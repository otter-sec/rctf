---
title: Analytics providers
description: Track visitor metrics with Google Analytics, Cloudflare Web Analytics.
order: 6
---

Analytics providers inject a tracking script into the frontend. No data is collected server-side.

## Configuration

```yaml
analytics:
  provider:
    name: analytics/google
    options:
      siteTag: G-XXXXXXXX
```

## Providers

::::tabs
:::tab[analytics/google]
Google Analytics 4.

```yaml
analytics:
  provider:
    name: analytics/google
    options:
      siteTag: G-XXXXXXXX
```

| Option               | Description                       |
| -------------------- | --------------------------------- |
| `<red>siteTag</red>` | Google Analytics 4 measurement ID |

:::
:::tab[analytics/cloudflare]
[Cloudflare Web Analytics](https://developers.cloudflare.com/analytics/web-analytics/).

```yaml
analytics:
  provider:
    name: analytics/cloudflare
    options:
      token: your-cf-token
```

| Option             | Description                    |
| ------------------ | ------------------------------ |
| `<red>token</red>` | Cloudflare Web Analytics token |

:::
::::
