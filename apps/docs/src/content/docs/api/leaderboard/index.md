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
| [Current standings](/api/leaderboard/now/) | `<route>GET /api/[v2,v1]/leaderboard/now</route>` |
| [Standings with graph](/api/leaderboard/with-graph/) | `<route>GET /api/v2/leaderboard/with-graph</route>` |
| [Score graph](/api/leaderboard/graph/) | `<route>GET /api/[v2,v1]/leaderboard/graph</route>` |
| [Leaderboard challenges](/api/leaderboard/challs/) | `<route>GET /api/v2/leaderboard/challs</route>` |

:::

The leaderboard worker calculates challenge values, team scores, global and division ranks, first bloods, and graph samples. These routes return its latest cached result.

Authentication is optional. Before the event starts, `leaderboardRead{:ts}` can access standings and graphs, while `challsRead{:ts}` can access challenge metadata.

V2 adds fields and search support. V1 remains available for existing clients.

### Query behavior

`/now`, `/with-graph`, and `/graph` use `limit` and `offset` for pagination. `limit` must be at least `1`, `offset` must be at least `0`, and deployment settings define their maximum values.

`division` filters standings to a configured division. `search` is available on V2 `/now` and V2 `/with-graph` for fuzzy team name search. Search values are expected to be 2 to 100 characters.

Search requests are rate limited per IP address with burst `3` and refill window `3000` ms. If the bucket is exhausted, the route returns `<response>429 badRateLimit</response>` with `data.timeLeft`.

V1 `/api/v1/leaderboard/graph` supports `limit` and optional `division`. Offset based graph pagination is available through the V2 graph route.

### Ranking rules

The leaderboard worker sorts teams by score descending. Ties are broken in this order:

1. Most recent solve of a challenge marked `tiebreakEligible` (`last_tiebreak_solve_at`). Earlier is better.
2. Absolute last solve time. Earlier is better.

### Banned teams

Banned teams are left out of leaderboard responses. Their cached rank fields are cleared until they are unbanned and the leaderboard is recalculated. If a banned team appears in a response, `globalPlace` is `null{:ts}`.
