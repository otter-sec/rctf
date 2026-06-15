---
title: Leaderboard
description: Fetch the current standings.
order: 1
---

:::aside
```sh title="Request"
$ curl https://api.example.com/v1/leaderboard?limit=2 \
    -H "Authorization: Bearer $TOKEN"
```

```json title="200 goodLeaderboard"
{
  "kind": "goodLeaderboard",
  "data": {
    "total": 128,
    "leaderboard": [
      { "rank": 1, "name": "alice", "score": 4200 },
      { "rank": 2, "name": "bob",   "score": 3100 }
    ]
  }
}
```
:::

`<route>GET /v1/leaderboard</route>` returns the current standings, highest
score first. The route is public — no token is required — and safe to poll.

## Query parameters

`limit` caps the number of rows, from 1 to 100, and defaults to 25. `offset`
skips rows for pagination. Request a page past the end and the `leaderboard`
array comes back empty while `total` still reports the full count.

## Response fields

`total` is the number of ranked players, independent of paging. Each entry in
`leaderboard` carries a one-based `rank`, the player's `name`, and their
integer `score`. Ties break by who reached the score first, so ranks stay
dense and unique.

## Errors

A malformed `limit` or `offset` returns `<response>400 badRequest</response>`.
There are no authenticated failures here — the route never returns
`<response>401</response>`.
