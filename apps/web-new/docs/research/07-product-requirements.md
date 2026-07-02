# rCTF Web Frontend Requirements — Extracted from apps/docs

Source: `/Users/enscribe/Repositories/jktrn/rctf-new/apps/docs/src/content/docs/` (+ `packages/types/src/responses/good-client-config-v2.ts` for the exact client-config shape).

## 1. Client config (`GET /api/v2/integrations/client/config`)

Public runtime settings the SPA boots from. V2 response (`goodClientConfigV2`) data shape (exact, from `packages/types/src/responses/good-client-config-v2.ts`):

| Field                                       | Type                                                                                            | Notes                                                                                                 |
| ------------------------------------------- | ----------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `meta.description`, `meta.imageUrl`         | string                                                                                          | link-preview meta tags                                                                                |
| `homeContent`                               | string                                                                                          | Markdown for home page                                                                                |
| `sponsors[]`                                | `{name, icon, description, url?}`                                                               | sponsor cards; descriptions render Markdown                                                           |
| `flagFormatPlaceholder`                     | string                                                                                          | placeholder in flag submit box (default `flag{[\x20-\x7e]+}`)                                         |
| `analytics`                                 | `{provider, publicOptions: Record<string,string>} \| null`                                      | null = disabled                                                                                       |
| `ctfName`                                   | string                                                                                          |                                                                                                       |
| `divisions`                                 | `Record<divisionId, displayName>`                                                               |                                                                                                       |
| `defaultDivision`                           | `string \| null`                                                                                | preselected division                                                                                  |
| `origin`                                    | string                                                                                          | canonical origin                                                                                      |
| `startTime`, `endTime`                      | int (Unix ms)                                                                                   | runtime admin-settings overrides are reflected here                                                   |
| `userMembers`                               | boolean                                                                                         | team-members feature toggle                                                                           |
| `faviconUrl`, `logoLightUrl`, `logoDarkUrl` | `string \| null`                                                                                | light/dark logos                                                                                      |
| `emailEnabled`                              | boolean                                                                                         | drives email-based auth UI                                                                            |
| `registrationsEnabled`                      | `boolean \| null`                                                                               | registration gating                                                                                   |
| `ctftime`                                   | `{clientId: numeric-string} \| null`                                                            | null = hide "Login with CTFtime"                                                                      |
| `instancerEnabled`                          | boolean                                                                                         |                                                                                                       |
| `isArchived`                                | boolean                                                                                         | archive/read-only mode flag                                                                           |
| `captcha`                                   | `{provider, publicOptions (e.g. siteKey), protectedEndpoints: Record<action, boolean>} \| null` | actions: `register, recover, setEmail, instancerStart, instancerExtend, avatarUpload, adminBotSubmit` |

V1 route still exists with legacy `globalSiteTag`/`recaptcha` fields (older clients only). Runtime admin settings (name, times, homeContent, sponsors, meta, favicon, logos) override config-file values and are "returned through the v2 client config"; `null` reverts to config default.

## 2. Markdown renderer spec

Rendered in: challenge descriptions, home page content, sponsor descriptions. Current impl: `marked` + 2 custom extensions + DOMPurify; hydrated client-side (`apps/web/src/lib/utils/markdown.ts`, `markdown.svelte`). Behavior contract:

- **Alerts** (GitHub blockquote style, `> [!TYPE]`, case-insensitive trigger): six types — `note`, `tip`, `important`, `warning`, `caution`, `connection`. Unknown types fall back to plain blockquote. Body parsed as Markdown (except CONNECTION).
- **CONNECTION callout** (distinct type, used for challenge "Remote" field): body NOT parsed as Markdown; wrapping backticks stripped; renders as clickable link if content starts `http://`/`https://`, else monospaced code block; **must include a copy button** next to the value.
- **`<timer />`** inline element: no attributes; always targets global CTF schedule from client config. States: before start → "CTF starts in" countdown; between → "CTF ends in" countdown; after end → "The CTF is over."; archived → "The CTF is archived." Ticks once per second. Explicitly no `to=`/`until=` support.
- **Standard Markdown**: `marked` defaults, which include `gfm: true` — tables, autolinks, strikethrough, and task lists all render (verified against marked 17.0.4 during the Phase 0 audit; an earlier revision of this doc claimed otherwise). Footnotes are genuinely absent (they require the separate `marked-footnote` plugin, which neither app installs).
- **Sanitization**: DOMPurify default profile after parsing. Scripts/handlers/dangerous protocols stripped; `<details>`, `<summary>`, `<sub>`, `<sup>`, `<kbd>` etc. allowed. Only extra attributes preserved: `data-alert`, `data-type`, `data-content`, `data-timer` (hydration markers emitted only by the extensions — hand-written ones must have no effect).
- Docs warn the docs-site alert styling differs; the rCTF frontend's own styling is authoritative.

