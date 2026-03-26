---
title: Configuration
description: Complete reference for all rCTF configuration options including file-based config and environment variables.
---

rCTF is configured through YAML or JSON files in a `rctf.d/` directory and optional environment variable overrides.

## Configuration loading

Configuration is loaded from a directory named `rctf.d/`. The loader searches upward from the `packages/config/` directory, or you can specify a path via the `RCTF_CONF_PATH` environment variable.

All files in the directory (`.yaml`, `.yml`, or `.json`) are loaded **alphabetically** and deep-merged in order. This allows you to split configuration across multiple files for organization:

```
rctf.d/
  01-base.yaml         # Core settings
  02-providers.yaml    # Provider configuration
  03-overrides.yaml    # Environment-specific overrides
```

Environment variables are applied last, overriding any file-based values.

## Environment variables

The following environment variables are supported. They override values from config files.

### Core

| Variable             | Type   | Description                                      |
| -------------------- | ------ | ------------------------------------------------ |
| `RCTF_NAME`          | string | CTF display name                                 |
| `RCTF_ORIGIN`        | string | CTF origin URL (e.g., `https://ctf.example.com`) |
| `RCTF_TOKEN_KEY`     | string | Base64-encoded 32-byte key for token encryption  |
| `RCTF_INSTANCE_TYPE` | string | `all`, `frontend`, or `leaderboard`              |
| `RCTF_CONF_PATH`     | string | Path to config directory (overrides search)      |

### Database

| Variable                 | Type    | Description                        |
| ------------------------ | ------- | ---------------------------------- |
| `RCTF_DATABASE_URL`      | string  | PostgreSQL connection string       |
| `RCTF_DATABASE_HOST`     | string  | PostgreSQL host (if not using URL) |
| `RCTF_DATABASE_PORT`     | integer | PostgreSQL port                    |
| `RCTF_DATABASE_USERNAME` | string  | PostgreSQL user                    |
| `RCTF_DATABASE_PASSWORD` | string  | PostgreSQL password                |
| `RCTF_DATABASE_DATABASE` | string  | PostgreSQL database name           |
| `RCTF_DATABASE_MIGRATE`  | string  | `before`, `only`, or `never`       |
| `RCTF_REDIS_URL`         | string  | Redis connection string            |
| `RCTF_REDIS_HOST`        | string  | Redis host (if not using URL)      |
| `RCTF_REDIS_PORT`        | integer | Redis port                         |
| `RCTF_REDIS_PASSWORD`    | string  | Redis password                     |
| `RCTF_REDIS_DATABASE`    | integer | Redis database number              |

### Timing and auth

| Variable                     | Type    | Description                                |
| ---------------------------- | ------- | ------------------------------------------ |
| `RCTF_START_TIME`            | integer | Competition start time (Unix milliseconds) |
| `RCTF_END_TIME`              | integer | Competition end time (Unix milliseconds)   |
| `RCTF_LOGIN_TIMEOUT`         | integer | Verification token expiry in milliseconds  |
| `RCTF_USER_MEMBERS`          | boolean | Enable team members feature                |
| `RCTF_CTFTIME_CLIENT_ID`     | string  | CTFtime OAuth client ID                    |
| `RCTF_CTFTIME_CLIENT_SECRET` | string  | CTFtime OAuth client secret                |

### UI and meta

| Variable                | Type   | Description                                                 |
| ----------------------- | ------ | ----------------------------------------------------------- |
| `RCTF_HOME_CONTENT`     | string | Home page markdown content                                  |
| `RCTF_FAVICON_URL`      | string | Favicon URL                                                 |
| `RCTF_META_DESCRIPTION` | string | Meta description                                            |
| `RCTF_IMAGE_URL`        | string | Meta image URL                                              |
| `RCTF_GLOBAL_SITE_TAG`  | string | Google Analytics tag (deprecated, use `analytics.provider`) |

### Email

| Variable              | Type   | Description                 |
| --------------------- | ------ | --------------------------- |
| `RCTF_EMAIL_FROM`     | string | Email sender address        |
| `RCTF_EMAIL_LOGO_URL` | string | Logo URL in email templates |

