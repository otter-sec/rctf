---
title: "API reference"
description: "Reference for rCTF API versions, authentication, envelopes, permissions, rate limits, and typed route definitions."
order: 6
---

The rCTF API is a JSON REST API served from `<route>/api</route>`. Route definitions are exported from the `@rctf/types` package, and the API server registers each route by prefixing the typed path with `<route>/api</route>`.

## Versions

Both API versions are available at the same time:

| Version | Prefix | Status | Use |
| --- | --- | --- | --- |
| V1 | `<route>/api/v1</route>` | Supported | Legacy clients and compatibility with the original rCTF API. |
| V2 | `<route>/api/v2</route>` | Recommended | New integrations, richer response data, runtime settings, avatars, instancers, admin bot jobs, and admin search APIs. |

The two versions overlap rather than forming separate complete APIs. Use V2 where a V2 route exists, and fall back to V1 routes for actions that don't have V2 replacements. Many V2 routes share the same response `<red>kind</red>` string as their V1 equivalents, but the `data` payload is often wider in V2 (avatars, country codes, blood index, and similar additions).

## Typed route contract

The `@rctf/types` package exports every public route definition, response definition, enum, and helper type:

```ts showLineNumbers=false

  GetChallengesRouteV2,
  type RouteBodyInput,
  type RouteQueryInput,
  type RouteSuccessResponse,
} from '@rctf/types'

type Query = RouteQueryInput<typeof GetChallengesRouteV2>
type Response = RouteSuccessResponse<typeof GetChallengesRouteV2>
```

`RouteBodyInput<T>{:ts}` describes the client-side input shape before any zod coercions and transforms have run. The matching `RouteQueryInput<T>{:ts}` and `RouteParamsInput<T>{:ts}` helpers do the same for query strings and path parameters.

## Authentication

User-authenticated routes require an auth token in the `Authorization` header:

```text
Authorization: Bearer <auth-token>
```

Service-authenticated admin bot routes also use the `Authorization` header, but the token here is the shared admin bot service secret from `adminBot.provider.options.secretKey`.

| Auth mode | Behavior |
| --- | --- |
| Public | No token is required. Some public routes still accept optional auth so admins can bypass start-time gates. |
| Optional | The route works without a token, but an auth token may affect the response. |
| Required | A missing or invalid token returns `<response>401 badToken</response>`. |
| Permissioned | The user token must be valid and the user must have every required permission bit. Missing bits return `<response>403 badPerms</response>`. |
| Service | The shared service bearer token must match the configured provider secret. |

### Token types

| Token | Lifetime | Used by |
| --- | --- | --- |
| Auth | No expiry | `Authorization: Bearer <auth-token>` on user routes. |
| Team | No expiry | Account recovery and v1 login. V2 registration returns it directly when registration completes without email verification. |
| Verify | `loginTimeout` | Email update verification. |
| CTFtime auth | `loginTimeout` | CTFtime registration and login handoff. |

Tokens are encrypted with AES-GCM using the configured `tokenKey`. Changing `tokenKey` invalidates every token that was issued before the rotation.

## Response envelope

Most API routes return a JSON envelope:

```json
{
  "kind": "goodChallenges",
  "message": "The retrieval of challenges was successful.",
  "data": []
}
```

Routes whose response definition has no data schema omit the `data` field:

```json
{
  "kind": "goodFlag",
  "message": "The flag is correct."
}
```

The v1 CTFtime leaderboard route is the only typed route that intentionally returns the data body directly. `<route>GET /api/v1/integrations/ctftime/leaderboard</route>` returns `{ "standings": [...] }{:json}` rather than an rCTF envelope.

## Request validation

JSON routes parse the request body as JSON when a body schema exists. Form routes parse `multipart/form-data`. Validation failures return `<response>400 badBody</response>` with a machine-readable `reason` string:

```json
{
  "kind": "badBody",
  "message": "The request body does not meet requirements.",
  "data": {
    "reason": "query:limit: Too small: expected number to be >=1"
  }
}
```

The reason prefix identifies the source as `body`, `query`, or `params`. Malformed JSON returns `<response>400 badJson</response>`. Malformed form data returns `<response>400 badBody</response>` with `body:formData:malformed`.

## Permissions

Admin routes use bitmask permissions from `Permissions{:ts}`:

