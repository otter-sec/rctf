---
title: Deploying challenges
description: Guide to deploying CTF challenges including shared remotes, instanced remotes, kCTF, Docker, and admin bots.
order: 4
---

With the CTF platform running and challenges ready to create, the next step is deployment. Alongside static challenges, there are two main deployment types, **shared remote** and **instanced remote**.

:::tip
Whichever deployment method you pick, ship a local setup of the challenge (e.g., a Docker Compose file) for debugging. It also makes remote deployment easier, since most solutions are designed around running a provided Docker image.
:::

rCTF also supports hosting admin bots separately from the challenge. This handles traffic spikes better and gives a more accurate simulation of external visitors, rather than the internal-IP traffic you'd see from a local deployment.

## Shared remote

In a shared remote, every competitor connects to one single instance shared across all teams. This works when the vulnerability does not depend on state or is sandboxed (for example, a cryptographic vulnerability that proves you can recover the secret value from the server).

Google built [kCTF](https://google.github.io/kctf/introduction.html) for this. It runs challenges on GCP with instance scaling, health checks, automatic restarts on failure, and secure sandboxing on shared hosts. For a simpler alternative, you can run shared instances on a traditional VPS, either inside Docker or directly on the host.

:::warning[Wrap shared remotes in a jail]
Any shared remote where the intended solve gives a competitor code execution must run the vulnerable process inside a per-connection sandbox. Concretely:

- **[pwn.red/jail](https://github.com/redpwn/jail)** is the modern drop-in. It's a small base image that forks the challenge per connection inside an nsjail with read-only rootfs, no network, dropped caps, and CPU/memory/time limits. Add two lines to a Dockerfile (`FROM pwn.red/jail`) and you get isolation per session for free. Recommended default for pwn / RCE-style shared remotes.
- **[nsjail](https://github.com/google/nsjail)** is the lower-level building block both kCTF and pwn.red/jail wrap. kCTF runs every challenge inside an nsjail by default. If you're not on kCTF and not using pwn.red/jail, configure nsjail yourself.

Use one of these everywhere it's possible. A shared remote without per-connection isolation lets the first solver replace the binary, drop a backdoor in `/tmp/{:dir}`, or just kill the process for everyone else.
:::

### kCTF

kCTF has its own [documentation](https://google.github.io/kctf/), so this section focuses on the things that aren't immediately obvious, especially for first-time users:

- When deploying kCTF, you can control which (sub)domain the challenges live under. The `$ <red>kctf</red> cluster create` command has a `<dim>--domain-name</dim>` flag for this. Expect to either use Google nameservers if you want to host challenges under `*.example.com`, or set up a subdomain with `NS` records pointing to Google so challenges are available under `*.subdomain.example.com`.
- By default, the created nodes are spot (preemptible) instances. This means the nodes rotate every 24 hours, with brief downtime each time. To avoid this, resize the cluster without the spot instance flag (e.g., `$ <red>kctf</red> cluster resize <dim>--min-nodes</dim> 1 <dim>--max-nodes</dim> 3 <dim>--num-nodes</dim> 1 <dim>--machine-type</dim> n2-standard-4`), at slightly higher cost.
- If a health check fails, the challenge restarts automatically, which can look like a connectivity issue from the outside. Run `$ <red>kctf</red> chal status` to see what's actually going on.
- Watch your GCP project's quotas. The dashboard shows which limits have been hit or are getting close. Deploying a lot of challenges can fail because of insufficient IP addresses or other quota constraints. Setting up kCTF early is a practical way to verify your quotas are sufficient, and it may improve your account's standing for automatic quota increase approvals.
- Some challenges deployed to kCTF need extra changes because of the security hardening. Standing up kCTF early lets you catch and fix these before the competition starts. The [Kubernetes Pods documentation](https://kubernetes.io/docs/concepts/workloads/pods/) covers the configurable options for kCTF challenge instances (for example, additional volumes, since the file system is read-only by default).

### Docker

If you don't want the complexity of kCTF (GCP plus Kubernetes), a simpler option is to deploy challenges using Docker on one or more dedicated hosts. Don't reuse the same VPS that runs the CTF platform. Challenges can pull serious traffic, and keeping participant data away from intentionally vulnerable services is just good security hygiene.

The simplest deployment method is [Docker Compose](https://docs.docker.com/compose/), with each challenge on a unique port. Note that challenges that grant remote code execution carry risk of container breakouts (especially when elevated privileges are involved) or malicious actions like disk exhaustion. Wrap the challenge process in [pwn.red/jail](https://github.com/redpwn/jail) or nsjail. See the [shared-remote callout above](#shared-remote).

:::caution
It is critical that competitors cannot access internal metadata services (e.g. `http://169.254.169.254` on AWS/GCP cloud providers, which hold access credentials to the cloud account).
:::

### VM

An alternative is to provision a separate VM (or VPS) for each challenge instance. It costs more than running everything on one host, but it reduces the blast radius. A single compromised challenge cannot take out others through disk exhaustion, container breakouts, or similar attacks. The right configuration depends on what each challenge needs.

:::caution
It is critical that competitors cannot access internal metadata services (e.g. `http://169.254.169.254` on AWS/GCP cloud providers, which hold access credentials to the cloud account).
:::

## Instanced remote

In an instanced remote setup, each competitor gets a dedicated instance. This is necessary for challenges where the vulnerability hands you file write or remote code execution. Otherwise, competitors could break the challenge, remove flags, or interfere with each other.

rCTF v2 ships first-party support for instanced challenges, so you don't need a third-party integration here. Pick whichever backend matches your operational comfort level:

- **[Docker instancer](/integrations/instancer/docker)** is a bundled Python FastAPI service that runs on a standalone Docker host alongside Traefik and Redis. It's lightweight and a good fit for small-to-medium events.
- **[Kubernetes instancer](/integrations/instancer/kubernetes)** is a Go operator that reconciles `ChallengeInstance` custom resources into per-team namespaces with network policies, Traefik routes, and ACME wildcard TLS. It comes with a Terraform module for GKE, and is the scalable option.

The shared `<red>instancerConfig</red>` schema, participant lifecycle, and admin UI are covered in the [instancer overview](/integrations/instancer).

If you'd rather stick with an existing setup, third-party integrations like [Klodd](https://klodd.tjcsec.club/) still work against rCTF, but the first-party instancer is the recommended path now.

:::warning
Instances can be deployed before the CTF begins. Be careful when deploying challenges in advance if their names are predictable.
:::

## Admin bot

rCTF v2 ships a first-party admin bot integration that runs trusted TypeScript handlers in a Puppeteer-driven Chrome/Firefox session. The handlers sit alongside the challenge, validate participant input, and stream structured per-job logs back to the platform. Configuration, the handler API, scaling notes, and deployment guidance are all on the [Admin bot](/integrations/admin-bot) page.

## Keeping challenges in sync

Updating a challenge is where most operational pain comes from. Touching the source code without updating the published attachment leaves teams solving against stale handouts. Rebuilding the Docker image but forgetting to roll the running deployment leaves the flag pointing at the old binary. Tweaking `<red>instancerConfig</red>` in the admin UI without bumping the image causes new instances to come up with mismatched assets. Each of these is easy to miss in the moment and hard to debug after the fact.

:::tip[Use Konata + CI as the single source of truth]
Commit every challenge's `kona.yml{:file}` alongside the source, and let [Konata](/integrations/konata) drive deployment from CI on every push to `main`. With the [Konata GitHub Action](/integrations/konata#ci-integration), one commit can rebuild and push the Docker image, re-render attachments, refresh metadata on rCTF, and (for k8s-instancer) trigger a rollout of the running deployment, all from the same source tree, in the right order.
:::

Pair that with **generated attachments** rather than hand-copied files. If a challenge produces its handout from the build (a multi-stage `Dockerfile{:file}` export, a `$ <red>make</red> handout` target, a script), reference that path from `<red>attachments.files</red>` and let Konata's [deterministic compressor](/integrations/konata#kona-compress) re-archive it on every sync. Same inputs always produce the same archive bytes, so rCTF's content-hash dedup leaves attachments alone when nothing changed and uploads exactly once when something did. You stop shuttling tarballs into the right folder, and the published attachment is always the one that came out of the latest build.

The [SekaiCTF 2026 challenge repository](https://github.com/project-sekai-ctf/sekaictf-2026) is the current working reference for this workflow end-to-end. It includes challenge sources, `kona.yaml{:file}` files, static Kubernetes deployments, rCTF-instancer configs, dynamic scoring, and a `.github/workflows/sync.yaml{:file}` workflow that ships every change through Konata.
