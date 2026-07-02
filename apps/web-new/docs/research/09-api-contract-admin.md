# rCTF Admin API Contract Catalog (for apps/web-new admin section)

Sources: `apps/docs/src/content/docs/api/admin/*.md` (31 files), `apps/docs/src/content/docs/api/responses.md`. Docs pages render schemas from `@rctf/types` route defs (`packages/types/src/routes/{v1,v2}/admin.ts`, `packages/types/src/responses/*`, `packages/types/src/util/{schemas,types}.ts`), so field tables below come from those defs (authoritative).

## Envelope

Every response: `{ kind: string, message: string, data?: T }`. `data` omitted when there is none. Unknown routes → `404 badEndpoint`; unexpected errors → `500 errorInternal`.

Common errors (all admin routes): `400 badJson` (invalid JSON body, no data), `400 badBody` (`{ reason: string }` — validation failure of body/query/params/form-data), `401 badToken` (missing/unusable auth token), `403 badPerms` (missing permission bits), `404 badEndpoint` (route unavailable or backing provider unconfigured), `429 badRateLimit` (`{ timeLeft: number }`), `500 errorInternal`.

## Auth & permissions

Bitmask on the user token: `challsRead=1`, `challsWrite=2`, `leaderboardRead=4`, `challsSolveWrite=8`, `usersWrite=16`, `settingsWrite=32`. When a route lists multiple bits, ALL are required.

| Bit                | Used by                                                                                                                  |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------ |
| `challsRead`       | admin challenge read, upload query, instancer schema, admin-bot status, (with usersWrite) team detail + submissions      |
| `challsWrite`      | challenge update, file upload, V1 challenge delete                                                                       |
| `challsSolveWrite` | delete solve                                                                                                             |
| `usersWrite`       | teams list/filter/detail/update/delete/token/avatar, verifications, submissions (with challsRead), external-auth clients |
| `settingsWrite`    | settings read AND update                                                                                                 |

Admin-bot worker routes use `serviceAuth: adminBot` — shared bearer token from config `adminBot.provider.options.secretKey`, NOT a user token.

## Shared objects & enums

- `ChallengeFileV2`: `{ name: string, url: string, size: number|null }` (V1 file: `{ name, url }` only).
- `ChallengePoints`: `{ min: int, max: int }` (min=floor, max=initial).
- `ChallengeScoring` (discriminated union on `kind`): `{ kind: "decay" }` | `{ kind: "dynamic", source: { transport: "webhook", secret: string } }`.
- `InstancerConfig` (response form): `{ challengeIntegrationId: string, instancer?: string (default instancer when omitted), config: Record<string, any> (provider-specific), expose?: Expose[], timeoutMilliseconds: int, extendable?: boolean }`.
- `Expose`: `{ kind: ExposeKind, hostPrefix: string (regex ^[a-z0-9-]+$, ≤63), containerName: string, containerPort: int 1–65535, shouldDisplay?: boolean, title?: string }`.
- `ExposeKind` enum in types: `tcp | tcp-ssl | http | https | raw` (responses.md table lists only the first four; `raw` exists in the type).
- `AdminBotConfig` (response form): `{ code: string, inputs: Record<string, RegexRule>, revision: string, timeoutMilliseconds: int, requireInstancerInstancesRunning?: boolean }`.
- `RegexRule`: `{ pattern: string, flags?: string }`.
- Enums: `AdminTeamSortBy` = `createdAt|team|email|division|score|solves|status`; `SortOrder`/`SubmissionSortOrder` = `asc|desc`; `AdminTeamStatus` = `active|banned|admin`; `SubmissionKind` = `flag|admin_bot`; `SubmissionSortBy` = `createdAt|challenge|team|ip|kind|result`; `SubmissionResult` = `correct|incorrect|already_solved|queued|active_job|invalid_input|bad_instancer_state`; `SubmissionTeamStatus` = `banned|not_banned`; `AdminBotJobStatus` = `queued|running|completed|failed`.
- `UploadFileName`: string 1–255 chars, regex `^(?!\.{1,2}$)[^/\\\0:]{1,255}$` (no `/ \ NUL :`, not `.`/`..`).
- `UploadSha256`: 64-char hex digest (case-insensitive).
- `UserName`: normalized, then must match `^[ -~]{2,64}$` (2–64 printable ASCII); violation → `400 badName`.

