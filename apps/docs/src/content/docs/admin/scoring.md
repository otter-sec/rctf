---
title: Scoring
description: Challenge scoring kinds in rCTF (decay and dynamic), plus a guide for publishing scores to dynamic challenges.
order: 2
---

Each challenge uses either decay or dynamic scoring. Decay is the default and gives every solver the same number of points. Dynamic scoring accepts a different score for each team from an external service.

You set the scoring kind from the admin challenge editor under `/admin/challs` or directly through the [admin challenge update API](/api/admin/challenge-update). The platform refuses to switch a challenge's scoring kind while solves exist. Wipe the solves first, or pick the kind when you create the challenge.

## Challenge types

### Decay

The default. Every solver receives the same point value, and that value decreases as more teams solve the challenge. The math is controlled by the global [scoring provider](/providers/scores), which sees the challenge's `<red>points.min</red>` and `<red>points.max</red>` along with the current solve count.

```json title="Challenge data - decay"
{
  "points": { "min": 100, "max": 500 },
  "scoring": { "kind": "decay" }
}
```

Editing `<red>points.min</red>` or `<red>points.max</red>` on a decay challenge immediately re-prices every existing solver. Switching the scoring algorithm globally also re-prices every decay challenge on the next worker tick.

Some scoring providers compare a challenge against `<red>maxSolves</red>`, the highest solve count among decay challenges. Dynamic challenges are excluded from that calculation, since their scores come from an external source.

:::note[Default behavior]
Existing challenges that don't set `<red>scoring</red>` at all are treated as decay. Upgrading from an earlier rCTF version doesn't require touching any data.
:::

### Dynamic

The points for a dynamic challenge come from an external scoring source that publishes per-team values over time. Every team can have a different score on the same challenge, and the scores can move up or down as the source publishes updates. Dynamic scoring works well for king-of-the-hill, attack-defense, and other scoring systems that run outside rCTF.

```json title="Challenge data - dynamic"
{
  "scoring": {
    "kind": "dynamic",
    "source": {
      "transport": "webhook",
      "secret": "<shared-secret>"
    }
  }
}
```

| Field | Required when | Purpose |
| --- | --- | --- |
| `<red>scoring.source.transport</red>` | Always | Must be `<green>webhook</green>`. |
| `<red>scoring.source.secret</red>` | Always | Shared HMAC secret used for webhook auth. |

:::warning[Flag submissions are rejected]
Dynamic challenges ignore flag submissions. The external source owns the scoreboard. Leave the challenge's `<red>flag</red>` field empty so the public challenge listing hides the submit form.
:::

## Dynamic scoring guide

Dynamic challenges talk to rCTF through a webhook. Your scoring backend POSTs the current per-team scores whenever they change.

:::warning[Stop the feed when the event ends]
The dynamic-scores endpoint accepts updates before the CTF starts and after it ends. Stop the scoring backend at the end of the event, or later updates will continue to change the leaderboard.
:::

### Team identifiers

Every entry in the score list references an rCTF team ID, the same UUID that appears on the `/users/:id` page. The dynamic backend needs to know each team's ID somehow. A few patterns tend to work.

- Have admins paste each team's rCTF ID into the dynamic service's onboarding flow.
- Wire a "Sign in with rCTF" button on the dynamic service through [External apps](/admin/external-auth) and read the team ID from `<route>GET /api/v1/users/me</route>` once the user lands back authorized. This is usually the lowest-friction option when teams self-onboard.

Scores for unknown team IDs are silently ignored. Keep a record of the IDs you send if you need to confirm that every team was updated.

### Request body

The webhook uses this JSON body:

```json title="Payload"
{
  "scores": [
    { "userId": "11111111-2222-3333-4444-555555555555", "points": 1280 },
    { "userId": "66666666-7777-8888-9999-000000000000", "points": 940 }
  ]
}
```

| Field | Type | Required | Purpose |
| --- | --- | --- | --- |
| `<red>scores</red>` | `array{:ts}` | Yes | Per-team score entries. |
| `<red>scores[].userId</red>` | `string{:ts}` | Yes | rCTF team UUID. |
| `<red>scores[].points</red>` | `int{:ts}` | Yes | Signed integer. `<green>0</green>` clears that team's score for the challenge. Negative values are accepted. |

Each entry replaces that team's current score for the challenge. Teams omitted from the payload keep their existing score.

### Webhook

Send a `<route>POST /api/v2/challs/:id/scores</route>` request whenever a team's score changes. rCTF saves the new values, records the change for the historical graph, and tells the leaderboard worker to recalculate the standings.

