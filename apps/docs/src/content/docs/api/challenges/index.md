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

These routes cover public challenge data, solve history, flag submission, and dynamic scoring. Challenge administration is documented under [Admin](/api/admin/).

Use V2 where available. Flag submission still uses V1 because it has no V2 replacement.

### Scoring behavior

For a `decay` challenge, the configured [scoring provider](/providers/scores/) calculates the current value from its point range and solve count. Public responses include the current value, not `points.min` or `points.max`. Challenge and solve changes recalculate the leaderboard.

`dynamic` challenges receive per-team scores through a webhook. See [Submit dynamic scores](/api/challenges/submit-dynamic-scores/) for the request format and [Scoring](/admin/scoring/) for setup guidance.

### Visibility behavior

Participants see challenges after the event starts and each challenge is released. A user with `challsRead{:ts}` can bypass the event start time. Hidden challenges remain unavailable, and scheduled challenges stay unavailable until their release time.
