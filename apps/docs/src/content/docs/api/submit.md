---
title: Submit a flag
description: Score a challenge solve.
order: 2
---

:::aside
```sh title="Request"
$ curl https://api.example.com/v1/challenges/42/submit \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"flag": "example{h3ll0_w0rld}"}'
```

```json title="200 goodFlag"
{
  "kind": "goodFlag",
  "data": { "points": 300, "firstBlood": false }
}
```
:::

`<route>POST /v1/challenges/:id/submit</route>` scores a solve attempt. The
body is a single `flag` string. Submissions are rate-limited per team, and
correct flags are idempotent — re-submitting a solved challenge is a no-op
that still returns `<response>200 goodFlag</response>`.

## Request body

`flag` is the candidate string, compared verbatim after trimming surrounding
whitespace. Comparison is constant-time, so a wrong flag and a right flag take
the same wall-clock time to reject or accept.

## Response fields

`points` is the value awarded, after any decay. `firstBlood` is `true` only
for the first correct submission across all teams — worth surfacing in the UI,
since it is the one moment the score is more than a number.

## Failure modes

An incorrect flag returns `<response>403 badFlag</response>`. An unknown
challenge id is `<response>404 badChallenge</response>`, and exceeding the
submit rate is `<response>429 badRateLimit</response>`. All three share the
envelope, so one error path handles them.
