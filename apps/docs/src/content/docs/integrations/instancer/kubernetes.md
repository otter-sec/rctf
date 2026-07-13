---
title: Kubernetes instancer
description: Deploy the rCTF Kubernetes instancer on GKE with the bundled Terraform modules and operator.
order: 2
---

The Kubernetes instancer runs each team's challenge instance in its own namespace. A controller inside the cluster watches `ChallengeInstance` resources and creates the pods, network rules, services, and Traefik routes they describe.

rCTF communicates with the Kubernetes API through the `<green>instancer/k8s-instancer</green>` provider. The controller handles the resources inside the cluster.

:::warning[Hostile workloads]
Challenge images run untrusted code. Review any change that widens RBAC permissions, mounts credentials, grants host access, or weakens the default network policies.
:::

## How requests become instances

A deployment has three main components:

| Component | Source | Responsibility |
| --- | --- | --- |
| `<green>K8sInstancerProvider</green>` | `apps/api/src/providers/instancer/k8s-instancer.ts{:file}` | Translates rCTF instance requests into create, get, patch, and delete operations on `ChallengeInstance` custom resources. |
| `<green>k8s-operator</green>` | `apps/k8s-operator/{:dir}` | Go controller that watches `ChallengeInstance` resources and keeps the corresponding cluster resources up to date. |
| `<green>Traefik</green>` | `deploy/terraform/instancer/modules/k8s/traefik.tf{:file}` | Helm-installed ingress controller that terminates TLS and routes wildcard hostnames to per-instance services. |

A participant request flows through these in order:

:::steps
1. **rCTF creates the custom resource**

   After validating the challenge config, rCTF creates a cluster-wide `ChallengeInstance` resource in the `rctf.osec.io/v1` API group. It contains the challenge and team IDs, expiration time, pod definitions, and exposed endpoints.

2. **The controller creates the Kubernetes resources**

   The controller watches for `ChallengeInstance` changes and creates the matching namespace, network policies, deployments, services, and Traefik routes. It also adds a Kubernetes finalizer, which prevents the `ChallengeInstance` from disappearing before its namespace has been removed.

3. **Traefik routes participant traffic**

   Each expose entry gets a hostname of the form `<red><hostPrefix>-<uid>.<instancer-host></red>`. Traefik matches the hostname against the generated `<red>IngressRoute</red>` and forwards traffic to the per-instance service.

4. **The controller cleans up at expiry**

   At `<red>spec.expiresAt</red>`, the controller deletes the `ChallengeInstance` and its namespace. Stopping an instance through rCTF follows the same cleanup path.
:::

Namespaces use the predictable name `<red>inst-<challenge-id>-<team-id></red>`. Child resources point back to their `ChallengeInstance`, allowing Kubernetes garbage collection to remove anything left behind after cleanup.

## Prerequisites

The Terraform example assumes GKE plus Cloudflare for DNS and ACME. GCP Cloud DNS works as a drop-in alternative.

| Requirement | Notes |
| --- | --- |
| GCP project with billing enabled | Used for GKE, Artifact Registry, and optionally Cloud DNS. |
| `$ <red>gcloud</red>` and `$ <red>kubectl</red>` | Needed for cluster auth. |
| `$ <red>terraform</red>` | The example pins providers but not the Terraform CLI. |
| Domain plus DNS provider | One of Cloudflare or GCP Cloud DNS. Used for the ACME DNS-01 challenge and the wildcard `A` record. |
| Let's Encrypt account email | Registered through the `acme_registration` resource. |

The instancer's public hostname is `<red><instancer_subdomain>.<instancer_zone></red>`, or `<red><instancer_zone></red>` when no subdomain is configured. Each instance gets a hostname one level below it.

## Controller image

The operator image is published at `ghcr.io/otter-sec/rctf-new/k8s-operator`. The Terraform module installs it from `apps/k8s-operator/dist/install.yaml{:file}` and fills in the configured `INSTANCER_HOST`, so you do not need to build or publish an image before running `$ <red>terraform</red> apply`.

## Terraform variables

Start with the Terraform example in `deploy/terraform/instancer/example/{:dir}`.

