---
title: Integrations
description: Overview of rCTF integrations with CTFtime, instancers, blood bots, and more.
order: 4
---

rCTF integrates with several external services to enhance your CTF platform.

## Available integrations

| Integration | Config field | Description |
| --- | --- | --- |
| [CTFtime](/docs/integrations/ctftime) | `<red>ctftime</red>` | OAuth integration with [CTFtime](https://ctftime.org) for team authentication and leaderboard export. Participants register and log in with their CTFtime accounts, and final standings can be exported in CTFtime's format. |
| [Instancer](/docs/integrations/instancer) | `<red>instancerProvider</red>` | Per-team challenge instance management via Docker or Kubernetes. Isolated environments per team with configurable timeouts, manual extension, and automatic cleanup. |
| [Admin bot](/docs/integrations/admin-bot) | `<red>adminBot</red>` | Browser automation for web challenges. Challenge authors write trusted TypeScript that validates participant input, runs a Chrome or Firefox session, and stores structured per-job logs. |
| [Blood bot](/docs/integrations/bloodbot) | `<red>bloodBot</red>` | First-blood announcements to Discord and Telegram. Notifies configured channels when teams achieve first, second, or third blood on challenges. |
| [Analytics](/docs/providers/analytics) | `<red>analytics</red>` | Client-side analytics injection supporting Google Analytics, Cloudflare Web Analytics. |
| [Konata](/docs/integrations/konata) | - | External CLI + CI actions for deploying challenges to rCTF (challenge sync, Docker publish, Kubernetes rollout). The `<red>instancerConfig</red>` schema shown throughout these docs is what Konata consumes. |
