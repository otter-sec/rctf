---
title: Email providers
description: Configure email delivery with SMTP, Amazon SES, Postmark, or Mailgun.
order: 2
---

Email providers send verification and recovery emails. You need one configured if you want email-based registration, account recovery, or email changes to work.

:::tip[What we use in practice]
For events we run or help operate (including Malta CTF, idek CTF, DiceCTF, SekaiCTF), we typically use [Postmark](https://postmarkapp.com/) for transactional delivery. The others are perfectly reasonable choices too. SMTP works with any provider you already have credentials for, SES is the cheapest at volume if you're already on AWS, and Mailgun is a fine alternative if you prefer it. Pick whichever fits your existing infrastructure.
:::

## Configuration

Email config includes the provider, a sender address, and an optional email-specific logo URL:

```yaml
email:
  provider:
    name: emails/smtp
    options:
      smtpUrl: smtp://user:password@mail.example.com:587
  from: noreply@example.com
  logoUrl: https://example.com/email-logo.png # Optional
```

When `<red>email.logoUrl</red>` is unset, emails use the top-level `<red>logoLightUrl</red>` and `<red>logoDarkUrl</red>` values instead. The logo can also be set with the `RCTF_EMAIL_LOGO_URL{:sh}` environment variable.

:::note
Without an email provider, registrations complete immediately without verification (no email goes out), users can't recover their accounts, and email-based division ACLs can't be enforced.
:::

Registration and recovery emails are [rate limited](/api#rate-limits) per client IP and per destination address. This protects your sending quota and domain reputation from abuse, even when captcha is not configured for those actions. Make sure the [proxy settings](/configuration#proxy) are correct so the real client IP reaches the rate limiter.

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
| `<red>smtpUrl</red>` | `RCTF_SMTP_URL{:sh}` | SMTP connection URL |

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
| `<red>awsKeyId</red>`     | `RCTF_SES_KEY_ID{:sh}`     | AWS access key ID     |
| `<red>awsKeySecret</red>` | `RCTF_SES_KEY_SECRET{:sh}` | AWS secret access key |
| `<red>awsRegion</red>`    | `RCTF_SES_REGION{:sh}`     | AWS region            |

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
| `<red>serverToken</red>` | `RCTF_POSTMARK_SERVER_TOKEN{:sh}` | Postmark server token |

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
| `<red>apiKey</red>` | `RCTF_MAILGUN_API_KEY{:sh}` | Mailgun API key        |
| `<red>domain</red>` | `RCTF_MAILGUN_DOMAIN{:sh}`  | Mailgun sending domain |

::::
:::::