:::file-tree
- deploy/
  - terraform/
    - instancer/
      - **example**/
        - main.tf Providers, GKE module wiring
        - dns.tf Cloudflare or GCP Cloud DNS record
        - tls.tf ACME wildcard certificate and Traefik TLSStore
        - rctf-operator.tf k8s module call and rCTF ServiceAccount
        - variables.tf Input variables
        - terraform.tfvars.example Example values
      - modules/
        - gke/ GKE cluster and Artifact Registry
        - k8s/ Traefik, error pages, controller installer
:::

Copy `terraform.tfvars.example{:file}` to `terraform.tfvars{:file}` and fill in:

| Variable | Required | Purpose |
| --- | --- | --- |
| `<red>cloudflare_api_token</red>` | Cloudflare only | API token with `Zone.DNS` edit on the configured zone. Used for ACME DNS-01 and the wildcard record. |
| `<red>letsencrypt_email_address</red>` | Yes | Address registered with Let's Encrypt for the wildcard certificate. |
| `<red>instancer_zone</red>` | Yes | Base apex domain, for example `<green>ctf.example.com</green>`. |
| `<red>instancer_subdomain</red>` | Yes | Optional subdomain in front of `<red>instancer_zone</red>`. Set to an empty string when serving instances from the apex. |
| `<red>ctf_name</red>` | Yes | Displayed on the 404 and 502 error pages rendered by the in-cluster Nginx deployment. |
| `<red>gcp_dns_managed_zone_name</red>` | Cloud DNS only | Managed-zone name when using `google_dns_record_set` instead of Cloudflare. |
| `<red>gcp_project_id</red>` | Yes | GCP project that hosts the GKE cluster and Artifact Registry. |
| `<red>gcp_region</red>` | Yes | GKE control-plane region, for example `<green>us-central1</green>`. |
| `<red>gcp_zone</red>` | Yes | Single zone for the node pool. Set to the same value as `<red>gcp_region</red>` for a multi-zone cluster. The Artifact Registry location is derived from this with a `^(.*)-[a-z]$` regex. |
| `<red>gcp_instancer_cluster_name</red>` | Yes | GKE cluster name and Artifact Registry service account ID. |
| `<red>gcp_instancer_machine_type</red>` | Yes | GCE machine type, for example `<green>e2-medium</green>`. |
| `<red>gcp_instancer_min_node_count</red>` | No | Autoscaling minimum. Defaults to `1{:ts}`. |
| `<red>gcp_instancer_max_node_count</red>` | No | Autoscaling maximum. Defaults to `1{:ts}`. |
| `<red>gcp_instancer_pod_pids_limit</red>` | No | Per-pod kubelet PID cap. Defaults to `1024{:ts}`. Bounds fork bombs in challenge pods so one container can't drain the node's `kernel.pid_max`. Must be `>= 1024` per GKE's kubelet validation. |

A minimal Cloudflare-backed file looks like this:

```hcl title="terraform.tfvars"
cloudflare_api_token = "<cloudflare-api-token>"
letsencrypt_email_address = "ops@example.com"
instancer_zone = "ctf.example.com"
instancer_subdomain = "instances"
ctf_name = "Example CTF"

gcp_project_id = "example-ctf"
gcp_region = "us-central1"
gcp_zone = "us-central1-a"
gcp_instancer_cluster_name = "rctf-cluster"
gcp_instancer_machine_type = "e2-standard-4"
gcp_instancer_min_node_count = 1
gcp_instancer_max_node_count = 8
```

To use GCP Cloud DNS instead of Cloudflare, comment out the Cloudflare blocks in `dns.tf{:file}` and `tls.tf{:file}`, uncomment the `google_dns_record_set` and `gcloud` ACME blocks, and set `<red>gcp_dns_managed_zone_name</red>`.

## Deployment

:::steps
1. **Initialize Terraform**

   ```console
   $ <red>cd</red> deploy/terraform/instancer/example
   $ <red>cp</red> terraform.tfvars.example terraform.tfvars
   $ <yellow>$EDITOR</yellow> terraform.tfvars
   $ <red>terraform</red> init
   ```

2. **Apply the stack**

   ```console
   $ <red>terraform</red> apply
   ```

   Terraform provisions GKE, the node pool, Artifact Registry, the Cloudflare or Cloud DNS record, the ACME wildcard certificate, Traefik, the error-pages deployment, the `rctf` service account, and applies the bundled `apps/k8s-operator/dist/install.yaml{:file}` (pointing at the prebuilt `ghcr.io/otter-sec/rctf-new/k8s-operator` image). The first apply typically takes 10 to 15 minutes. ACME validation alone can add a few minutes if DNS propagation is slow.