### Leaderboard

| Variable                             | Type    | Description                      |
| ------------------------------------ | ------- | -------------------------------- |
| `RCTF_LEADERBOARD_MAX_LIMIT`         | integer | Max teams per leaderboard page   |
| `RCTF_LEADERBOARD_MAX_OFFSET`        | integer | Max leaderboard offset           |
| `RCTF_LEADERBOARD_UPDATE_INTERVAL`   | integer | Leaderboard recalc interval (ms) |
| `RCTF_LEADERBOARD_GRAPH_MAX_TEAMS`   | integer | Max teams on score graph         |
| `RCTF_LEADERBOARD_GRAPH_SAMPLE_TIME` | integer | Graph sample interval (ms)       |

:::note
Boolean environment variables accept `true`, `yes`, `y`, or `1` as truthy values. Anything else is treated as false.
:::

## Configuration reference

Below is the complete reference of all configuration options available in `rctf.d/` files.

### Core settings

```yaml
ctfName: My CTF # CTF display name (required)
origin: https://ctf.example.com # Public origin URL (required)
tokenKey: <base64-32-byte-key> # Token encryption key (required)
instanceType: all # all | frontend | leaderboard
```

| Field          | Type   | Default | Description                                                                                                         |
| -------------- | ------ | ------- | ------------------------------------------------------------------------------------------------------------------- |
| `ctfName`      | string | -       | Display name of your CTF                                                                                            |
| `origin`       | string | -       | Public URL of your CTF (no trailing slash)                                                                          |
| `tokenKey`     | string | -       | Base64-encoded 32-byte key for AES-GCM token encryption                                                             |
| `instanceType` | string | `all`   | Controls which components run: `all` (API + leaderboard worker), `frontend` (API only), `leaderboard` (worker only) |

:::caution
The `tokenKey` is critical for security. All authentication tokens are encrypted with this key. If it is lost or changed, all existing tokens become invalid and users will need to re-authenticate.
:::

### Database

```yaml
database:
  sql: postgres://user:password@localhost:5432/rctf
  redis: redis://localhost:6379
  migrate: never
```

The `sql` field accepts either a connection string or an object:

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

The `redis` field accepts either a connection string or an object:

```yaml
database:
  redis:
    host: localhost
    port: 6379
    password: secret # Optional
    database: 0 # Optional, default 0
```

| Field              | Type             | Default | Description                                                                          |
| ------------------ | ---------------- | ------- | ------------------------------------------------------------------------------------ |
| `database.sql`     | string \| object | -       | PostgreSQL connection (required)                                                     |
| `database.redis`   | string \| object | -       | Redis connection (required)                                                          |
| `database.migrate` | string           | `never` | `before` runs migrations on startup, `only` runs migrations and exits, `never` skips |

### Timing

```yaml
startTime: 1735689600000 # January 1, 2025 00:00 UTC
endTime: 1735776000000 # January 2, 2025 00:00 UTC
```

| Field       | Type   | Default | Description                                            |
| ----------- | ------ | ------- | ------------------------------------------------------ |
| `startTime` | number | -       | Competition start time in Unix milliseconds (required) |
| `endTime`   | number | -       | Competition end time in Unix milliseconds (required)   |

:::tip
To convert a date to Unix milliseconds: `date -d "2025-01-01T00:00:00Z" +%s000` or use `new Date('2025-01-01T00:00:00Z').getTime()` in JavaScript.
:::

### Divisions

```yaml
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
```

| Field             | Type   | Default            | Description                                   |
| ----------------- | ------ | ------------------ | --------------------------------------------- |
| `divisions`       | object | `{ open: "Open" }` | Map of division ID to display name            |
| `defaultDivision` | string | -                  | Default division for new users (optional)     |
| `divisionACLs`    | array  | -                  | Access control rules for divisions (optional) |

#### Division ACLs

ACLs control which divisions a user can register for based on their email. Each ACL entry has:

