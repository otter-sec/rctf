---
title: Admin bot
description: Configure browser-based admin bot jobs for web challenges.
order: 3
---

The admin bot lets a web challenge accept participant input and open it in a controlled Chrome or Firefox session. Each challenge supplies a trusted TypeScript handler that prepares the browser, visits the submitted URL, and records logs for the participant and organizers.

:::warning[Trusted challenge code]
Challenge handlers run as trusted code inside the admin bot service. Their source is available through the public challenge integration API, so do not put secrets in it. Store flags in challenge data and read them from `ctx.job.flags{:ts}` (a list of `{ provider, flag }{:ts}` entries for the submitting team) while the job runs.
:::

## How a job runs

An admin bot job moves through the platform in this order:

:::steps
1. **Configure the provider**

   Configure rCTF with the browser worker's URL and a bearer token shared by both services.

2. **Save challenge code**

   When an admin saves the handler, the worker builds it and validates the exported `Challenge{:ts}`. rCTF stores the validated version and uses its input definitions in the challenge form.

3. **Submit a job**

   rCTF validates the submitted fields, captcha, rate limit, existing jobs, and any required challenge instance before adding the job to the queue.

4. **Run the browser handler**

   The worker takes the next queued job, opens a fresh browser context, runs the saved handler, and reports its logs and result to rCTF.
:::

## Backend configuration

The backend config enables the provider and gives rCTF the worker's URL.

```yaml title="rctf.d/admin-bot.yaml"
adminBot:
  provider:
    name: admin-bots/rctf-ts
    options:
      endpoint: http://admin-bot:21337
      secretKey: <shared-secret>
  maxLogsPerUserChallenge: 5
```

`admin-bots/rctf-ts{:yaml}` is the built-in provider for TypeScript challenge configs. It accepts provider options from config files or environment variables:

| Field or variable | Purpose |
| --- | --- |
| `adminBot.provider.options.endpoint{:yaml}` | Base URL of the admin bot worker from the rCTF API container or process. |
| `adminBot.provider.options.secretKey{:yaml}` | Bearer token shared between the rCTF API and the admin bot worker. |
| `<yellow>RCTF_ADMIN_BOT_ENDPOINT</yellow>` | Environment override for `endpoint{:yaml}`. |
| `<yellow>RCTF_ADMIN_BOT_SECRET_KEY</yellow>` | Environment override for `secretKey{:yaml}`. |
| `adminBot.maxLogsPerUserChallenge{:yaml}` | Number of completed or failed job logs retained per user and challenge. The default is `5{:ts}`. |

Set the same secret on the worker through `<yellow>RCTF_SECRET_KEY</yellow>`. Each service uses it to authenticate requests from the other.

Protect participant submissions with captcha by adding the `adminBotSubmit{:yaml}` action:

```yaml title="rctf.d/captcha.yaml"
captcha:
  protectedEndpoints:
    - adminBotSubmit
```

## Worker service

The worker is a separate Bun service under `apps/admin-bot/{:dir}`. It validates challenge handlers and polls rCTF for queued jobs.

The deployment files are in `deploy/admin-bot/{:dir}`.

:::file-tree
- deploy/
  - admin-bot/
    - compose.yml Service, volume, tmpfs, resource limit, and network settings
    - .env.example Required worker environment variables
    - Dockerfile Bun runtime and browser dependencies
:::

The worker service uses these environment variables:

| Variable | Purpose |
| --- | --- |
| `<yellow>RCTF_BASE_URL</yellow>` | Base URL of the rCTF API from the worker container or process. |
| `<yellow>RCTF_SECRET_KEY</yellow>` | Shared bearer token. This must match the provider secret in rCTF config. |
| `<yellow>RCTF_EXTRA_HEADERS</yellow>` | JSON object of extra headers added to worker-to-API requests. |
| `<yellow>BROWSER_CACHE_DIR</yellow>` | Browser download cache directory. The Docker image defaults to `/data/browser-cache/{:dir}`. |
| `<yellow>POLL_INTERVAL_MS</yellow>` | Queue polling interval. The default is `5000{:ts}`. |
| `<yellow>PORT</yellow>` | Worker HTTP port. The default is `21337{:ts}`. |
| `<yellow>RCTF_EGRESS_ALLOW_PRIVATE_CIDRS</yellow>` | Optional comma-separated CIDRs that browser sessions may reach even though they are not public unicast. |
| `<yellow>RCTF_EGRESS_DENY_CIDRS</yellow>` | Optional comma-separated CIDRs to deny. These take precedence over allow-private entries. |

