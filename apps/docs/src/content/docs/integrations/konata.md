---
title: Konata
description: CLI tool and CI actions for syncing CTF challenges to rCTF, building images, and rolling out Kubernetes manifests.
order: 5
---

[Konata](https://github.com/project-sekai-ctf/konata) deploys challenges from a repository. The `$ <red>kona</red>` command can package attachments, build and push images, apply Kubernetes manifests, and update rCTF or CTFd.

One root `kona.yaml{:file}` holds shared settings. Each challenge directory has its own `kona.yaml{:file}` with the challenge metadata and deployment instructions.

This page covers Konata as it relates to rCTF. For the upstream tool and source, check the [Konata repository](https://github.com/project-sekai-ctf/konata).

:::note[Pre-1.0 status]
Konata has been used for public events, but it is still pre-1.0 and its configuration may change incompatibly before the 1.0 release.
:::

## Install

Konata is published on PyPI:

```ansi
$ <red>pip</red> install konata
$ <red>kona</red> <dim>--help</dim>
```

Konata requires Python 3.12 or newer. Use `sync` to deploy challenges and `compress` to create attachment archives separately.

## Repository layout

The root and per-challenge files can use either the `.yaml` or `.yml` extension. Challenge directories can be arranged however you like. Konata searches to `<red>discovery.challenge_folder_depth</red>`, which defaults to three levels below the root.

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

The root config contains credentials and any shared clusters, registries, domains, or templates. Only the `<red>rctf</red>` block is required for an rCTF-only setup.

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

### `<red>secrets</red>`

The `<red>secrets</red>` map gives sensitive or repeated values a name. Each entry uses exactly one source:

| Field | Behavior |
| --- | --- |
| `<red>value</red>` | Inline literal. Useful for non-secret values you still want to centralize. |
| `<red>file_path</red>` | Path read from disk at load time. Relative paths resolve against the directory containing the root `kona.yml{:file}`. |
| `<red>env</red>` | Read from the environment. Konata fails fast if the variable is unset. |

Use the name anywhere a field accepts `<red>secret</red>`:

```yaml
rctf:
  team_token:
    secret: token # resolves to secrets.token
```

### `<red>rctf</red>`

rCTF API credentials. Konata calls into rCTF over the public admin API.

| Field | Purpose |
| --- | --- |
| `<red>base_url</red>` | Public origin of the rCTF instance (no trailing slash). |
| `<red>team_token</red>` | Admin team token. Accepts either `<red>secret: <name></red>` or `<red>value: <literal></red>`. |
| `<red>extra_headers</red>` | Optional headers added to every request. Useful for a deploy-token gate at the reverse proxy. |

A `<red>ctfd</red>` block with the same structure is available for CTFd deployments. Both blocks can be used together when the same challenge repository is deployed to multiple platforms.

### `<red>clusters</red>`

Named Kubernetes clusters that challenge `<red>kubernetesManifests</red>` / `<red>kubernetesInlineManifests</red>` deployments target. Each entry picks exactly one auth backend:

| Backend | Use when |
| --- | --- |
| `<red>gcloud</red>` | Required for GKE. Konata runs `$ <red>gcloud</red> container clusters get-credentials`, so the workflow needs an authenticated `$ <red>gcloud</red>` session and the `gke-gcloud-auth-plugin`. |
| `<red>kind</red>` | Local Kind cluster. `<red>clusterName</red>` / `<red>cluster_name</red>` defaults to `<green>kind</green>`. |
| `<red>kubeconfig</red>` | Inline kubeconfig pulled from a `<red>secret</red>` or `<red>value</red>`. |
| `<red>use_default: true</red>` | Use `<yellow>$KUBECONFIG</yellow>` or `~/.kube/config{:file}` from the host (the default). |
| `<red>incluster: true</red>` | Use the in-pod service-account credentials when Konata itself runs inside the cluster. |

`<red>alias_to</red>` / `<red>aliasTo</red>` redirects one cluster name to another. This lets challenge files target a stable name such as `<red>main</red>` while the root config decides which cluster that means.

### `<red>registries</red>`

The `<red>registries</red>` map names container registry prefixes. An image selects one with `<red>registryName</red>` / `<red>registry_name</red>`, and Konata prepends the mapped prefix to the image name. Separate entries are useful when shared and instanced challenges publish to different registries.

### `<red>domains</red>`

The `<red>domains</red>` map makes hostnames available to Jinja templates, for example `{{ config.domains['static'] }}`. Changing a deployment domain then requires one root edit instead of changes to every challenge.

### `<red>templates</red>`

Templates control the final challenge description and connection block. They use Jinja2 and can read `<red>challenge</red>`, `<red>config</red>`, and `<red>models</red>`.

| Field | Purpose |
| --- | --- |
| `<red>challenge_description</red>` | Top-level description template. Receives `<red>endpoints_rendered</red>` already filled in by the per-provider endpoints template. |
| `<red>endpoints_text.rctf</red>` | Endpoints template used when syncing to rCTF. The default renders a `> [!CONNECTION]{:md}` callout, which the rCTF frontend turns into a styled connection-info box. |
| `<red>endpoints_text.ctfd</red>` | Endpoints template used when syncing to CTFd. The default is plain `socat`/`nc`/`ncat --ssl`/`http(s)` lines. |
| `<red>ctfd_attribution</red>` | Suffix appended to the description on CTFd syncs (defaults to `**Author**: {{ challenge.author }}`). |

rCTF and CTFd have separate endpoint templates, so either format can be changed independently.

```yaml
templates:
  endpoints_text:
    rctf: |
      {% for endpoint in challenge.endpoints %}
      ...your override...
      {% endfor %}
```

### `<red>discovery</red>`

Top-level discovery options.

| Field | Default | Purpose |
| --- | --- | --- |
| `<red>challenge_folder_depth</red>` | `3{:ts}` | Max depth from root when scanning for `kona.yml{:file}` / `kona.yaml{:file}`. |
| `<red>attachment_analysis_depth</red>` | `50{:ts}` | Per-challenge cap when walking attachment file lists. |
| `<red>klodd_domain</red>` | - | Klodd domain when using the [Klodd](https://github.com/redpwn/klodd) integration. |
| `<red>klodd_endpoint_name</red>` | - | Klodd endpoint identifier. |

### `<red>attachment_format</red>`

Choose `<green>tar_gz</green>` (the default), `<green>zip</green>`, or `<green>7z</green>` for generated attachments. Password protection always uses `<green>7z</green>`.

### `<red>attachment_wrap_dir</red>`

When `true{:ts}`, the default, generated archives place their files under a directory named after the archive or challenge. Set it to `false{:ts}` to put files at the archive root.

## Per-challenge config

A challenge file declares one or more challenges and may include a `<red>deployment</red>` block. A static challenge needs only its category, name, author, description, and flag:

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

Konata accepts a datetime value and sends it to rCTF as `<red>releaseTime</red>` in Unix milliseconds. Use a timestamp with a timezone, such as `<green>2026-02-07T18:00:00Z</green>`. Konata treats timestamps without a timezone as UTC.

### Scoring

By default, Konata creates a decay challenge. `<red>initialValue</red>` and `<red>minimumValue</red>` set its point range, while the rCTF block controls tiebreak eligibility:

```yaml
scoring:
  initialValue: 500
  minimumValue: 50
  rctf:
    eligibleForTiebreaks: true
```

For rCTF [dynamic scoring](/admin/scoring), set `<red>scoring.rctf.kind</red>` to `<green>dynamic</green>` and provide a webhook secret. As elsewhere in Konata, the secret can come from either `<red>secret</red>` or `<red>value</red>`.

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

`<red>transport</red>` currently defaults to `<green>webhook</green>`. The resolved secret becomes the rCTF dynamic-scoring webhook secret used to authenticate score submissions to `<route>POST /api/v2/challs/:id/scores</route>`. See [Submit dynamic scores](/api/challenges/submit-dynamic-scores) for the request format.

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

`<red>flags</red>` is configured separately for each platform. rCTF accepts exactly one flag, while CTFd accepts a list. A flag can be an inline string, `<red>{ str: ... }</red>` / `<red>{ strContent: ... }</red>`, or `<red>{ file: ... }</red>`. Konata reads file-backed flags during sync and resolves their paths relative to the challenge directory.

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

Use `<red>endpoints</red>` to add connection information to a static challenge's description. Each entry has a `<red>type</red>`, a host in `<red>endpoint</red>`, and an optional `<red>port</red>`. The supported types are `<green>http</green>`, `<green>https</green>`, `<green>socat</green>`, `<green>nc</green>`, and `<green>ncat-ssl</green>`. The host supports Jinja templates:

```yaml
endpoints:
  - type: nc
    endpoint: "{{ challenge.name | lower }}.{{ config.domains['static'] }}"
    port: 1337
```

### Deployment

The optional `<red>deployment</red>` block tells Konata which images to build and which Kubernetes manifests to apply. Omit it for challenges that need only metadata and attachments.

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

For an instanced challenge, add `<red>instancerConfig</red>` / `<red>instancer_config</red>`. Its shared fields match the [rCTF instancer config](/integrations/instancer#challenge-configuration). The inner `<red>config</red>` contains Docker services or Kubernetes `<red>pods[]</red>`. Konata accepts both `snake_case` and `camelCase` keys.

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

For an instanced Kubernetes challenge, provide the pods only. The rCTF operator creates the namespace, services, network policies, and ingress when a team starts an instance.

`<red>instancerConfig.instancer</red>` names which configured rCTF instancer the challenge runs on, matching a key in rCTF's `<red>instancers</red>` map. Omit it to fall back to rCTF's `<red>defaultInstancer</red>`. See [Instancer](/integrations/instancer#provider-configuration) for the deployment-side setup.

### Admin bot

For a web challenge with an rCTF [admin bot](/integrations/admin-bot), put the handler source under `<red>adminBot</red>` / `<red>admin_bot</red>`. Konata uploads it as `<red>adminBotConfig</red>`, and rCTF reads the handler's inputs, timeout, and revision from the source.

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

### `<red>kona</red> sync`

`sync` finds the selected challenges, builds and pushes their images, applies Kubernetes manifests, and updates every configured platform.

```ansi
$ <red>kona</red> sync <dim>-d</dim> ./ctf-challenges
```

| Flag | Behavior |
| --- | --- |
| `<dim>-d</dim>`, `<dim>--deploy-directory</dim>` | Root of the deploy repo (the folder containing the root `kona.yml{:file}`). Defaults to the current directory (`.`). |
| `<dim>--only</dim> <name>` | Repeatable. Restricts the run to specific challenge folder names. Discovery still walks the tree, and non-matching challenges are skipped. |
| `<dim>--challenge-path</dim> <path>` | Repeatable. Direct paths to challenge directories, bypassing discovery entirely. The CI integration uses this to scope each matrix shard to one challenge. |

### `<red>kona</red> compress`

`compress` creates an attachment archive that can be committed and referenced through `<red>attachments.preCompressed</red>`.

```ansi
$ <red>kona</red> compress ./challenge/dist <dim>--format</dim> zip <dim>--output</dim> handout.zip
$ <red>kona</red> compress ./challenge/dist <dim>--password</dim> <green>"<yellow>$FLAG</yellow>"</green> <dim>--output</dim> handout.7z
```

| Flag | Behavior |
| --- | --- |
| `path` (positional) | Source file or directory. |
| `<dim>-f</dim>`, `<dim>--format</dim>` | `<green>tar_gz</green>` (default), `<green>zip</green>`, or `<green>7z</green>`. |
| `<dim>-o</dim>`, `<dim>--output</dim>` | Output path. Defaults to `<src>.{tar.gz,zip,7z}` in the current directory, based on the selected or forced archive format. |
| `<dim>-p</dim>`, `<dim>--password</dim>` | Encrypts the archive. Passing a password forces `<green>7z</green>` output, even when `<dim>--format</dim>` is `<green>tar_gz</green>` or `<green>zip</green>`. |

Generated archives are deterministic. Konata normalizes file metadata and entry order, so the same inputs produce the same archive bytes across machines and runs. It applies the same rules to attachments built during `sync`.

## CI integration

The [`project-sekai-ctf/konata-deploy-action`](https://github.com/project-sekai-ctf/konata-deploy-action) has two parts. `detect` builds a matrix of changed challenges, then `sync` deploys one challenge from each matrix job with `$ <red>kona</red> sync <dim>--challenge-path</dim> <one>`. Unchanged challenges are not redeployed.

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

The [SekaiCTF 2026 challenges](https://github.com/project-sekai-ctf/sekaictf-2026) repository contains a working Konata and rCTF deployment. It includes static Kubernetes services, instanced challenges, dynamic scoring, file-backed flags, multiple registries, and CI that only deploys changed challenges.
