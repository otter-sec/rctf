All data gathered. Composing the report.

# rCTF Public API Contract Catalog (for apps/web-new)

Sources: `apps/docs/src/content/docs/api/**` (all non-admin pages) cross-referenced with the authoritative route/response definitions in `packages/types/src/routes/**` and `packages/types/src/responses/**` (the docs render schemas from these via directives). Base path: all routes are served under `<origin>/api` + typed path (e.g. `/api/v2/challs`).

## 1. Conventions

### Response envelope

- Every typed route (one exception) returns `{ kind: string, message: string, data?: T }`. `data` is omitted entirely when the response definition has no data schema (e.g. `goodFlag`, `goodToken`).
- Sole exception: `GET /api/v1/integrations/ctftime/leaderboard` returns the raw body `{ standings: [...] }` with no envelope (`returnBodyAsIs: true`).
- Unknown routes → `404 badEndpoint`. Unexpected server errors → `500 errorInternal`. `badEndpoint` is ALSO returned when the provider behind a route is not configured (e.g. instancer disabled, CTFtime not configured, `userMembers` disabled) — the frontend must treat 404 on feature routes as "feature off".
- Validation failures → `400 badBody` with `data.reason` string prefixed by source: `body:`, `query:`, or `params:` (e.g. `"query:limit: Too small: expected number to be >=1"`). Malformed JSON → `400 badJson`. Malformed multipart → `400 badBody` with `body:formData:malformed`.
- Route definitions (incl. all zod schemas, `RouteBodyInput<T>`, `RouteQueryInput<T>`, `RouteParamsInput<T>`, `RouteSuccessResponse<T>` helpers) are importable from `@rctf/types` — the new frontend should consume these instead of hand-writing types.

### Common error kinds (usable on any route)

| Kind               | Status | Data                        |
| ------------------ | ------ | --------------------------- |
| `badJson`          | 400    | —                           |
| `badBody`          | 400    | `{ reason: string }`        |
| `badToken`         | 401    | —                           |
| `badPerms`         | 403    | —                           |
| `badEndpoint`      | 404    | —                           |
| `badNotStarted`    | 401    | — (CTF not started)         |
| `badEnded`         | 401    | — (CTF ended)               |
| `badCaptcha`       | 403    | — (V2 captcha fail)         |
| `badRecaptchaCode` | 401    | — (V1 captcha fail)         |
| `badRateLimit`     | 429    | `{ timeLeft: number }` (ms) |
| `errorInternal`    | 500    | —                           |

### Auth token model

- Header: `Authorization: Bearer <auth-token>` on all user-authenticated routes.
- Token kinds: **Auth** (no expiry; the session credential), **Team** (no expiry; recovery + v1 login; shown in own-profile as `teamToken` — treat as credential), **Verify** (`loginTimeout` TTL, single-use via Redis marker; email/registration verification), **CtftimeAuth** (`loginTimeout` TTL; CTFtime handoff).
- Tokens are AES-256-GCM encrypted with server `tokenKey`; rotating `tokenKey` invalidates all tokens.
- Auth modes per route: Public / Optional (token may enrich response, e.g. `mySolvePosition`, `yourScore`) / Required (missing/invalid → `401 badToken`) / Permissioned (admin bitmask; missing bits → `403 badPerms`) / Service (shared secret; admin-bot worker + dynamic-scores HMAC).
- Permission bits (`Permissions`): `challsRead=1`, `challsWrite=2`, `leaderboardRead=4`, `challsSolveWrite=8`, `usersWrite=16`, `settingsWrite=32`. Multiple bits = ALL required. Own-profile `perms` is `null` for standard users — nonnull perms is how the frontend detects admin.
- Several authenticated participant routes carry `rejectBanned: true` (all instancer + admin-bot participant routes): banned teams are rejected.

### Timing gates