3. **Fetch kubectl credentials**

   ```console
   $ <red>gcloud</red> container clusters get-credentials rctf-cluster <dim>--project</dim> example-ctf <dim>--location</dim> us-central1
   $ <red>kubectl</red> get pods <dim>-n</dim> rctf-operator-system
   ```

   The controller pod should be `Running`. Traefik comes up in the `traefik` namespace, with the wildcard certificate stored in the `instancer-wildcard-tls` Kubernetes `Secret`.

4. **Wire the outputs into rCTF**

   Three Terraform outputs map directly to provider options:

   | Terraform output | rCTF option | Environment override |
   | --- | --- | --- |
   | `<red>rctf_instancer_api_url</red>` | `<red>options.apiUrl</red>` | `K8S_INSTANCER_API_URL{:sh}` |
   | `<red>rctf_instancer_auth_token</red>` | `<red>options.authToken</red>` | `K8S_INSTANCER_AUTH_TOKEN{:sh}` |
   | `<red>rctf_instancer_ca_certificate</red>` | `<red>options.caCertificate</red>` | `K8S_INSTANCER_CA_CERTIFICATE{:sh}` |

   Render them into rCTF's `rctf.d/{:dir}`:

   ```console
   $ <red>terraform</red> output <dim>-raw</dim> rctf_instancer_api_url
   $ <red>terraform</red> output <dim>-raw</dim> rctf_instancer_auth_token
   $ <red>terraform</red> output <dim>-raw</dim> rctf_instancer_ca_certificate
   ```

   ```yaml title="rctf.d/instancer.yaml"
   instancers:
     k8s:
       name: instancer/k8s-instancer
       options:
         apiUrl: https://203.0.113.10
         authToken: <rctf_instancer_auth_token>
         caCertificate: |
           -----BEGIN CERTIFICATE-----
           ...
           -----END CERTIFICATE-----
   ```

   `<red>caCertificate</red>` is required even when the API server certificate is already trusted by the host.

5. **Verify end-to-end**

   Create an instanced challenge that uses the `<green>instancer/k8s-instancer</green>` provider and start it as a participant. The controller should create the `inst-<challenge-id>-<team-id>` namespace, and Traefik should serve the `<hostPrefix>-<uid>.<instancer-host>` hostname over HTTPS.
:::

## What Terraform provisions

The example layers the GKE module, the k8s module, and the example-level resources in `rctf-operator.tf{:file}`, `dns.tf{:file}`, and `tls.tf{:file}`:

| Resource | Source | Purpose |
| --- | --- | --- |
| GKE cluster (`google_container_cluster`) | `modules/gke/gke.tf{:file}` | Stable release channel, workload identity, `COS_CONTAINERD` nodes, weekly Wednesday 07\:00 to 19\:00 UTC maintenance window. |
| GKE primary node pool | `modules/gke/gke.tf{:file}` | Autoscaling between `min_node_count` and `max_node_count`, surge upgrades, optional preemptible nodes, workload metadata concealment. |
| GCP service account | `modules/gke/gke.tf{:file}` | Identity for cluster nodes. Granted `<green>roles/artifactregistry.writer</green>` on the challenge registry. |
| Artifact Registry repo (`google_artifact_registry_repository`) | `modules/gke/registry.tf{:file}` | Docker registry named `challenge-registry`. Keeps the five most recent versions, deletes images older than `<green>30d</green>`. |
| Traefik (`helm_release.traefik`) | `modules/k8s/traefik.tf{:file}` | `LoadBalancer` service with `externalTrafficPolicy: Local{:yml}` to preserve client IPs, plus the dashboard entrypoint for `$ <red>kubectl</red> port-forward`. |
| Nginx error pages | `modules/k8s/traefik.tf{:file}` | `kubernetes_deployment_v1.error-pages` plus a `ConfigMap` rendering 404 and 502 templates with `<red>ctf_name</red>`. |
| Traefik `Middleware` and catch-all `IngressRoute` | `modules/k8s/traefik.tf{:file}` | Middleware intercepts 502 errors and serves the Nginx page. The catch-all `HostRegexp(.*)` route returns the 404 page for unmatched hosts. |
| Operator installer (`kubectl_manifest`) | `modules/k8s/rctf-operator.tf{:file}` | Applies every manifest in `apps/k8s-operator/dist/install.yaml{:file}`, replacing `INSTANCER_HOST` with the resolved hostname. |
| ACME wildcard certificate (`acme_certificate`) | `example/tls.tf{:file}` | DNS-01 challenge through Cloudflare or Cloud DNS. The chain and key land in the `instancer-wildcard-tls` `Secret` in the `traefik` namespace. |
| Traefik `TLSStore` (`kubectl_manifest`) | `example/tls.tf{:file}` | Sets `instancer-wildcard-tls` as the default certificate for the cluster. |
| Wildcard DNS record (`cloudflare_dns_record`) | `example/dns.tf{:file}` | `*.<subdomain>` `A` record pointing at the Traefik LoadBalancer IP. The GCP variant uses `google_dns_record_set`. |
| `rctf` service account, `ClusterRole`, `ClusterRoleBinding`, and `Secret` | `example/rctf-operator.tf{:file}` | Service account in `kube-system` with verbs `<green>create</green>`, `<green>get</green>`, `<green>delete</green>`, and `<green>patch</green>` on `challengeinstances.rctf.osec.io`. A long-lived `kubernetes.io/service-account-token` secret backs the `<red>rctf_instancer_auth_token</red>` output. |

