---
title: Configuration
description: Complete reference for all rCTF configuration options including file-based config and environment variables.
order: 2
---

rCTF is configured through YAML or JSON files in a `rctf.d/{:dir}` directory and optional environment variable overrides.

## Configuration loading

By default, rCTF searches upward from `packages/config/{:dir}` for a directory named `rctf.d/{:dir}`. Set `<yellow>RCTF_CONF_PATH</yellow>` to use another directory.

rCTF loads `.yaml`, `.yml`, and `.json` files **alphabetically**, merging each file over the previous ones. This lets you separate base settings, providers, and deployment-specific overrides:

:::file-tree
- rctf.d/
  - 01-base.yaml Core settings
  - 02-providers.yaml Provider configuration
  - 03-overrides.yaml Environment-specific overrides
:::

Environment variables are applied last, overriding any file-based values.

## Environment variables

The following environment variables are supported. They override values from config files.

### Core

| Variable | Type | Description |
| --- | --- | --- |
| `<yellow>RCTF_NAME</yellow>` | `string{:ts}` | CTF display name |
| `<yellow>RCTF_ORIGIN</yellow>` | `string{:ts}` | CTF origin URL (e.g., `https://ctf.example.com`) |
| `<yellow>RCTF_TOKEN_KEY</yellow>` | `string{:ts}` | Base64-encoded 32-byte key for token encryption |
| `<yellow>RCTF_INSTANCE_TYPE</yellow>` | `string{:ts}` | `<green>all</green>`, `<green>frontend</green>`, or `<green>leaderboard</green>` |
| `<yellow>RCTF_SHUTDOWN_TIMEOUT</yellow>` | `integer{:ts}` | Graceful-shutdown cap in milliseconds before force-exit. `0` disables the cap. |
| `<yellow>RCTF_IDLE_TIMEOUT</yellow>` | `integer{:ts}` | Idle connection timeout in seconds (0-255) |
| `<yellow>RCTF_MAX_REQUEST_BODY_SIZE</yellow>` | `integer{:ts}` | Maximum accepted request body size in bytes |
| `<yellow>RCTF_UPLOAD_PROVIDER</yellow>` | `string{:ts}` | `<green>uploads/local</green>`, `<green>uploads/s3</green>`, or `<green>uploads/gcs</green>`. See [Uploads](/providers/uploads) for each provider's variables. |
| `<yellow>RCTF_CONF_PATH</yellow>` | `string{:ts}` | Path to config directory (overrides search) |

### Database

| Variable | Type | Description |
| --- | --- | --- |
| `<yellow>RCTF_DATABASE_URL</yellow>` | `string{:ts}` | PostgreSQL connection string |
| `<yellow>RCTF_DATABASE_HOST</yellow>` | `string{:ts}` | PostgreSQL host (if not using URL) |
| `<yellow>RCTF_DATABASE_PORT</yellow>` | `integer{:ts}` | PostgreSQL port |
| `<yellow>RCTF_DATABASE_USERNAME</yellow>` | `string{:ts}` | PostgreSQL user |
| `<yellow>RCTF_DATABASE_PASSWORD</yellow>` | `string{:ts}` | PostgreSQL password |
| `<yellow>RCTF_DATABASE_DATABASE</yellow>` | `string{:ts}` | PostgreSQL database name |
| `<yellow>RCTF_DATABASE_MIGRATE</yellow>` | `string{:ts}` | `<green>before</green>`, `<green>only</green>`, or `<green>never</green>` |
| `<yellow>RCTF_REDIS_URL</yellow>` | `string{:ts}` | Redis connection string |
| `<yellow>RCTF_REDIS_HOST</yellow>` | `string{:ts}` | Redis host (if not using URL) |
| `<yellow>RCTF_REDIS_PORT</yellow>` | `integer{:ts}` | Redis port |
| `<yellow>RCTF_REDIS_PASSWORD</yellow>` | `string{:ts}` | Redis password |
| `<yellow>RCTF_REDIS_DATABASE</yellow>` | `integer{:ts}` | Redis database number |

### Timing and auth