A minimal worker environment looks like this:

```sh title="deploy/admin-bot/.env"
RCTF_BASE_URL=http://rctf:80
RCTF_SECRET_KEY=<shared-secret>
POLL_INTERVAL_MS=5000
PORT=21337
```

Start or update the root stack first. It creates the dedicated control-plane network used by the API and worker:

```ansi
$ <red>docker</red> compose up <dim>-d</dim>
```

Then run the bundled admin bot Compose service from the repository root:

```ansi
$ <red>docker</red> compose <dim>-f</dim> deploy/admin-bot/compose.yml up <dim>-d</dim>
```

The Compose file binds the worker to `127.0.0.1:21337`, mounts a persistent browser cache, uses tmpfs for browser scratch data, drops Linux capabilities, caps container resources, and joins the external `rctf_admin_bot_network`. The root stack attaches only the `rctf` service to that network; the worker does not join the general `rctf_network` used by supporting services such as instancers.

:::warning[Network exposure]
Keep the worker on a private network. Although `/v1/test` requires the shared bearer token, it builds and evaluates trusted challenge code and should not be exposed to the internet.
:::

## Resource limits

Each worker process handles one job at a time, so without container limits a single submitted page that allocates memory, spins the CPU, or spawns processes can crash the worker or starve the host, and deny admin bot service for every challenge using that worker.

The bundled Compose file caps the container and reads overrides from `deploy/admin-bot/.env{:file}`:

| Variable | Default | Purpose |
| --- | --- | --- |
| `<yellow>ADMIN_BOT_CPU_LIMIT</yellow>` | `2{:ts}` | CPU cores available to the worker and its browser. |
| `<yellow>ADMIN_BOT_MEMORY_LIMIT</yellow>` | `3G{:ts}` | Memory limit for the container. |
| `<yellow>ADMIN_BOT_PIDS_LIMIT</yellow>` | `1024{:ts}` | Maximum processes and threads in the container. |

The tmpfs mounts and `/dev/shm` count against the memory limit. Their sizes add up to about `1.1G{:ts}` in the bundled file, so keep the memory limit well above that plus browser headroom.

Deployments that bypass the bundled Compose file should apply equivalent limits: browser resource use is controlled by participant-influenced pages, not by the worker.

## Challenge source

Admin bot challenge code exports a `Challenge{:ts}` instance. The loader only allows imports that resolve to the admin bot type module, such as `../src/types`, `../types`, `./types`, `./src/types`, `src/types`, and `types`.

This example restricts participant input to one challenge origin, stores the flag in browser local storage for that origin, visits the submitted URL, and writes a challenge log line:

```ts title="admin-bot.ts" showLineNumbers=false
import { sleep } from 'bun'
import { Challenge, type ChallengeContext } from '../src/types'

export const challenge = new Challenge({
  // required:
  timeoutMilliseconds: 30_000,

  inputs: {
    url: { pattern: '^http(s?)://.*' },
  },

  handler: async (ctx: ChallengeContext): Promise<void> => {
    const url = ctx.input.url!
    const page = await ctx.browserContext.newPage()

    ctx.output.info('challenge', 'hello from my challenge!', {
      optional: 'values',
      that: 'will be',
      displayed: 'separately!',
    })
    ctx.output.warn('challenge', 'warn!')
    ctx.output.error('challenge', 'error!')
    ctx.output.fatal('challenge', 'fatal!')

    try {
      await page.goto(url)
    } catch (e) {
      // Without this, the error propagated is that something went wrong.
      // Ideally, there would be automagic so you don't need to do this,
      //   but page navigations throw a normal error, and searching in a string is... ugly.
      // @see https://github.com/puppeteer/puppeteer/blob/main/packages/puppeteer-core/src/cdp/Frame.ts#L210-L212
      ctx.output.fatal('challenge', `failed to visit provided URL: ${e}`, {
        url,
      })
      return
    }
    await sleep(15_000)
    await page.close()
  },

  hooksConfig: {
    showConsoleLogs: true,
    showBrowserErrors: true,
    showNavigation: true,
    limitTabsNumber: -1, // no limit
  },

  // optional:
  browser: 'chrome',
  // vvv argv array. by default we apply some default argv values,
  //   but if you override this we'll not add anything to the list!
  browserArguments: undefined,
  browserVersion: 'stable',
  puppeteerLaunchOptionsExtra: undefined, // Record<string, unknown>
  // vvv Record<string, unknown>. by default we apply some default values,
  //  but if you override this we'll not add anything to this mapping!
  extraPrefsFirefox: undefined,

  maxLogValueChars: 4096, // limit number of characters within strings in logs
  maxLogLines: 64, // limit the number of lines stored per submission

  restrictDomains: {
    // note on case sensitivity:
    // - DNS `host` is lowercased and has one trailing root dot removed
    // - `url` param preserves the original casing of the path/query
    //
    // DNS is resolved and all answers are checked by the worker's proxy.
    // Domain rules cannot permit an address denied by the IP policy.

    // allow example.com, but not any other example.com subdomain
    host: {
      allowRegex: [{ pattern: '^example\\.com$' }],
      disallowRegex: [{ pattern: '^.*\\.example\\.com$' }],
    },
    // allow example.com/kek, but not any other urls on example.com
    url: {
      allowRegex: [{ pattern: 'example\\.com\\/kek' }],
      disallowRegex: [{ pattern: 'example\\.com' }],
    },
  },

  // 1. If challenge has no instancer configured, this value will be ignored.
  // 2. The values in `ChallengeContext.job.instancerInstances` will not be filled,
  //  unless this variable is set to true.
  // 3. This provides no guarantee that instances will still be alive by the time the handler executes,
  //  because the platform would not prevent someone from stopping the instance once the job is queued.
  requireInstancerInstancesRunning: false,
})
```

