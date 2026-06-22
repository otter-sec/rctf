---
title: Docker instancer
description: Deploy the rCTF Docker instancer with the bundled Compose stack and configure Docker-backed instanced challenges.
order: 1
---

The Docker instancer is a Python FastAPI service that manages Docker containers, networks, volumes, Redis instance locks, Redis expirations, and Traefik labels. It's the lightweight option for per-team challenge instances and is what the bundled Compose stack ships out of the box.

For the participant lifecycle, the common `<red>instancerConfig</red>` fields, and endpoint-kind semantics, see [Instancer](/integrations/instancer).

## Deployment

The bundled deployment files live under `deploy/docker-instancer/{:dir}`:

:::file-tree
- deploy/
  - docker-instancer/
    - compose.yml Traefik, Redis, and tiny-instancer service
    - .env.example Required environment variables
    - Dockerfile Python 3.14 runtime image
    - conf/ Traefik static and dynamic config
    - certs/ TLS certificate mount point
:::

The Compose stack exposes Traefik on `80{:ts}`, `443{:ts}`, and `1337{:ts}`. The instancer API itself binds to `127.0.0.1:12237` on the host and to `tiny-instancer:1337` inside the `rctf_network` Docker network.

:::warning[Hosting the instancer on a separate machine]
The bundled `compose.yml{:file}` binds the instancer API to `127.0.0.1:12237` because the default deployment expects rCTF and the instancer to share the `rctf_network` Docker network on the same host. The loopback bind is intentional.

If you split the instancer onto its own host (which we recommend, since it isolates challenge workloads from the platform), change the port mapping to bind globally:

```yaml title="deploy/docker-instancer/compose.yml"
ports:
  - '12237:1337'
```

The API is authenticated by a shared `<red>AUTH_TOKEN</red>`, but the endpoint shouldn't be reachable from anything other than rCTF. Put a host firewall in front of it that only allows the rCTF host's source IP.
:::

The environment file requires shared auth, Redis, and public instance host settings:

```sh title="deploy/docker-instancer/.env"
DEV_ENV=false
BIND_PORT=1337
WEB_WORKERS=1
USE_PROXY_HEADERS=true

AUTH_TOKEN=<shared-secret>
INSTANCES_HOST=instancer.example.com

REDIS_HOST=cache
REDIS_PORT_NUMBER=6379
REDIS_PASSWORD=<redis-password>

TRAEFIK_PERMANENT_REDIRECT_MIDDLEWARE_NAME=permanent-https-redirect@file
```

The Docker instancer stack starts from the repository root:

```console
$ <red>docker</red> compose <dim>-f</dim> deploy/docker-instancer/compose.yml up <dim>-d</dim>
```

The same token belongs in rCTF:

```yaml title="rctf.d/instancer.yaml"
instancers:
  docker:
    name: instancer/docker-instancer
    options:
      apiUrl: http://tiny-instancer:1337
      authToken: <shared-secret>
```

When rCTF is outside the `rctf_network` Docker network, the host-mapped API URL is:

```yaml title="rctf.d/instancer.yaml"
instancers:
  docker:
    name: instancer/docker-instancer
    options:
      apiUrl: http://127.0.0.1:12237
      authToken: <shared-secret>
```

Traefik terminates TLS for every `<green>https</green>` and `<green>tcp-ssl</green>` endpoint. Each instance is served at `<hostPrefix>-<uid>.<INSTANCES_HOST>`, so a single wildcard certificate for `*.<INSTANCES_HOST>` covers every per-team instance. The static config (`conf/tls.yml{:file}`) points Traefik at two files in the mounted `certs/{:dir}` directory:

:::file-tree
- deploy/
  - docker-instancer/
    - certs/
      - fullchain.pem Certificate + intermediate chain
      - privkey.pem Private key
:::

Instance hostnames are one label deep, so the single-level wildcard is enough; you don't need to enumerate `<hostPrefix>` values. Generate the cert with any ACME client that supports a DNS-01 challenge (wildcards can't use HTTP-01). With Certbot:

```console
$ <red>certbot</red> certonly <dim>--manual</dim> <dim>--preferred-challenges</dim> dns <dim>-d</dim> <green>'*.instancer.example.com'</green>
```

Copy the issued files into the mount, matching the names Traefik expects:

```console
$ <red>cp</red> /etc/letsencrypt/live/instancer.example.com/fullchain.pem deploy/docker-instancer/certs/fullchain.pem
$ <red>cp</red> /etc/letsencrypt/live/instancer.example.com/privkey.pem deploy/docker-instancer/certs/privkey.pem
```