- Start-gated routes (`onlyWhenStarted`) return `401 badNotStarted` before `startTime`; a token holding the route's bypass permission bit reads through the gate (standings/graph: `leaderboardRead`; challenges/solves/profiles/leaderboard-challs/instancer/admin-bot: `challsRead`; flag submit bypass: `challsWrite`).
- `POST /api/v1/challs/:id/submit` is additionally end-gated (`401 badEnded` after `endTime`). V1 member create/delete also list `badEnded`.
- Division change via profile update is rejected after `endTime` (`badDivisionChangeEnded` on V2; via `badBody` on V1).
- Dynamic-scores webhook deliberately has NO timing gates.

### Captcha

- Only enforced when deployment's captcha provider protects that action (client discovers via client-config `captcha.protectedEndpoints`). Field name: V1 `recaptchaCode`, V2 `captchaCode`.
- Protected actions → routes: `register` (v1/v2 register), `recover` (v1/v2 recover), `setEmail` (v1/v2 PUT email), `avatarUpload` (PATCH avatar), `instancerStart` (PUT instance), `instancerExtend` (PATCH instance), `adminBotSubmit` (POST admin-bot).

### Rate limits (all → `429 badRateLimit` + `data.timeLeft` ms)

| Action               | Scope          | Burst / refill window                                                  |
| -------------------- | -------------- | ---------------------------------------------------------------------- |
| Registration email   | IP             | 20 / 600 000 ms                                                        |
| Registration email   | email          | 2 / 3 600 000 ms                                                       |
| Recovery             | IP             | 5 / 1 500 000 ms                                                       |
| Recovery             | email          | 2 / 3 600 000 ms                                                       |
| Flag submission      | user+challenge | 5 / 25 000 ms                                                          |
| Profile name update  | user           | 3 / 180 000 ms (consumed on EVERY profile update regardless of fields) |
| Avatar upload        | user           | 2 / 120 000 ms                                                         |
| Admin bot submission | user+challenge | 1 / 10 000 ms                                                          |
| Leaderboard search   | IP             | 3 / 3 000 ms (only when `search` param present)                        |

Registration buckets are only consumed when a verification email would actually be sent; recovery buckets are consumed BEFORE account lookup (no email-existence oracle).

### API versioning

- V1 (`/api/v1/...`) and V2 (`/api/v2/...`) coexist; they overlap rather than being complete alternatives. Rule for the new frontend: **use V2 where it exists, V1 where there is no V2 replacement.** V1-only actions the new frontend still needs: login (`POST /v1/auth/login`), token test (`GET /v1/auth/test`), flag submit (`POST /v1/challs/:id/submit`), email auth remove, CTFtime auth set/remove, team members CRUD, CTFtime callback.
- V2 payloads are wider (avatars, countryCode, statusText, bloodIndex, dynamicScores, instancer/admin-bot metadata, `hasFlag`, search).

### Pagination / polling semantics

- Pagination is query-string `limit` (int ≥ 1; max capped by deployment config, NOT exposed via API) + `offset` (int ≥ 0). Used by: challenge solves (v1/v2), challenge scores (v2), leaderboard now/with-graph/graph(v2). V1 graph supports only `limit`. Responses that paginate include `total` for page math (leaderboard, challenge scores); challenge solves response has NO total — infer end by short page.
- Leaderboard data is produced by a background worker into a cache; freshness is worker-tick based, plain polling from the client (no push channel documented for the frontend). Ranking: score desc; ties → earlier `tiebreakEligible` last-solve wins, then earlier absolute last solve. Banned teams excluded; `globalPlace: null` if one leaks through.
- Instancer: `PUT` may return `status: "starting"` — client polls `GET .../instance` until `running`/`errored`. Status enum: `stopped | running | starting | stopping | errored`.
- Admin bot: `POST` returns `jobId`; poll `GET .../admin-bot/status` (`job: null` = no queued/running job; job has `queuePosition`, incremental `logs`). Job status enum: `queued | running | completed | failed`. History endpoint lists retained finished jobs (`hasLogs` flag), logs fetched separately.