The worker validates `Challenge{:ts}` when an admin saves the challenge. Invalid regular expressions, missing exports, and unsupported imports appear as errors in the editor.

## Challenge config fields

The `Challenge{:ts}` constructor accepts these fields:

| Field | Required | Purpose |
| --- | --- | --- |
| `timeoutMilliseconds{:ts}` | Yes | Maximum time the handler may run. The worker fails the job on timeout. |
| `inputs{:ts}` | Yes | Map of participant input names to regex rules. Input names may be up to `256{:ts}` characters, and submitted values may be up to `1024{:ts}` characters. |
| `handler{:ts}` | Yes | Async function that receives a `ChallengeContext{:ts}` and drives the browser session. |
| `hooksConfig{:ts}` | Yes | Browser event logging and tab limit configuration. |
| `browser{:ts}` | No | Browser engine. The supported values are `chrome{:ts}` and `firefox{:ts}`. The default is `chrome{:ts}`. |
| `browserVersion{:ts}` | No | Browser build passed to `@puppeteer/browsers`. The default is `stable{:ts}`. |
| `browserArguments{:ts}` | No | Launch arguments. When set, this replaces the default Chrome arguments. |
| `puppeteerLaunchOptionsExtra{:ts}` | No | Extra Puppeteer launch options merged into the worker's launch call. |
| `extraPrefsFirefox{:ts}` | No | Firefox preference overrides merged between worker defaults and mandatory proxy/protocol controls. |
| `maxLogLines{:ts}` | No | Number of log lines buffered for this job. The default is `64{:ts}`. |
| `maxLogValueChars{:ts}` | No | Maximum string length in each log field. The default is `2048{:ts}`. |
| `restrictDomains{:ts}` | No | Host and URL allow or deny rules applied by the filtering proxy before DNS and address validation. |
| `requireInstancerInstancesRunning{:ts}` | No | Requires a running instancer instance before queuing the job and passes displayed endpoints into `ctx.job.instancerInstances{:ts}`. |

By default, Chrome starts with `<dim>--no-sandbox</dim>`, `<dim>--disable-jit</dim>`, `<dim>--disable-wasm</dim>`, and `<dim>--disable-dev-shm-usage</dim>`. Setting `browserArguments{:ts}` replaces those defaults, but it cannot replace the worker's enforced proxy, WebRTC, or QUIC switches. Firefox keeps its worker defaults and mandatory egress preferences when challenge preferences are merged.

## Challenge context

The handler receives a `ChallengeContext{:ts}`:

| Field | Purpose |
| --- | --- |
| `ctx.logger{:ts}` | Pino logger scoped to the running job. |
| `ctx.browserContext{:ts}` | Fresh Puppeteer browser context for the job. |
| `ctx.input{:ts}` | Participant input values after API-side regex validation. |
| `ctx.output{:ts}` | Structured log writer shown to participants and admins. |
| `ctx.job{:ts}` | Job metadata, including challenge ID, user ID, config revision, submitted time, per-team flags, and optional instancer endpoints. |

Use `ctx.output.info(){:ts}`, `ctx.output.warn(){:ts}`, `ctx.output.error(){:ts}`, and `ctx.output.fatal(){:ts}` for participant-visible logs:

```ts showLineNumbers=false
ctx.output.info('challenge', 'visited page', {
  url: ctx.input.url,
})
```

