---
title: Integrations
description: Overview of rCTF integrations with CTFtime, instancers, blood bots, and more.
order: 4
---

rCTF can connect to external services for authentication, challenge instances, browser automation, notifications, analytics, and challenge deployment.

## Available integrations

| Integration | Config field | Description |
| --- | --- | --- |
| [CTFtime](/integrations/ctftime) | `<red>ctftime</red>` | Lets participants register and log in with [CTFtime](https://ctftime.org), then exports the final standings in CTFtime's format. |
| [Instancer](/integrations/instancer) | `<red>instancers</red>` | Gives each team an isolated challenge environment running on Docker or Kubernetes. Participants can start, extend, and stop instances from the challenge page, and timeouts clean them up automatically. |
| [Admin bot](/integrations/admin-bot) | `<red>adminBot</red>` | Runs trusted TypeScript handlers in Chrome or Firefox for web challenges and keeps structured logs for participants and organizers. |
| [Blood bot](/integrations/bloodbot) | `<red>bloodBot</red>` | Announces first, second, or third bloods in Discord, Telegram, or both. |
| [Analytics](/providers/analytics) | `<red>analytics</red>` | Adds Google Analytics or Cloudflare Web Analytics tracking to the frontend. |
| [Konata](/integrations/konata) | - | Syncs challenges, publishes Docker images, and deploys Kubernetes manifests from the CLI or CI. Its challenge configuration includes the `<red>instancerConfig</red>` data used by rCTF. |