---

## 2. Auth domain

### POST /api/v2/auth/register (and v1 `/api/v1/auth/register`)

- Auth: none. Captcha action `register`. Rate limits: registration email buckets.
- Body (v2): `{ email?: string (required unless ctftimeToken; normalized lowercase/trim), name: string (2–64 printable ASCII), ctftimeToken?: string, captchaCode?: string }`. V1 identical but `recaptchaCode`.
- Success: `200 goodVerifySent` (no data — email verification pending, team NOT created yet) OR immediate `200 goodRegisterV2` `{ authToken, teamToken }` (v1: `goodRegister` `{ authToken }`).
- Errors: `badCompetitionNotAllowed`(403), `badCtftimeToken`(401), `badEmail`(400), `badName`(400), `badKnownCtftimeId`/`badKnownEmail`/`badKnownName`(409), `badRegistrationsDisabled`(400), `badCaptcha`/`badRecaptchaCode`, `badEndpoint`, `badRateLimit`.
- Behavior: server picks division via email ACLs (client does not send division). CTFtime registrations skip email ACLs and email buckets.

### POST /api/v2/auth/verify (and v1)

- Auth: none. Body: `{ verifyToken: string }`.
- Success depends on token kind: pending registration → `goodRegisterV2` `{ authToken, teamToken }` (v1 `goodRegister` `{ authToken }`); team token → `goodVerify` `{ authToken }`; email-change verify token → `goodEmailSet` (no data).
- Errors: `badTokenVerification`(401), `badEmailChangeDivision`(403), `badKnownCtftimeId`/`badKnownEmail`/`badKnownName`(409), `badUnknownUser`(404). Verify tokens single-use + `loginTimeout` expiry; decryption success ≠ usable.

### POST /api/v2/auth/recover (and v1)

- Auth: none. Captcha action `recover`. Rate limits: recovery buckets. Body: `{ email, captchaCode? }` (v1 `recaptchaCode`).
- Success: always `200 goodVerifySent` (no data) — including unknown emails (anti-enumeration). Errors: `badEndpoint` (no email provider), `badEmail`, `badUnknownEmail`(404 — listed but flow returns goodVerifySent for unknown; treat as possible), `badCaptcha`/`badRecaptchaCode`, `badRateLimit`. Recovery email contains a team token → exchange via verify (v2) or login (v1).

### GET /api/v2/auth/verify-info

- Auth: none. Query: `{ token: string }`.
- Success: `200 goodVerifyInfo` `{ kind: "register"|"team"|"update", email: string|null, name?: string }`. Does NOT consume the token — use to render confirmation UI before submitting to verify. Errors: `badTokenVerification`.

### POST /api/v1/auth/login (V1-only, current)

- Auth: none. Body: `{ teamToken?: string, ctftimeToken?: string }` (exactly one required).
- Success: `200 goodLogin` `{ authToken }`. Errors: `badUnknownUser`, `badTokenVerification`, `badCtftimeToken`.

### GET /api/v1/auth/test (V1-only, current)

- Auth: required. Success: `200 goodToken` (no data). Error: `401 badToken`. Session-validity check.

## 3. Challenges domain

### GET /api/v2/challs (v1: /api/v1/challs)

- Auth: none, optional auth accepted (v2). Start-gated; bypass `challsRead`.
- Success `200 goodChallengesV2`: array of `{ id, name, description (markdown), category, author, files: {name, url, size: int|null}[], points: int (current dynamic value), solves: int, sortWeight: number|null, tags: string[]|null, instancerLifetime: number|null (ms), instancerExtendable: boolean, instancerStoppable: boolean, instancerActions: {id, label}[], adminBotInputs: Record<string,{pattern, flags?}>|null|undefined, hasFlag: boolean, scoringKind?: "decay"|"dynamic", yourScore?: int (auth-only, when caller has solve/feed entry), yourPointDelta?: int (dynamic, latest tick) }`.
- V1 `goodChallenges`: `{ id, name, description, category, author, files: {name,url}[], points?, solves?, sortWeight? }` (nullables omitted).
- Errors: `badNotStarted`. Public list does not expose `points.min`/`points.max`. Hidden + future-`releaseTime` challenges excluded for non-admins.