| Field       | Description                                                                            |
| ----------- | -------------------------------------------------------------------------------------- |
| `match`     | Match type: `domain`, `email`, `regex`, or `any`                                       |
| `value`     | Value to match against (domain suffix, exact email, regex pattern, or empty for `any`) |
| `divisions` | Array of division IDs this rule grants access to                                       |

ACL rules are evaluated in order. The first matching rule determines the user's allowed divisions.

:::note
Division ACLs only apply when an email provider is configured. If CTFtime authentication is enabled, ACLs are bypassed entirely - all divisions become available.
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

| Field                  | Type    | Default   | Description                                                |
| ---------------------- | ------- | --------- | ---------------------------------------------------------- |
| `registrationsEnabled` | boolean | `true`    | Whether new registrations are allowed                      |
| `userMembers`          | boolean | `true`    | Enable team members feature                                |
| `maxMembers`           | number  | `50`      | Maximum members per team                                   |
| `loginTimeout`         | number  | `3600000` | Verification/CTFtime token expiry in milliseconds (1 hour) |
| `ctftime.clientId`     | string  | -         | CTFtime OAuth client ID (numeric string)                   |
| `ctftime.clientSecret` | string  | -         | CTFtime OAuth client secret                                |

:::note
Auth tokens (used for logging in) never expire. Only verification and CTFtime tokens expire according to `loginTimeout`.
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

| Field                        | Type   | Default | Description                                  |
| ---------------------------- | ------ | ------- | -------------------------------------------- |
| `captcha.provider`           | object | -       | Captcha provider config (`name` + `options`) |
| `captcha.protectedEndpoints` | array  | -       | List of actions requiring captcha            |

Available captcha actions: `register`, `recover`, `setEmail`, `instancerStart`, `instancerExtend`, `avatarUpload`, `adminBotSubmit`.

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
instancerProvider:
  name: instancer/docker-instancer
  options:
    apiUrl: http://localhost:8000
    authToken: secret
```

| Field               | Type   | Default                      | Description                             |
| ------------------- | ------ | ---------------------------- | --------------------------------------- |
| `uploadProvider`    | object | `{ name: "uploads/local" }`  | File upload provider                    |
| `scoreProvider`     | object | `{ name: "scores/classic" }` | Scoring algorithm provider              |
| `instancerProvider` | object | -                            | Challenge instancer provider (optional) |

See the [Providers](/providers) section for detailed configuration of each provider.

### Admin bot

```yaml
adminBot:
  provider:
    name: admin-bot/rctf-js
    options: {}
  maxLogsPerUserChallenge: 5
```

| Field                              | Type    | Default | Description                                   |
| ---------------------------------- | ------- | ------- | --------------------------------------------- |
| `adminBot.provider`                | object  | -       | Admin bot provider config                     |
| `adminBot.maxLogsPerUserChallenge` | integer | `5`     | Max stored log entries per user per challenge |

### Email

```yaml
email:
  provider:
    name: emails/smtp
    options:
      smtpUrl: smtp://user:pass@mail.example.com:587
  from: noreply@example.com
  logoUrl: https://example.com/logo.png
```

| Field            | Type   | Default | Description                                      |
| ---------------- | ------ | ------- | ------------------------------------------------ |
| `email.provider` | object | -       | Email provider config                            |
| `email.from`     | string | -       | Sender email address (required if email enabled) |
| `email.logoUrl`  | string | -       | Logo URL for email templates (optional)          |

:::note
Email is required for account registration when CTFtime auth is not configured. It is also needed for account recovery and email-based division ACLs.
:::

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

| Field                   | Type   | Default                               | Description                                              |
| ----------------------- | ------ | ------------------------------------- | -------------------------------------------------------- |
| `homeContent`           | string | `"Home content. Markdown supported."` | Home page content (Markdown)                             |
| `sponsors`              | array  | `[]`                                  | List of sponsors (`name`, `icon`, `description`, `url?`) |
| `meta.description`      | string | `"rCTF event description"`            | HTML meta description                                    |
| `meta.imageUrl`         | string | `""`                                  | HTML meta image URL                                      |
| `faviconUrl`            | string | rCTF default                          | Favicon URL                                              |
| `logoLightUrl`          | string | `""`                                  | Logo for light mode                                      |
| `logoDarkUrl`           | string | `""`                                  | Logo for dark mode                                       |
| `flagFormatPlaceholder` | string | `"flag{[\\x20-\\x7e]+}"`              | Flag format hint shown to participants                   |

:::tip
Most UI settings (`ctfName`, `homeContent`, `sponsors`, `meta`, `faviconUrl`, `logoLightUrl`, `logoDarkUrl`) can also be changed at runtime through the admin settings API without restarting the server.
:::

### Analytics

```yaml
analytics:
  provider:
    name: analytics/plausible
    options:
      domain: ctf.example.com
      src: https://plausible.io/js/script.js