| Variable                          | Type           | Description                                |
| --------------------------------- | -------------- | ------------------------------------------ |
| `<yellow>RCTF_START_TIME</yellow>`            | `integer{:ts}` | Competition start time (Unix milliseconds) |
| `<yellow>RCTF_END_TIME</yellow>`              | `integer{:ts}` | Competition end time (Unix milliseconds)   |
| `<yellow>RCTF_LOGIN_TIMEOUT</yellow>`         | `integer{:ts}` | Verification token expiry in milliseconds  |
| `<yellow>RCTF_USER_MEMBERS</yellow>`          | `boolean{:ts}` | Enable team members feature                |
| `<yellow>RCTF_CTFTIME_CLIENT_ID</yellow>`     | `string{:ts}`  | CTFtime OAuth client ID                    |
| `<yellow>RCTF_CTFTIME_CLIENT_SECRET</yellow>` | `string{:ts}`  | CTFtime OAuth client secret                |

### UI and meta

| Variable | Type | Description |
| --- | --- | --- |
| `<yellow>RCTF_HOME_CONTENT</yellow>` | `string{:ts}` | Home page markdown content |
| `<yellow>RCTF_FAVICON_URL</yellow>` | `string{:ts}` | Favicon URL |
| `<yellow>RCTF_META_DESCRIPTION</yellow>` | `string{:ts}` | Meta description |
| `<yellow>RCTF_IMAGE_URL</yellow>` | `string{:ts}` | Meta image URL |
| `<yellow>RCTF_GLOBAL_SITE_TAG</yellow>` | `string{:ts}` | Google Analytics tag. Deprecated and auto-converted to `<red>analytics.provider</red>` at startup. See [Upgrading from v1](/installation/upgrading#analytics-provider). |

### Email

| Variable                    | Type          | Description                 |
| --------------------------- | ------------- | --------------------------- |
| `<yellow>RCTF_EMAIL_FROM</yellow>`      | `string{:ts}` | Email sender address        |
| `<yellow>RCTF_EMAIL_LOGO_URL</yellow>`  | `string{:ts}` | Logo URL in email templates |

### Leaderboard

| Variable                                  | Type           | Description                      |
| ----------------------------------------- | -------------- | -------------------------------- |
| `<yellow>RCTF_LEADERBOARD_MAX_LIMIT</yellow>`         | `integer{:ts}` | Max teams per leaderboard page   |
| `<yellow>RCTF_LEADERBOARD_MAX_OFFSET</yellow>`        | `integer{:ts}` | Max leaderboard offset           |
| `<yellow>RCTF_LEADERBOARD_UPDATE_INTERVAL</yellow>`   | `integer{:ts}` | Leaderboard recalc interval (ms) |
| `<yellow>RCTF_LEADERBOARD_GRAPH_MAX_TEAMS</yellow>`   | `integer{:ts}` | Max teams on score graph         |
| `<yellow>RCTF_LEADERBOARD_GRAPH_SAMPLE_TIME</yellow>` | `integer{:ts}` | Graph sample interval (ms)       |

:::note
Boolean environment variables accept `<green>true</green>`, `<green>yes</green>`, `<green>y</green>`, or `<green>1</green>` as truthy values. Anything else is treated as false.
:::

## Configuration reference

Below is the complete reference of all configuration options available in `rctf.d/{:dir}` files.

### Core settings

```yaml
ctfName: My CTF # CTF display name (required)
origin: https://ctf.example.com # Public origin URL (required)
tokenKey: <base64-32-byte-key> # Token encryption key (required)
instanceType: all # all | frontend | leaderboard
shutdownTimeout: 30000 # Graceful-shutdown cap in ms
idleTimeout: 65 # Idle connection timeout in seconds
maxRequestBodySize: 1073741824 # Maximum request body size in bytes
```

| Field | Type | Default | Description |
| --- | --- | --- | --- |
| `<red>ctfName</red>` | `string{:ts}` | - | Display name of your CTF |
| `<red>origin</red>` | `string{:ts}` | - | Public URL of your CTF (no trailing slash) |
| `<red>tokenKey</red>` | `string{:ts}` | - | Base64-encoded 32-byte key for AES-GCM token encryption |
| `<red>instanceType</red>` | `string{:ts}` | `<green>all</green>` | Controls which components run: `<green>all</green>` (API + leaderboard worker), `<green>frontend</green>` (API only), `<green>leaderboard</green>` (worker only). See [Scaling](/installation/scaling) before splitting roles. |
| `<red>shutdownTimeout</red>` | `number{:ts}` | `30000{:ts}` (30s) | Time in milliseconds to drain in-flight requests and stop the leaderboard worker on `SIGTERM{:sh}`/`SIGINT{:sh}` before the process force-exits. `0{:ts}` disables the force-exit cap. See [Scaling](/installation/scaling#graceful-shutdown). |
| `<red>idleTimeout</red>` | `number{:ts}` | `65{:ts}` | How long in seconds an idle connection stays open before the server closes it. Set it higher than your reverse proxy's keep-alive timeout. Bun limits this value to `255{:ts}`, and rCTF rejects larger values at startup. Set it to `0{:ts}` to disable the timeout. |
| `<red>maxRequestBodySize</red>` | `number{:ts}` | `1073741824{:ts}` (1 GiB) | Maximum request body size accepted by the Bun API server. This is the effective backend cap for upload routes when the bundled nginx config sets `<red>client_max_body_size</red>` to `<green>0</green>` for streaming uploads. |

:::warning
The `<red>tokenKey</red>` is critical for security. All authentication tokens are encrypted with this key. If it is lost or changed, all existing tokens become invalid and users will need to re-authenticate.
:::

### Database

```yaml
database:
  sql: postgres://user:password@localhost:5432/rctf
  redis: redis://localhost:6379
  migrate: never
```

The `<red>sql</red>` field accepts either a connection string or an object:

```yaml
database:
  sql:
    host: localhost
    port: 5432
    user: rctf
    password: secret
    database: rctf
    maxPoolSize: 100 # Default: 100
    idleTimeout: 30000 # Default: 30000 (ms)
    connectTimeout: 3000 # Default: 3000 (ms)
```

The `<red>redis</red>` field accepts either a connection string or an object:

```yaml
database:
  redis:
    host: localhost
    port: 6379
    password: secret # Optional
    database: 0 # Optional, default 0
```

| Field | Type | Default | Description |
| --- | --- | --- | --- |
| `<red>database.sql</red>` | `string{:ts}` \| `object{:ts}` | - | PostgreSQL connection (required) |
| `<red>database.redis</red>` | `string{:ts}` \| `object{:ts}` | - | Redis connection (required) |
| `<red>database.migrate</red>` | `string{:ts}` | `<green>never</green>` | `<green>before</green>` runs migrations on startup, `<green>only</green>` runs migrations and exits, `<green>never</green>` skips |

### Timing

```yaml
startTime: 1735689600000 # January 1, 2025 00:00 UTC
endTime: 1735776000000 # January 2, 2025 00:00 UTC
```

| Field | Type | Default | Description |
| --- | --- | --- | --- |
| `<red>startTime</red>` | `number{:ts}` | - | Competition start time in Unix milliseconds (required) |
| `<red>endTime</red>` | `number{:ts}` | - | Competition end time in Unix milliseconds (required) |

:::tip
To convert a date to Unix milliseconds: `$ <red>date</red> <dim>-d</dim> <green>"2025-01-01T00:00:00Z"</green> +%s000` or use `new Date('2025-01-01T00:00:00Z').getTime(){:ts}` in JavaScript.
:::

### Divisions

```yaml
divisions:
  open: Open
  student: Student
defaultDivision: open
divisionACLs:
  - match: domain
    value: example.edu
    divisions: [student, open]
  - match: any
    value: ''
    divisions: [open]
```

| Field | Type | Default | Description |
| --- | --- | --- | --- |
| `<red>divisions</red>` | `object{:ts}` | `{ open: "Open" }{:ts}` | Map of division ID to display name |
| `<red>defaultDivision</red>` | `string{:ts}` | - | Default division for new users (optional) |
| `<red>divisionACLs</red>` | `array{:ts}` | - | Access control rules for divisions (optional) |

#### Division ACLs

ACLs control which divisions a user can register for based on their email. Each ACL entry has:

| Field | Description |
| --- | --- |
| `<red>match</red>` | Match type: `<green>domain</green>`, `<green>email</green>`, `<green>regex</green>`, or `<green>any</green>` |
| `<red>value</red>` | Value to match. For a domain rule, use the full domain after `@`, such as `example.edu`. Email rules take the full address, regex rules take a pattern, and `<green>any</green>` uses an empty value. |
| `<red>divisions</red>` | Array of division IDs this rule grants access to |

A user receives the divisions from **every** matching rule, regardless of order. A `<green>domain</green>` rule matches the full domain exactly. For example, `<green>example.edu</green>` matches `alice@example.edu` but not `alice@sub.example.edu`.

:::warning[Email provider required, disable CTFtime auth]
Division ACLs require an email provider. Disable CTFtime authentication when using them because CTFtime sign-ins bypass the ACLs and can select any division.
:::

### Authentication

```yaml
registrationsEnabled: true
userMembers: true
maxMembers: 50
loginTimeout: 3600000
ctftime:
  clientId: '12345'
  clientSecret: your-secret
```

| Field | Type | Default | Description |
| --- | --- | --- | --- |
| `<red>registrationsEnabled</red>` | `boolean{:ts}` | `true{:ts}` | Whether new registrations are allowed |
| `<red>userMembers</red>` | `boolean{:ts}` | `true{:ts}` | Enable team members feature |
| `<red>maxMembers</red>` | `number{:ts}` | `50{:ts}` | Maximum members per team |
| `<red>loginTimeout</red>` | `number{:ts}` | `3600000{:ts}` | Verification/CTFtime token expiry in milliseconds (1 hour) |
| `<red>ctftime.clientId</red>` | `string{:ts}` | - | CTFtime OAuth client ID (numeric string) |
| `<red>ctftime.clientSecret</red>` | `string{:ts}` | - | CTFtime OAuth client secret |

:::note
Auth tokens (used for logging in) never expire. Only verification and CTFtime tokens expire according to `<red>loginTimeout</red>`.
:::

### Captcha

```yaml
captcha:
  provider:
    name: captcha/turnstile
    options:
      siteKey: your-site-key
      secretKey: your-secret-key
  protectedEndpoints:
    - register
    - recover
```

| Field | Type | Default | Description |
| --- | --- | --- | --- |
| `<red>captcha.provider</red>` | `object{:ts}` | - | Captcha provider config (`<red>name</red>` + `<red>options</red>`) |
| `<red>captcha.protectedEndpoints</red>` | `array{:ts}` | - | List of actions requiring captcha |

Available captcha actions: `<green>register</green>`, `<green>recover</green>`, `<green>setEmail</green>`, `<green>instancerStart</green>`, `<green>instancerExtend</green>`, `<green>avatarUpload</green>`, `<green>adminBotSubmit</green>`.

See [Captcha Providers](/providers/captcha) for provider-specific configuration.

### Providers

```yaml
uploadProvider:
  name: uploads/s3
  options:
    bucketName: my-bucket
    awsKeyId: AKIAIOSFODNN7EXAMPLE
    awsKeySecret: wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
    awsRegion: us-east-1
scoreProvider:
  name: scores/classic
instancers:
  docker:
    name: instancer/docker-instancer
    options:
      apiUrl: http://localhost:8000
      authToken: secret
  k8s:
    name: instancer/k8s-instancer
    options:
      apiUrl: https://k8s.example.com
      authToken: <service-account-token>
  k8s-arm:
    name: instancer/k8s-instancer
    options:
      apiUrl: https://k8s-arm.example.com
      authToken: <service-account-token>
defaultInstancer: k8s
```

| Field | Type | Default | Description |
| --- | --- | --- | --- |
| `<red>uploadProvider</red>` | `object{:ts}` | `{ name: "uploads/local" }{:ts}` | File upload provider |
| `<red>scoreProvider</red>` | `object{:ts}` | `{ name: "scores/classic" }{:ts}` | Scoring algorithm provider |
| `<red>instancers</red>` | `object{:ts}` | - | Map of named challenge instancer providers (optional). Each key is an instancer name a challenge can target. |
| `<red>defaultInstancer</red>` | `string{:ts}` | - | Name of the instancer used when a challenge doesn't pick one. Required when more than one instancer is defined. When there is only one, rCTF selects it automatically. |

See the [Providers](/providers) section for detailed configuration of each provider.

### Admin bot

```yaml
adminBot:
  provider:
    name: admin-bot/rctf-js
    options: {}
  maxLogsPerUserChallenge: 5
```

| Field | Type | Default | Description |
| --- | --- | --- | --- |
| `<red>adminBot.provider</red>` | `object{:ts}` | - | Admin bot provider config |
| `<red>adminBot.maxLogsPerUserChallenge</red>` | `integer{:ts}` | `5{:ts}` | Max stored log entries per user per challenge |

### Email

```yaml
email:
  provider:
    name: emails/smtp
    options:
      smtpUrl: smtp://user:pass@mail.example.com:587
  from: noreply@example.com
  logoUrl: https://example.com/email-logo.png
```

| Field | Type | Default | Description |
| --- | --- | --- | --- |
| `<red>email.provider</red>` | `object{:ts}` | - | Email provider config |
| `<red>email.from</red>` | `string{:ts}` | - | Sender email address (required if email enabled) |
| `<red>email.logoUrl</red>` | `string{:ts}` | - | Logo URL for email templates. Falls back to the top-level light and dark logos when unset. |

See [Email Providers](/providers/emails) for provider-specific options.

### UI

```yaml
homeContent: |
  Welcome to My CTF!

  **Markdown** is supported.
sponsors:
  - name: Sponsor Name
    icon: https://example.com/sponsor.png
    description: Sponsor description
    url: https://sponsor.com
meta:
  description: A cool CTF competition
  imageUrl: https://example.com/banner.png
faviconUrl: https://example.com/favicon.ico
logoLightUrl: https://example.com/logo-light.svg
logoDarkUrl: https://example.com/logo-dark.svg
flagFormatPlaceholder: 'flag{[\x20-\x7e]+}'
```

| Field | Type | Default | Description |
| --- | --- | --- | --- |
| `<red>homeContent</red>` | `string{:ts}` | `"Home content. Markdown supported."{:ts}` | Home page content (Markdown) |
| `<red>sponsors</red>` | `array{:ts}` | `[]{:json}` | List of sponsors (`<red>name</red>`, `<red>icon</red>`, `<red>description</red>`, `<red>url</red>`) |
| `<red>meta.description</red>` | `string{:ts}` | `"rCTF event description"{:ts}` | HTML meta description |
| `<red>meta.imageUrl</red>` | `string{:ts}` | `""{:ts}` | HTML meta image URL |
| `<red>faviconUrl</red>` | `string{:ts}` | rCTF default | Favicon URL |
| `<red>logoLightUrl</red>` | `string{:ts}` | `""{:ts}` | Logo for light mode |
| `<red>logoDarkUrl</red>` | `string{:ts}` | `""{:ts}` | Logo for dark mode |
| `<red>flagFormatPlaceholder</red>` | `string{:ts}` | `"flag{[\\x20-\\x7e]+}"{:ts}` | Flag format hint shown to participants |

:::tip
The admin settings API can update `<red>ctfName</red>`, event timing, homepage content, sponsors, metadata, favicon, and logos without restarting rCTF.
:::

### Analytics

```yaml
analytics:
  provider:
    name: analytics/google
    options:
      siteTag: G-XXXXXXXXX
```

| Field | Type | Default | Description |
| --- | --- | --- | --- |
| `<red>analytics.provider</red>` | `object{:ts}` | - | Analytics provider (`<green>analytics/google</green>`, `<green>analytics/cloudflare</green>`) |

### Limits

```yaml
maxAvatarSize: 1048576 # 1 MB
leaderboard:
  maxLimit: 100
  maxOffset: 4294967296
  updateInterval: 30000
  graphMaxTeams: 10
  graphSampleTime: 1800000
  graphWithListLimit: 100
```

| Field | Type | Default | Description |
| --- | --- | --- | --- |
| `<red>maxAvatarSize</red>` | `number{:ts}` | `1048576{:ts}` (1 MB) | Maximum avatar upload size in bytes |
| `<red>leaderboard.maxLimit</red>` | `number{:ts}` | `100{:ts}` | Max teams returned per leaderboard request |
| `<red>leaderboard.maxOffset</red>` | `number{:ts}` | `4294967296{:ts}` | Max pagination offset |
| `<red>leaderboard.updateInterval</red>` | `number{:ts}` | `30000{:ts}` (30s) | Leaderboard recalculation interval in ms |
| `<red>leaderboard.graphMaxTeams</red>` | `number{:ts}` | `10{:ts}` | Max teams displayed on score graph |
| `<red>leaderboard.graphSampleTime</red>` | `number{:ts}` | `1800000{:ts}` (30min) | Time between graph data points in ms |
| `<red>leaderboard.graphWithListLimit</red>` | `number{:ts}` | `100{:ts}` | Max teams for combined leaderboard + graph endpoint |

### Moderation

```yaml
avatarsModeration:
  provider:
    name: moderation/openai
    options:
      apiKey: sk-...
  allowOnInternalError: true
```

| Field | Type | Default | Description |
| --- | --- | --- | --- |
| `<red>avatarsModeration.provider</red>` | `object{:ts}` | - | Moderation provider for avatar uploads |
| `<red>avatarsModeration.allowOnInternalError</red>` | `boolean{:ts}` | `true{:ts}` | Allow avatar upload if moderation API fails |

See [Moderation Providers](/providers/moderation) for details.

### Proxy

```yaml
proxy:
  cloudflare: true
  trust: loopback
```

| Field | Type | Default | Description |
| --- | --- | --- | --- |
| `<red>proxy.cloudflare</red>` | `boolean{:ts}` | `false{:ts}` | Trust Cloudflare `CF-Connecting-IP` header for client IP |
| `<red>proxy.trust</red>` | `boolean{:ts}` \| `string{:ts}` \| `string[]{:ts}` \| `number{:ts}` | `'loopback'{:ts}` | Proxy trust setting for `X-Forwarded-For`. `true{:ts}` trusts all, a number trusts the first N hops, a string or array specifies trusted CIDR ranges or the named subnets `loopback{:ts}`, `linklocal{:ts}`, `uniquelocal{:ts}` |

:::warning
Behind Cloudflare, set `<red>proxy.cloudflare</red>` to `true{:ts}` so logs and rate limits use the participant's IP. For any other reverse proxy, configure `<red>proxy.trust</red>` with the proxies rCTF should trust.
:::

### Blood bot

```yaml
bloodBot:
  bloodsCount: 3
  destinations:
    - provider:
        name: messages/discord
        options:
          url: https://discord.com/api/webhooks/...
      bloodEmojis:
        - '<:rank1:1008801500736266261>'
        - '<:rank2:1008801501776449738>'
        - '<:rank3:1008801503080874056>'
      messageTemplate: '{{bloodEmoji}} {{bloodNumTitle}} solve for challenge "**{{challengeName}}**" goes to **{{teamName}}**!'
    - provider:
        name: messages/telegram
        options:
          botToken: '123456:ABC-DEF...'
          chatId: '-1001234567890'
```

| Field | Type | Default | Description |
| --- | --- | --- | --- |
| `<red>bloodBot.bloodsCount</red>` | `number{:ts}` | `1{:ts}` | Number of blood tiers to announce (1-3) |
| `<red>bloodBot.destinations</red>` | `array{:ts}` | - | At least one destination (required) |
| `<red>bloodBot.destinations[].provider</red>` | `object{:ts}` | - | Messages provider config |
| `<red>bloodBot.destinations[].bloodEmojis</red>` | `string[]{:ts}` | `[]{:ts}` | Optional blood emoji for this destination |
| `<red>bloodBot.destinations[].messageTemplate</red>` | `string{:ts}` | - | Custom message template (optional) |

Available template variables: `{{teamName}}`, `{{teamUrl}}`, `{{bloodEmoji}}`, `{{bloodNumber}}`, `{{bloodNumOrdinal}}`, `{{bloodNumSentence}}`, `{{bloodNumWord}}`, `{{bloodNumTitle}}`, `{{challengeCategory}}`, `{{challengeName}}`.

See [Blood Bot](/integrations/bloodbot) for more details.

## Complete example

```yaml title="rctf.d/01-base.yaml"
ctfName: Example CTF 2025
origin: https://ctf.example.com
tokenKey: dGhpcyBpcyBhIGJhc2U2NCBrZXkgZXhhbXBsZSE=

database:
  sql: postgres://rctf:password@localhost:5432/rctf
  redis: redis://localhost:6379
  migrate: before

startTime: 1735689600000
endTime: 1735776000000

divisions:
  open: Open
  student: Student
defaultDivision: open
divisionACLs:
  - match: domain
    value: edu
    divisions: [student, open]
  - match: any
    value: ''
    divisions: [open]

captcha:
  provider:
    name: captcha/turnstile
    options:
      siteKey: 0x4AAAAAAA...
      secretKey: 0x4AAAAAAA...
  protectedEndpoints:
    - register
    - recover

email:
  provider:
    name: emails/smtp
    options:
      smtpUrl: smtp://user:pass@mail.example.com:587
  from: noreply@example.com

uploadProvider:
  name: uploads/s3
  options:
    bucketName: ctf-uploads
    awsKeyId: AKIAIOSFODNN7EXAMPLE
    awsKeySecret: wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
    awsRegion: us-east-1

proxy:
  cloudflare: true

bloodBot:
  bloodsCount: 3
  destinations:
    - provider:
        name: messages/discord
        options:
          url: https://discord.com/api/webhooks/123/abc
      bloodEmojis:
        - '<:rank1:1008801500736266261>'
        - '<:rank2:1008801501776449738>'
        - '<:rank3:1008801503080874056>'
      messageTemplate: '{{bloodEmoji}} {{bloodNumTitle}} solve for challenge "**{{challengeName}}**" goes to **{{teamName}}**!'
```
