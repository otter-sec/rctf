---
title: Providers
description: Configure services for captcha, email, uploads, scoring, moderation, and more.
order: 3
---

Providers connect rCTF to services such as email, object storage, captcha, and scoring. You choose an implementation with `<red>name</red>` and configure it through `<red>options</red>`.

## Provider format

All providers follow the same configuration pattern:

```yaml
providerField:
  name: provider-type/provider-name
  options:
    key: value
```

The `<red>name</red>` selects the provider, while `<red>options</red>` contains its settings. Most of those settings can also be supplied through environment variables. Name categories are plural or mass nouns.

## Available providers

| Type | Config Field | Available Providers | Default |
| --- | --- | --- | --- |
| [Captcha](/providers/captcha) | `<red>captcha.provider</red>` | `<green>captcha/recaptcha</green>`, `<green>captcha/hcaptcha</green>`, `<green>captcha/turnstile</green>` | None (disabled) |
| [Email](/providers/emails) | `<red>email.provider</red>` | `<green>emails/smtp</green>`, `<green>emails/ses</green>`, `<green>emails/postmark</green>`, `<green>emails/mailgun</green>` | None (disabled) |
| [Uploads](/providers/uploads) | `<red>uploadProvider</red>` | `<green>uploads/local</green>`, `<green>uploads/s3</green>`, `<green>uploads/gcs</green>` | `<green>uploads/local</green>` |
| [Scoring](/providers/scores) | `<red>scoreProvider</red>` | `<green>scores/classic</green>`, `<green>scores/sekai</green>`, `<green>scores/steep</green>`, `<green>scores/jammy</green>`, `<green>scores/genni</green>`, `<green>scores/legacy</green>` | `<green>scores/classic</green>` |
| [Moderation](/providers/moderation) | `<red>avatarsModeration.provider</red>` | `<green>moderation/openai</green>` | None (disabled) |
| [Messages](/integrations/bloodbot)\* | `<red>bloodBot.destinations[].provider</red>` | `<green>messages/discord</green>`, `<green>messages/telegram</green>` | None (disabled) |
| [Analytics](/providers/analytics) | `<red>analytics.provider</red>` | `<green>analytics/google</green>`, `<green>analytics/cloudflare</green>` | None (disabled) |
| [Instancer](/integrations/instancer) | `<red>instancers</red>` | `<green>instancers/docker</green>`, `<green>instancers/k8s</green>` | None (disabled) |
| [Admin Bot](/integrations/admin-bot) | `<red>adminBot.provider</red>` | `<green>admin-bots/rctf-ts</green>` | None (disabled) |

Providers marked "None (disabled)" are optional. Their features remain unavailable until a provider is configured.

\* Unlike the other providers, message providers are not selected by a top-level config field. They are nested inside each [blood bot](/integrations/bloodbot) destination entry, so the same deployment can post to multiple destinations using different providers.