## searchFilter query language (team-filter & submission-filter bodies)

Every filter field is a `searchFilter(T)` object, itself nullish (omit or `null` = filter not applied):

```ts
{ include?: T[] | null,   // allowlist: keep only rows matching ANY listed value; omitted/null = no allowlist
  exclude?: T[] | null }  // denylist: drop rows matching ANY listed value; omitted/null = no denylist
```

Both arrays max 1024 entries. `include` and `exclude` may be combined in one field; multiple fields AND together.

---

## Challenges

### GET /api/v2/admin/challs (also /api/v1/admin/challs) — Admin challenge list

- Auth: user token, `challsRead`. No query/body.
- 200 `goodAdminChallengesV2`: `data` = array of AdminChallengeV2 (below). Includes hidden and unreleased challenges.
- V1 (`goodAdminChallenges`): entries lack `hidden`, `releaseTime`, `instancerConfig`, `adminBotConfig`, `tags`, `scoring`, file `size`; `sortWeight` omitted when null.
- Errors: badPerms, badToken.

**AdminChallengeV2 object** (response for list/detail/update):
`{ id: string, name: string, description: string (Markdown), category: string, author: string, files: ChallengeFileV2[], points: {min:int, max:int}, flag: string, tiebreakEligible: boolean, sortWeight: number|null, tags: string[]|null, instancerConfig: InstancerConfig|null, adminBotConfig: AdminBotConfig|null, hidden: boolean, releaseTime: number|null (Unix ms), scoring: ChallengeScoring|null (null = CTF default), solveCount?: int (present only on single-challenge detail endpoint) }`

### GET /api/v2/admin/challs/:id (also v1) — Admin challenge detail

- Auth: `challsRead`. Params: `{ id: string }`.
- 200 `goodAdminChallengeV2`: AdminChallengeV2 with `solveCount`. Errors: badChallenge (404), badPerms, badToken. Used when opening the challenge editor.

### PUT /api/v2/admin/challs/:id (also v1) — Create or update challenge

- Auth: `challsWrite`. Params: `{ id: string }`. Upsert: creates if `:id` doesn't exist. **Partial-update semantics: fields omitted from `data` keep current values.**
- V2 body `{ data: {...} }`, every field optional:
  - `name?: string`, `category?: string`, `author?: string`, `description?: string` (Markdown), `flag?: string`
  - `points?: { min: int, max: int }` (both required when present)
  - `tiebreakEligible?: boolean`
  - `files?: { name: string, url: string, size: int|null }[]`
  - `sortWeight?: number` (manual ordering weight)
  - `tags?: string[]`
  - `instancerConfig?: PartialInstancerConfig | null` — `null` clears the integration. Partial shape: `{ challengeIntegrationId?: string, instancer?: string, config?: Record<string, any>, expose?: Expose[], timeoutMilliseconds?: int, extendable?: boolean }`
  - `adminBotConfig?: { code: string } | null` — request sends only `code`; `null` clears. (Server derives inputs/revision/timeout; response returns full AdminBotConfig.)
  - `hidden?: boolean`
  - `releaseTime?: int | null` (Unix ms, `null` clears schedule)
  - `scoring?: { kind: "decay" } | { kind: "dynamic", source: { transport: "webhook", secret: string } }`
- V1 body `data`: only `name, category, author, description, flag, points{min,max}, tiebreakEligible, files[{name,url}], sortWeight`.
- 200 `goodChallengeUpdateV2`: full updated AdminChallengeV2. Errors: badJson, badBody, badPerms, badToken, `400 badInstancerConfig` (`{ error: string }` — active instancer provider rejected config), `400 badAdminBotConfig` (`{ error: string }` — admin-bot provider rejected source).
- Side effects: leaderboard recalculated; instancer/admin-bot providers validate configs before a new revision is saved.

