---
title: Email providers
description: Configure email delivery with SMTP, Amazon SES, Postmark, or Mailgun.
order: 2
---

Email providers send verification and recovery emails. You need one configured if you want email-based registration, account recovery, or email changes to work.

:::tip[What we use in practice]
We usually use [Postmark](https://postmarkapp.com/) for events including Malta CTF, idek CTF, DiceCTF, and SekaiCTF. SES is inexpensive at higher volume when the event already uses AWS. SMTP works with any mail service that provides credentials, and Mailgun is another hosted option. Account limits and existing infrastructure usually matter more than the provider itself.
:::

## Configuration

Configure a provider and sender address. You can also add an email-specific logo:

```yaml
email:
  provider:
    name: emails/smtp
    options:
      smtpUrl: smtp://user:password@mail.example.com:587
  from: noreply@example.com
  logoUrl: https://example.com/email-logo.png # Optional
```

When `<red>email.logoUrl</red>` is unset, emails use the top-level `<red>logoLightUrl</red>` and `<red>logoDarkUrl</red>` values instead. The logo can also be set with the `<yellow>RCTF_EMAIL_LOGO_URL</yellow>` environment variable.

:::note
Without an email provider, registration skips verification, account recovery is unavailable, and email-based division ACLs cannot be enforced.
:::

Registration and recovery emails are [rate limited](/api#rate-limits) by client IP and destination address, with or without captcha. Configure [proxy trust](/configuration#proxy) correctly so the limiter sees the participant's IP rather than the proxy's.

## Providers

:::::tabs
::::tab[emails/smtp]
Sends emails over SMTP using Nodemailer.

```yaml
email:
  provider:
    name: emails/smtp
    options:
      smtpUrl: smtp://user:password@mail.example.com:587
  from: noreply@example.com
```

| Option               | Environment Variable | Description         |
| -------------------- | -------------------- | ------------------- |
| `<red>smtpUrl</red>` | `<yellow>RCTF_SMTP_URL</yellow>` | SMTP connection URL |

::::
::::tab[emails/ses]
Sends emails through Amazon Simple Email Service.

```yaml
email:
  provider:
    name: emails/ses
    options:
      awsKeyId: AKIAIOSFODNN7EXAMPLE
      awsKeySecret: wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
      awsRegion: us-east-1
  from: noreply@example.com
```

| Option                    | Environment Variable       | Description           |
| ------------------------- | -------------------------- | --------------------- |
| `<red>awsKeyId</red>`     | `<yellow>RCTF_SES_KEY_ID</yellow>`     | AWS access key ID     |
| `<red>awsKeySecret</red>` | `<yellow>RCTF_SES_KEY_SECRET</yellow>` | AWS secret access key |
| `<red>awsRegion</red>`    | `<yellow>RCTF_SES_REGION</yellow>`     | AWS region            |

:::warning
Make sure your SES account is out of the sandbox and the sender address is verified before you use it.
:::
::::
::::tab[emails/postmark]
Sends emails through the [Postmark](https://postmarkapp.com/) API.

```yaml
email:
  provider:
    name: emails/postmark
    options:
      serverToken: your-server-token
  from: noreply@example.com
```

| Option                   | Environment Variable              | Description           |
| ------------------------ | --------------------------------- | --------------------- |
| `<red>serverToken</red>` | `<yellow>RCTF_POSTMARK_SERVER_TOKEN</yellow>` | Postmark server token |

::::
::::tab[emails/mailgun]
Sends emails through the [Mailgun](https://www.mailgun.com/) API.

```yaml
email:
  provider:
    name: emails/mailgun
    options:
      apiKey: your-api-key
      domain: mail.example.com
  from: noreply@example.com
```

| Option              | Environment Variable        | Description            |
| ------------------- | --------------------------- | ---------------------- |
| `<red>apiKey</red>` | `<yellow>RCTF_MAILGUN_API_KEY</yellow>` | Mailgun API key        |
| `<red>domain</red>` | `<yellow>RCTF_MAILGUN_DOMAIN</yellow>`  | Mailgun sending domain |

::::
:::::
