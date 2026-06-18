---
title: "Integrations"
description: "Client config, analytics, CTFtime, instancer, and admin bot participant routes."
order: 15
scroll: true
aside: true
---

:::aside

| Route | Endpoint |
| --- | --- |
| [Client config](/api/integrations/client-config/) | `<route>GET /api/[v2,v1]/integrations/client/config</route>` |
| [Analytics script](/api/integrations/analytics-script/) | `<route>GET /api/v2/integrations/analytics/script</route>` |
| [Instance status](/api/integrations/instance-status/) | `<route>GET /api/v2/integrations/challs/:id/instance</route>` |
| [Start an instance](/api/integrations/instance-start/) | `<route>PUT /api/v2/integrations/challs/:id/instance</route>` |
| [Extend an instance](/api/integrations/instance-extend/) | `<route>PATCH /api/v2/integrations/challs/:id/instance</route>` |
| [Stop an instance](/api/integrations/instance-stop/) | `<route>DELETE /api/v2/integrations/challs/:id/instance</route>` |
| [Admin bot config](/api/integrations/admin-bot-config/) | `<route>GET /api/v2/integrations/challs/:id/admin-bot/config</route>` |
| [Submit admin bot job](/api/integrations/admin-bot-submit/) | `<route>POST /api/v2/integrations/challs/:id/admin-bot</route>` |
| [Admin bot job status](/api/integrations/admin-bot-status/) | `<route>GET /api/v2/integrations/challs/:id/admin-bot/status</route>` |
| [Admin bot job history](/api/integrations/admin-bot-history/) | `<route>GET /api/v2/integrations/challs/:id/admin-bot/history</route>` |
| [Admin bot job logs](/api/integrations/admin-bot-logs/) | `<route>GET /api/v2/integrations/challs/:id/admin-bot/jobs/:jobId/logs</route>` |
| [CTFtime callback](/api/integrations/ctftime-callback/) | `<route>POST /api/v1/integrations/ctftime/callback</route>` |
| [CTFtime leaderboard](/api/integrations/ctftime-leaderboard/) | `<route>GET /api/v1/integrations/ctftime/leaderboard</route>` |

:::

Integration routes help the web app and external services coordinate with rCTF. They cover public runtime config, analytics script delivery, CTFtime handoff, per team challenge instances, and participant admin bot jobs.

The admin bot worker service routes use a separate service token and are documented in [Admin](/api/admin/).

### Version choice

Client config is available in both V1 and V2. Newer clients usually want V2 because it includes the current analytics, captcha, logo, archive, and instancer fields. The remaining integration routes are version specific.

### Timeline behavior

Instance and participant admin bot routes open after the CTF starts. Admins with `challsRead{:ts}` can read through that start gate when they need to review challenges before the event begins.