### GET /api/v2/challs/:id/solves (v1 same shape, smaller rows)

- Auth: none; optional auth (v2) adds `mySolvePosition`. Start-gated; bypass `challsRead`. Params `{ id }`; query `{ limit ≥1 (config-capped), offset ≥0 }`.
- Success `200 goodChallengeSolvesV2`: `{ solves: [{ id, createdAt (unix ms), userId, userName, userAvatarUrl: string|null, userCountryCode: string|null, userStatusText: string|null, globalPlace: int, division: string, divisionPlace: int, bloodIndex: 0|1|2|null }], mySolvePosition: int|null }`. V1: `{ solves: [{ id, createdAt, userId, userName }] }`.
- Errors: `badNotStarted`, `badChallenge`(404), `badBody`.

### GET /api/v2/challs/:id/scores — **in @rctf/types, not yet in docs pages**

- Auth: none; optional auth adds `myPosition`. Start-gated; bypass `challsRead`. Params `{ id }`; query `{ limit, offset }`.
- Success `200 goodChallengeScoresV2`: `{ total: int, myPosition: int|null, scores: [{ userId, userName, userAvatarUrl|null, userCountryCode|null, userStatusText|null, points: int, pointDelta: int, globalPlace: int, division, divisionPlace: int }], graph: [{ id, name, points: [{time (unix ms), score}] }] }`. Per-challenge leaderboard for dynamic challenges.
- Errors: `badNotStarted`, `badChallenge`, `badBody`.

### POST /api/v1/challs/:id/submit (V1-only, current)

- Auth: required. Start-gated (bypass `challsWrite`) AND end-gated. Rate limit 5/25 000 ms per user+challenge.
- Params `{ id }`; body `{ flag: string (max 1024) }`.
- Success: `200 goodFlag` (no data). Errors: `badFlag`(400), `badAlreadySolvedChallenge`(409), `badChallenge`(404), `badNotStarted`/`badEnded`(401), `badRateLimit`, `badUnknownUser`, `badToken`, `badPerms`. Both correct and incorrect attempts create admin audit rows.

### POST /api/v2/challs/:id/scores (dynamic-scoring webhook — not called by the web frontend, listed for completeness)

- Auth: HMAC service auth, no user token. Headers `X-RCTF-Timestamp` (unix ms, ±5 min skew) + `X-RCTF-Signature` (`sha256=` hex HMAC-SHA256 of `${timestamp}.${raw_body}` with challenge `scoring.source.secret`). Sign raw bytes.
- Body: `{ scores: [{ userId, points: int32 (absolute setter; 0 clears; negatives allowed) }] }`. Unknown team IDs silently dropped.
- Success: `200 goodDynamicScores` `{ inserted, updated, deleted }`. Errors: `401 badSignature` (all probe-able causes collapsed), `409 badReplayedRequest` (accepted-signature dedupe, 10 min window per challenge), `badBody`. No timing gates. Fires `leaderboard:force-update` pub/sub.

## 4. Leaderboard domain

All: auth none (optional token honored for start-gate bypass), start-gated, read from worker cache.

### GET /api/v2/leaderboard/now (v1 same minus search)

- Query: `{ limit ≥1 (config-capped), offset ≥0, division?: string, search?: string (2–100 chars, v2 only) }`. Search rate limit 3/3 000 ms per IP. Bypass `leaderboardRead`.
- Success `200 goodLeaderboardV2`: `{ total: int, leaderboard: [{ id, name, score: int, avatarUrl|null, countryCode|null, statusText|null, solves: [{id (challenge id), solveTime (unix ms)}], dynamicScores: [{id, points: int, pointDelta: int}], division, divisionPlace: int, globalPlace: int|null }] }`. V1 `goodLeaderboard`: `{ total, leaderboard: [{id, name, score}] }`.
- Errors: `badNotStarted`, `badBody`, `badRateLimit` (v2).

