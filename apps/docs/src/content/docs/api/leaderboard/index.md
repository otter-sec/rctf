---
title: "Leaderboard"
description: "API reference for leaderboard standings, graph data, challenge metadata, search, and pagination."
order: 12
scroll: true
aside: true
---

:::aside

| Route | Endpoint |
| --- | --- |
| [Current standings](/docs/api/leaderboard/now/) | `<route>GET /api/[v2,v1]/leaderboard/now</route>` |
| [Standings with graph](/docs/api/leaderboard/with-graph/) | `<route>GET /api/v2/leaderboard/with-graph</route>` |
| [Score graph](/docs/api/leaderboard/graph/) | `<route>GET /api/[v2,v1]/leaderboard/graph</route>` |
| [Leaderboard challenges](/docs/api/leaderboard/challs/) | `<route>GET /api/v2/leaderboard/challs</route>` |

:::

Leaderboard routes read from cached standings produced by the leaderboard worker. The worker keeps the public scoreboard data up to date, including challenge scores, team scores, global ranks, division ranks, first bloods, and score graph samples.

Optional auth is accepted on these routes. When a token has the relevant bypass permission, the request can read leaderboard data before the CTF start time gate opens. Standings and graph routes use `leaderboardRead{:ts}` for that bypass, while challenge metadata uses `challsRead{:ts}`.

For new clients, prefer the V2 routes. V1 routes remain available for older clients and return a smaller set of fields, without search support.

### Query behavior

`<route>/now</route>`, `<route>/with-graph</route>`, and `<route>/graph</route>` use query string pagination. The API expects `limit` to be at least `1` and `offset` to be at least `0`. Deployment config sets the maximum allowed values.

`division` filters standings to a configured division. `search` is available on V2 `<route>/now</route>` and V2 `<route>/with-graph</route>` for fuzzy team name search. Search values are expected to be 2 to 100 characters.

Search requests are rate limited per IP address with burst `3` and refill window `3000` ms. If the bucket is exhausted, the route returns `<response>429 badRateLimit</response>` with `data.timeLeft`.

V1 `<route>/api/v1/leaderboard/graph</route>` supports `limit` and optional `division`. Offset based graph pagination is available through the V2 graph route.

### Ranking rules

The leaderboard worker sorts teams by score descending. Ties are broken in this order:

1. Most recent solve of a challenge marked `tiebreakEligible` (`last_tiebreak_solve_at`). Earlier is better.
2. Absolute last solve time. Earlier is better.

This gives the worker a stable ordering when both scores and regular last-solve times match.

### Banned teams

Banned teams are left out of leaderboard responses. Their cached rank fields are cleared until they are unbanned and the leaderboard is recalculated. If a banned team appears in a response, `globalPlace` is `null{:ts}`.