#### Endpoint

```http
POST /api/v2/challs/<challenge-id>/scores HTTP/1.1
Host: ctf.example.com
Content-Type: application/json
X-RCTF-Timestamp: <unix-milliseconds>
X-RCTF-Signature: sha256=<hex>

{"scores":[{"userId":"…","points":1280}]}
```

| Header | Description |
| --- | --- |
| `<red>X-RCTF-Timestamp</red>` | Unix milliseconds at signing time. Requests outside a five-minute skew window are rejected. |
| `<red>X-RCTF-Signature</red>` | `<green>sha256=</green>` followed by the lowercase hex HMAC-SHA256 of `<green>${timestamp}.${challenge_id}.${raw_body}</green>` using the challenge's `<red>secret</red>`. The challenge ID is the `:id` path parameter, so a signature only works for the challenge it was signed for. |

The route is public and authenticates requests with the HMAC signature, timestamp, and replay check. The shared secret protects the scoreboard and should be handled like a password.

#### Responses

| Status | Kind | Meaning |
| --- | --- | --- |
| `200` | `<green>goodDynamicScores</green>` | Body has `<red>inserted</red>`, `<red>updated</red>`, `<red>deleted</red>` counts. |
| `400` | `<green>badBody</green>` | Payload didn't validate against the schema. |
| `401` | `<green>badSignature</green>` | HMAC mismatch, timestamp outside the skew window, unknown challenge ID, or the challenge isn't `<green>dynamic</green>`. The endpoint deliberately doesn't distinguish these so it can't be probed for which challenges accept the feed. |
| `409` | `<green>badReplayedRequest</green>` | The same signed request was already accepted within the last ten minutes. When retrying, this confirms that the original delivery succeeded. |

#### Reference publisher

```ts title="publish-scores.ts" showLineNumbers=false
import { createHmac } from 'node:crypto'

const RCTF_BASE_URL = 'https://ctf.example.com'
const CHALLENGE_ID = 'koth-pwn-2026'
const SECRET = process.env.RCTF_DYNAMIC_SECRET!

type ScoreEntry = { userId: string; points: number }

export async function publishScores(scores: ScoreEntry[]) {
  const body = JSON.stringify({ scores })
  const timestamp = Date.now().toString()
  const signature =
    'sha256=' +
    createHmac('sha256', SECRET).update(`${timestamp}.${CHALLENGE_ID}.${body}`).digest('hex')

  const res = await fetch(`${RCTF_BASE_URL}/api/v2/challs/${CHALLENGE_ID}/scores`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-rctf-timestamp': timestamp,
      'x-rctf-signature': signature,
    },
    body,
  })

  if (!res.ok) {
    throw new Error(`rCTF rejected scores: ${res.status} ${await res.text()}`)
  }
  return (await res.json()) as {
    data: { inserted: number; updated: number; deleted: number }
  }
}
```

:::warning[Sign the raw body, not the parsed body]
rCTF reads the raw request bytes for HMAC verification and only parses JSON after the signature matches. Sign the exact bytes you send. Adding whitespace, sorting keys, or letting a middleware re-serialize the body between signing and sending will cause verification to fail.
:::

:::note[Retries are safe]
If a request times out, retry with the same body, timestamp, and signature. A `409` `<green>badReplayedRequest</green>` means the first request succeeded and the retry can be treated as successful. Send retries one at a time. For a new score update, create a new timestamp and signature.
:::

## How scores reach the leaderboard

rCTF stores each team's current points in `solves.points{:sql}`. It also appends every change to `score_events{:sql}` with the point difference and its source (`<green>flag</green>`, `<green>decay-recompute</green>`, `<green>feed</green>`, `<green>ban</green>`, `<green>delete</green>`, or `<green>algo-change</green>`).

- The leaderboard worker sums each team's `solves.points{:sql}` to produce ranks. Decay recomputes are debounced through Redis pub/sub so a burst of solves only re-prices the challenge once.
- The leaderboard graph replays `score_events{:sql}` chronologically so historical points reflect what the team had at that point in time, not what they have now.
- Banning a team emits reversing events for every solve they had, and unbanning restores them. The leaderboard worker re-runs decay for every affected challenge.
- Deleting a solve emits a single reversing event.

You don't need to interact with `score_events{:sql}` directly. It's an internal audit log. Its fields are documented above to help explain discrepancies between the `/scores` page and the `/scores/:id` graph.