### GET /api/v2/leaderboard/with-graph (V2-only)

- Query: same as v2 `/now` (limit, offset, division?, search?; search rate-limited). Bypass `leaderboardRead`.
- Success `200 goodLeaderboardWithGraph`: `{ total, leaderboard: LeaderboardEntryV2[] (same as /now), graph: [{ id, name, points: [{time, score}], dynamicPoints?: [{time, score}] }] }`. One round-trip for standings page with chart.

### GET /api/v2/leaderboard/graph (v1: limit+division only, no offset)

- Query v2: `{ limit, offset, division? }`. Bypass `leaderboardRead`. Graph size/cadence governed by `leaderboard.graphMaxTeams` / `leaderboard.graphSampleTime` server config.
- Success `200 goodLeaderboardGraph`: `{ graph: [{ id, name, points: [{time, score}], dynamicPoints?: [{time, score}] }] }`. Errors: `badNotStarted`, `badBody`.

### GET /api/v2/leaderboard/challs (V2-only)

- No params. Start-gated; bypass `challsRead` (not leaderboardRead).
- Success `200 goodLeaderboardChallengesV2`: `{ challenges: Record<challengeId, { name, category, solves: int, points: int, sortWeight: int|null, scoringKind: "decay"|"dynamic", firstSolvers: [{id}] (≤3, ordered) }> }`. Errors: `badNotStarted`.

## 5. Users domain

### GET /api/v2/users/:id (v1 smaller)

- Auth: none. Start-gated; bypass `challsRead` (profiles include solves). Params `{ id: team id }`.
- Success `200 goodUserDataV2`: `{ name, ctftimeId?: string|null, division, score: int, globalPlace: int|null, divisionPlace: int|null, solves: [{ category, name, points: int|null, awardedPoints: int|null, solves: int|null, id, createdAt (unix ms), bloodIndex: int|null }], dynamicScores: [{id, points, pointDelta}], avatarUrl|null, countryCode|null, statusText|null }`. V1 `goodUserData` drops avatar/country/status/dynamicScores/awardedPoints/bloodIndex (nullable ctftimeId omitted-when-null).
- Errors: `badUnknownUser`(404), `badNotStarted`.

### GET /api/v2/users/me (v1 smaller)

- Auth: required. Not start-gated.
- Success `200 goodUserSelfDataV2`: public V2 fields plus `{ id, email: string|null, teamToken (credential!), allowedDivisions: string[], perms: int|null }`. Errors: `badToken`.

### PATCH /api/v2/users/me (v1: name+division only)

- Auth: required. Rate limit: 3/180 000 ms per user, consumed on every call.
- Body (v2, all optional): `{ name? (2–64 printable ASCII), division?: string (must be in allowedDivisions per email ACL), countryCode?: ISO-3166-1-alpha-2|null (null clears), statusText?: string (max 60)|null }`.
- Success `200 goodUserUpdateV2`: `{ user: { name, email|null, division, avatarUrl|null, countryCode|null, statusText|null } }` (v1: `{ user: { name, email|null, division } }`).
- Errors: `badName`, `badKnownName`(409), `badDivisionNotAllowed`(403), `badDivisionChangeEnded` (v2; v1 surfaces as `badBody`), `badRateLimit`, `badToken`. Triggers leaderboard recalc.

### PATCH /api/v2/users/me/avatar (V2-only)