```

| Field                | Type   | Default | Description                                                                            |
| -------------------- | ------ | ------- | -------------------------------------------------------------------------------------- |
| `analytics.provider` | object | -       | Analytics provider (`analytics/google`, `analytics/cloudflare`, `analytics/plausible`) |

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

| Field                            | Type   | Default           | Description                                         |
| -------------------------------- | ------ | ----------------- | --------------------------------------------------- |
| `maxAvatarSize`                  | number | `1048576` (1 MB)  | Maximum avatar upload size in bytes                 |
| `leaderboard.maxLimit`           | number | `100`             | Max teams returned per leaderboard request          |
| `leaderboard.maxOffset`          | number | `4294967296`      | Max pagination offset                               |
| `leaderboard.updateInterval`     | number | `30000` (30s)     | Leaderboard recalculation interval in ms            |
| `leaderboard.graphMaxTeams`      | number | `10`              | Max teams displayed on score graph                  |
| `leaderboard.graphSampleTime`    | number | `1800000` (30min) | Time between graph data points in ms                |
| `leaderboard.graphWithListLimit` | number | `100`             | Max teams for combined leaderboard + graph endpoint |

### Moderation

```yaml
avatarsModeration:
  provider:
    name: moderation/openai
    options:
      apiKey: sk-...
  allowOnInternalError: true
```

| Field                                    | Type    | Default | Description                                 |
| ---------------------------------------- | ------- | ------- | ------------------------------------------- |
| `avatarsModeration.provider`             | object  | -       | Moderation provider for avatar uploads      |
| `avatarsModeration.allowOnInternalError` | boolean | `true`  | Allow avatar upload if moderation API fails |

See [Moderation Providers](/providers/moderation) for details.

### Proxy

```yaml
proxy:
  cloudflare: true
  trust: false
```

| Field              | Type                                    | Default | Description                                                                                                                                     |
| ------------------ | --------------------------------------- | ------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `proxy.cloudflare` | boolean                                 | `false` | Trust Cloudflare `CF-Connecting-IP` header for client IP                                                                                        |
| `proxy.trust`      | boolean \| string \| string[] \| number | `false` | Proxy trust setting for `X-Forwarded-For`. `true` trusts all, a number trusts the first N hops, a string or array specifies trusted CIDR ranges |

:::caution
Set `proxy.cloudflare: true` if your rCTF instance is behind Cloudflare. This ensures correct client IP extraction for rate limiting and logging. When using a different reverse proxy, configure `proxy.trust` instead.
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
    - provider:
        name: messages/telegram
        options:
          botToken: '123456:ABC-DEF...'
          chatId: '-1001234567890'
```

| Field                                     | Type   | Default | Description                             |
| ----------------------------------------- | ------ | ------- | --------------------------------------- |
| `bloodBot.bloodsCount`                    | number | `1`     | Number of blood tiers to announce (1-3) |
| `bloodBot.destinations`                   | array  | -       | At least one destination (required)     |
| `bloodBot.destinations[].provider`        | object | -       | Messages provider config                |
| `bloodBot.destinations[].messageTemplate` | string | -       | Custom message template (optional)      |

Available template variables: `{{teamName}}`, `{{teamUrl}}`, `{{bloodNumSentence}}`, `{{challengeCategory}}`, `{{challengeName}}`.

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
```