Stored logs are newline-delimited JSON. The API accepts up to `1048576{:ts}` characters of logs per completion or failure report, and older logs are pruned according to `adminBot.maxLogsPerUserChallenge{:yaml}`.

## Browser hooks

`hooksConfig{:ts}` controls automatic browser logging:

| Field | Behavior |
| --- | --- |
| `showConsoleLogs{:ts}` | Captures page, service worker, and extension console messages when supported by the browser. |
| `showBrowserErrors{:ts}` | Captures page errors and failed network requests. |
| `showNavigation{:ts}` | Captures tab creation, main-frame navigation, service worker creation, and tab close events. |
| `limitTabsNumber{:ts}` | Closes the browser when too many page targets are opened. Use `-1{:ts}` for no limit and `0{:ts}` to prevent page tabs. |

Chrome supports extension page logging and service worker console logging. Firefox doesn't support those two hook surfaces in the current worker.

## Browser egress filtering

Every browser launch gets a separate loopback filtering-proxy session, even when `restrictDomains{:ts}` is omitted. The proxy denies non-global destinations by default, including loopback, private, link-local, metadata, carrier-grade NAT, reserved and multicast space. It also blocks IPv4-compatible IPv6, IPv4-mapped private addresses, RFC 6052 NAT64, 6to4, and Teredo destinations.

The worker resolves hostnames itself and checks every returned address. If any answer is denied, the request is denied. It then connects only to the first vetted numeric address with the returned address family, closing the DNS-rebinding gap between checking a name and opening its socket. Domain rules cannot override an IP denial.

Plain HTTP must use an absolute `http:{:ts}` proxy URL. HTTPS and other TLS traffic use `CONNECT{:ts}`; the proxy evaluates its URL rules against only `https://host:port/{:ts}` because it cannot see encrypted paths or query strings. Browser WebSocket traffic over TLS uses the same CONNECT tunnel.

`restrictDomains{:ts}` adds regex rules on top of the address policy. Rules keep their existing first-match order: host allow, host deny, URL allow, then URL deny. The default domain decision is allow, after which address filtering still applies.

Use an allowlist plus a catch-all deny rule for challenges where the bot should only contact the challenge origin:

```ts showLineNumbers=false
restrictDomains: {
  host: {
    allowRegex: [{ pattern: '^challenge\\.example\\.com$' }],
    disallowRegex: [{ pattern: '.*' }],
  },
}
```

Hostnames are canonicalized before matching: DNS names are lowercased, one terminal root dot is removed, IPv6 brackets are removed, and zone identifiers are rejected. HTTP URLs are rebuilt with that canonical authority before URL rules run, so a trailing DNS root dot cannot select a different rule result.

Chrome is forced to use the session proxy without its implicit loopback bypass. Non-proxied WebRTC UDP and QUIC are disabled. Firefox uses manual HTTP and TLS proxy preferences with direct failover and bypasses disabled; WebRTC, HTTP/3, and WebTransport are also disabled. Challenge-supplied Puppeteer options, browser switches, and Firefox preferences cannot replace these controls.

Operators can add narrow exceptions with `<yellow>RCTF_EGRESS_ALLOW_PRIVATE_CIDRS</yellow>` or explicit denials with `<yellow>RCTF_EGRESS_DENY_CIDRS</yellow>`. Entries are trimmed comma-separated CIDRs and invalid values stop worker startup. Precedence is explicit deny, operator allow-private, then built-in special-address filtering. Keep exceptions limited to the exact service ranges that a challenge requires.

The boundary protects traffic initiated by participant-controlled browser content. Trusted challenge TypeScript and worker traffic to rCTF run outside the browser proxy, as do browser downloads.

:::note[Kubernetes defense in depth]
In Kubernetes, put the worker and rCTF API on a dedicated control-plane path and apply a `NetworkPolicy` that blocks metadata, node, pod, service, and other private ranges while allowing DNS, the rCTF API, and required public egress. The in-process proxy remains the primary browser boundary; network policy is recommended defense in depth for unusual runtime or CNI behavior.
:::

## Instancer integration

`requireInstancerInstancesRunning{:ts}` ties admin bot jobs to challenge instances. Before queueing the job, the API checks that the user's instance is running and that its remaining lifetime is at least `timeoutMilliseconds{:ts}`.

When the check passes, the handler receives displayed endpoints in `ctx.job.instancerInstances{:ts}`:

```ts showLineNumbers=false
for (const endpoint of ctx.job.instancerInstances) {
  ctx.output.info('challenge', 'instance endpoint', endpoint)
}
```