Traefik is configured with three ports:

| Port        | Entry point | Purpose                                                             |
| ----------- | ----------- | ------------------------------------------------------------------- |
| `80{:ts}`   | `web`       | HTTP routes plus global 502 middleware.                             |
| `443{:ts}`  | `websecure` | HTTPS routes terminated with the ACME wildcard.                     |
| `1337{:ts}` | `tcp`       | Raw TCP with SNI routing for `<green>tcp-ssl</green>` expose kinds. |

Terraform requests the wildcard certificate outside the cluster, so DNS provider credentials are never stored there. A compromised cluster can expose the issued certificate, but it cannot use those credentials to request new ones or change DNS records.

## Network policies

The controller creates three `NetworkPolicy` resources in every instance namespace:

| Policy | Pod selector | Behavior |
| --- | --- | --- |
| `isolate-namespace` | All pods | Ingress is restricted to other pods in the same managed namespace. Egress is restricted to pods in the same namespace plus UDP `53` to the `kube-system` namespace for DNS. |
| `ingress-traefik` | `rctf.osec.io/exposed=true` | Allows ingress from Traefik pods in the `traefik` namespace. Applied only to pods that match an `<red>expose[].containerName</red>` entry. |
| `egress` | `rctf.osec.io/egress=true` | Allows egress to `0.0.0.0/0` except RFC1918 (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`), CGNAT (`100.64.0.0/10`), and link-local (`169.254.0.0/16`). |

The controller labels a pod as exposed when it appears in an `<red>expose[]</red>` entry. It adds the egress label only when that pod sets `egress: true{:yml}` in `<red>instancerConfig</red>`. Leave it `false{:yml}` when the challenge does not need internet access.

:::note[Cluster network plugin]
Network policies only enforce isolation when the cluster's CNI supports them. The bundled GKE Terraform module enables GKE Dataplane V2, which enforces them. On a bare-metal cluster, make sure the chosen CNI honors `NetworkPolicy`.
:::

## Exposed hostnames inside pods

The controller writes the resolved public endpoints onto every instance pod template as a JSON annotation named `<red>rctf.osec.io/exposed-hostnames</red>`. Challenge code can read that annotation through Kubernetes' downward API when it needs to know its own public callback URL, WebSocket URL, or peer-facing hostname.

Each array entry follows the matching `<red>expose[]</red>` entry:

```json title="rctf.osec.io/exposed-hostnames"
[
  {
    "kind": "https",
    "hostPrefix": "web-demo",
    "host": "web-demo-7f3a2c1d9b80.instances.ctf.example.com",
    "port": 443,
    "containerName": "app",
    "containerPort": 8080,
    "title": "Challenge"
  }
]
```

Expose it to a container as an environment variable with `<red>fieldRef</red>`:

```yaml title="challenge.yaml"
instancerConfig:
  config:
    pods:
      - name: app
        spec:
          containers:
            - name: app
              image: ghcr.io/example/web-demo:latest
              env:
                - name: RCTF_EXPOSED_HOSTNAMES
                  valueFrom:
                    fieldRef:
                      fieldPath: metadata.annotations['rctf.osec.io/exposed-hostnames']
```

`<red>RCTF_EXPOSED_HOSTNAMES</red>` is a JSON string. Hidden endpoints (`shouldDisplay: false{:yml}`) are included because they still exist for routing.

## Per-pod safety checklist

Kubernetes does not expose every resource limit directly in a PodSpec, and the controller does not add limits to the pod definition you provide. Set the following values on every pod under `<red>instancerConfig.config.pods[]</red>`.

| Setting | Why it matters |
| --- | --- |
| `<red>resources.limits.cpu</red>` / `<red>resources.limits.memory</red>` | Without limits a pod can use whatever the node has free. Set them per-container. |
| `<red>resources.limits.ephemeral-storage</red>` | A participant `dd`-ing `/tmp/{:dir}` fills the node's overlayfs and takes down every other pod sharing it. Pick a value (`128Mi` is reasonable for most challenges). |
| `<red>securityContext.readOnlyRootFilesystem</red>` set to `true{:yml}` | Pairs with the ephemeral-storage limit. If the challenge needs to write somewhere, mount a sized `<red>emptyDir</red>` with `<red>sizeLimit</red>`. |
| `<red>securityContext.allowPrivilegeEscalation</red>` set to `false{:yml}` and dropped `<red>capabilities</red>` | Defaults are unsafe. Drop `ALL` and only add what the challenge actually needs. |
| `<red>automountServiceAccountToken</red>` set to `false{:yml}` on the pod | Otherwise the default service-account token gets mounted into the container. |
| `<red>terminationGracePeriodSeconds</red>` | Cap it (e.g. `10{:ts}`) so held TCP connections don't delay pod cleanup for minutes when an instance expires. |
| `<red>volumes[].emptyDir.sizeLimit</red>` | Any `<red>emptyDir</red>` mount needs a size cap or the same disk-fill issue applies. |

:::warning[File descriptor / nofile limits]
Kubernetes' PodSpec has no first-class `<red>ulimits</red>` field. The CRI passes container ulimits through containerd's `<red>default_ulimits</red>`, which on GKE `COS_CONTAINERD` nodes isn't exposed via the kubelet config. Changing it takes a custom node startup script or DaemonSet that rewrites `/etc/containerd/config.toml{:file}`.

If your challenge is sensitive to FD exhaustion, the practical workaround is to set the limit in the entrypoint:

```sh title="Dockerfile entrypoint"
#!/bin/sh
ulimit -n 1024
exec /your/challenge "$@"
```

This is per-image, not platform-enforced, so it's only as strong as the image. Don't rely on it for hostile-input boundaries that absolutely must not break. Reach for a per-connection sandbox (nsjail) instead.
:::

## RBAC and the rCTF service account

The example creates a single `ServiceAccount` named `rctf` in `kube-system` and a matching `ClusterRole` granting only what the API needs:

```yaml title="kubernetes_cluster_role_v1.rctf"
rule:
  api_groups: ['rctf.osec.io']
  resources: ['challengeinstances']
  verbs: ['create', 'get', 'delete', 'patch']
```

The rCTF API never reads or writes any other resource type. The `kubernetes_secret_v1.rctf_token` resource issues a `kubernetes.io/service-account-token` so the token doesn't rotate. The value comes back through the `<red>rctf_instancer_auth_token</red>` Terraform output.

The controller's RBAC configuration is under `apps/k8s-operator/config/{:dir}`. It grants access to the namespaces, deployments, services, network policies, and Traefik resources needed to update each instance. The Traefik resources are `IngressRoute`, `IngressRouteTCP`, and `Middleware`. Run `$ <red>make</red> manifests` to generate the CRD in `apps/k8s-operator/config/crd/bases/{:dir}`.

## Example challenge config (Konata)

This complete [Konata](/integrations/konata) example is adapted from `misc/pwnable-document-fabricator` in the SekaiCTF 2026 challenge repository.

```yaml title="misc/pwnable-document-fabricator/kona.yaml"
challenges:
  - category: misc
    name: pwnable document fabricator
    releaseTime: '2026-06-28T08:00:00Z'
    author: SekaiCTF
    description: |
      yep it's another web challenge.
    attachments:
      files:
        - "challenge/"
      exclude:
        - "challenge/readflag.c"
      additional:
        - path: readflag.c
          strContent: |
            #include <stdio.h>
            int main() { printf("SEKAI{dummy_flag}"); }
      stripComponents: 1
    flags:
      rctf: SEKAI{example}
    instancerConfig:
      instancer: k8s
      challengeIntegrationId: pwnable-doc
      timeoutMilliseconds: 1800000
      expose:
        - kind: https
          hostPrefix: pwnable-doc
          containerName: app
          containerPort: 8080
      config:
        pods:
          - name: app
            egress: false
            ports:
              - protocol: TCP
                port: 8080
            spec:
              restartPolicy: Always
              terminationGracePeriodSeconds: 0
              automountServiceAccountToken: false
              enableServiceLinks: false
              containers:
                - name: app
                  image: "{{ images['pwnable-doc'] }}"
                  ports:
                    - containerPort: 8080
                  volumeMounts:
                    - name: tmp
                      mountPath: /tmp
                  resources:
                    requests: { cpu: 100m, memory: 128Mi }
                    limits: { cpu: 500m, memory: 512Mi }
                  readinessProbe:
                    tcpSocket: { port: 8080 }
                    initialDelaySeconds: 5
                    periodSeconds: 3
                  securityContext:
                    readOnlyRootFilesystem: true
                    allowPrivilegeEscalation: false
                    capabilities:
                      drop: ["ALL"]
              volumes:
                - name: tmp
                  emptyDir:
                    medium: Memory
                    sizeLimit: 512Mi

deployment:
  images:
    - path: challenge
      name: pwnable-doc
      tag: latest
      registryName: instancer-challenges
      platform: linux/amd64
```

Things worth pointing at in this example:

- **`egress: false{:yml}`** keeps the pod sealed off from public internet egress. Set it to `true{:yml}` only for challenges that need outbound access.
- **Resource `<red>requests</red>` and `<red>limits</red>`** keep one instance from starving the node. Set both from the expected peak load for one team.
- **`<red>readinessProbe</red>`** keeps Traefik from routing to the pod before the app is up. Without it, the first request after creation often 502s while the container is still booting.
- **`<red>readOnlyRootFilesystem</red>` plus the sized `<red>emptyDir</red>`** gives the app a bounded writable `/tmp/{:dir}` without letting it write into the image layer.
- **`<red>securityContext</red>`** locks the container down with dropped capabilities and no privilege escalation.
- **`<red>{{ images['pwnable-doc'] }}</red>`** resolves to the fully-qualified registry path Konata pushed to (`<red>registries.instancer-challenges</red>` + the image name + tag).
- **The `additional` attachment entry** ships a dummy `readflag.c` while the real challenge flag is kept out of the handout.

For the rest of the Konata schema, see [Konata](/integrations/konata).

## Troubleshooting

| Symptom | Likely cause |
| --- | --- |
| `$ <red>terraform</red> apply` hangs on `acme_certificate` | DNS propagation for the DNS-01 record is slow. Verify the Cloudflare or Cloud DNS TXT record is visible from a public resolver. |
| Instances stuck in `<green>starting</green>` | Inspect the `ChallengeInstance` status conditions with `$ <red>kubectl</red> get challengeinstance <dim>-A</dim> <dim>-o</dim> yaml`. The `<red>NamespaceDeployed</red>`, `<red>DeploymentsDeployed</red>`, and `<red>ServicesDeployed</red>` conditions narrow down the failing stage. |
| 502 from the wildcard host | Traefik is reachable but the backing pod isn't ready. The `global-errors` middleware serves the Nginx 502 page until the deployment reports ready replicas. |
| 404 on the wildcard host | The catch-all `<red>IngressRoute</red>` matched. Confirm an active `ChallengeInstance` exists for the hostname and that its `<red>IngressRoute</red>` has a higher priority than `1{:ts}`. |
| rCTF returns `<response>400 badInstancerConfig</response>` | The challenge `<red>config</red>` failed the provider's Zod schema. Fetch it with `<route>GET /api/v2/admin/instancer/schema</route>` and validate the challenge manifest against it. |
| Namespace stuck `Terminating` | A child resource still holds a finalizer. The controller waits one second per reconcile while the namespace drains. Check Traefik CRDs in the namespace if the wait doesn't resolve. |

Kubernetes events appear in `$ <red>kubectl</red> describe challengeinstance <name>`. Compare them with the controller logs from `$ <red>kubectl</red> logs <dim>-n</dim> rctf-operator-system <dim>-l</dim> control-plane=controller-manager` when the resources for an instance are not being created or removed correctly.