### DELETE /api/v2/admin/challs/:challengeId/solves/:userId — Delete a solve

- Auth: `challsSolveWrite`. Params: `{ challengeId, userId }`. 200 `goodChallengeSolveDeleteV2`, no data. Errors: badPerms, badToken, `404 badUnknownSolveV2`. Leaderboard recalculated. Challenge and team untouched.

### DELETE /api/v1/admin/challs/:id — Delete a challenge (V1 ONLY — no V2 route)

- Auth: `challsWrite`. Params: `{ id }`. 200 `goodChallengeDelete`, no data. Errors: badPerms, badToken. Removes challenge AND its solves; leaderboard recalculated. New admin UI must call this v1 route for delete (docs: "V2 admin clients remove solves directly and update challenge data through create-or-update").

---

## Uploads

### POST /api/v2/admin/upload — Upload files (multipart)

- Auth: `challsWrite`. Body: `multipart/form-data` with one or more `files` fields (each a file; filename must satisfy UploadFileName pattern).
- 200 `goodFilesUploadV2`: array of `{ name: string, url: string, size: int|null }`. Errors: badBody, badPerms, badToken (also `500 badFilesUpload` if upload provider fails).
- Dedup by SHA-256: re-uploading identical bytes returns the existing URL.
- V1 (`POST /api/v1/admin/upload`): JSON `{ files: [{ name: UploadFileName, data: string (base64 data URI) }] }`; response array lacks `size`; extra error `400 badDataUri`.

### POST /api/v2/admin/upload/query (also v1) — Query uploads

- Auth: `challsRead`. Body: `{ uploads: [{ sha256: <64-hex>, name: UploadFileName }] }`.
- 200 `goodUploadsQueryV2`: array of `{ sha256: string, name: string, url: string|null, size: number|null }` — `url: null` means not uploaded yet. V1 response lacks `size`. Errors: badJson, badBody, badPerms, badToken.
- UI purpose: pre-check existence by hash to skip redundant uploads.

---

## Teams

### GET /api/v2/admin/users — List teams

- Auth: `usersWrite`. Query params (**limit & offset REQUIRED**):
  - `limit`: int 1–100 (page size), `offset`: int ≥0 (page offset)
  - `search?`: string 1–100 — free-text over team name AND email
  - `sortBy?`: `createdAt|team|email|division|score|solves|status`; `sortOrder?`: `asc|desc`
- 200 `goodAdminUsersV2`: `{ total: int (matching the query, for pagination), users: [{ id: string, name: string, email: string|null, division: string, perms: int (bitmask), banned: boolean, score: int, solveCount: int, avatarUrl: string|null, countryCode: string|null (ISO 3166-1 alpha-2), statusText: string|null (free-form badge), createdAt: string (ISO 8601) }] }`.
- Errors: badBody, badPerms, badToken.

### POST /api/v2/admin/users — Filter teams

- Same auth/query/response as GET list (query still controls pagination/sort/search). JSON body adds structured filters:
  - `status?: searchFilter(AdminTeamStatus) | null` — values `active|banned|admin`
  - `division?: searchFilter(string) | null` — division IDs
- Errors: badJson, badBody, badPerms, badToken.

### GET /api/v2/admin/users/:id — Team detail

- Auth: `usersWrite` AND `challsRead` (response contains solve data). Params: `{ id }`.
- 200 `goodAdminUserV2`: all list-item fields above PLUS `solves: [{ challengeId: string, challengeName: string, challengeCategory: string, createdAt: string (ISO 8601) }]`. Contains private fields (email) — trusted admin views only.
- Errors: badPerms, badToken, `404 badUnknownUser`.

### PUT /api/v2/admin/users/:id — Update team

