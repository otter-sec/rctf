---
title: "Challenges"
description: "Challenge listing, solve listing, flag submission, and dynamic-scoring webhook routes."
order: 11
scroll: true
aside: true
---

:::aside

| Route | Endpoint |
| --- | --- |
| [Challenge list](/api/challenges/list/) | `<route>GET /api/[v2,v1]/challs</route>` |
| [Challenge solves](/api/challenges/solves/) | `<route>GET /api/[v2,v1]/challs/:id/solves</route>` |
| [Submit a flag](/api/challenges/submit/) | `<route>POST /api/v1/challs/:id/submit</route>` |
| [Submit dynamic scores](/api/challenges/submit-dynamic-scores/) | `<route>POST /api/v2/challs/:id/scores</route>` |

:::

Challenge routes provide public challenge metadata, solve history, the legacy flag submission endpoint, and the dynamic-scoring webhook. Admin challenge mutation routes are documented in [Admin](/api/admin/).

For new clients, prefer V2 routes. V1 routes remain available for older clients. Flag submission still uses V1 because there is no V2 route for that action.

### Scoring behavior

Challenge point values come from the configured [scoring provider](/providers/scores/) for `decay` challenges. The public challenge list returns the current point value. It does not expose the configured `points.min` or `points.max` range. Challenge updates and solve changes trigger leaderboard recalculation.

`dynamic` challenges receive per-team scores over a webhook instead - see [Submit dynamic scores](/api/challenges/submit-dynamic-scores/) for the wire format and [Scoring](/admin/scoring/) for the operator-facing model.

### Visibility behavior

Regular users see challenges once those challenges are visible and released. Admin users with `challsRead{:ts}` can read through the CTF start gate with the same public routes. Hidden and scheduled release rules still apply inside the challenge service.