| Permission | Bit | Routes |
| --- | --- | --- |
| `challsRead{:ts}` | `1` | Admin challenge reads, instancer schema, admin bot status, challenge start-time bypass. |
| `challsWrite{:ts}` | `2` | Challenge updates, challenge deletion in v1, file upload. |
| `leaderboardRead{:ts}` | `4` | CTFtime leaderboard and leaderboard start-time bypass. |
| `challsSolveWrite{:ts}` | `8` | Solve deletion. |
| `usersWrite{:ts}` | `16` | Admin user lists, user mutation, pending verification management, submission audit logs. |
| `settingsWrite{:ts}` | `32` | Runtime settings reads and updates. |

When a route lists multiple permission bits, the user needs all of them.

## Timing gates

Routes marked as start-gated return `<response>401 badNotStarted</response>` before `startTime`. Admin users can bypass that gate when the route defines a bypass permission and their token has the required bit.

`<route>POST /api/v1/challs/:id/submit</route>` is also end-gated, returning `<response>401 badEnded</response>` after `endTime`.

## Captcha

Captcha-protected routes only validate a challenge response when the configured captcha provider marks that action as protected. V1 request bodies use `recaptchaCode`, and V2 request bodies use `captchaCode`.

| Action | Routes |
| --- | --- |
| `register{:ts}` | `<route>POST /api/v1/auth/register</route>`, `<route>POST /api/v2/auth/register</route>`. |
| `recover{:ts}` | `<route>POST /api/v1/auth/recover</route>`, `<route>POST /api/v2/auth/recover</route>`. |
| `setEmail{:ts}` | `<route>PUT /api/v1/users/me/auth/email</route>`, `<route>PUT /api/v2/users/me/auth/email</route>`. |
| `avatarUpload{:ts}` | `<route>PATCH /api/v2/users/me/avatar</route>`. |
| `instancerStart{:ts}` | `<route>PUT /api/v2/integrations/challs/:id/instance</route>`. |
| `instancerExtend{:ts}` | `<route>PATCH /api/v2/integrations/challs/:id/instance</route>`. |
| `adminBotSubmit{:ts}` | `<route>POST /api/v2/integrations/challs/:id/admin-bot</route>`. |

## Rate limits

Rate-limited routes return `<response>429 badRateLimit</response>` with `data.timeLeft`, measured in milliseconds:

| Action               | Scope              | Bucket                                 |
| -------------------- | ------------------ | -------------------------------------- |
| Registration email   | IP address         | Burst `20`, refill window `600000` ms. |
| Registration email   | Email address      | Burst `2`, refill window `3600000` ms. |
| Account recovery     | IP address         | Burst `5`, refill window `1500000` ms. |
| Account recovery     | Email address      | Burst `2`, refill window `3600000` ms. |
| Flag submission      | User and challenge | Burst `5`, refill window `25000` ms.   |
| Profile name update  | User               | Burst `3`, refill window `180000` ms.  |
| Avatar upload        | User               | Burst `2`, refill window `120000` ms.  |
| Admin bot submission | User and challenge | Burst `1`, refill window `10000` ms.   |
| Leaderboard search   | IP address         | Burst `3`, refill window `3000` ms.    |

The registration and recovery limits gate verification email delivery, and they apply whether or not the action is captcha protected. Registration only consumes its buckets when a verification email would be sent, and recovery consumes its buckets before the account lookup, so throttling cannot be used to probe whether an email is registered.

## Route sections

| Section | Scope |
| --- | --- |
| [Authentication](/api/auth/) | Registration, verification, recovery, login, and token validation across V2 and V1 route contracts. |
| [Challenges](/api/challenges/) | Public challenge listing, solves, v1 flag submission, and the dynamic-scoring webhook. |
| [Leaderboard](/api/leaderboard/) | Current standings, graph data, challenge leaderboard metadata, search, and pagination. |
| [Users](/api/users/) | Public profiles, self profile, updates, avatar upload, email/CTFtime auth, and team members. |
| [Admin](/api/admin/) | Challenge management, users, verification queue, submissions, uploads, settings, admin bot service routes, and external-auth clients. |
| [Integrations](/api/integrations/) | Client config, analytics script proxy, CTFtime, instancers, and participant admin bot routes. |
| [External auth](/api/external-auth/) | "Sign in with rCTF" flow for external services - client lookup, consent, and token exchange. |
| [Responses](/api/responses/) | Shared response kinds, error payloads, and common object models. |
