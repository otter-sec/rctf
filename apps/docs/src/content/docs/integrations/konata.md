---
title: Konata
description: CLI tool and CI actions for syncing CTF challenges to rCTF, building images, and rolling out Kubernetes manifests.
order: 5
---

[Konata](https://github.com/project-sekai-ctf/konata) is a CTF challenge-management tool, invoked as `$ <red>kona</red>` on the command line. It walks a repository of challenge directories, builds and pushes Docker images, applies Kubernetes manifests, and syncs the resulting challenge metadata to rCTF (and CTFd, when configured).

The whole workflow is driven by a single root `kona.yaml{:file}` or `kona.yml{:file}` for global settings, plus a per-challenge `kona.yaml{:file}` or `kona.yml{:file}` in each challenge directory.

This page covers Konata as it relates to rCTF. For the upstream tool and source, check the [Konata repository](https://github.com/project-sekai-ctf/konata).

:::note[Pre-1.0 status]
Konata is pre-1.0. The schema is settled enough that we've used it to run public CTFs end-to-end, but breaking changes are still on the table until 1.0.
:::

## Install

Konata is published on PyPI:

```console
$ <red>pip</red> install konata
$ <red>kona</red> <dim>--help</dim>
```

Python 3.12 or newer is required. The `$ <red>kona</red>` binary exposes two commands. The `sync` command is the main workflow, and `compress` is a helper for packaging attachment folders ahead of time.

## Repository layout

Konata assumes a directory tree with one root config at `kona.yaml{:file}` or `kona.yml{:file}` and one config per challenge somewhere underneath. The challenge folder structure itself is arbitrary. Konata walks up to `<red>discovery.challenge_folder_depth</red>` levels deep (default `3{:ts}`), looking for files named `kona.yaml{:file}` or `kona.yml{:file}`.

A typical layout (taken from the SekaiCTF 2026 challenge repository):

:::file-tree
- sekaictf-2026/
  - **kona.yaml** Global config
  - web/
    - migurimental/
      - kona.yml Per-challenge config
      - challenge/
      - solution/
  - game/
    - minions-in-16k/
      - kona.yaml Per-challenge config
      - challenge/
      - dist/
  - misc/
    - survey/
      - kona.yaml Per-challenge config
:::

## Global config

The root `kona.yaml{:file}` configures credentials, clusters, registries, and shared template overrides. Everything below is optional. A minimum config just needs an `<red>rctf</red>` block.

```yaml title="kona.yaml"
secrets:
  token:
    env: RCTF_TOKEN
  minions-queue-secret:
    env: MINIONS_QUEUE_SECRET
  minions-rctf-secret:
    env: MINIONS_RCTF_SECRET
  ppfarming-api-ip:
    env: PPFARMING_API_IP

clusters:
  prod:
    gcloud:
      clusterName: sekaictf-infra
      project: sekaictf-500215
      zone: europe-west1-b
  instancer:
    gcloud:
      clusterName: instancer-cluster
      project: sekaictf-500215
      zone: europe-west1
  main:
    aliasTo: prod

registries:
  challenges: europe-west1-docker.pkg.dev/sekaictf-500215/sekaictf
  instancer-challenges: europe-west1-docker.pkg.dev/sekaictf-500215/challenge-registry

domains:
  static: chals.sekai.team
  instancer: instancer.sekai.team

rctf:
  baseUrl: 'https://ctf.sekai.team'
  teamToken:
    secret: token

templates:
  challengeDescription: |
    {{ challenge.description }}

    {{ endpoints_rendered.strip() }}
```

### `secrets`

Named references that the rest of the config can pull from. Each entry must specify exactly one of:

| Field | Behavior |
| --- | --- |
| `<red>value</red>` | Inline literal. Useful for non-secret values you still want to centralize. |
| `<red>file_path</red>` | Path read from disk at load time. Relative paths resolve against the directory containing the root `kona.yml{:file}`. |
| `<red>env</red>` | Read from the environment. Konata fails fast if the variable is unset. |

The reference is then used wherever the schema accepts a `<red>secret</red>` or `<red>value</red>` field:

```yaml
rctf:
  team_token:
    secret: token # resolves to secrets.token
```

### `rctf`

rCTF API credentials. Konata calls into rCTF over the public admin API.

| Field | Purpose |
| --- | --- |
| `<red>base_url</red>` | Public origin of the rCTF instance (no trailing slash). |
| `<red>team_token</red>` | Admin team token. Accepts either `<red>secret: <name></red>` or `<red>value: <literal></red>`. |
| `<red>extra_headers</red>` | Optional headers added to every request. Useful for a deploy-token gate at the reverse proxy. |

A `<red>ctfd</red>` block with the same shape exists for CTFd deployments, and both can coexist if you mirror the same challenge repo to multiple platforms.

### `clusters`

Named Kubernetes clusters that challenge `<red>kubernetesManifests</red>` / `<red>kubernetesInlineManifests</red>` deployments target. Each entry picks exactly one auth backend:

| Backend | Use when |
| --- | --- |
| `<red>gcloud</red>` | Targeting GKE. Konata runs `$ <red>gcloud</red> container clusters get-credentials` under the hood, so the workflow needs a logged-in `$ <red>gcloud</red>` and the `gke-gcloud-auth-plugin`. |
| `<red>kind</red>` | Local Kind cluster. `<red>clusterName</red>` / `<red>cluster_name</red>` defaults to `<green>kind</green>`. |
| `<red>kubeconfig</red>` | Inline kubeconfig pulled from a `<red>secret</red>` or `<red>value</red>`. |
| `<red>use_default: true</red>` | Use `$KUBECONFIG` or `~/.kube/config{:file}` from the host (the default). |
| `<red>incluster: true</red>` | Use the in-pod service-account credentials when Konata itself runs inside the cluster. |

`<red>alias_to</red>` / `<red>aliasTo</red>` lets a challenge reference one cluster name while routing to another. The SekaiCTF example uses this so per-challenge configs say `<red>clusterName: main</red>`, while the operator swaps `main => prod` at the root level.

### `registries`

Aliases for container registry prefixes. A challenge's `<red>deployment.images[].registryName</red>` / `<red>registry_name</red>` looks up an entry here, then prepends the resolved value to the image name. Splitting registries (one for static-hosted images, one for instancer images) is common when shared challenge workloads and the rCTF instancer live in different registries or clusters.

### `domains`

Free-form key/value map of domain names available to the Jinja templates inside challenge configs (`{{ config.domains['static'] }}` in the examples). Keeps the deploy domain out of every per-challenge config.

### `templates`

Overrides for the rendered challenge description and endpoint block. The defaults wrap the description with a connection-info section followed by `**Author**: ...`. Overrides are Jinja2 templates with `<red>challenge</red>`, `<red>config</red>`, and `<red>models</red>` available.

| Field | Purpose |
| --- | --- |
| `<red>challenge_description</red>` | Top-level description template. Receives `<red>endpoints_rendered</red>` already filled in by the per-provider endpoints template. |
| `<red>endpoints_text.rctf</red>` | Endpoints template used when syncing to rCTF. The default renders a `> [!CONNECTION]{:md}` callout, which the rCTF frontend turns into a styled connection-info box. |
| `<red>endpoints_text.ctfd</red>` | Endpoints template used when syncing to CTFd. The default is plain `socat`/`nc`/`ncat --ssl`/`http(s)` lines. |
| `<red>ctfd_attribution</red>` | Suffix appended to the description on CTFd syncs (defaults to `**Author**: {{ challenge.author }}`). |

Endpoint templates are separate because rCTF and CTFd format connection details differently. You can override either provider without replacing the other one's default.

```yaml
templates:
  endpoints_text:
    rctf: |
      {% for endpoint in challenge.endpoints %}
      ...your override...
      {% endfor %}
```

### `discovery`

Top-level discovery options.

| Field | Default | Purpose |
| --- | --- | --- |
| `<red>challenge_folder_depth</red>` | `3{:ts}` | Max depth from root when scanning for `kona.yml{:file}` / `kona.yaml{:file}`. |
| `<red>attachment_analysis_depth</red>` | `50{:ts}` | Per-challenge cap when walking attachment file lists. |
| `<red>klodd_domain</red>` | - | Klodd domain when using the [Klodd](https://github.com/redpwn/klodd) integration. |
| `<red>klodd_endpoint_name</red>` | - | Klodd endpoint identifier. |

### `attachment_format`

`<green>tar_gz</green>` (default), `<green>zip</green>`, or `<green>7z</green>`. Picks the archive format Konata uses when bundling attachment files for upload. Password-protected generated archives always use `<green>7z</green>`, regardless of this setting.

### `attachment_wrap_dir`

`true{:ts}` (default) or `false{:ts}`. When on, every archive entry is nested under a top-level `<red><archive_name or challenge_id>/</red>` directory, so unpacking the download drops files into one named folder instead of the current directory. Set it to `false{:ts}` to write entries at the archive root.

## Per-challenge config

Each challenge directory has a `kona.yml{:file}` (or `kona.yaml{:file}`) that declares one or more challenges plus an optional `<red>deployment</red>` block. The simplest static challenge needs nothing but a category, name, author, description, and flag:

```yaml title="misc/survey/kona.yaml"
challenges:
  - category: misc
    name: Survey
    author: SekaiCTF
    releaseTime: '2026-06-28T20:00:00Z'
    description: |
      This year we tried many new things compared to previous iterations, and we would love your feedback

      [https://forms.gle/KdEuEWyUxeX5CEe26](https://forms.gle/KdEuEWyUxeX5CEe26)
    tags:
      - SEKAI
    flags:
      rctf: 'SEKAI{thx_4_play1ng_sekaictf_2026!}'
    scoring:
      initialValue: 39
      minimumValue: 39
      rctf:
        eligibleForTiebreaks: false
```

`<red>discovery.skip: true</red>` opts the directory out of discovery, which is useful when the file is committed but the challenge isn't ready to deploy yet.

### Challenge fields

| Field | Purpose |
| --- | --- |
| `<red>category</red>` | Challenge category. Combined with `<red>name</red>` to form the default challenge ID. |
| `<red>name</red>` | Challenge name. Becomes the slug under which Konata syncs it. |
| `<red>author</red>` | Rendered into the default description template. |
| `<red>description</red>` | Markdown description. Trimmed of leading/trailing whitespace before rendering. |
| `<red>override_id</red>` | Replaces the default `<red><category>_<name></red>` challenge ID. Useful when renaming a challenge without breaking already-recorded solves. |
| `<red>tags</red>` | Free-form label list synced to both rCTF and CTFd. |
| `<red>attachments</red>` | File list or full `<red>AttachmentConfig</red>`. See below. |
| `<red>scoring</red>` | Initial / minimum point values plus per-platform overrides (`<red>scoring.rctf.eligibleForTiebreaks</red>`, `<red>scoring.ctfd.decay</red>`, ...). |
| `<red>flags</red>` | Per-platform flags. `<red>flags.rctf</red>` is either a literal string or `<red>{ file: <path> }</red>` / `<red>{ strContent: <value> }</red>`. |
| `<red>endpoints</red>` | Static endpoints (host/port) rendered into the description by the endpoints template. |
| `<red>hidden</red>` | When `true{:ts}`, the challenge is uploaded but not released. |
| `<red>releaseTime</red>` / `<red>release_time</red>` | Optional datetime for delayed release. |
| `<red>sortWeight</red>` / `<red>sort_weight</red>` | Numeric sort hint passed through to rCTF. |
| `<red>instancerConfig</red>` / `<red>instancer_config</red>` | rCTF instancer config (see [Instancer](/integrations/instancer)) |
| `<red>adminBot</red>` / `<red>admin_bot</red>` | Admin-bot challenge source for the rCTF [admin bot](/integrations/admin-bot). See [Admin bot](#admin-bot). |

### Release scheduling

Use `<red>releaseTime</red>` / `<red>release_time</red>` when a challenge should be uploaded ahead of time but hidden from participants until a specific moment:

```yaml
challenges:
  - category: crypto
    name: needLe in a multivariate sekai
    author: sceleri
    releaseTime: 2026-06-27T08:00:00Z
    flags:
      rctf: SEKAI{example}
```

Konata accepts a datetime value and sends it to rCTF as `<red>releaseTime</red>` in Unix milliseconds. Prefer timezone-aware timestamps such as `<green>2026-02-07T18:00:00Z</green>`; naive datetimes are treated as UTC.

### Scoring

By default, Konata creates regular rCTF decay challenges and sets their point range from `<red>scoring.initialValue</red>` / `<red>initial_value</red>` and `<red>scoring.minimumValue</red>` / `<red>minimum_value</red>`. The rCTF-specific block also controls tiebreak eligibility:

```yaml
scoring:
  initialValue: 500
  minimumValue: 50
  rctf:
    eligibleForTiebreaks: true
```

For rCTF [dynamic scoring](/admin/scoring), set `<red>scoring.rctf.kind</red>` to `<green>dynamic</green>` and provide a webhook secret. The secret accepts the same `<red>secret</red>` / `<red>value</red>` shape used elsewhere in Konata:

```yaml title="kona.yaml"
secrets:
  minions-rctf-secret:
    env: MINIONS_RCTF_SECRET
```

```yaml title="game/minions-in-16k/kona.yaml"
challenges:
  - overrideId: game_minions-in-16k
    category: game
    name: Minions in 16k
    author: mixy1
    scoring:
      rctf:
        kind: dynamic
        dynamic:
          secret:
            secret: minions-rctf-secret
```

`<red>transport</red>` currently defaults to `<green>webhook</green>`. The resolved secret becomes the rCTF dynamic-scoring webhook secret used to authenticate score submissions to `<route>POST /api/v2/challs/:id/scores</route>`; see [Submit dynamic scores](/api/challenges/submit-dynamic-scores) for the wire format.

### Attachments

Three forms are accepted:

A bare list:

```yaml
attachments:
  - dist/bzImage
  - dist/initramfs.cpio.gz
```

A full `<red>AttachmentConfig</red>`:

```yaml
attachments:
  files:
    - 'challenge/'
  exclude:
    - 'challenge/flag.txt'
  stripComponents: 1
  additional:
    - path: flag.txt
      strContent: 'SEKAI{dummy_flag}'
  preCompressed:
    - dist/handout.tar.gz
```

| Field | Purpose |
| --- | --- |
| `<red>files</red>` | Files relative to the challenge directory. Directory entries (`chall/src/{:dir}`) recurse into all files underneath. |
| `<red>exclude</red>` | Globs filtered out of the resolved file list before archiving. |
| `<red>additional</red>` | Synthetic files injected into the archive. Each entry specifies `<red>path</red>` plus exactly one of `<red>strContent</red>` / `<red>str</red>` or `<red>base64Content</red>` / `<red>base64</red>`. A typical use is shipping a dummy flag file so the build still works. |
| `<red>preCompressed</red>` / `<red>pre_compressed</red>` | Archives that are uploaded as-is instead of being repacked. The challenge page shows them under their original filenames. |
| `<red>archiveName</red>` / `<red>archive_name</red>` | Base name for the generated archive (and the wrap directory when `<red>attachmentWrapDir</red>` / `<red>attachment_wrap_dir</red>` is on). Defaults to the challenge ID. Characters illegal in filenames are replaced with `_`. |
| `<red>stripComponents</red>` / `<red>strip_components</red>` | Number of leading path components to drop from each entry's archive path, like `$ <red>tar</red> <dim>--strip-components</dim>`. Defaults to `0{:ts}`. Use it to flatten a nested `dist/` or `handout/` prefix out of the downloaded archive. |
| `<red>password</red>` | Encrypts the generated archive with AES-256 behind this password. Setting a password forces the `<green>7z</green>` format regardless of `<red>attachmentFormat</red>` / `<red>attachment_format</red>`. Does not apply to `<red>preCompressed</red>` archives, which are uploaded as-is. |

:::note[Attachment matching is strict]
A `<red>files</red>` glob that matches nothing, a named file that doesn't exist, or a missing `<red>preCompressed</red>` archive now fails the sync instead of being silently skipped. Fix the path or drop the entry.
:::

### Flags

`<red>flags</red>` is a per-platform map. Each platform has its own shape, where rCTF accepts exactly one flag and CTFd accepts a list. Inside each platform, a flag value can be an inline literal string, `<red>{ str: ... }</red>` / `<red>{ strContent: ... }</red>`, or `<red>{ file: ... }</red>` (read at sync time, with the path resolved relative to the challenge directory).

```yaml
# rCTF flag, inline literal. This form is the most common.
flags:
  rctf: SEKAI{example}

# rCTF flag, explicit str form. Equivalent to the inline literal above.
flags:
  rctf:
    str: SEKAI{example}

# rCTF flag, read from a file. Pairs well with an `additional` attachment that ships a dummy flag.txt
# (see Attachments) so the build context stays self-contained.
flags:
  rctf:
    file: flag.txt
```

| Field | Type | Notes |
| --- | --- | --- |
| `<red>flags.rctf</red>` | `string{:ts}` \| `{ str }{:ts}` \| `{ strContent }{:ts}` \| `{ file }{:ts}` | Single flag synced to rCTF. |
| `<red>flags.ctfd[]</red>` | list | Multiple flags synced to CTFd. |
| `<red>flags.ctfd[].type</red>` | `string{:ts}` | CTFd flag type. Defaults to `<green>static</green>`. Pass `<green>regex</green>` for regex flags. |
| `<red>flags.ctfd[].flag</red>` | `string{:ts}` \| `{ str }{:ts}` \| `{ strContent }{:ts}` \| `{ file }{:ts}` | Flag value. Same forms as `<red>flags.rctf</red>`. |

### Endpoints

Static-hosting deployments declare `<red>endpoints</red>` so Konata can render connection info into the description. Each entry has a `<red>type</red>` (one of `<green>http</green>`, `<green>https</green>`, `<green>socat</green>`, `<green>nc</green>`, `<green>ncat-ssl</green>`), an `<red>endpoint</red>` host, and an optional `<red>port</red>`. Jinja templating works on `<red>endpoint</red>`, so the host can be built from the challenge name and the global `<red>domains</red>` map:

```yaml
endpoints:
  - type: nc
    endpoint: "{{ challenge.name | lower }}.{{ config.domains['static'] }}"
    port: 1337
```

### Deployment

`<red>deployment</red>` declares what Konata should build and what manifests to apply on top of the challenge sync. Both blocks are optional, so a static challenge with just a flag and an attachment skips deployment entirely.

#### Building images

```yaml
deployment:
  images:
    - path: challenge
      dockerfile: deploy/sandbox/rootless.Containerfile # optional, defaults to <path>/Dockerfile
      name: minions
      tag: latest
      registryName: instancer-challenges
      platform: linux/amd64
      buildArgs:
        ENV: prod
      noCache: false
      exports:
        - stage: out
          src: /out
          dst: ./handout
```

| Field | Purpose |
| --- | --- |
| `<red>path</red>` (alias `<red>buildContext</red>` / `<red>build_context</red>`) | Build-context directory relative to the challenge folder. |
| `<red>dockerfile</red>` | Path to a non-default Dockerfile. |
| `<red>name</red>`, `<red>tag</red>` | Image name and tag. The published image is `<registries[registryName]>/<name>:<tag>`. |
| `<red>registryName</red>` / `<red>registry_name</red>` | Lookup key into the root-level `<red>registries</red>` map. |
| `<red>platform</red>` | Optional target platform. `linux/amd64` is the common choice for CTF builds. |
| `<red>buildArgs</red>` / `<red>build_args</red>` | Build-time `<dim>--build-arg</dim>` values. |
| `<red>noCache</red>` / `<red>no_cache</red>` | Forces a clean build when `true{:ts}`. |
| `<red>exports</red>` | Multi-stage build exports. Copies the contents of `<red>src</red>` in a named stage out to `<red>dst</red>` on the host. Used for shipping handouts that fall out of the build. |

Image references inside Kubernetes manifests can interpolate `{{ images[challenge.name] }}` to pull in the fully-resolved `registry/name:tag` for the current challenge.

#### Kubernetes manifests

Two equivalent forms:

```yaml
deployment:
  kubernetesManifests:
    - paths:
        - manifests/deployment.yaml
        - manifests/service.yaml
      clusterName: main
      rolloutRestart:
        image: true
```

…or inline documents:

```yaml
deployment:
  kubernetesInlineManifests:
    - clusterName: main
      documents:
        - apiVersion: v1
          kind: Namespace
          metadata:
            name: 67-hunt
        - apiVersion: sctf.es3n1n.io/v1alpha1
          kind: Challenge
          metadata:
            name: 67-hunt
            namespace: 67-hunt
          spec:
            releaseTime: "2026-06-27T08:00:00Z"
            pods:
              - name: challenge
                replicas: 2
                spec:
                  containers:
                    - name: challenge
                      image: "{{ images['67-hunt'] }}"
                      ports:
                        - containerPort: 8080
                      resources:
                        requests: { cpu: 50m, memory: 32Mi }
                        limits: { cpu: 500m, memory: 128Mi }
                      securityContext:
                        runAsNonRoot: true
                        allowPrivilegeEscalation: false
                        capabilities:
                          drop: ["ALL"]
                exposed:
                  - protocol: HTTPS
                    subdomain: 67-hunt
                    targetPort: 8080
```

| Field | Purpose |
| --- | --- |
| `<red>clusterName</red>` / `<red>cluster_name</red>` | Cluster from the root `<red>clusters</red>` map (or an `<red>aliasTo</red>` / `<red>alias_to</red>`) to apply against. |
| `<red>paths</red>` / `<red>documents</red>` | YAML files on disk or inline objects. Both render as Jinja templates with `<red>challenge</red>`, `<red>challenges</red>`, `<red>images</red>`, and `<red>config</red>` available. |
| `<red>rolloutRestart.image</red>` / `<red>rollout_restart.image</red>` | When `true{:ts}` (the default), triggers a rollout restart of the matching Deployment whenever the resolved image digest changes. |
| `<red>rolloutRestart.annotationPath</red>` / `<red>rollout_restart.annotation_path</red>` | Optional JSON-path-style hook for restarting on annotation changes. |

### Instanced challenges

For challenges using the rCTF instancer, add `<red>instancerConfig</red>` / `<red>instancer_config</red>`. The schema mirrors the [rCTF instancer config](/integrations/instancer#challenge-configuration). The outer envelope is the same across providers, and only the inner `<red>config</red>` differs (Docker Compose-like for docker-instancer, `<red>pods[]</red>` for k8s-instancer). The whole Konata schema accepts both `snake_case` and `camelCase` keys.

```yaml title="misc/pwnable-document-fabricator/kona.yaml"
challenges:
  - category: misc
    name: pwnable document fabricator
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
                    allowPrivilegeEscalation: false
                    readOnlyRootFilesystem: true
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

The instanced flow only needs pod definitions. The rCTF instancer's k8s-operator handles namespaces, services, network policies, and ingress at runtime, so no `<red>kubernetesInlineManifests</red>` block is required.

`<red>instancerConfig.instancer</red>` names which configured rCTF instancer the challenge runs on, matching a key in rCTF's `<red>instancers</red>` map. Omit it to fall back to rCTF's `<red>defaultInstancer</red>`. See [Instancer](/integrations/instancer#provider-configuration) for the deployment-side setup.

### Admin bot

Web challenges that use the rCTF [admin bot](/integrations/admin-bot) declare their bot source under `<red>adminBot</red>` / `<red>admin_bot</red>`. Konata uploads the source as the challenge's `<red>adminBotConfig</red>`, and rCTF parses it server-side to derive the bot's inputs, timeout, and revision, so nothing else needs configuring here.

Provide exactly one of `<red>code</red>` (inline source) or `<red>file</red>` (path relative to the challenge directory):

```yaml title="web/lt_w/kona.yaml"
challenges:
  - category: web
    name: '&lt;\w+'
    author: claustra01
    adminBot:
      code: |
        import { Challenge } from '../src/types'

        const APP_HOST = '{{"ltw." + config.domains['static']}}'
        const APP_URL = `https://${APP_HOST}`

        export const challenge = new Challenge({
          timeoutMilliseconds: 30_000,
          inputs: {
            id: {
              pattern: '^[0-9a-fA-F-]{36}$',
            },
          },
          browser: 'chrome',
          restrictDomains: {
            host: {
              allowRegex: [{ pattern: '^{{("ltw." + config.domains['static']) | re_escape}}$' }],
              disallowRegex: [{ pattern: '.*' }],
            },
          },
        })
```

```yaml
# Inline form
adminBot:
  code: |
    // hello
```

| Field | Purpose |
| --- | --- |
| `<red>code</red>` | Inline admin-bot source. Rendered as a Jinja2 template with the same `<red>challenge</red>`, `<red>config</red>`, `<red>images</red>`, and `<red>models</red>` context as descriptions and manifests. |
| `<red>file</red>` | Path to a source file, read at sync time and resolved relative to the challenge directory. Mutually exclusive with `<red>code</red>`. |

:::note[`re_escape` filter]
Konata's Jinja2 environment exposes a `<red>re_escape</red>` filter (`{{ value | re_escape }}`) for safely embedding a templated value into a regex, which is handy in admin-bot source and endpoint templates.
:::

## CLI

### `kona sync`

The main entry point. Walks the deploy directory, builds and pushes any declared images, applies Kubernetes manifests, then syncs challenge metadata to every configured platform.

```console
$ <red>kona</red> sync <dim>-d</dim> ./ctf-challenges
```

| Flag | Behavior |
| --- | --- |
| `<dim>-d</dim>`, `<dim>--deploy-directory</dim>` | Root of the deploy repo (the folder containing the root `kona.yml{:file}`). Defaults to the current directory (`.`). |
| `<dim>--only</dim> <name>` | Repeatable. Restricts the run to specific challenge folder names. Discovery still walks the tree, and non-matching challenges are skipped. |
| `<dim>--challenge-path</dim> <path>` | Repeatable. Direct paths to challenge directories, bypassing discovery entirely. The CI integration uses this to scope each matrix shard to one challenge. |

### `kona compress`

Helper for producing an attachment archive from a folder or file. Useful when you want to commit a pre-built handout and reference it through `<red>attachments.preCompressed</red>`.

```console
$ <red>kona</red> compress ./challenge/dist <dim>--format</dim> zip <dim>--output</dim> handout.zip
$ <red>kona</red> compress ./challenge/dist <dim>--password</dim> "$FLAG" <dim>--output</dim> handout.7z
```

| Flag | Behavior |
| --- | --- |
| `path` (positional) | Source file or directory. |
| `<dim>-f</dim>`, `<dim>--format</dim>` | `<green>tar_gz</green>` (default), `<green>zip</green>`, or `<green>7z</green>`. |
| `<dim>-o</dim>`, `<dim>--output</dim>` | Output path. Defaults to `<src>.{tar.gz,zip,7z}` in the current directory, based on the selected or forced archive format. |
| `<dim>-p</dim>`, `<dim>--password</dim>` | Encrypts the archive. Passing a password forces `<green>7z</green>` output, even when `<dim>--format</dim>` is `<green>tar_gz</green>` or `<green>zip</green>`. |

Generated archives are deterministic. Konata normalizes file metadata and entry order, so the same inputs produce the same archive bytes across machines and runs. It applies the same rules to attachments built during `sync`.

## CI integration

The [`project-sekai-ctf/konata-deploy-action`](https://github.com/project-sekai-ctf/konata-deploy-action) GitHub Action exposes two subactions. The `detect` action walks the repository and emits a matrix of changed challenges, and `sync` runs `$ <red>kona</red> sync <dim>--challenge-path</dim> <one>` for one matrix shard. Together they restrict each push to redeploying only the challenges that changed.

The SekaiCTF 2026 workflow is a good reference:

```yaml title=".github/workflows/sync.yaml"
name: Deploy challenges

on:
  push:
    branches: [main]

permissions:
  contents: read
  id-token: write

jobs:
  detect:
    runs-on: ubuntu-latest
    outputs:
      matrix: ${{ steps.detect.outputs.matrix }}
      should_sync: ${{ steps.detect.outputs.should-sync }}
    steps:
      - uses: actions/checkout@v6
      - uses: project-sekai-ctf/konata-deploy-action/detect@main
        id: detect

  sync:
    needs: detect
    if: needs.detect.outputs.should_sync == 'true'
    runs-on: ubuntu-latest
    env:
      USE_GKE_GCLOUD_AUTH_PLUGIN: "True"
    strategy:
      matrix:
        challenge: ${{ fromJson(needs.detect.outputs.matrix) }}
      fail-fast: false
    steps:
      - uses: actions/checkout@v6

      - name: Authenticate to Google Cloud
        uses: google-github-actions/auth@v3
        with:
          project_id: sekaictf-500215
          workload_identity_provider: ${{ secrets.WORKLOAD_IDENTITY_PROVIDER }}
          service_account: ${{ secrets.SERVICE_ACCOUNT }}

      - name: Activate Google Cloud SDK credentials
        run: |
          gcloud auth login --brief --cred-file="${GOOGLE_GHA_CREDS_PATH}"
          gcloud config set project sekaictf-500215

      - name: Install gke-gcloud-auth-plugin
        run: |
          curl -fsSL https://packages.cloud.google.com/apt/doc/apt-key.gpg | sudo gpg --batch --dearmor -o /usr/share/keyrings/cloud.google.gpg
          echo "deb [signed-by=/usr/share/keyrings/cloud.google.gpg] https://packages.cloud.google.com/apt cloud-sdk main" | sudo tee /etc/apt/sources.list.d/google-cloud-sdk.list > /dev/null
          sudo apt-get update -o Dir::Etc::sourcelist=/etc/apt/sources.list.d/google-cloud-sdk.list -o Dir::Etc::sourceparts="-"
          sudo apt-get install -yq --no-install-recommends google-cloud-cli-gke-gcloud-auth-plugin

      - name: Configure Docker for Artifact Registry
        run: gcloud auth configure-docker europe-west1-docker.pkg.dev,us-central1-docker.pkg.dev --quiet

      - uses: docker/setup-qemu-action@v3
        with:
          platforms: arm64

      - uses: project-sekai-ctf/konata-deploy-action/sync@main
        with:
          challenge-path: ${{ matrix.challenge }}
        env:
          RCTF_TOKEN: ${{ secrets.RCTF_TOKEN }}
          MINIONS_QUEUE_SECRET: ${{ secrets.MINIONS_QUEUE_SECRET }}
          MINIONS_RCTF_SECRET: ${{ secrets.MINIONS_RCTF_SECRET }}
          MINIONS_RCTF_API_GSA: ${{ secrets.MINIONS_RCTF_API_GSA }}
          MINIONS_RCTF_API_IP: ${{ secrets.MINIONS_RCTF_API_IP }}
          MINIONS_K8S_INSTANCER_API_URL: ${{ secrets.MINIONS_K8S_INSTANCER_API_URL }}
          MINIONS_K8S_INSTANCER_AUTH_TOKEN: ${{ secrets.MINIONS_K8S_INSTANCER_AUTH_TOKEN }}
          MINIONS_K8S_INSTANCER_CA_CERTIFICATE: ${{ secrets.MINIONS_K8S_INSTANCER_CA_CERTIFICATE }}
          MINIONS_GCS_BUCKET: ${{ secrets.MINIONS_GCS_BUCKET }}
          PPFARMING_API_IP: ${{ secrets.PPFARMING_API_IP }}
          PPFARMING_API_TOKEN: ${{ secrets.PPFARMING_API_TOKEN }}
          PPFARMING2_API_IP: ${{ secrets.PPFARMING2_API_IP }}
          PPFARMING2_API_TOKEN: ${{ secrets.PPFARMING2_API_TOKEN }}
```

Notable bits:

- **Workload Identity Federation** is preferred over a long-lived JSON key. The `id-token: write{:yml}` permission is what makes `google-github-actions/auth@v3` work with WIF.
- **`$ <red>gcloud</red> auth configure-docker`** is needed for every Artifact Registry host the matrix shard might push to.
- **`<yellow>docker/setup-qemu-action</yellow>`** is only needed when some challenge builds target non-native platforms such as arm64.
- **`<yellow>RCTF_TOKEN</yellow>`** is the admin team token referenced by the root `kona.yaml{:file}` (`secrets.token.env: RCTF_TOKEN{:yml}`). Extra env vars map to other root-level `<red>secrets</red>` entries.

## Real-world reference

The [SekaiCTF 2026 challenges](https://github.com/project-sekai-ctf/sekaictf-2026) repository is the most complete current Konata + rCTF deployment reference. It covers static-hosted Kubernetes challenges, k8s-instancer challenges, custom instancer providers, dynamic scoring, file-backed flags, dummy-flag injection via `<red>additional</red>` attachments, multi-cluster registries, and the change-detected CI matrix.
