---
title: "Integrations"
description: "Client config, analytics, CTFtime, instancer, and admin bot participant routes."
order: 15
scroll: true
aside: true
---

:::aside
  

::route-list-item{title="Client config" method="GET" path="/api/[v2,v1]/integrations/client/config" href="/docs/api/integrations/client-config/"}

::route-list-item{title="Analytics script" method="GET" path="/api/v2/integrations/analytics/script" href="/docs/api/integrations/analytics-script/"}

::route-list-item{title="Instance status" method="GET" path="/api/v2/integrations/challs/:id/instance" href="/docs/api/integrations/instance-status/"}

::route-list-item{title="Start an instance" method="PUT" path="/api/v2/integrations/challs/:id/instance" href="/docs/api/integrations/instance-start/"}

::route-list-item{title="Extend an instance" method="PATCH" path="/api/v2/integrations/challs/:id/instance" href="/docs/api/integrations/instance-extend/"}

::route-list-item{title="Stop an instance" method="DELETE" path="/api/v2/integrations/challs/:id/instance" href="/docs/api/integrations/instance-stop/"}

::route-list-item{title="Admin bot config" method="GET" path="/api/v2/integrations/challs/:id/admin-bot/config" href="/docs/api/integrations/admin-bot-config/"}

::route-list-item{title="Submit admin bot job" method="POST" path="/api/v2/integrations/challs/:id/admin-bot" href="/docs/api/integrations/admin-bot-submit/"}

::route-list-item{title="Admin bot job status" method="GET" path="/api/v2/integrations/challs/:id/admin-bot/status" href="/docs/api/integrations/admin-bot-status/"}

::route-list-item{title="Admin bot job history" method="GET" path="/api/v2/integrations/challs/:id/admin-bot/history" href="/docs/api/integrations/admin-bot-history/"}

::route-list-item{title="Admin bot job logs" method="GET" path="/api/v2/integrations/challs/:id/admin-bot/jobs/:jobId/logs" href="/docs/api/integrations/admin-bot-logs/"}

::route-list-item{title="CTFtime callback" method="POST" path="/api/v1/integrations/ctftime/callback" href="/docs/api/integrations/ctftime-callback/"}

::route-list-item{title="CTFtime leaderboard" method="GET" path="/api/v1/integrations/ctftime/leaderboard" href="/docs/api/integrations/ctftime-leaderboard/"}
  

:::

Integration routes help the web app and external services coordinate with rCTF. They cover public runtime config, analytics script delivery, CTFtime handoff, per team challenge instances, and participant admin bot jobs.

The admin bot worker service routes use a separate service token and are documented in [Admin](/docs/api/admin/).

### Version choice

Client config is available in both V1 and V2. Newer clients usually want V2 because it includes the current analytics, captcha, logo, archive, and instancer fields. The remaining integration routes are version specific.

### Timeline behavior

Instance and participant admin bot routes open after the CTF starts. Admins with `challsRead{:ts}` can read through that start gate when they need to review challenges before the event begins.
