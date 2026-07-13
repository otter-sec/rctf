---
title: Infrastructure
description: Cloud-provider, Kubernetes, runtime, host, and network mistakes that recur in CTF operations, with rCTF-specific notes on what the platform already handles.
order: 1
---

This page covers recurring problems with cloud quotas, cluster security, challenge limits, host configuration, and reverse proxies. Most are recoverable when they are found during testing rather than during the event.

## Cloud providers

### Not requesting quota in advance

New GCP, AWS, and Azure accounts often start with low default quotas. If you hit quota during the event, autoscaling stops and new instances may fail to start. Quota reviews can take multiple days, so request increases at least two weeks before the event.

::::tabs
:::tab[GCP]
For GCP, check project-level quota in the [IAM quotas page](https://console.cloud.google.com/iam-admin/quotas). Pay attention to `CPUS`, `IN_USE_ADDRESSES`, `PERSISTENT_DISK_SSD_GB`, GPU quotas in the selected region, and the per-region GKE `SUBNETWORKS` cap.

Quota belongs to the project. Sponsored credits don't automatically raise project limits. File the request with the event date, expected team count, expected concurrent workload, and selected region, then verify the approved limit in the same UI.
:::
:::tab[AWS]
For AWS, Service Quotas requests are tied to an account-region pair. Request quota in every region you plan to use, especially for vCPU limits by instance family, Elastic IPs, and EBS volume capacity.

Region choice matters. Some instance families are easier to approve in one region than another, so pick the region only after checking whether the required capacity is realistic there.
:::
:::tab[Azure]
For Azure, check regional vCPU limits by family before committing to a region. Like the other providers, credit or sponsorship doesn't automatically grant the compute quota an event needs.

Request more capacity than the steady-state estimate. Traffic bursts, retries, node replacement, and cached container images can consume much more than a simple team count suggests.
:::
::::

:::warning[Request headroom]
Ask for roughly 1.5 to 2x the worst-case estimate. The margin covers burst, retries, pre-pulled images, and replacement capacity during node churn.
:::

GCP trial projects are a common edge case. If a project is still on a free-trial billing account, quota-increase requests can be rejected regardless of timing because trial projects are intentionally kept at lower limits.

1. Upgrade to a paid billing account before requesting quota increases. Free credits can still apply, but the billing account class matters during review.

2. Run a small always-on VM, such as an `e2-small`, for 3 to 7 days before filing the request. Consistent billable usage makes the project look like an active workload rather than a brand-new account.

3. File the request with context. Reference the active workload and the event date in the justification. A note like `currently running production workloads, scaling up for an event on YYYY-MM-DD` reads better than a bare capacity request. Projects that jump straight from no usage to a very large quota request are more likely to be denied or routed to a slower manual review queue.

### Exposing the instance-metadata service to challenges

Anything reachable from a challenge container can also reach `http://169.254.169.254` on AWS, GCP, or Hetzner, or `http://[fd00:ec2::254]` on IPv6. Those metadata services can hand out short-lived credentials for the node's service account.

:::important[Block metadata service access]
Block egress from challenge containers to `169.254.0.0/16` and the IPv6 metadata addresses. Verify the rule from inside a test pod or challenge container, not only from the host.

For shared-remote VPS or bare-VM challenges without Kubernetes `NetworkPolicy`, drop IMDS at the host firewall or run the host without an attached service account.
:::

From a test pod, run `$ <red>curl</red> http://169.254.169.254`. The request should fail. If the cluster is dual-stack, also test the IPv6 metadata address. On bare-metal clusters, this catches CNI configurations that silently ignore the intended policy.

For rCTF Kubernetes instancer deployments, the [Kubernetes instancer](/integrations/instancer/kubernetes#network-policies) ships a `NetworkPolicy` per instance namespace that excludes RFC1918, CGNAT, and link-local ranges by default. That covers IMDS on IPv4. The Terraform module also enables GKE `workload_metadata_concealment`. Opt into public egress with `egress: true{:yml}` on the pod rather than removing the policy.

The bundled GKE Terraform module provisions an IPv4-only cluster, so the IPv6 IMDS address `[fd00:ec2::254]` is unreachable from challenge pods because the cluster has no IPv6. If you switch the cluster to dual-stack, the shipped `NetworkPolicy` has no IPv6 allow rule and will implicitly deny IPv6 egress. That keeps IPv6 IMDS blocked, but challenges that need IPv6 internet egress will also fail until you add an explicit IPv6 `IPBlock` with matching `fd00::/8` and `fe80::/10` exceptions.

## Kubernetes

### Skipping per-pod resource limits

A pod without `<red>resources.limits</red>` can use whatever the node has free. A fork bomb or memory leak in one instance can take down other instances on the same node.

This often happens when a PodSpec defines `<red>requests</red>` but no limits, uses values measured from only one successful test, or leaves `<red>terminationGracePeriodSeconds</red>` unbounded.

The k8s-instancer `<red>instancerConfig.config.pods[]</red>` field is a real PodSpec. Set `<red>resources.requests/limits</red>` directly.

### Mounting broad service-account tokens

Every pod in a namespace can receive the `default` service-account token at `/var/run/secrets/kubernetes.io/serviceaccount/{:dir}`. If that service account has broad permissions, or if the cluster over-grants `system:authenticated`, a compromised challenge turns straight into Kubernetes API access.

:::important[Disable tokens unless needed]
Set `<red>automountServiceAccountToken</red>` to `false{:yml}` unless the challenge genuinely needs the in-cluster API. Audit `system:authenticated` cluster-role bindings with `$ <red>kubectl</red> get clusterrolebindings <dim>-o</dim> yaml | <red>grep</red> <dim>-A4</dim> system:authenticated`, and remove bindings with meaningful verbs. Also check that temporary controller RBAC changes from debugging were reverted before the event.
:::

The k8s-instancer `<red>instancerConfig.config.pods[]</red>` field accepts the standard PodSpec, including `<red>automountServiceAccountToken</red>`.

## Runtime limits

### Missing runtime abuse limits

CPU and memory limits aren't enough on their own. A participant can run a fork bomb like `$ :(){ :|:& };:`, fill `/tmp/{:dir}` with `$ <red>dd</red> if=/dev/zero of=/tmp/x`, or open a large number of file descriptors from inside a challenge process. Those behaviors need runtime limits, not assumptions about participant behavior.

::::tabs
:::tab[Docker]
For Docker services, set `pids_limit` so fork bombs can't exhaust the host `kernel.pid_max`. Set `ulimits.nofile` so a process can't exhaust the file-descriptor table. If `/tmp/{:dir}` is writable, mount a size-limited `tmpfs`. Bare-metal challenges need the same storage cap with a `tmpfs` `size=` option.
:::
:::tab[Kubernetes]
For Kubernetes services, set `resources.limits.ephemeral-storage` on pods and configure kubelet `podPidsLimit` at the cluster level. Use `<red>readOnlyRootFilesystem</red>` where practical and set `<red>terminationGracePeriodSeconds</red>` so cleanup can't be delayed indefinitely.
:::
:::tab[nsjail]
For nsjail services, use `<dim>--rlimit_nproc</dim>`, `<dim>--rlimit_nofile</dim>`, and `<dim>--time_limit</dim>`. Shared remote services should have a per-connection time limit so slow or long-lived TCP connections cannot starve the connection table.
:::
::::

Before release, test challenge services with intentionally abusive clients. Include `$ :(){ :|:& };:`, `$ <red>dd</red> if=/dev/zero of=/tmp/x`, `$ for i in $(<red>seq</red> 100000); do exec {fd}<>/dev/null; done`, and slow TCP connections where the challenge uses a shared remote.

The [Docker instancer](/integrations/instancer/docker#docker-challenge-config) defaults to `6m` memory, `1.0` CPU, `1024` PIDs, and `1024` nofile per service when not overridden. It also exposes `<red>mem_limit</red>`, `<red>cpus</red>`, `<red>pids_limit</red>`, and `<red>ulimits</red>` for tuning. The GKE Terraform module sets kubelet `<red>podPidsLimit</red>` to `1024{:ts}` cluster-wide through `<red>gcp_instancer_pod_pids_limit</red>`, so a fork bomb inside a challenge pod hits that cap before the node `kernel.pid_max`.

The Kubernetes side otherwise leaves several settings to the challenge author. Ephemeral-storage limits, `<red>readOnlyRootFilesystem</red>`, FD ulimits, and `<red>terminationGracePeriodSeconds</red>` are not defaulted. See the [per-pod safety checklist](/integrations/instancer/kubernetes#per-pod-safety-checklist) on the Kubernetes instancer page for the full list of fields to set.

When in doubt, treat every challenge image as already compromised. Assume participants can get code execution inside the challenge container, even when the intended solution isn't RCE.

## Host

### Improper host hardening

A cloud VM with an unpatched kernel or unnecessary privileges can turn challenge code execution into host access. Container-escape and local privilege-escalation issues get patched regularly, but unpatched hosts stay exposed.

Run unattended upgrades (or an equivalent) on challenge hosts, then reboot into the newer kernel before the event. Don't mount `/var/run/docker.sock{:file}` into challenge containers. Avoid `<dim>--privileged</dim>`, `<dim>--cap-add=SYS_ADMIN</dim>`, `<dim>--pid=host</dim>`, and `<dim>--net=host</dim>` unless someone has reviewed the security impact. Keep runc, Docker, and containerd on patched versions.

Public local privilege-escalation exploits can show up within days of disclosure. A container with Docker socket access can also start a container with `$ <red>docker</red> run <dim>-v</dim> /:/host` and walk out to the host filesystem. Pin minimum runtime versions and verify them before the event.

### Challenge machine runs out of disk space

Disk exhaustion is easy to miss because CPU and memory dashboards can stay quiet while logs, images, and caches grow in the background.

Docker `json-file` logs have no rotation unless `max-size` and `max-file` are set in `/etc/docker/daemon.json{:file}`, so a noisy challenge can fill `/var/lib/docker/containers/*/.log{:file}` for the lifetime of the container. `journald` grows in the same way unless `SystemMaxUse=` is configured. Rebuilds and redeploys also leave dangling images and build cache in `/var/lib/docker/{:dir}`, so schedule `$ <red>docker</red> system prune` or keep an eye on disk usage before the event.

## Network

### Client-IP extraction not tested end-to-end

Cloudflare, load balancers, nginx, and Traefik can all replace the source address as they forward a request. If their trust settings disagree, rCTF may record a proxy address instead of the participant's IP. Rate limits can then group unrelated participants together, and bans may block an entire proxy. Challenges have the opposite risk when they trust `X-Forwarded-For` from any client, since participants can supply that header themselves.

Send a request through the real DNS from a known external IP and confirm the admin or audit log shows that IP. Then test a challenge through the same path and confirm the challenge sees the same address. A staging path without the full proxy chain isn't enough for this check.

:::important[Trust only the edge you control]
If `<yellow>USE_PROXY_HEADERS</yellow>=true` is enabled without a locked-down trusted-proxy CIDR, participants can spoof `X-Forwarded-For`. The same applies to nginx `set_real_ip_from` and Traefik `forwardedHeaders.trustedIPs` when the trusted range is wider than the proxy layer you control. With Cloudflare, restore `CF-Connecting-IP` so the platform does not log only Cloudflare edge IPs.
:::

### Not being prepared for traffic

The first few minutes after start pile up concurrent registrations, logins, challenge reads, and leaderboard reads. Load-test those paths from a separate machine before the event, and size the challenge cluster for `expected teams × overlapping instanced challenges`.

Turn on captcha for sensitive unauthenticated actions, verify rate limits on sensitive platform paths, and configure trusted proxy IP ranges before the load test. The test should use the production proxy chain, not a local or staging shortcut.

rCTF caches leaderboard reads, compresses and caches static assets, and rate limits sensitive routes. Instanced challenges can also scale separately through the [Docker](/integrations/instancer/docker) or [Kubernetes](/integrations/instancer/kubernetes) backend. These protections still need to be tested through the production proxy and DNS path.
