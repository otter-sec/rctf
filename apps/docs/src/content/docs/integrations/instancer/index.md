---
title: Instancer
description: Configure per-team challenge instances with Docker or Kubernetes.
order: 2
---

The instancer gives each team an isolated copy of a challenge service running on Docker or Kubernetes. Participants can start, inspect, extend, and stop their instance through rCTF.

Instanced challenges work well when teams need private mutable state, a dedicated service process, or a target that should disappear after a timeout.

:::warning[Hostile workloads]
Treat challenge images as hostile. Set resource limits, keep containers or pods unprivileged, and avoid mounting host paths unless the challenge explicitly needs them.
:::

## Pick a backend

Both providers give participants the same controls and use the same shared challenge fields, but each backend has its own deployment guide.

- [Docker instancer](/integrations/instancer/docker) is a bundled Python FastAPI service driving Docker, Traefik, and Redis.
- [Kubernetes instancer](/integrations/instancer/kubernetes) is a Go operator driving GKE, Traefik, and Terraform.

## How it works

Each challenge uses `<red>instancerConfig</red>` to select a named instancer and set its ID, timeout, public endpoints, and provider-specific settings. If the challenge does not select one, rCTF uses `<red>defaultInstancer</red>` or the only configured instancer.

When a participant starts an instance, rCTF validates the challenge configuration and sends the request to Docker or Kubernetes. The challenge page shows the instance status and the endpoints in the order listed under `<red>expose</red>`, along with controls to extend or stop it.

## Provider configuration

Define instancers under the `<red>instancers</red>` map in `rctf.d/{:dir}`. Each key is a name you choose, and challenges use that name to select an instancer. `<red>defaultInstancer</red>` chooses the fallback for challenges that don't specify one. It is required when you configure more than one instancer. With only one, rCTF selects it automatically.

```yaml title="rctf.d/instancer.yaml"
instancers:
  docker:
    name: instancers/docker
    options:
      apiUrl: http://tiny-instancer:1337
      authToken: <shared-secret>
  k8s:
    name: instancers/k8s
    options:
      apiUrl: https://k8s.example.com
      authToken: <service-account-token>
      caCertificate: <base64-encoded-ca>
defaultInstancer: docker
```

A single-instancer deployment only needs one entry, and `<red>defaultInstancer</red>` can be omitted:

```yaml title="rctf.d/instancer.yaml"
instancers:
  docker:
    name: instancers/docker
    options:
      apiUrl: http://tiny-instancer:1337
      authToken: <shared-secret>
```

::::tabs
:::tab[Docker]
`<green>instancers/docker</green>` calls into the bundled Docker instancer or any compatible tiny-instancer API.

| Field or variable | Purpose |
| --- | --- |
| `<red>options.apiUrl</red>` | Base URL of the Docker instancer API from the rCTF API process. |
| `<red>options.authToken</red>` | Shared token sent as `<red>rctfAuthToken</red>` when rCTF creates, reads, extends, or deletes an instance. |
| `<yellow>DOCKER_INSTANCER_API_URL</yellow>` | Environment override for `<red>apiUrl</red>`. |
| `<yellow>DOCKER_INSTANCER_AUTH_TOKEN</yellow>` | Environment override for `<red>authToken</red>`. |

See [Docker instancer](/integrations/instancer/docker) for the deployment walkthrough and Docker-specific challenge schema.
:::
:::tab[Kubernetes]
`<green>instancers/k8s</green>` creates cluster-scoped `ChallengeInstance` custom resources.

| Field or variable | Purpose |
| --- | --- |
| `<red>options.apiUrl</red>` | Kubernetes API server URL. |
| `<red>options.authToken</red>` | Bearer token for a service account that can create, get, patch, and delete `ChallengeInstance` resources. |
| `<red>options.caCertificate</red>` | base64-encoded Kubernetes API CA certificate. This is required by the provider unless `<red>inCluster</red>` is set. |
| `<red>options.inCluster</red>` | Set to `true{:yml}` when rCTF runs inside the target cluster. Authenticates with the pod's mounted service account and makes the three options above unnecessary. Defaults to `false{:yml}`. |
| `<yellow>K8S_INSTANCER_API_URL</yellow>` | Environment override for `<red>apiUrl</red>`. |
| `<yellow>K8S_INSTANCER_AUTH_TOKEN</yellow>` | Environment override for `<red>authToken</red>`. |
| `<yellow>K8S_INSTANCER_CA_CERTIFICATE</yellow>` | Environment override for `<red>caCertificate</red>`. |
| `<yellow>K8S_INSTANCER_IN_CLUSTER</yellow>` | Environment override for `<red>inCluster</red>`. |

See [Kubernetes instancer](/integrations/instancer/kubernetes) for the Terraform deployment walkthrough and Kubernetes-specific challenge schema.
:::
::::

:::note[Environment overrides and multiple instancers]
The `<yellow>DOCKER_INSTANCER_*</yellow>` and `<yellow>K8S_INSTANCER_*</yellow>` environment variables apply globally per provider type, so they're best suited to single-instancer deployments. When you run two instancers of the same type, set their `<red>options</red>` inline instead.
:::