Traefik loads these at startup and doesn't watch the file config (`watch: false{:yaml}`), so restart the Traefik container after renewing or replacing the certificate.

### Docker daemon address pool

Every instanced challenge creates its own user-defined Docker network. Docker carves those networks out of the daemon's default address pool, which on a fresh install is only `172.17.0.0/16` plus a small chunk of `192.168.0.0/16`. That's enough for ~30 networks before `$ <red>docker</red> network create` starts failing with `could not find an available, non-overlapping IPv4 address pool`. For a production CTF this runs out fast.

Expand the pool by adding the following to `/etc/docker/daemon.json{:file}` on the instancer host:

```json title="/etc/docker/daemon.json"
{
  "default-address-pools": [
    {
      "base": "100.64.0.0/10",
      "size": 24
    }
  ]
}
```

This carves `100.64.0.0/10` (the CGNAT range, safe to use internally) into `/24` subnets, giving you **16384** Docker networks. That's enough for ~8192 concurrent instances in the worst case (each challenge typically creates two networks). Add more `default-address-pools` entries if you need still more room.

Restart Docker after editing the file (`$ <red>systemctl</red> restart docker`) so it picks up the new pool. Networks already created on the old pool keep working but stick with their original ranges.

## Docker challenge config

The Docker provider accepts a Docker Compose-like object under `<red>config</red>`:

```yaml title="challenge.yaml"
instancerConfig:
  challengeIntegrationId: web-demo
  timeoutMilliseconds: 600000
  extendable: true
  config:
    services:
      app:
        image: ghcr.io/example/web-demo:latest
        environment:
          FLAG: flag{example}
        networks:
          - internal
        expose:
          - '8080'
        read_only: true
        mem_limit: 128m
        cpus: 0.5
        pids_limit: 128
    networks:
      internal:
        internal: true
  expose:
    - kind: https
      hostPrefix: web-demo
      containerName: app
      containerPort: 8080
      title: Challenge
```

The top-level Docker config supports `<red>services</red>`, `<red>networks</red>`, and `<red>volumes</red>`. At least one service is required after defaults are applied.

Each service supports these field groups:

| Fields | Purpose |
| --- | --- |
| `<red>image</red>` | Docker image. This is required for each explicit service. |
| `<red>hostname</red>`, `<red>environment</red>`, `<red>command</red>`, `<red>entrypoint</red>`, `<red>working_dir</red>`, `<red>user</red>` | Process and runtime metadata. |
| `<red>networks</red>`, `<red>network_mode</red>`, `<red>dns</red>`, `<red>dns_opt</red>`, `<red>dns_search</red>`, `<red>extra_hosts</red>`, `<red>expose</red>` | Network configuration. |
| `<red>volumes</red>`, `<red>tmpfs</red>`, `<red>shm_size</red>`, `<red>read_only</red>` | Filesystem configuration. |
| `<red>privileged</red>`, `<red>security_opt</red>`, `<red>cap_add</red>`, `<red>cap_drop</red>` | Container privilege controls. |
| `<red>mem_limit</red>`, `<red>cpus</red>`, `<red>pids_limit</red>`, `<red>ulimits</red>`, `<red>sysctls</red>` | Resource and kernel limits. |
| `<red>healthcheck</red>`, `<red>labels</red>`, `<red>restart</red>` | Health, metadata, and restart behavior. |

Explicit services default to a read-only root filesystem, `<green>no-new-privileges</green>`, dropped Linux capabilities, `6m` memory, `1.0` CPU, `1024` PIDs, and `nofile` soft and hard limits of `1024`.

Services may only reference networks declared under `<red>config.networks</red>`. Named volume mounts may only reference volumes declared under `<red>config.volumes</red>`. Absolute and relative bind-style mount sources aren't checked against the volume map.

### Network isolation

Challenge workloads are untrusted, so a container is never attached to Docker's shared default bridge unless you ask for it. A service with no `<red>networks</red>`, no `<red>expose</red>`, and no `<red>network_mode</red>` runs detached (`<red>network_mode: none</red>`) rather than on the default bridge. That's what the default config does. When a challenge's services need to talk to each other, declare an internal user-defined network (`<red>internal: true</red>`, as in the example above) and list it under each service's `<red>networks</red>`. That network keeps them off the host and the internet while still connecting them. Set a service's `<red>network_mode</red>` to `<red>bridge</red>` only when you want it on the host's default bridge.
