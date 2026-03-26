---
title: Integrations
description: Overview of rCTF integrations with CTFtime, instancers, blood bots, and more.
---

rCTF integrates with several external services to enhance your CTF platform.

## Available integrations

### [CTFtime](/integrations/ctftime)

OAuth integration with [CTFtime](https://ctftime.org) for team authentication and leaderboard export. Allows participants to register and log in with their CTFtime accounts, and enables exporting final standings in CTFtime's format.

### [Instancer](/integrations/instancer)

Per-team challenge instance management via Docker or Kubernetes. Provides isolated environments for each team with configurable timeouts, instance extension, and automatic cleanup.

### [Blood Bot](/integrations/bloodbot)

First blood announcements to Discord and Telegram. Automatically notifies configured channels when teams achieve first, second, or third blood on challenges.

### Admin Bot

Puppeteer-based browser automation for testing web challenges. Challenge authors write JavaScript code that runs in a browser context, useful for XSS and web exploitation challenges. Configured via the `adminBot` config section and managed through the admin API.

### Analytics

Client-side analytics injection supporting Google Analytics, Cloudflare Web Analytics, and Plausible. See the [Providers overview](/providers#analytics-providers) for configuration.