## Challenge configuration

Each instanced challenge needs `<red>instancerConfig</red>`. Its ID, timeout, extension setting, and exposed endpoints work the same with either provider. The contents of `<red>config</red>` depend on whether the challenge uses Docker or Kubernetes.

```yaml title="challenge.yaml"
instancerConfig:
  challengeIntegrationId: web-demo
  instancer: docker
  timeoutMilliseconds: 600000
  extendable: true
  config:
    # Provider-specific config.
  expose:
    - kind: https
      hostPrefix: web-demo
      containerName: app
      containerPort: 8080
      shouldDisplay: true
      title: Challenge
```

| Field | Purpose |
| --- | --- |
| `<red>challengeIntegrationId</red>` | Stable ID used in Docker labels, Kubernetes resource names, and instance requests. Don't change it after launch. |
| `<red>instancer</red>` | Name of the instancer (a key in the `<red>instancers</red>` map) this challenge runs on. Omit to use `<red>defaultInstancer</red>`. The admin challenge editor exposes this as a dropdown of configured instancers. |
| `<red>timeoutMilliseconds</red>` | Instance lifetime for create and extend operations. |
| `<red>extendable</red>` | Lets participants extend their instance when set to `true{:ts}`. |
| `<red>config</red>` | Provider-specific service or pod configuration. See [Docker](/integrations/instancer/docker#docker-challenge-config) or [Kubernetes](/integrations/instancer/kubernetes#kubernetes-challenge-config) for the schema. |
| `<red>expose</red>` | Public endpoints rCTF should display or keep hidden for internal routing. |

The `<red>expose</red>` entries map public endpoints to a service container or pod:

| Field | Purpose |
| --- | --- |
| `<red>kind</red>` | Endpoint kind. The values are `<green>http</green>`, `<green>https</green>`, `<green>tcp</green>`, and `<green>tcp-ssl</green>`. |
| `<red>hostPrefix</red>` | Prefix used when generating the per-instance hostname. |
| `<red>containerName</red>` | Docker service name or Kubernetes pod name receiving traffic. |
| `<red>containerPort</red>` | Port inside the service container or Kubernetes service. |
| `<red>shouldDisplay</red>` | Controls whether the endpoint is shown to participants. Hidden endpoints still exist. |
| `<red>title</red>` | Optional display label. |

## Endpoint kinds

Endpoint support is provider-specific:

| Kind | Docker behavior | Kubernetes behavior |
| --- | --- | --- |
| `<green>http</green>` | Traefik HTTP router on the configured HTTP port. The default is `80{:ts}`. | Traefik `IngressRoute` on the `web` entrypoint. The public port is `80{:ts}`. |
| `<green>https</green>` | Traefik HTTPS router on the configured HTTPS port. The default is `443{:ts}`. | Traefik `IngressRoute` on the `websecure` entrypoint plus an HTTP redirect route. The public port is `443{:ts}`. |
| `<green>tcp</green>` | Rewritten to `<green>tcp-ssl</green>` because Traefik needs SNI routing. | Returned as `unsupported-by-instancer` with port `0{:ts}`. Kubernetes configs should use `<green>tcp-ssl</green>`. |
| `<green>tcp-ssl</green>` | Traefik TCP router with TLS and HostSNI on the configured TCP port. The default is `1337{:ts}`. | Traefik `IngressRouteTCP` with TLS and HostSNI on port `1337{:ts}`. |

## Participant actions and API routes

The instance routes are under `/api/v2/integrations/challs/:id/instance`:

| Method                  | Action                                                |
| ----------------------- | ----------------------------------------------------- |
| `<route>GET</route>`    | Returns current status, time left, and endpoints.     |
| `<route>PUT</route>`    | Creates an instance.                                  |
| `<route>PATCH</route>`  | Extends an instance when the challenge is extendable. |
| `<route>DELETE</route>` | Stops an instance.                                    |

The returned status is `<green>stopped</green>`, `<green>starting</green>`, `<green>running</green>`, `<green>stopping</green>`, or `<green>errored</green>`.

Captcha can protect create and extend actions:

```yaml title="rctf.d/captcha.yaml"
captcha:
  protectedEndpoints:
    - instancerStart
    - instancerExtend
```

## Provider schemas and the admin UI

The fields shared by both providers remain the same. Only `<red>config</red>` differs. Docker accepts a Compose-like service definition, while Kubernetes accepts `<red>pods[]</red>`. Each provider publishes a JSON Schema that describes and validates its version of `<red>config</red>`.

The schema endpoint returns the schema for each configured instancer and identifies the default. Deployment tools can use the same endpoint to validate a challenge before sending it to rCTF.

### Dynamic admin UI

The challenge editor builds its form from these schemas. If several instancers are configured, selecting one updates the available fields and validation rules. Use the advanced YAML editor when a setting cannot be represented by the generated form.
