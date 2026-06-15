---
title: List challenges
description: Fetch the visible challenge list.
order: 4
---

:::aside
```sh title="Request"
$ curl https://api.example.com/v1/challenges \
    -H "Authorization: Bearer $TOKEN"
```

```json title="200 goodChallenges"
{
  "kind": "goodChallenges",
  "data": [
    { "id": "web/intro", "name": "Warmup", "category": "web", "points": 100, "solves": 412 },
    { "id": "pwn/heap",  "name": "Overflow", "category": "pwn", "points": 480, "solves": 23  }
  ]
}
```
:::

`<route>GET /v1/challenges</route>` returns the challenge list visible to the
current request. The route takes optional auth — call it with or without a
bearer token — but the token shapes the result: regular users never see hidden
challenges or ones whose release time is still in the future.

## Response fields

`data` is a flat array, one object per challenge. `id` is the stable slug used
on the submit route, `name` and `category` are display strings, and `points` is
the current value after any dynamic decay. `solves` is the running count across
all teams, so a freshly released challenge starts at `0` and climbs as it falls.

## Failure modes

Before the event's start time the route is gated and returns
`<response>401 badNotStarted</response>`; an admin token carrying the
`challsRead` permission bypasses that gate. A token that fails to verify is
`<response>401 badToken</response>`. Both use the same envelope as the success
case, so the `kind` discriminator is the only field you need to branch on.