- Auth: required. Captcha action `avatarUpload`. Rate limit 2/120 000 ms per user. Body: `multipart/form-data` — `avatar` file field (omit to REMOVE current avatar), optional `captchaCode` field.
- Server: enforces `maxAvatarSize`, resizes 256×256, converts WebP, optional moderation, deletes replaced image.
- Success `200 goodAvatarUpdated` `{ url: string|null }`. Errors: `badAvatarFile`(400), `badAvatarFileSize`(400, `{maxSize}`), `badModerationNotPassed`(400), `badCaptcha`, `badRateLimit`, `badToken`.

### PUT /api/v2/users/me/auth/email (v1 with `recaptchaCode`)

- Auth: required. Captcha action `setEmail`. Body: `{ email, captchaCode? }`.
- Success: `200 goodVerifySent` (email provider configured → token emailed, submit via verify) or `200 goodEmailSet` (immediate). Errors: `badEmail`, `badKnownEmail`(409), `badEmailChangeDivision`(403), `badUnknownUser`, `badCaptcha`, `badToken`.

### DELETE /api/v1/users/me/auth/email (V1-only)

- Auth: required. Success `200 goodEmailRemoved` (no data). Errors: `badZeroAuth`(409 — would remove last auth method), `badEmailNoExists`(404), `badEndpoint`, `badUnknownUser`, `badToken`.

### PUT /api/v1/users/me/auth/ctftime (V1-only)

- Auth: required. Body `{ ctftimeToken: string }`. Success `200 goodCtftimeAuthSet` (no data). Errors: `badEndpoint` (CTFtime not configured), `badCtftimeToken`(401), `badKnownCtftimeId`(409), `badUnknownUser`, `badToken`.

### DELETE /api/v1/users/me/auth/ctftime (V1-only)

- Auth: required. Success `200 goodCtftimeRemoved` (no data). Errors: `badZeroAuth`(409), `badCtftimeNoExists`(404), `badEndpoint`, `badUnknownUser`, `badToken`.

### GET /api/v1/users/me/members (V1-only)

- Auth: required. Feature-gated by `userMembers` config (`badEndpoint` when off). Members are informational email rows, not login identities.
- Success `200 goodMemberData`: `[{ id (membership id), userid, email }]`. Errors: `badEndpoint`, `badToken`.

### POST /api/v1/users/me/members (V1-only)

- Auth: required. Body `{ email }`. Success `200 goodMemberCreate` `{ id, userid, email }`. Errors: `badEndpoint`, `badEnded`, `badEmail`, `badKnownEmail`(409), `badTooManyMembers`(409, `maxMembers` cap), `badToken`.

### DELETE /api/v1/users/me/members/:id (V1-only)

- Auth: required. Params `{ id: membership id }`. Success `200 goodMemberDelete` (no data). Errors: `badEnded`, `badEndpoint`, `badToken`.

## 6. External auth domain ("Sign in with rCTF" — NOT OAuth2)

No scopes/refresh/PKCE/OIDC. Consent page lives at frontend route `/external-auth/authorize?client_id&redirect_uri&state`. Codes: Redis, 60 s TTL, single-use (atomic delete on first exchange). Deleting a client blocks future exchanges but does not revoke issued tokens. All failures (unknown client, wrong secret, bad/expired/reused code, redirect mismatch) → identical `400 badExternalAuthRequest` (no data).

### GET /api/v2/external-auth/clients/:id

- Auth: none. Params `{ id }`. Success `200 goodExternalAuthClient` `{ id, name, redirectUri }` (never the secret). Error: `badExternalAuthRequest`. Consent page uses this to render app name + verify redirect URI byte-for-byte.

### POST /api/v2/external-auth/authorize

- Auth: **required** (user session token). Body: `{ clientId, redirectUri (must byte-match registration), state?: string (opaque, echoed) }`.
- Success `200 goodExternalAuthAuthorize` `{ redirectTo: string }` — registered redirectUri with `code=...`(&`state=...`) appended. Errors: `badExternalAuthRequest`, `badToken`.

### POST /api/v2/external-auth/token

