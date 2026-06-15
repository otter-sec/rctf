---
title: Captcha providers
description: Configure captcha verification with reCAPTCHA, hCaptcha, or Cloudflare Turnstile.
order: 1
---

Captcha providers protect sensitive endpoints from automated abuse. rCTF supports three captcha services.

## Configuration

Captcha configuration has two parts: the provider (which service to use) and the protected endpoints (which actions require verification).

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

## Protected endpoints

The `<red>protectedEndpoints</red>` array controls which actions require captcha verification:

| Action                           | Description                             |
| -------------------------------- | --------------------------------------- |
| `<green>register</green>`        | New account registration                |
| `<green>recover</green>`         | Account recovery via email              |
| `<green>setEmail</green>`        | Changing account email                  |
| `<green>instancerStart</green>`  | Starting a challenge instance           |
| `<green>instancerExtend</green>` | Extending a challenge instance lifetime |
| `<green>avatarUpload</green>`    | Uploading a team avatar                 |
| `<green>adminBotSubmit</green>`  | Submitting a job to the admin bot       |

Only the actions listed in `<red>protectedEndpoints</red>` will require captcha. Unlisted actions proceed without verification.

:::note
Captcha is not the only protection on email-sending endpoints. The `<green>register</green>` and `<green>recover</green>` actions are additionally [rate limited](/docs/api#rate-limits) per client IP and per target email, regardless of captcha configuration.
:::

## Providers

::::tabs
:::tab[captcha/recaptcha]
Google reCAPTCHA v2 Invisible. The frontend renders the widget with `size: 'invisible'{:ts}` and verifies the response against `https://www.google.com/recaptcha/api/siteverify`.

```yaml
captcha:
  provider:
    name: captcha/recaptcha
    options:
      siteKey: your-site-key
      secretKey: your-secret-key
```

| Option                 | Environment Variable             | Description          |
| ---------------------- | -------------------------------- | -------------------- |
| `<red>siteKey</red>`   | `RCTF_RECAPTCHA_SITE_KEY{:sh}`   | reCAPTCHA site key   |
| `<red>secretKey</red>` | `RCTF_RECAPTCHA_SECRET_KEY{:sh}` | reCAPTCHA secret key |

:::
:::tab[captcha/hcaptcha]
[hCaptcha](https://www.hcaptcha.com/) verification.

```yaml
captcha:
  provider:
    name: captcha/hcaptcha
    options:
      siteKey: your-site-key
      secretKey: your-secret-key
```

| Option                 | Environment Variable            | Description         |
| ---------------------- | ------------------------------- | ------------------- |
| `<red>siteKey</red>`   | `RCTF_HCAPTCHA_SITE_KEY{:sh}`   | hCaptcha site key   |
| `<red>secretKey</red>` | `RCTF_HCAPTCHA_SECRET_KEY{:sh}` | hCaptcha secret key |

:::
:::tab[captcha/turnstile]
[Cloudflare Turnstile](https://developers.cloudflare.com/turnstile/) verification.

```yaml
captcha:
  provider:
    name: captcha/turnstile
    options:
      siteKey: your-site-key
      secretKey: your-secret-key
```

| Option                 | Environment Variable             | Description          |
| ---------------------- | -------------------------------- | -------------------- |
| `<red>siteKey</red>`   | `RCTF_TURNSTILE_SITE_KEY{:sh}`   | Turnstile site key   |
| `<red>secretKey</red>` | `RCTF_TURNSTILE_SECRET_KEY{:sh}` | Turnstile secret key |

:::
::::

## Migrating from v1

If you are using the legacy `<red>recaptcha</red>` top-level config from v1, it is automatically converted to the new format at startup. However, migrating is recommended:

::::tabs
:::tab[v1 (deprecated)]
```yaml
recaptcha:
  siteKey: your-site-key
  secretKey: your-secret-key
  protectedActions:
    - register
```
:::
:::tab[v2 (recommended)]
```yaml
captcha:
  provider:
    name: captcha/recaptcha
    options:
      siteKey: your-site-key
      secretKey: your-secret-key
  protectedEndpoints:
    - register
```
:::
::::
