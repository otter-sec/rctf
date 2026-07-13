---
title: Integrations
description: Overview of rCTF integrations with CTFtime, instancers, blood bots, and more.
order: 4
---

rCTF can connect to external services for authentication, challenge instances, browser automation, notifications, analytics, and challenge deployment.

## Available integrations

| Integration | Config field | Description |
| --- | --- | --- |
| [CTFtime](/integrations/ctftime) | `<red>ctftime</red>` | OAuth integration with [CTFtime](https://ctftime.org) for team authentication and leaderboard export. Participants register and log in with their CTFtime accounts, and final standings can be exported in CTFtime's format. |
| [Instancer](/integrations/instancer) | `<red>instancers</red>` | Per-team challenge instance management via Docker or Kubernetes. Define one or more named instancers; each challenge targets one. Isolated environments per team with configurable timeouts, manual extension, and automatic cleanup. |
| [Admin bot](/integrations/admin-bot) | `<red>adminBot</red>` | Browser automation for web challenges. Challenge authors write trusted TypeScript that validates participant input, runs a Chrome or Firefox session, and stores structured per-job logs. |
| [Blood bot](/integrations/bloodbot) | `<red>bloodBot</red>` | First-blood announcements to Discord and Telegram. Notifies configured channels when teams achieve first, second, or third blood on challenges. |
| [Analytics](/providers/analytics) | `<red>analytics</red>` | Client-side analytics injection supporting Google Analytics, Cloudflare Web Analytics. |
| [Konata](/integrations/konata) | - | External CLI and CI actions for syncing challenges, publishing Docker images, and running Kubernetes deployments. Konata writes the `<red>instancerConfig</red>` schema used by rCTF. |