The check only happens before queueing. A participant can still stop the instance before the worker gets to the job, so handlers should tolerate failed connections and report a clear log message.

## Participant behavior

Released challenges expose `adminBotInputs{:ts}` in the public challenge list. The challenge page renders one field per configured input.

The participant-side API uses these endpoints:

| Method | Path | Purpose |
| --- | --- | --- |
| `<route>GET</route>` | `/api/v2/integrations/challs/:id/admin-bot/config` | Returns source code and file extension for the released challenge config. |
| `<route>POST</route>` | `/api/v2/integrations/challs/:id/admin-bot` | Validates inputs and queues a job. |
| `<route>GET</route>` | `/api/v2/integrations/challs/:id/admin-bot/status` | Returns the latest job, logs when present, and queue position while queued. |
| `<route>GET</route>` | `/api/v2/integrations/challs/:id/admin-bot/history` | Returns completed and failed jobs retained for the current user. |
| `<route>GET</route>` | `/api/v2/integrations/challs/:id/admin-bot/jobs/:jobId/logs` | Returns stored logs for one retained job. |

Each user can have one queued or running admin bot job per challenge. Submissions are rate-limited to one request every ten seconds per user and challenge.

## Service API

The worker uses the service-authenticated admin API:

| Method | Path | Purpose |
| --- | --- | --- |
| `<route>POST</route>` | `/api/v2/admin/admin-bot/jobs/pull` | Claims the oldest queued job. |
| `<route>GET</route>` | `/api/v2/admin/admin-bot/challenges/:id/source` | Fetches challenge source for the claimed revision. |
| `<route>POST</route>` | `/api/v2/admin/admin-bot/jobs/:id/complete` | Marks a running job as completed and stores logs. |
| `<route>POST</route>` | `/api/v2/admin/admin-bot/jobs/:id/fail` | Marks a running job as failed and stores logs. |
| `<route>GET</route>` | `/api/v2/admin/admin-bot/queue-depth` | Returns the number of queued jobs. |

Each worker process runs one job at a time. Multiple worker processes can poll the same API when more browser throughput is needed.

## Scaling under load

Admin bot jobs are bound by browser session throughput, not CPU. A worker spends most of its wall time waiting on Puppeteer (page loads, redirects, the configured timeout), so steady-state CPU stays low even when the queue is backing up. Autoscaling on CPU will react late and under-provision, so scale on **queue depth** instead.

`<route>GET /api/v2/admin/admin-bot/queue-depth</route>` returns the current queue length in `data.depth{:yaml}`. Start by targeting `2{:yaml}` to `5{:yaml}` waiting jobs per replica, then adjust the threshold based on job duration and browser resource use.

We are usually using [KEDA](https://keda.sh) for this. It can read this endpoint directly with its `metrics-api{:yaml}` scaler, so you do not need anything else.

A Kubernetes deployment can scale the worker with the following KEDA configuration.

1. Run the admin bot image as a normal `Deployment{:yaml}`.
2. Expose the worker with a `Service{:yaml}` and point `adminBot.provider.options.endpoint{:yaml}` at it, for example `http://adminbot.adminbot.svc.cluster.local:21337{:yaml}`.
3. Add a KEDA `TriggerAuthentication{:yaml}` and `ScaledObject{:yaml}` that use the same secret to poll queue depth.

The KEDA-specific pieces look like this:

```yaml title="KEDA admin bot scaler"
apiVersion: keda.sh/v1alpha1
kind: TriggerAuthentication
metadata:
  name: adminbot-platform
  namespace: adminbot
spec:
  secretTargetRef:
    - parameter: token
      name: adminbot-secrets
      key: RCTF_SECRET_KEY
---
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: adminbot
  namespace: adminbot
spec:
  scaleTargetRef:
    name: adminbot
  minReplicaCount: 1
  maxReplicaCount: 20
  pollingInterval: 10
  triggers:
    - type: metrics-api
      metadata:
        url: http://rctf-api.rctf.svc.cluster.local/api/v2/admin/admin-bot/queue-depth
        valueLocation: data.depth
        targetValue: "2"
        authMode: bearer
      authenticationRef:
        name: adminbot-platform
  advanced:
    horizontalPodAutoscalerConfig:
      behavior:
        scaleDown:
          stabilizationWindowSeconds: 300
```

Keep `minReplicaCount{:yaml}` at `1{:yaml}`. Setting it to `0{:yaml}` can still scale workers up for queued jobs, because KEDA polls rCTF directly, but the API's `/v1/test` config-validation call has no worker pod to hit while scaled down.