- Auth: `usersWrite`. Params: `{ id }`. Body `{ data: {...} }`, all optional:
  - `banned?: boolean` — ban removes team from leaderboard after recalc (solves kept); unban restores rank
  - `name?: UserName` (2–64 printable ASCII, normalized)
  - `division?: string`
  - `countryCode?: string | null` (ISO 3166-1 alpha-2 from region list, `null` clears)
  - `statusText?: string | null` (≤60 chars, `null` clears)
  - (Note: docs prose says the route "supports banning and unbanning"; the type def carries all five fields — treat the schema as the contract.)
- 200 `goodAdminUserUpdateV2`, no data. Errors: badJson, badBody, `400 badName`, `409 badKnownName`, badPerms, badToken, `404 badUnknownUser`, `403 badUserPrivileged` (admin accounts immutable via this route).

### PATCH /api/v2/admin/users/:id/avatar — Update team avatar (**exists in types; NO docs page under api/admin/**)

- Auth: `usersWrite`. Params: `{ id }`. Body: `multipart/form-data`, field `avatar?` (image file).
- 200 `goodAvatarUpdated`: `{ url: string|null }` (null = cleared). Errors: `400 badAvatarFile`, `400 badAvatarFileSize` (`{ maxSize: number }`), `400 badModerationNotPassed`, badBody, badPerms, badToken, badUnknownUser, badUserPrivileged.

### DELETE /api/v2/admin/users/:id — Delete team

- Auth: `usersWrite`. Params: `{ id }`. 200 `goodAdminUserDeleteV2`, no data. Errors: badPerms, badToken, `404 badUnknownUser`, `403 badUserPrivileged`. Hard delete — docs steer UIs to ban (PUT) when the record should survive.

### POST /api/v2/admin/users/:id/token — Create team token

- Auth: `usersWrite`. Params: `{ id }`. 200 `goodCreateUserTokenV2`: `{ token: string }` (a live credential — handle like a secret; account-recovery use case). Errors: badPerms, badToken, `404 badUnknownUser`, `403 badUserPrivileged` (no tokens for admin users).

---

## Verifications

### GET /api/v2/admin/user-verifications — Pending verifications

- Auth: `usersWrite`. 200 `goodAdminUserVerificationsV2`: `{ verifications: [{ id: string, name: string, email: string, division: string, createdAt: int (Unix ms), expiresAt: int (Unix ms) }] }`. Errors: badPerms, badToken.

### POST /api/v2/admin/user-verifications/:id/complete — Complete verification manually

- Auth: `usersWrite`. Params: `{ id }`. Creates the team. 200 `goodAdminUserVerificationCompleteV2`: `{ userId: string }`. Errors: `409 badKnownEmail`, `409 badKnownName` (dup checks still apply), badPerms, badToken, `404 badUnknownVerification`.

### POST /api/v2/admin/user-verifications/:id/resend — Resend verification email

- Auth: `usersWrite`. Params: `{ id }`. 200 `goodAdminUserVerificationResendV2`: `{ id: string }`. Errors: `404 badEndpoint` (no email provider configured), badPerms, badToken, `404 badUnknownVerification`.

---

## Submissions (audit log: flag submissions + admin-bot job submissions)

### GET /api/v2/admin/submissions — List submissions

- Auth: `usersWrite` AND `challsRead`. Query (**limit & offset REQUIRED**):
  - `limit`: int 1–100; `offset`: int ≥0
  - `sortBy?`: `createdAt|challenge|team|ip|kind|result`; `sortOrder?`: `asc|desc`
  - `challengeSearch?`: string 1–100 (free-text over challenge name); `teamSearch?`: string 1–100 (free-text over team name)
- 200 `goodAdminSubmissions`: `{ total: int, submissions: [{ id: string, kind: "flag"|"admin_bot", challengeId: string, challengeName: string, challengeCategory: string, userId: string, userName: string, userDivision: string, userAvatarUrl: string|null, userCountryCode: string|null, userStatusText: string|null, userBanned: boolean, ip: string, result: SubmissionResult, details: Record<string, any> (result-specific), relatedId: string|null (e.g. admin-bot job ID), createdAt: string (ISO 8601) }] }`.
- Errors: badBody, badPerms, badToken.

### POST /api/v2/admin/submissions — Filter submissions

