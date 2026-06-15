---
title: Providers
description: Overview of rCTF's pluggable provider system for captcha, email, uploads, scoring, moderation, and more.
order: 3
---

rCTF uses a pluggable provider system, so you can swap implementations for major platform features. Each provider is configured with a `<red>name</red>` and an `<red>options</red>` object in your [configuration](/docs/configuration).

## Provider format

All providers follow the same configuration pattern:

```yaml
providerField:
  name: provider-type/provider-name
  options:
    key: value
```

The `<red>name</red>` identifies which implementation to load, and `<red>options</red>` is passed directly to the provider's constructor. Most providers also support environment variable fallbacks for their options.

## Available providers

| Type | Config Field | Available Providers | Default |
| --- | --- | --- | --- |
| [Captcha](/docs/providers/captcha) | `<red>captcha.provider</red>` | `<green>captcha/recaptcha</green>`, `<green>captcha/hcaptcha</green>`, `<green>captcha/turnstile</green>` | None (disabled) |
| [Email](/docs/providers/emails) | `<red>email.provider</red>` | `<green>emails/smtp</green>`, `<green>emails/ses</green>`, `<green>emails/postmark</green>`, `<green>emails/mailgun</green>` | None (disabled) |
| [Uploads](/docs/providers/uploads) | `<red>uploadProvider</red>` | `<green>uploads/local</green>`, `<green>uploads/s3</green>`, `<green>uploads/gcs</green>` | `<green>uploads/local</green>` |
| [Scoring](/docs/providers/scores) | `<red>scoreProvider</red>` | `<green>scores/classic</green>`, `<green>scores/sekai</green>`, `<green>scores/steep</green>`, `<green>scores/jammy</green>`, `<green>scores/genni</green>`, `<green>scores/legacy</green>` | `<green>scores/classic</green>` |
| [Moderation](/docs/providers/moderation) | `<red>avatarsModeration.provider</red>` | `<green>moderation/openai</green>` | None (disabled) |
| [Messages](/docs/integrations/bloodbot)\* | `<red>bloodBot.destinations[].provider</red>` | `<green>messages/discord</green>`, `<green>messages/telegram</green>` | None (disabled) |
| [Analytics](/docs/providers/analytics) | `<red>analytics.provider</red>` | `<green>analytics/google</green>`, `<green>analytics/cloudflare</green>` | None (disabled) |
| [Instancer](/docs/integrations/instancer) | `<red>instancerProvider</red>` | `<green>instancer/docker-instancer</green>`, `<green>instancer/k8s-instancer</green>` | None (disabled) |
| [Admin Bot](/docs/integrations/admin-bot) | `<red>adminBot.provider</red>` | `<green>admin-bot/rctf-js</green>` | None (disabled) |

Providers marked as "None (disabled)" are optional features. The platform functions without them, but the associated features will be unavailable.

\* Unlike the other providers, message providers are not selected by a top-level config field. They are nested inside each [blood bot](/docs/integrations/bloodbot) destination entry, so the same deployment can post to multiple destinations using different providers.
