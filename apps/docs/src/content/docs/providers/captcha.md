---
title: Captcha providers
description: Configure captcha verification with reCAPTCHA, hCaptcha, or Cloudflare Turnstile.
order: 1
---

rCTF can verify sensitive actions with reCAPTCHA, hCaptcha, or Cloudflare Turnstile.

## Configuration

Choose a provider, then list the actions that should require it.

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

Actions not listed in `<red>protectedEndpoints</red>` do not require captcha.

:::note
Registration and recovery remain [rate limited](/api#rate-limits) by client IP and destination email, even when captcha is enabled.
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

rCTF converts the v1 `<red>recaptcha</red>` block at startup, but new configuration should use the provider format:

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