- Same auth/query/response as GET. JSON body (all fields optional/nullable):
  - `challenge?: searchFilter(string)|null` — challenge IDs
  - `team?: searchFilter(string)|null` — team IDs
  - `kind?: searchFilter("flag"|"admin_bot")|null`
  - `result?: searchFilter(SubmissionResult)|null` — `correct|incorrect|already_solved|queued|active_job|invalid_input|bad_instancer_state`
  - `teamStatus?: searchFilter("banned"|"not_banned")|null`
  - `category?: searchFilter(string)|null` — challenge categories
  - `division?: searchFilter(string)|null`
  - `createdAfter?: string`, `createdBefore?: string` — ≤64 chars, anything `Date.parse` accepts, server-normalized to ISO; inclusive bounds ("at or after"/"at or before"); validation: `createdAfter` must be ≤ `createdBefore` when both present (else `400 badBody` with issue on `createdAfter`)
- Errors: badJson, badBody, badPerms, badToken.

---

## Settings

### GET /api/v2/admin/settings — Read settings

- Auth: `settingsWrite` (read also requires the write bit). 200 `goodAdminSettings`: `{ overrides: AdminSettings, defaults: AdminSettings }` — overrides = DB runtime values, defaults = config files/env. Errors: badPerms, badToken.

**AdminSettings** (all fields optional in responses; absent = unset):
`{ ctfName?: string, homeContent?: string (Markdown), startTime?: int (Unix ms), endTime?: int (Unix ms), sponsors?: [{ name: string, icon: string (URL), description: string, url?: string }], meta?: { description?: string, imageUrl?: string }, faviconUrl?: string, logoLightUrl?: string, logoDarkUrl?: string }`

### PUT /api/v2/admin/settings — Update settings

- Auth: `settingsWrite`. Body `{ data: {...} }` — same fields as AdminSettings but every field nullish: **omitted = unchanged; `null` = clear the override so the config default applies again** (`sponsors` and `meta` are also nullable as wholes).
- 200 `goodAdminSettingsUpdate`: `{ overrides, defaults }` (post-update state). Errors: badJson, badBody, badPerms, badToken.
- Side effect: changing `startTime`/`endTime` queues leaderboard recalculation.

---

## Instancer

### GET /api/v2/admin/instancer/schema — Instancer schema

- Auth: `challsRead`. 200 `goodInstancerSchema` per the type def: `{ defaultInstancer: string, instancers: [{ name: string, schema: Record<string, unknown> (JSON Schema for the provider's config fields), defaults: Record<string, unknown>, canStop: boolean, canExtend: boolean }] }`.
  - **Discrepancy**: responses.md's summary table shows the older flat `{ schema, defaults }`; the type def (multi-instancer, matching `instancerConfig.instancer` selection) is authoritative.
- Errors: `404 badEndpoint` (no instancer provider configured), badPerms, badToken.
- UI purpose: challenge editor renders/validates `instancerConfig.config` against the selected instancer's JSON Schema + defaults before save.

---

## Admin bot

### GET /api/v2/admin/admin-bot/status — user-facing admin route

- Auth: user token, `challsRead`. 200 `goodAdminBotStatus`: `{ enabled: boolean, configLanguage: string (e.g. "javascript" — source language the provider expects) }`. `404 badEndpoint` when no admin-bot provider configured. Errors: badPerms, badToken.
- UI purpose: gate admin-bot fields in the challenge editor; pick editor syntax highlighting.

The remaining four are **service routes** (worker-only, `Authorization: Bearer <adminBot.provider.options.secretKey>`; not called by the web admin UI, listed for completeness):

