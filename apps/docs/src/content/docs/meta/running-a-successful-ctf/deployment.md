---
title: Deploying challenges
description: Guide to deploying CTF challenges including shared remotes, instanced remotes, kCTF, Docker, and admin bots.
order: 4
---

Hosted challenges use either a **shared remote**, which every team connects to, or an **instanced remote**, which gives each team a separate environment.

:::tip
Every hosted challenge should include a local setup, such as a Docker Compose file. Authors need it to reproduce deployment problems and test the reference solution against the same build.
:::

Admin bots should run separately from challenge services. This keeps browser traffic outside the challenge network and lets bot workers scale independently.

## Shared remote

In a shared remote, every team connects to the same service. Use one when solves do not alter shared state, or when each connection runs inside its own sandbox. A cryptographic oracle is a common example.

[kCTF](https://google.github.io/kctf/introduction.html) runs shared challenges on GCP with autoscaling, health checks, automatic restarts, and per-connection sandboxing. A dedicated VPS running Docker is simpler, but you must provide the isolation and resource limits yourself.

:::warning[Wrap shared remotes in a jail]
Any shared remote where the intended solve gives a competitor code execution must run the vulnerable process inside a per-connection sandbox. Concretely:

- **[pwn.red/jail](https://github.com/redpwn/jail)** runs each connection in a separate nsjail with a read-only root filesystem, no network, dropped capabilities, and CPU, memory, and time limits. It is a practical default for shared pwn and RCE services.
- **[nsjail](https://github.com/google/nsjail)** is the lower-level building block both kCTF and pwn.red/jail wrap. kCTF runs every challenge inside an nsjail by default. If you're not on kCTF and not using pwn.red/jail, configure nsjail yourself.

Use a jail whenever the intended solution provides code execution. Without per-connection isolation, one solver can replace the binary, leave a backdoor in `/tmp/{:dir}`, or stop the service for everyone.
:::

### kCTF

kCTF has its own [documentation](https://google.github.io/kctf/), so this section focuses on the things that aren't immediately obvious, especially for first-time users:

- Set the challenge domain with `<dim>--domain-name</dim>` when you run `$ <red>kctf</red> cluster create`. To use `*.example.com`, use Google nameservers for the domain. To use `*.subdomain.example.com`, add `NS` records that delegate the subdomain to Google.
- By default, the created nodes are spot (preemptible) instances. This means the nodes rotate every 24 hours, with brief downtime each time. To avoid this, resize the cluster without the spot instance flag (e.g., `$ <red>kctf</red> cluster resize <dim>--min-nodes</dim> 1 <dim>--max-nodes</dim> 3 <dim>--num-nodes</dim> 1 <dim>--machine-type</dim> n2-standard-4`), at slightly higher cost.
- If a health check fails, the challenge restarts automatically, which can look like a connectivity issue from the outside. Run `$ <red>kctf</red> chal status` to see what's actually going on.
- Watch your GCP project's quotas. The dashboard shows which limits have been hit or are getting close. Deploying a lot of challenges can fail because of insufficient IP addresses or other quota constraints. Setting up kCTF early is a practical way to verify your quotas are sufficient, and it may improve your account's standing for automatic quota increase approvals.
- Some challenges deployed to kCTF need extra changes because of the security hardening. Standing up kCTF early lets you catch and fix these before the competition starts. The [Kubernetes Pods documentation](https://kubernetes.io/docs/concepts/workloads/pods/) covers the configurable options for kCTF challenge instances (for example, additional volumes, since the file system is read-only by default).

### Docker

For a smaller setup, run Docker on one or more dedicated hosts. Do not put intentionally vulnerable challenges on the server that holds the rCTF database or participant data. Challenge traffic and a container escape should not be able to take down or expose the platform.

[Docker Compose](https://docs.docker.com/compose/) is enough for a small set of shared services, with each challenge on its own port. A container alone is not a safe boundary for an RCE challenge, especially if it has extra privileges. Put the vulnerable process inside [pwn.red/jail](https://github.com/redpwn/jail) or nsjail and set storage and process limits.

:::caution
Block access to cloud metadata services such as `http://169.254.169.254`. They can expose credentials for the cloud account.
:::

### VM

Another option is to give each challenge instance its own VM or VPS. This costs more, but a compromised challenge is less likely to affect the rest of the event through disk exhaustion, a container escape, or a host failure. Block access to the cloud metadata service on these hosts as well. Choose the level of isolation based on the risks and resource needs of each challenge.

## Instanced remote

An instanced remote gives each team its own environment. Use it when a solve changes persistent state, writes files, or gives broad code execution that cannot be safely reset after every connection.

rCTF provides two instancer backends:

- **[Docker instancer](/integrations/instancer/docker)** is a bundled Python FastAPI service that runs on a standalone Docker host alongside Traefik and Redis. It's lightweight and a good fit for small-to-medium events.
- **[Kubernetes instancer](/integrations/instancer/kubernetes)** runs each team instance in its own namespace with network policies and Traefik routing. It includes a Terraform deployment for GKE and is intended for events that need several challenge nodes.

The [instancer overview](/integrations/instancer) explains the shared `<red>instancerConfig</red>` fields, participant controls, and admin UI.

Existing systems such as [Klodd](https://klodd.tjcsec.club/) can still integrate with rCTF.

:::warning
Instances can be deployed before the CTF begins. Be careful when deploying challenges in advance if their names are predictable.
:::

## Admin bot

The rCTF [admin bot](/integrations/admin-bot) runs trusted TypeScript handlers in Chrome or Firefox. It validates participant input, queues browser visits, and returns logs for each job. Run the worker separately from the challenge so browser capacity can scale without exposing the worker service publicly.

## Keeping challenges in sync

Deploy source, attachments, images, and `<red>instancerConfig</red>` from the same revision. Updating them separately makes it easy to publish a binary that no longer matches the remote service or reference solution.

:::tip[Use Konata + CI as the single source of truth]
Commit each challenge's `kona.yml{:file}` beside its source and deploy it with [Konata](/integrations/konata) from CI. The [Konata GitHub Action](/integrations/konata#ci-integration) can build and push the image, regenerate attachments, update rCTF, and roll out the Kubernetes deployment from one commit.
:::

Generate attachments from the challenge build and reference the output through `<red>attachments.files</red>`. Konata archives that output on each sync, while rCTF skips the upload when its contents have not changed.

The [SekaiCTF 2026 challenge repository](https://github.com/project-sekai-ctf/sekaictf-2026) shows this workflow with Konata, Kubernetes, instanced challenges, and dynamic scoring.
