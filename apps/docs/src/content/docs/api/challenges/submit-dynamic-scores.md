---
title: "<route>POST</route> Submit dynamic scores"
description: "<route>POST /api/v2/challs/:id/scores</route>"
order: 4
---

BadBody,
  BadJson,
  BadReplayedRequest,
  BadSignature,
  SubmitDynamicScoresRouteV2,
} from '@rctf/types'

:::aside

::::route-example{def="SubmitDynamicScoresRouteV2" extra="BadJson"}

```json body
{
  "scores": [
    {
      "userId": "11111111-2222-3333-4444-555555555555",
      "points": 1280
    },
    {
      "userId": "66666666-7777-8888-9999-000000000000",
      "points": 940
    }
  ]
}
```

```json params
{
  "id": "challenge-id"
}
```

::::

:::

::route-meta{def="SubmitDynamicScoresRouteV2"}

Publishes per-team scores for a `dynamic` challenge. The endpoint checks an HMAC signature derived from the challenge's per-instance webhook secret in `<red>scoring.source.secret</red>`. It does not use a user auth token. See [Scoring](/admin/scoring/#dynamic-scoring-guide) for team identifiers and a publisher example.

:::warning[No event-timing gate]

This route deliberately has neither `onlyWhenStarted` nor `onlyWhenNotFinished`. Backends can seed
  scores before `startTime` and any deliveries that land after `endTime` are still applied to the
  final tally. Cutting the feed off cleanly at end is the operator's job.

:::

### Authentication

| Header | Value |
| --- | --- |
| `X-RCTF-Timestamp` | Unix milliseconds at signing time. Must be within a five-minute skew window of the server clock. |
| `X-RCTF-Signature` | `sha256=` followed by the lowercase hex HMAC-SHA256 of `${timestamp}.${challenge_id}.${raw_body}` using the challenge's webhook `secret`. |

Sign the raw request bytes, not the re-serialized JSON. Any difference between the signed bytes and the bytes on the wire (whitespace, key ordering, middleware re-serialization) will fail verification. The challenge ID in the signed string is the `:id` path parameter, so a signature is only valid for the challenge it was produced for.

Unknown challenge IDs, non-dynamic challenges, mismatched signatures, and timestamps outside the skew window all return the same `<response>401 badSignature</response>` so the endpoint can't be probed for which challenges accept a feed.

rCTF also refuses to apply the same delivery twice. Each accepted signature is remembered for ten minutes, and re-sending the same signed bytes to the same challenge within that window returns `<response>409 badReplayedRequest</response>`, so a captured request can't be replayed against the scoreboard.

Only accepted deliveries are remembered, which makes retries safe. If a push fails or the response gets lost, resend the identical signed request: either it goes through, or it comes back `<response>409 badReplayedRequest</response>` and you know the original attempt was accepted. Retry one attempt at a time, and sign a new request (fresh timestamp, fresh signature) whenever the scores themselves change. Because the challenge ID is part of the signed string, pushing the same payload to several challenges (even ones sharing a secret) means signing it once per challenge.

::request-body{def="SubmitDynamicScoresRouteV2" source="params" title="Path parameters"}

::request-body{def="SubmitDynamicScoresRouteV2" title="Request body"}

Each entry is an absolute setter for that team and challenge. A `<green>points</green>` value of `0` clears the team's score for the challenge, negative values are accepted, and teams omitted from the payload keep whatever score they already had. Entries for team IDs that don't exist are silently dropped - the response counts only reflect rows that actually landed.

::response-body{def="SubmitDynamicScoresRouteV2" response="goodDynamicScores" title="Response fields"}

Successful pushes also fire the `leaderboard:force-update` Redis pub/sub message, so a split `<green>frontend</green>` + `<green>leaderboard</green>` deployment still picks up the new scores on the worker's next tick.