- Auth: none (server-to-server; secret in body). Body: `{ clientId, clientSecret, code }`.
- Success `200 goodExternalAuthToken` `{ accessToken, tokenType: "bearer" }` — accessToken is a regular no-expiry rCTF auth token with full account access. Error: `badExternalAuthRequest`.

## 7. Integrations domain

### GET /api/v2/integrations/client/config (v1 legacy)

- Auth: none. THE bootstrap call for the frontend.
- Success `200 goodClientConfigV2` data: `{ meta: { description, imageUrl }, homeContent (markdown), sponsors: [{name, icon, description, url?}], flagFormatPlaceholder, analytics: {provider, publicOptions: Record<string,string>}|null, ctfName, divisions: Record<key,displayName>, defaultDivision: string|null, origin, startTime (unix ms), endTime (unix ms), userMembers: boolean, faviconUrl|null, logoLightUrl|null, logoDarkUrl|null, emailEnabled: boolean, registrationsEnabled: boolean|null, ctftime: {clientId}|null, instancerEnabled: boolean, isArchived: boolean, captcha: { provider, publicOptions, protectedEndpoints: Record<ProtectedAction, boolean> }|null }`.
- V1 `goodClientConfig`: same core but `globalSiteTag?`, `recaptcha?: {siteKey, protectedActions}` instead of analytics/captcha, no logos/archive/instancer fields; nullables omitted-when-null.

### GET /api/v2/integrations/analytics/script

- Auth: none. NOT a typed route/envelope: returns provider JavaScript (server caches 1 h). `404` when analytics unconfigured, `502` on upstream fetch failure.

### Instancer routes (all: auth required, rejectBanned, start-gated bypass `challsRead`, params `{ id: challenge id }`, success `200 goodInstanceStatus` `{ status: "stopped"|"running"|"starting"|"stopping"|"errored", timeLeftMilliseconds: int|null, endpoints: [{ kind: "tcp"|"tcp-ssl"|"http"|"https"|"raw", host, port, title?, text? }]|null }`; common errors `badEndpoint` (no instancer/challenge config), `badChallenge`, `badInstancerError`(400, `{message}`), `badPerms`)