## 3. Theming contract

Docs promise organizers a specific token system (all OKLCH, in `apps/web/src/app.css`; `:root` = light, `[data-theme='dark']` = dark; theme toggled via `data-theme` on `<html>`, persisted to `localStorage`, respects `prefers-color-scheme` on first load):

- **Layered tokens** `--background-l0..l5` / `--foreground-l0..l5` (l0 = page background / primary text; higher = more emphasis for bg, less prominence for fg). Documented values e.g. light bg l0 `oklch(98% 0 0)` → l5 `oklch(84% 0 0)`; dark bg l0 `oklch(15% 0 0)` → l5 `oklch(40% 0 0)`.
- **Semantic**: `accent` (primary actions/buttons/links), `destructive`, `success` (solved challenges), plus hover variants (`--background-accent-hover`, `--background-l5` for secondary hover).
- **Scoreboard**: `gold`/`silver`/`bronze` (top-3 placements AND first/second/third bloods), `self` (current user's row highlight), `nth` (everyone else) — each with bg/fg per theme.
- **Graph**: 10 named line colors `first`…`tenth` (red-500…pink-500 light, 300-shades dark), used only for graph lines/sparklines.
- **Prose**: `prose`, `prose-link`, `prose-inline-code`.
- **Category colors**: per-color 5-variable sets: `--background-{color}-l0`, `--background-{color}-l1`, `--background-{color}-l1-hover`, `--foreground-{color}-l0`, `--foreground-{color}-l1`, both themes. Palette colors: `red, orange, yellow, green, teal, blue, purple, fuchsia, pink, gray`.
- **Category indirection**: `getCategoryStyle(color)` emits inline CSS binding generic tokens `--category-foreground-l0/l1`, `--category-background-l0/l1/l1-hover` to the color's vars; components use generic category classes. (Rewrite may keep the mechanism with scoped CSS instead of Tailwind classes, but the token names are documented publicly.)
- **Categories** config (`apps/web/src/lib/utils/categories.ts`): each category = `{name, icon, color}`. Defaults: `sanity`(gray), `pwn`→"Binary Exploitation"(red), `reverse`→"Reverse Engineering"(orange), `crypto`→"Cryptography"(yellow), `forensics`(green), `blockchain`(teal), `web`(sky/blue), `misc`→"Miscellaneous"(purple), `ppc`→"Professional Programming and Coding"(fuchsia), `koth`→"King of the Hill"(pink), `osint`(gray). Aliases: `binary`→`pwn`, `rev`→`reverse`, `cryptography`→`crypto`. `categoryOrder` controls challenge-list order (unlisted categories sort alphabetically after listed); separate `scoreboardCategoryOrder` for scoreboard column order. Utility fns documented: `getCategoryConfig`, `getCategoryKeyOrAlias`, `getCategoryStyle`, `getCategoryOrder`. Icons vendored as local Svelte components (Tabler Icons artwork) under `lib/icons/`.
- **Design language promises**: flat (no shadows), `font-medium` max weight, generally no transitions, dark mode handled entirely by CSS custom properties. Docs walk organizers through adding custom categories/colors — the rewrite must keep an equivalent extension path (add config entry + icon component + CSS vars).
- Component inventory docs currently promise (shadcn-based; rewrite replaces impl but the _capability list_ is the feature surface): Button, Badge, Input, Textarea, Checkbox, Label, Separator, Progress, Spinner, Skeleton, Card, Section, ScrollArea, Resizable, Sidebar, Dialog, Drawer, Sheet, Tooltip, Popover, DropdownMenu, Table, Accordion, Tabs, VirtualList, Chart, Field, InputGroup, Select, TagInput, SchemaForm, Command, Pagination, ButtonGroup, Navigation, NavigationMobile, ThemeToggle, Markdown, FlagPicker, EmptyState, SearchInput. (Note: theming/components.md is written around shadcn-svelte + tailwind-variants and will need a rewrite itself.)

## 4. Scoring

Two per-challenge scoring kinds; kind is set in admin challenge editor (`/admin/challs`), cannot be switched while solves exist:

- **Decay** (default; challenges without `scoring` field are decay): all solvers get the same value; value computed by the global score provider from `points.min`/`points.max` + solve count. Editing min/max re-prices all existing solvers immediately.
- **Dynamic**: per-team scores pushed by an external webhook (`scoring: {kind:"dynamic", source:{transport:"webhook", secret}}`). Flag submissions rejected; **frontend hides the submit form when the challenge's flag field is empty**. Scores can differ per team and move up/down; KOTH/attack-defense.
- Score providers (global, config `scoreProvider`): `scores/classic` (default, logistic decay), `scores/sekai` (log decay, gradient=10 decay=60, gentler), `scores/steep` (aggressive early decay), `scores/jammy` (time-based: first-solve time vs event duration, option `maximumScoreTime` default 0.8), `scores/genni` (binary: maxPoints for ≤2 solves else 0), `scores/legacy` (tanh normalized by maxSolves). Provider context: `minPoints, maxPoints, solves, maxSolves, eventStartTime, eventEndTime, firstSolveTime`.
- Frontend displays: current point value per challenge (from leaderboard/challs data), solve counts, and the challenge point range. Konata defaults: `pointsMin` commonly 50–100, `initialValue`/`minimumValue` map to max/min. Per-challenge `sortWeight` and `eligibleForTiebreaks` exist as data fields.
- Leaderboard mechanics that shape the UI: leaderboard worker sums `solves.points`; graph replays `score_events` chronologically (historical points = value at that time, not current); `/scores` list vs `/scores/:id` team graph pages. Score-event sources: `flag, decay-recompute, feed, ban, delete, algo-change`.
- Leaderboard limits from config: `maxLimit` 100/page, `maxOffset`, `updateInterval` 30s, `graphMaxTeams` 10, `graphSampleTime` 30min, `graphWithListLimit` 100 (combined leaderboard+graph endpoint).
- **First bloods**: first three solves tracked as bloods (index 0/1/2); UI colors them gold/silver/bronze.

## 5. Divisions, teams, registration, email verification

- **Team model**: one shared login token per team; team owns name, email, score, solves, members, settings. Auth via `Authorization: Bearer` token. Auth tokens never expire; Verify/CtftimeAuth tokens expire after `loginTimeout` (default 1h) and are single-use (Redis marker).
- **Divisions**: `divisions` map (id → display name, default `{open: "Open"}`), `defaultDivision` optional. Chosen at registration. Division ACLs (server-side, email-based: match `domain`/`email`/`regex`/`any`) restrict eligibility — union of all matching rules; require an email provider; CTFtime auth bypasses ACLs entirely (all divisions available). Registration: server picks the default allowed division; client does not send division at register time. Email change re-checks ACLs.
- **Team members** (`userMembers`, default true, `maxMembers` default 50): informational-only member emails; members share the team token. UI: add/remove members by email.
- **Account requirements**: every account needs ≥1 auth method (email or CTFtime ID); user cannot remove email without a linked CTFtime ID and vice versa — frontend must enforce/reflect this in profile settings.
- **Registration gating**: `registrationsEnabled` (nullable boolean in client config). Two register outcomes: email verification enabled → `200 goodVerifySent` (team not yet created; user must follow email link, then `POST /auth/verify` completes registration and returns tokens); no email provider or CTFtime registration → immediate `goodRegisterV2` with `authToken` + `teamToken`. `GET /api/v2/auth/verify-info` previews a verification token. Verify endpoint handles 3 flows: pending registration, team-token login/recovery, email-change confirmation.
- **Recovery**: email-based (`recover`), sends team token; rate limited per IP (burst 5 / 1500000ms) and per email (burst 2 / 1h). Register email: burst 20 / 600000ms per IP + burst 2 / 1h per email; 429 `badRateLimit` returns `data.timeLeft` (frontend should surface wait time).
- **Admin panel** (web UI): bitwise perms `challsRead(1), challsWrite(2), leaderboardRead(4), challsSolveWrite(8), usersWrite(16), settingsWrite(32)`; full admin = 63. Perm-holders bypass timeline restrictions (e.g. `challsRead` sees challenges pre-start). Admin surfaces required: challenge CRUD at `/admin/challs` (with scoring kind, hidden flag, releaseTime, files, instancerConfig, adminBotConfig), team list/search/paginate + token regeneration (usersWrite), solve viewing/deletion, submissions table (IPs for flag + admin-bot submissions; sortable by time/challenge/team/IP/type/result), runtime settings editor at `/admin/settings` (name, start/end with start<end validation, homeContent, sponsors, meta, favicon, logos; null reverts), file upload (multi-file, SHA256 dedup + existence pre-check), external apps registration (name + exact redirect_uri; client_secret shown exactly once), CTFtime leaderboard export (leaderboardRead).
- **Challenge visibility**: `hidden: true` hides entirely from non-admins; `releaseTime` (Unix ms) delays visibility; `null` = visible at CTF start.

## 6. Integrations surfaced in UI

**Admin bot (players)**: released challenges expose `adminBotInputs` in the public challenge list; challenge page renders one field per configured input (regex-validated; names ≤256 chars, values ≤1024 chars). Endpoints: `GET .../challs/:id/admin-bot/config` (view released bot source + file extension — source is public), `POST .../admin-bot` (submit job; captcha-gated if `adminBotSubmit`), `GET .../admin-bot/status` (latest job, logs when present, **queue position while queued**), `GET .../admin-bot/history` (retained completed/failed jobs), `GET .../admin-bot/jobs/:jobId/logs`. Constraints the UI must reflect: one queued/running job per user per challenge; rate limit 1 submission / 10s / user+challenge; logs are structured NDJSON with levels info/warn/error/fatal (participant-visible). Admin side: challenge editor sends TS source for validation; config errors (bad regex, missing export, bad imports) come back and must be displayed.

**Instancer (players)**: challenge page lifecycle controls under `GET/PUT/PATCH/DELETE /api/v2/integrations/challs/:id/instance` — status view (one of `stopped, starting, running, stopping, errored`), time remaining, create, extend (only when challenge `extendable`), stop. Endpoints returned **in the same order as the challenge's `expose` array**; each has kind (`http/https/tcp/tcp-ssl`), optional `title`, `shouldDisplay` filtering; k8s may return `unsupported-by-instancer` with port 0 for plain `tcp`. Captcha can gate `instancerStart`/`instancerExtend`. Instance hostnames: `<hostPrefix>-<uid>.<instances-host>`.
**Instancer (admin UI)**: challenge editor fetches the instancer schema endpoint (one JSON Schema per configured instancer + `defaultInstancer` name) and **renders form fields dynamically from JSON Schema** (→ SchemaForm requirement); instancer dropdown when multiple configured (default marked); "advanced YAML" toggle exposing raw `config`.

**CTFtime**: "Login with CTFtime" button (shown when `ctftime` non-null in client config) → redirect to CTFtime OAuth → callback URL is a **frontend route** `/integrations/ctftime/callback` → frontend sends code to API → CTFtime token; registration with CTFtime = team name + ctftime token, no email verification. Login matches CTFtime ID to account. Users can link/unlink CTFtime ID on profile (`PUT/DELETE /api/v1/users/me/ctftime` routes exist). Leaderboard export in CTFtime JSON format for `leaderboardRead` admins (post-event).

**Blood bot**: server-side only (Discord/Telegram webhooks). Web-visible part: blood status itself (first/second/third solve derived from solve timestamps, shown with gold/silver/bronze colors); `{{teamUrl}}` template links to team profile page (`/profile/:id`).

**Konata**: external CLI/CI, no web UI. Web-relevant: it produces challenge data the frontend renders — descriptions ending in `> [!CONNECTION]` callouts by default, tags, releaseTime, sortWeight, attachments (archives shown under original filenames), instancerConfig, adminBotConfig, dynamic-scoring challenges.

**External apps ("Sign in with rCTF")**: frontend must provide a **consent page** at `/external-auth/authorize?client_id&redirect_uri&state`: prompt login if needed, fetch app metadata via public `GET /api/v2/external-auth/clients/:id` (`{id, name, redirectUri}`), on approval `POST /api/v2/external-auth/authorize` (authed) → `{redirectTo}` → browser redirect. Explicitly not OAuth2 (no scopes/refresh/PKCE). Admin settings page manages app registration/deletion.

## 7. Captcha & analytics

- **Captcha providers**: `captcha/recaptcha` (Google reCAPTCHA v2 **Invisible** — frontend renders widget with `size: 'invisible'`), `captcha/hcaptcha`, `captcha/turnstile`. Frontend learns provider + `publicOptions.siteKey` + per-action booleans from client config; gates the 7 actions: `register, recover, setEmail, instancerStart, instancerExtend, avatarUpload, adminBotSubmit`. Unlisted actions proceed without captcha; captcha may be entirely null. V2 request field is `captchaCode` (v1 was `recaptchaCode`).
- **Analytics**: providers `analytics/google` (GA4 `siteTag`), `analytics/cloudflare` (`token`). Script loads via API proxy `GET /api/v2/integrations/analytics/script` — returns provider JavaScript (cached in-memory 1h server-side), 404 when unconfigured, 502 on upstream failure. Frontend injects this script client-side; no server-side collection. Client config `analytics.publicOptions` carries provider public options.
- **CSP constraint** (built into `svelte.config.ts`, static, meta-tag based): allow-list already includes all three captcha vendors, GA/Cloudflare analytics endpoints, S3/GCS storage, YouTube frames; `default-src 'none'`, `style-src` includes `'unsafe-inline'`; `frame-ancestors` impossible via meta (nginx `X-Frame-Options: DENY` instead). Any new external origin requires rebuild.

## 8. Archiving (static export)

`apps/export` crawls a live instance; frontend must work in this mode:

- Client config arrives with `isArchived: true` → frontend **hides all interactive controls**: flag submission, profile edits, account creation/login/registration/recovery.
- `/api/v2/users/me` always returns `401 badToken` → app must stay cleanly logged-out.
- All non-GET API calls return `405` `{kind:"badEndpoint", message:"This is a read-only archive."}` — UI must not break on these.
- Leaderboard endpoints (`with-graph`, `now`, `graph`) served from a static dump with client-visible **division filtering, search substring matching, offset/limit slicing still functional** — scoreboard stays searchable. Challenge solves paginated from static per-challenge `solves.json`.
- Analytics script endpoint returns empty 404 (no third-party pings).
- No admin pages, no instancer, no admin bot, no CTFtime, no captcha in archives.
- Exporter copies the SvelteKit static build (`apps/web/build/`) and injects a `window.fetch` interceptor — the rewrite must remain an adapter-static SPA whose data access goes exclusively through `fetch('/api/...')` so interception keeps working; assumes serving from `/`.
- `<timer />` shows "The CTF is archived." in this mode.

## 9. Explicit scope bounds (`meta/things-we-will-not-implement.md`)

The frontend must NOT implement:

1. **First blood bonus points** (recognition only, via blood colors/bloodbot; never score weight).
2. **Leaderboard freeze** (standings always visible for the whole event).
3. **Limited flag submission attempts / wrong-submission penalties** (protection = rate limits, not scoring).
4. **Auth-gated challenge list or leaderboard** — challenges and scoreboard must be publicly viewable without login.

## Additional cross-cutting frontend facts

- Architecture: SvelteKit `adapter-static` build served by nginx (`try_files ... /index.html` SPA fallback); nginx proxies `/api` and `/uploads` to the Bun/Hono API on :3000; `/_app/immutable/` gets immutable cache headers; gzip/brotli static precompression expected.
- Route paths referenced by docs (must exist in rewrite): `/`, `/admin/challs`, `/admin/settings`, `/scores` (leaderboard), `/scores/:id` (team graph), `/users/:id` & `/profile/:id` (team profile pages; team UUID visible there), `/external-auth/authorize`, `/integrations/ctftime/callback`.
- Avatars: team avatars uploadable (captcha-gateable `avatarUpload`), max `maxAvatarSize` (1 MB default), server resizes to 256×256 WebP, moderation may reject with error the UI must surface.
- Challenge files: `{name, url, size}` per attachment; served with immutable cache headers.
- Uploads admin flow: multi-file upload, SHA256 dedupe, pre-upload existence check by hash; streaming (nginx `client_max_body_size 0` on the upload route).
- Leaderboard API surface: `now`, `graph`, `with-graph` (combined, limit 100), `challs` (per-challenge current values/solve counts); division filter + team-name search (pg_trgm-backed) + pagination are first-class parameters.
- API responses use a `{kind, message, data}` envelope; error kinds are string discriminators (`badToken`, `badRateLimit` with `data.timeLeft`, `badEndpoint`, ...).
- Permission changes propagate within a 30s user-cache window (admin UX note).
- Docs describe `getCategoryStyle`/categories/colors with file paths under `apps/web/src/...` — a rewrite relocating these files will require updating theming docs (`theming/categories.md`, `theming/colors.md`, `theming/components.md`, `admin/markdown.md` reference `apps/web/src/lib/...` paths and shadcn/tailwind mechanics).
