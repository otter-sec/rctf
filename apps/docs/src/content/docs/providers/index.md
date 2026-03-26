---
title: Providers
description: Overview of rCTF's pluggable provider system for captcha, email, uploads, scoring, moderation, and more.
---

rCTF uses a pluggable provider system that allows you to choose between different implementations for key platform features. Each provider is configured with a `name` and an `options` object in your [configuration](/configuration).

## Provider format

All providers follow the same configuration pattern:

```yaml
providerField:
  name: provider-type/provider-name
  options:
    key: value
```

The `name` identifies which implementation to load, and `options` is passed directly to the provider's constructor. Most providers also support environment variable fallbacks for their options.

## Available providers

| Type                                | Config Field                       | Available Providers                                                                               | Default          |
| ----------------------------------- | ---------------------------------- | ------------------------------------------------------------------------------------------------- | ---------------- |
| [Captcha](/providers/captcha)       | `captcha.provider`                 | `captcha/recaptcha`, `captcha/hcaptcha`, `captcha/turnstile`                                      | None (disabled)  |
| [Email](/providers/emails)          | `email.provider`                   | `emails/smtp`, `emails/ses`, `emails/postmark`, `emails/mailgun`                                  | None (disabled)  |
| [Uploads](/providers/uploads)       | `uploadProvider`                   | `uploads/local`, `uploads/s3`, `uploads/gcs`                                                      | `uploads/local`  |
| [Scoring](/providers/scores)        | `scoreProvider`                    | `scores/classic`, `scores/sekai`, `scores/steep`, `scores/jammy`, `scores/genni`, `scores/legacy` | `scores/classic` |
| [Moderation](/providers/moderation) | `avatarsModeration.provider`       | `moderation/openai`                                                                               | None (disabled)  |
| Messages                            | `bloodBot.destinations[].provider` | `messages/discord`, `messages/telegram`                                                           | None (disabled)  |
| Analytics                           | `analytics.provider`               | `analytics/google`, `analytics/cloudflare`, `analytics/plausible`                                 | None (disabled)  |
| Instancer                           | `instancerProvider`                | `instancer/docker-instancer`, `instancer/k8s-instancer`                                           | None (disabled)  |
| Admin Bot                           | `adminBot.provider`                | `admin-bot/rctf-js`                                                                               | None (disabled)  |

Providers marked as "None (disabled)" are optional features. The platform functions without them, but the associated features will be unavailable.

## Analytics providers

Analytics providers inject a tracking script into the frontend.

### analytics/google

```yaml
analytics:
  provider:
    name: analytics/google
    options:
      siteTag: G-XXXXXXXX # Google Analytics 4 measurement ID
```

### analytics/cloudflare

```yaml
analytics:
  provider:
    name: analytics/cloudflare
    options:
      token: your-cf-token # Cloudflare Web Analytics token
```

### analytics/plausible

```yaml
analytics:
  provider:
    name: analytics/plausible
    options:
      apiHost: https://plausible.io # Optional, for self-hosted instances
```