- **POST /api/v2/admin/admin-bot/jobs/pull** → 200 `goodAdminBotJobPull`: `{ job: null | { id, challengeId, configRevision, userId, submittedAt (ISO), flag, inputs: Record<string,string>, instancerInstances: [{ type: string, host: string, port: number, title?: string }] } }`. Oldest queued job; `null` when queue empty.
- **GET /api/v2/admin/admin-bot/challenges/:id/source** → 200 `goodAdminBotChallengeSource`: `{ sourceCode: string, configRevision: string }`. Error: badEndpoint.
- **POST /api/v2/admin/admin-bot/jobs/:id/complete** and **POST .../:id/fail** — body `{ logs?: string }` (≤1,048,576 chars) → 200 `goodAdminBotJobUpdate`: `{ ok: boolean }`. Errors: badJson, badBody, badEndpoint.
- **GET /api/v2/admin/admin-bot/queue-depth** → 200 `goodAdminBotQueueDepth`: `{ depth: number }`.

---

## External-auth clients (OAuth-style)

### GET /api/v2/admin/external-auth/clients — List

- Auth: `usersWrite`. 200 `goodAdminExternalAuthClients`: array of `{ id: string, name: string, redirectUri: string, createdAt: string (ISO 8601), createdBy: string|null (creating admin's ID) }`. **Secrets never returned here.** Errors: badPerms, badToken.

### POST /api/v2/admin/external-auth/clients — Create

- Auth: `usersWrite`. Body: `{ name: string (1–100), redirectUri: string (1–1024) }`. Redirect URI stored verbatim, matched byte-for-byte at authorize time — no wildcards, no normalization.
- 200 `goodAdminExternalAuthClientCreate`: `{ id (server-generated UUID), name, redirectUri, createdAt, createdBy, secret: string (32-byte base64url) }`. **`secret` is returned exactly once — never retrievable again; lost secret ⇒ delete + recreate. UI must surface a one-time copy affordance.** Errors: badJson, badBody, badPerms, badToken.

### DELETE /api/v2/admin/external-auth/clients/:id — Delete

- Auth: `usersWrite`. Params: `{ id }`. 200 `goodAdminExternalAuthClientDelete`, no data. Unknown ID → `400 badExternalAuthRequest` (deliberately generic, anti-probing). Errors: badPerms, badToken.
- Behavior note for UI copy: deletion breaks future token exchanges for that clientId but does NOT revoke already-minted access tokens (no per-client registry; only rotating global `tokenKey` invalidates all tokens system-wide).

---

## Cross-cutting behavior the admin UI must implement

- **Pagination**: teams & submissions use required `limit` (1–100) / `offset` (≥0) query params; responses return `total` for page math. All other admin lists (challenges, verifications, external-auth clients) are unpaginated full arrays.
- **GET vs POST filter pattern**: GET carries pagination/sort/text-search in the query string; POST to the same path adds the structured include/exclude filter body while keeping identical query params and response shape. Admin UI filter builders emit the searchFilter language above.
- **Leaderboard recalculation** is triggered server-side by: challenge update, challenge delete, solve delete, ban/unban, startTime/endTime settings change. UI doesn't trigger it separately but may want to reflect eventual consistency.
- **Partial-update convention**: challenge PUT, team PUT, and settings PUT all merge — omitted keys unchanged. Settings additionally use `null` = clear override; challenge `instancerConfig`/`adminBotConfig` and `releaseTime` use `null` = remove; team `countryCode`/`statusText` use `null` = clear.
- **V1 routes still needed by the new UI**: `DELETE /api/v1/admin/challs/:id` (only challenge-delete route). V1 list/detail/update/upload variants exist for legacy tooling; new UI should use V2 everywhere else.
- **Provider-gated features**: instancer schema, admin-bot status, and verification resend return `404 badEndpoint` when their provider is unconfigured — UI should degrade (hide instancer/admin-bot editor sections, disable resend) rather than error.
- **Undocumented-but-typed route**: `PATCH /api/v2/admin/users/:id/avatar` exists in `packages/types/src/routes/v2/admin.ts` with no docs page — confirm intent before/while building the team editor.
- Key file paths: routes `packages/types/src/routes/v2/admin.ts`, `packages/types/src/routes/v1/admin.ts`; shared schemas `packages/types/src/util/schemas.ts`, `packages/types/src/util/types.ts`; responses `packages/types/src/responses/`; docs `apps/docs/src/content/docs/api/admin/`, `apps/docs/src/content/docs/api/responses.md`.
