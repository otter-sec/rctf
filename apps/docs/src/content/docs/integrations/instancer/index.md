---
title: Instancer
description: Configure per-team challenge instances with Docker or Kubernetes.
order: 2
---

The instancer integration creates one isolated challenge service per team. rCTF owns the user-facing lifecycle, and an instancer provider owns the compute backend that creates, reads, extends, and deletes the running instance.

Instanced challenges work well when teams need private mutable state, a dedicated service process, or a target that should disappear after a timeout.

:::warning[Hostile workloads]
Treat challenge images as hostile. Set resource limits, keep containers or pods unprivileged, and avoid mounting host paths unless the challenge explicitly needs them.
:::

## Pick a backend

Both providers share the same challenge fields and participant lifecycle, but each backend has its own deployment guide.

- [Docker instancer](/integrations/instancer/docker) is a bundled Python FastAPI service driving Docker, Traefik, and Redis.
- [Kubernetes instancer](/integrations/instancer/kubernetes) is a Go operator driving GKE, Traefik, and Terraform.

## Architecture

The instancer path has three layers:

:::steps
1. **Select a provider**

   The rCTF API loads the `<red>instancers</red>` map from `rctf.d/{:dir}`. You can define more than one named instancer, and each challenge targets one by name (falling back to `<red>defaultInstancer</red>`). The chosen provider validates challenge configs and translates rCTF lifecycle calls into Docker or Kubernetes operations underneath.

2. **Configure a challenge**

   Each instanced challenge stores `<red>instancerConfig</red>` in challenge data. The common fields cover the stable challenge integration ID, timeout, exposed endpoints, and provider-specific config.

3. **Run participant instances**

   Participants create, extend, inspect, and delete their instance from the challenge page. rCTF returns provider status and endpoints in the same order as the challenge's `<red>expose</red>` array, so the frontend can line them up cleanly.
:::

## Provider configuration

Instancers are defined under the `<red>instancers</red>` map in `rctf.d/{:dir}`. Each key is a name you choose; challenges target an instancer by that name. `<red>defaultInstancer</red>` picks the one used when a challenge doesn't name its own. It's required once more than one instancer is defined, and auto-selected when only one is:

```yaml title="rctf.d/instancer.yaml"
instancers:
  docker:
    name: instancer/docker-instancer
    options:
      apiUrl: http://tiny-instancer:1337
      authToken: <shared-secret>
  k8s:
    name: instancer/k8s-instancer
    options:
      apiUrl: https://k8s.example.com
      authToken: <service-account-token>
      caCertificate: |
        -----BEGIN CERTIFICATE-----
        ...
        -----END CERTIFICATE-----
defaultInstancer: docker
```

A single-instancer deployment only needs one entry, and `<red>defaultInstancer</red>` can be omitted:

```yaml title="rctf.d/instancer.yaml"
instancers:
  docker:
    name: instancer/docker-instancer
    options:
      apiUrl: http://tiny-instancer:1337
      authToken: <shared-secret>
```

::::tabs
:::tab[Docker]
`<green>instancer/docker-instancer</green>` calls into the bundled Docker instancer or any compatible tiny-instancer API.

| Field or variable | Purpose |
| --- | --- |
| `<red>options.apiUrl</red>` | Base URL of the Docker instancer API from the rCTF API process. |
| `<red>options.authToken</red>` | Shared token sent as `<red>rctfAuthToken</red>` in lifecycle requests. |
| `DOCKER_INSTANCER_API_URL{:sh}` | Environment override for `<red>apiUrl</red>`. |
| `DOCKER_INSTANCER_AUTH_TOKEN{:sh}` | Environment override for `<red>authToken</red>`. |

See [Docker instancer](/integrations/instancer/docker) for the deployment walkthrough and Docker-specific challenge schema.
:::
:::tab[Kubernetes]
`<green>instancer/k8s-instancer</green>` creates cluster-scoped `ChallengeInstance` custom resources.

| Field or variable | Purpose |
| --- | --- |
| `<red>options.apiUrl</red>` | Kubernetes API server URL. |
| `<red>options.authToken</red>` | Bearer token for a service account that can create, get, patch, and delete `ChallengeInstance` resources. |
| `<red>options.caCertificate</red>` | Kubernetes API CA certificate. This is required by the provider. |
| `K8S_INSTANCER_API_URL{:sh}` | Environment override for `<red>apiUrl</red>`. |
| `K8S_INSTANCER_AUTH_TOKEN{:sh}` | Environment override for `<red>authToken</red>`. |
| `K8S_INSTANCER_CA_CERTIFICATE{:sh}` | Environment override for `<red>caCertificate</red>`. |

See [Kubernetes instancer](/integrations/instancer/kubernetes) for the Terraform deployment walkthrough and Kubernetes-specific challenge schema.
:::
::::

:::note[Environment overrides and multiple instancers]
The `DOCKER_INSTANCER_*{:sh}` and `K8S_INSTANCER_*{:sh}` environment variables apply globally per provider type, so they're best suited to single-instancer deployments. When you run two instancers of the same type, set their `<red>options</red>` inline instead.
:::

## Challenge configuration

Each instanced challenge needs `<red>instancerConfig</red>`. The outer envelope (`<red>challengeIntegrationId</red>`, `<red>timeoutMilliseconds</red>`, `<red>extendable</red>`, `<red>expose</red>`) is the same regardless of which provider is active, and only the inner `<red>config</red>` body changes shape.

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
| `<red>challengeIntegrationId</red>` | Stable ID used in Docker labels, Kubernetes resource names, and lifecycle requests. Don't change it after launch. |
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

## Lifecycle and API behavior

Participant lifecycle routes are under `<route>/api/v2/integrations/challs/:id/instance</route>`:

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

## Provider schema and the admin UI

The `<red>instancerConfig</red>` envelope (`<red>challengeIntegrationId</red>`, `<red>timeoutMilliseconds</red>`, `<red>extendable</red>`, `<red>expose</red>`, `<red>config</red>`) is **provider-agnostic**. The same outer shape is accepted regardless of whether the active provider is `<green>instancer/docker-instancer</green>` or `<green>instancer/k8s-instancer</green>`. Only the inner `<red>config</red>` object is provider-specific (Docker Compose-like for docker, `<red>pods[]</red>` for Kubernetes), and the active provider validates it against its own schema.

The schema endpoint returns one entry per configured instancer (each with its own JSON Schema) plus the `<red>defaultInstancer</red>` name, so the response always matches what each provider will actually validate against. External tooling can fetch it to validate challenge configs before pushing them.

### Dynamic admin UI

The admin challenge editor fetches the same schema endpoint and renders the form fields directly from the returned JSON Schema. When multiple instancers are configured, an instancer dropdown lets you pick which one the challenge runs on (the `<red>defaultInstancer</red>` is marked as such), and the form re-renders from the selected instancer's schema without any frontend rebuild, since every field, type, and validation rule comes from that provider. An "advanced YAML" toggle exposes the raw `<red>config</red>` block for cases the schema-driven UI doesn't cover.