- `GET /api/v2/integrations/challs/:id/instance` — status poll (also `errorInternal` listed).
- `PUT /api/v2/integrations/challs/:id/instance` — start; body `{ captchaCode? }`; captcha action `instancerStart`; adds `badCaptcha`.
- `PATCH /api/v2/integrations/challs/:id/instance` — extend; body `{ captchaCode? }`; captcha action `instancerExtend`; adds `badCaptcha`.
- `DELETE /api/v2/integrations/challs/:id/instance` — stop.
- `POST /api/v2/integrations/challs/:id/instance/actions/:action` — **in @rctf/types, not yet in docs pages.** Params `{ id, action }`. Success `200 goodInstancerActionResult` `{ message: string|null, submitFlag: string|null }`. Errors add `badRateLimit`. (Frontend renders challenge's `instancerActions` buttons and calls this.)

### Admin bot participant routes (all start-gated bypass `challsRead`, params `{ id }`; feature-off → `badEndpoint`)

- `GET /api/v2/integrations/challs/:id/admin-bot/config` — auth: none (optional). Success `200 goodAdminBotConfig` `{ sourceCode, fileExtension }`. Errors: `badEndpoint`, `badChallenge`, `badToken`.
- `POST /api/v2/integrations/challs/:id/admin-bot` — auth required, rejectBanned. Captcha action `adminBotSubmit`. Rate limit 1/10 000 ms per user+challenge. Body `{ inputs: Record<string(max 256), string(max 1024)>, captchaCode? }` (keys = challenge's `adminBotInputs` config; values must match configured regex). Success `200 goodAdminBotJobSubmitted` `{ jobId }`. Errors: `badAdminBotConfig`(400 `{error}`), `badInstancerState`(400 `{error}` — needs running instance that outlives bot timeout), `badCaptcha`, `badRateLimit`, `badEndpoint`, `badChallenge`, `badPerms`, `badToken`. One queued/running job per user+challenge.
- `GET /api/v2/integrations/challs/:id/admin-bot/status` — auth required, rejectBanned. Success `200 goodAdminBotJobStatus` `{ job: { id, status: "queued"|"running"|"completed"|"failed", createdAt (ISO 8601 string), queuePosition: int|null, logs: string|null } | null }`.
- `GET /api/v2/integrations/challs/:id/admin-bot/history` — auth required, rejectBanned. Success `200 goodAdminBotJobHistory` `{ jobs: [{ id, status, createdAt (ISO), hasLogs: boolean }] }`.
- `GET /api/v2/integrations/challs/:id/admin-bot/jobs/:jobId/logs` — auth required, rejectBanned. Params `{ id, jobId }`. Success `200 goodAdminBotJobLogs` `{ logs: string|null }`.

### CTFtime

- `POST /api/v1/integrations/ctftime/callback` — auth: none. Body `{ ctftimeCode: string (OAuth code) }`. Success `200 goodCtftimeToken` `{ ctftimeToken, ctftimeName, ctftimeId }` (short-lived handoff token for register/login/link). Errors: `badEndpoint`, `badCtftimeCode`(401).
- `GET /api/v1/integrations/ctftime/leaderboard` — auth: required + permission `leaderboardRead` (admin-ish; not a normal frontend call). Returns RAW `{ standings: [{pos, team, score}] }` — no envelope.

---

## 8. Frontend-relevant behavioral notes (cross-cutting requirements)

1. **Bootstrap**: fetch `GET /v2/integrations/client/config` first; it drives ctfName, divisions, timing (`startTime`/`endTime` gates in UI), registration availability, email vs CTFtime auth affordances, captcha provider wiring + which actions need captcha widgets, logos/favicon, sponsors, homeContent markdown, `flagFormatPlaceholder`, `instancerEnabled`, `isArchived` (read-only mode), `userMembers`.
2. **Session model**: store the no-expiry authToken; validate with `GET /v1/auth/test`; identify user + admin status via `GET /v2/users/me` (`perms !== null`). Send token even on public routes so admins bypass start gates and users get `yourScore`/`mySolvePosition` enrichment.
3. **Error handling must be kind-driven**, not status-driven: 401 covers badToken/badNotStarted/badEnded/badRecaptchaCode/badSignature; 404 covers not-found AND feature-disabled; 400 badBody carries a machine-readable `reason`. 429 needs a `timeLeft`-ms countdown UX (flag submit, name update, avatar, admin bot, search, register/recover).
4. **Anti-enumeration surfaces**: recover always says goodVerifySent; external-auth always badExternalAuthRequest — don't try to render distinct causes.
5. **Undocumented-but-typed routes** the new frontend will likely need: `GET /api/v2/challs/:id/scores` (per-challenge dynamic scoreboard + graph, `total`/`myPosition`) and `POST /api/v2/integrations/challs/:id/instance/actions/:action` (provider action buttons, may return `submitFlag`). Types exist in `@rctf/types`; docs pages don't cover them yet.
6. **Minor doc/types drift observed**: docs' shared `Endpoint` object omits the `text` field and the `raw` kind present in `EndpointSchema`; `goodChallengesV2.scoringKind` describe-text mentions "static" but the `ChallengeScoringKind` enum is only `decay | dynamic`; docs' responses.md `goodAdminBotJobStatus`/history don't show field-level shapes (given above from types); leaderboard graph entries' optional `dynamicPoints` series is only visible in types.
7. **Validation constants** for client-side mirroring: name 2–64 printable ASCII (normalized), email normalized lowercase/trim, flag ≤1024 chars, statusText ≤60 chars, search 2–100 chars, admin-bot input keys ≤256 / values ≤1024, countryCode must be in `ALL_REGIONS` (from `@rctf/util`), `limit ≥1`/`offset ≥0` with server-config caps.
