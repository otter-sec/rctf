# rCTF Web Frontend — Auth Flows & App Shell Behavioral Spec

Source: `/Users/enscribe/Repositories/jktrn/rctf-new/apps/web` (branch `enscribe/fable-web-rewrite`).

## 0. Foundations (cross-cutting requirements)

### SPA configuration

- **Pure client-side SPA**: root `+layout.ts` sets `ssr = false`, `prerender = false`, `csr = true`. Built with `@sveltejs/adapter-static` (`fallback: 'index.html'`, `precompress: true`, `strict: true`) — svelte.config is TypeScript (`svelte.config.ts`, not `.js`).
- **CSP** injected via SvelteKit config in production only (disabled in dev): `default-src 'none'`; script-src allows self + recaptcha/hcaptcha/turnstile; connect-src allows self, `data:`, `blob:`, GCS/S3 wildcards, captcha + analytics endpoints; frame-src allows YouTube (+nocookie), recaptcha, hcaptcha, turnstile; img-src `http: https: blob: data:`; `base-uri`/`form-action` self; `object-src none`. `X-Frame-Options` handled by nginx, not meta.
- **Dev proxy** (vite.config.ts): `/api` and `/uploads` proxied to `http://127.0.0.1:3000` with `changeOrigin`. Backend URL is never configured client-side — all API calls are **same-origin** `new URL('/api/'+path, window.location.origin)`.
- `app.html`: body classes `bg-background-l0 text-foreground-l0 scheme-light-dark`, `data-sveltekit-preload-data="hover"`. `app.d.ts` only declares `window.dataLayer`/`window.gtag`.

### API client (`$lib/api/index.ts`)

- Typed route definitions from `@rctf/types`; each route has `path` (`:param` templating), `method`, optional `params`/`query`/`body` zod schemas, `bodyFormat` (`'form-data'` supported), `captchaAction`, `goodResponses`/`badResponses`.
- Response envelope `{kind, message, data}`; response parsed and zod-validated against the union of declared responses; unknown kind → throw.
- **Token storage**: `localStorage['token']`. `setToken`/`clearToken`/`isAuthenticated()` (token != null). `Authorization: Bearer <token>` header attached when present. On any response with kind `badToken` the client **auto-clears the token**.
- **Captcha auto-injection**: if `route.captchaAction` is set AND clientConfig marks that action protected, `apiRequest` transparently obtains an invisible-captcha token (`getCaptchaCode`) and adds `captchaCode` to the body before sending. Captcha failures throw `CaptchaError` and toast the error.
- `showApiError(response)`: toast the message; special case kind `badRateLimit` → "Try again in N second(s)" computed from `data.timeLeft` (ms).
- Module-level `cachedClientConfig` (`setClientConfig`/`getClientConfig`) so captcha code can access config outside components.
- `fetch` with `cache: 'no-store'`; JSON body unless `bodyFormat === 'form-data'` (FormData builder handles File, Date→ISO, arrays, null→'').

### Query layer (TanStack svelte-query)

- `createQueryClient()`: queries enabled only in browser, `staleTime` 60 s, retry: never for `ApiError` (non-good API kinds), else <3.
- `clientConfig` query: key `['clientConfig']`, GET `/api/v2/integrations/client/config`, `staleTime: Infinity`, also calls `setClientConfig`.
- `userSelf` query: key `['user','self']`, returns `null` if `!isAuthenticated()` (no request), GET `/api/v2/users/me`, returns `null` on any non-good kind (never errors), `staleTime` 5 min, **`refetchInterval` 30 s**.
- Root `+layout.ts` load: creates QueryClient, **awaits** `fetchQuery(clientConfig)` (blocking — app doesn't render until config arrives), `prefetchQuery(userSelf)` (non-blocking null-safe). Returns `{queryClient, clientConfig}` to all pages via `data`.

### `useApiForm(route, {defaults?, onSuccess?, onError?})` (`$lib/forms/use-api-form.svelte.ts`)

- Reactive `data`, `errors` (per-field + `_form`), `submitting`.
- `validateField(field)`: safeParse route.body, set/clear that field's zod message (used on `oninput`).
- `submit()`: full-body validation (failure → `_form` = prettified zod error); calls `apiRequest`; response kind starting `good` → `onSuccess`, else `errors._form = response.message` + `onError`; thrown errors (network/captcha) → `_form = err.message`.
- Helpers: `reset()`, `setData()`, `setError()`, `clearErrors()`.

### Captcha (`$lib/utils/captcha.ts`)

- Providers: `captcha/recaptcha`, `captcha/hcaptcha`, `captcha/turnstile`. Config from `clientConfig.captcha`: `{provider, publicOptions.siteKey, protectedEndpoints: Record<ProtectedAction, boolean>}` (nullable = disabled).
- `ProtectedAction` enum: `register`, `recover`, `setEmail`, `instancerStart`, `instancerExtend`, `avatarUpload`, `adminBotSubmit`. (Login is **never** captcha-protected.)
- Invisible widgets: lazily load provider script once, render into hidden div, `execute()` → promise for token. Per-provider error messages (expired/network/timeout).
- `captcha-notice.svelte`: legal fine print component; renders only when `isCaptchaProtected(action, config)`; provider-specific text with Privacy Policy + ToS links (Google/hCaptcha/Cloudflare), fallback generic message for unknown providers.

### Analytics (`$lib/utils/analytics.ts`)

- `initAnalytics(clientConfig)` on root layout mount. Providers `analytics/google` (needs `publicOptions.siteTag`; loads script then gtag bootstrap) and `analytics/cloudflare` (needs `publicOptions.token`). Script always loaded from **`/api/v2/integrations/analytics/script`** (backend-proxied). Unknown provider → console.warn, no-op. Idempotent via module promise.

### ClientConfig shape (GET /api/v2/integrations/client/config → kind `goodClientConfigV2`)

`meta.{description,imageUrl}`, `homeContent` (markdown), `sponsors[]{name,icon,description,url?}`, `flagFormatPlaceholder`, `analytics|null`, `ctfName`, `divisions` (record key→label), `defaultDivision`, `origin`, `startTime`/`endTime` (Unix ms), `userMembers`, `faviconUrl|null`, `logoLightUrl|null`, `logoDarkUrl|null`, `emailEnabled`, `registrationsEnabled|null`, `ctftime: {clientId}|null`, `instancerEnabled`, `isArchived`, `captcha|null`.

### User self shape (GET /api/v2/users/me → kind `goodUserSelfDataV2`)

`id, name, email|null, ctftimeId?, division, score, globalPlace|null, divisionPlace|null, solves[], dynamicScores[], teamToken, allowedDivisions[], perms|null (bitmask), avatarUrl|null, countryCode|null, statusText|null`. Permissions bits: `challsRead=1, challsWrite=2, leaderboardRead=4, challsSolveWrite=8, usersWrite=16, settingsWrite=32`.

---

## 1. Auth flows

All auth pages live in route group `(auth)`; its `+layout.svelte` is only a centered container (flex center, max-w-md). Every auth page sets `<title>{Page} | {ctfName}</title>` and renders nothing until clientConfig is loaded.

### 1.1 Login (`/login`)

- **Archived gate**: if `clientConfig.isArchived` → render `ArchivedNotice("Authentication is not available.")` instead of the form.
- **Form**: single password-type input `teamToken` (autocomplete `current-password`, required), via `useApiForm(LoginRoute)`. `oninput` per-field validation. Errors shown inline under the field (`errors.teamToken` and `errors._form`).
- **URL-paste tolerance**: on submit, if the entered value parses as a URL containing `?token=`, extract and use that token instead.
- **Token-in-URL auto-login**: `onMount`, if `?token=` query param exists → immediately `POST /api/v1/auth/login {teamToken}`. On non-good kind, prefill the form with the token and clear errors (user sees form).
- **Endpoint**: `POST /api/v1/auth/login`, body `{teamToken?} | {ctftimeToken?}` (at least one required; zod refinement attaches error to `teamToken`). Good: `goodLogin {authToken}`. Bad kinds: `badUnknownUser`, `badTokenVerification`, `badCtftimeToken`. No captcha.
- **On success**: `setToken(authToken)` (localStorage), toast "Logged in successfully!", invalidate `['user','self']`, `goto(getRedirectPath(?next))`.
- **`?next` redirect sanitization**: must start with `/`, resolved against current origin, same-origin only, rejects `//` prefix, fallback `/`. (Code TODO notes this should become a shared util.)
- **Links**: "Lost your team token?" → `/recover` shown **only if `clientConfig.emailEnabled`**; footer "Register here" → `/register`.
- **CTFtime button** shown only if `clientConfig.ctftime` non-null, with an "or" divider. On CTFtime completion: `POST /v1/auth/login {ctftimeToken}` → `goodLogin` → normal success path; **`badUnknownUser`** → stash `ctftimeToken` + `ctftimeName` in `sessionStorage`, `goto('/register')`; other bad kinds → `showApiError`; network error → toast.
- Submit button disabled + spinner while `form.submitting || loginMutation.isPending`.

### 1.2 Register (`/register`)

- **Archived gate**: `ArchivedNotice("Registration is not available.")`.
- Four render states: (a) success with team token, (b) verify-email-sent, (c) CTFtime completion, (d) default email form.
- **Default form**: `name` (text, minlength 2, maxlength 64, required, autocomplete `username`, autocorrect off) + `email` (required). Copy: "Please register only one account per team." `_form` errors render in a destructive alert box; field errors inline; `oninput` validation. Footer: "Login here" link + `CaptchaNotice(action=Register)`.
- **Endpoint**: `POST /api/v2/auth/register`, body `{name, email?, ctftimeToken?, captchaCode?}` (email XOR ctftimeToken required). `captchaAction: register` — captcha auto-injected when protected. Good kinds: `goodRegisterV2 {authToken, teamToken}` (direct registration) or `goodVerifySent` (email verification required). Bad kinds: `badCompetitionNotAllowed, badCtftimeToken, badEmail, badKnownCtftimeId, badName, badKnownName, badKnownEmail, badRegistrationsDisabled, badCaptcha, badEndpoint, badRateLimit`.
- **On `goodRegisterV2`**: `setToken(authToken)`, toast "Account created successfully!", invalidate userSelf, then render **TeamTokenCard** (state a) showing `teamToken` + login URL `${origin}/login?token=<encoded teamToken>`; both copyable to clipboard (toast on success/fail), token displayed in `<code>` select-all, "Continue" button → `/`.
- **On `goodVerifySent`**: state (b) card "Verification email sent" showing submitted email, "try again" button returns to form.
- **CTFtime path**: on mount, reads `ctftimeToken`/`ctftimeName` from sessionStorage (set by login page), populates form (`name` defaults to CTFtime team name), removes from sessionStorage. CTFtime button (shown when `clientConfig.ctftime`) first attempts **login** (`POST /v1/auth/login {ctftimeToken}`); `goodLogin` → set token, toast, invalidate, `goto('/')` (account already exists); otherwise switch to state (c): name-only form ("You can use a different name than your CTFtime team name."), submit posts register with `ctftimeToken` (no email). "Register with email instead" cancels (clears state, resets form).
- No email verify for CTFtime path; verify-sent only applies to email registration.

### 1.3 Recover (`/recover`)

- **Archived gate**: `ArchivedNotice("Account recovery is not available.")`.
- Form: single `email` input, `useApiForm(RecoverRouteV2)`.
- **Endpoint**: `POST /api/v2/auth/recover`, body `{email, captchaCode?}`, `captchaAction: recover`. Good: `goodVerifySent`. Bad: `badEndpoint, badEmail, badUnknownEmail, badCaptcha, badRateLimit`.
- On success: toast "Recovery email sent!", swap to confirmation card with **anti-enumeration copy** ("If an account exists for {email}, we've sent a recovery email…"), "try again" returns to form.
- Footer: "Login here" link + `CaptchaNotice(action=Recover)`.

### 1.4 Verify (`/verify?token=...`)

- Reads `?token`. No token → inline error "No verification token provided.", button disabled.
- **Info lookup**: `GET /api/v2/auth/verify-info?token=...` (query key `['auth','verify-info',token]`, staleTime Infinity) → `goodVerifyInfo {kind: 'register'|'team'|'update', email|null, name?}`; bad: `badTokenVerification` (query throws → shown as inline error, button disabled).
- Title/description/button label vary by kind: `register` → "Registering as {name}" / "Complete registration"; `team` → "Logging in as {name}" / "Log in"; `update` → "Setting email to {email} for {name}" / "Confirm email"; unknown → generic "Verify email".
- **Action is user-initiated** (button click, not automatic): `POST /api/v2/auth/verify {verifyToken}`. Good kinds and handling:
  - `goodRegisterV2 {authToken, teamToken}`: setToken, show **TeamTokenCard** (token + login URL), toast, invalidate userSelf.
  - `goodVerify {authToken}` (team login/recovery): setToken, toast, invalidate, "Redirecting…" card, `goto('/')` after 500 ms.
  - `goodEmailSet`: toast "Email verified!", invalidate, terminal card "You can now close this tab."
  - Other kinds / thrown errors → inline destructive alert with message. Bad kinds: `badTokenVerification, badEmailChangeDivision, badKnownCtftimeId, badKnownEmail, badKnownName, badUnknownUser`.
- Footer: "Wrong link? Back to login" → `/login`.

### 1.5 CTFtime OAuth (`button-ctftime.svelte` + `/integrations/ctftime/callback`)

- **Popup flow**: button (CTFtime logo SVG, outline style; spinner + "Connecting..." while pending) generates random 16-byte hex `state`, opens centered 600×500 popup (zoom-compensated) at `https://oauth.ctftime.org/authorize?scope=team:read&client_id={clientConfig.ctftime.clientId}&redirect_uri={origin}/integrations/ctftime/callback&state={state}`.
- **Callback page** (`/integrations/ctftime/callback/+page.svelte`): renders nothing; onMount posts `{kind:'ctftimeCallback', state, ctftimeCode: ?code}` to `window.opener` restricted to `location.origin`, then `window.close()`.
- Button listens for `message` events (added onMount, removed onDestroy); **validates `evt.origin === location.origin`, `kind === 'ctftimeCallback'`, and `state` matches** (single-use; nulled after handling).
- Exchanges code: `POST /api/v1/integrations/ctftime/callback {ctftimeCode}` → `goodCtftimeToken {ctftimeToken, ctftimeName, ctftimeId}`; bad: `badCtftimeCode, badEndpoint`. Success → `onCtftimeDone(data)` callback (page-specific, see login/register); non-good → `showApiError`; error → toast.

### 1.6 External-auth authorize (`/external-auth/authorize?client_id=...&redirect_uri=...&state=...`) — rCTF as OAuth provider

- **Archived gate**: `ArchivedNotice("Authorization is not available.")`.
- **Auth guard** (onMount): if `!isAuthenticated()` → `goto('/login?next=' + encodeURIComponent(pathname+search))` so user returns after login.
- **Client lookup**: missing `client_id` or `redirect_uri` → error "Missing client_id or redirect_uri." Otherwise `GET /api/v2/external-auth/clients/:id` → `goodExternalAuthClient {id, name, redirectUri}` (bad: `badExternalAuthRequest` → "This integration is not recognized."). Frontend performs a **bytes-exact `redirectUri` match** against the registration and fails fast ("The redirect URI does not match…") before issuing anything.
- **Consent UI**: shows client name, current team name (`useCurrentUser`), warning that the app "will receive a token that lets it act on your account with the same access you have", and the redirect URI in `<code>`. Spinner while client/user still loading. Load errors show message + "Go home" button.
- **Authorize**: `POST /api/v2/external-auth/authorize {clientId, redirectUri, state?}` (auth required) → `goodExternalAuthAuthorize {redirectTo}` → `window.location.href = redirectTo` (full navigation). Non-good → `showApiError`, button re-enabled.
- **Cancel/deny**: redirect to `redirect_uri` with `?error=access_denied` (+`&state=` if present; `?`/`&` separator chosen by existing query); if no redirect_uri, `goto('/')`.
- (Companion backend-only route not used by UI: `POST /v2/external-auth/token` — client-secret code exchange.)

---

## 2. App shell

### 2.1 Root layout (`routes/+layout.svelte`)

- Structure: `QueryClientProvider` → `Tooltip.Provider (delayDuration 300, disableHoverableContent)` → `div.min-h-screen.flex-col` → `<Navigation/>` + `<main flex-1>{children}</main>`. Outside: `<Toaster/>` (svelte-sonner) and `<Brainrot/>`.
- `<svelte:head>`: favicon (`clientConfig.faviconUrl` fallback bundled SVG), shortcut/apple-touch icons, webmanifest, title = `ctfName`, description = `meta.description`, `theme-color #111111`, canonical = `origin`, full OG + Twitter card meta (TODO comment: should be server-injected for crawlers).
- onMount: `initAnalytics(clientConfig)`.
- **Brainrot easter egg**: typing "BRAINROT" (outside inputs) spawns 3 draggable, z-orderable, closable floating windows with muted autoplaying YouTube embeds (Subway Surfers / Soap Cutting / Minecraft).

### 2.2 Navigation (desktop, `navigation.svelte`)

- Sticky top header (`z-50`), uses custom `arrowNavigation` action for arrow-key focus traversal among links/buttons (skips disabled/hidden/`data-arrow-navigation-exclude`).
- **Left**: wordmark link to `/` — `clientConfig.logoLightUrl`/`logoDarkUrl` with bundled SVG defaults; light/dark variants swapped via CSS (`dark:` classes). Then icon nav buttons (each wrapped in tooltip): Home `/`, Challenges `/challenges`, Scoreboard `/scores`; **Admin dropdown** (gavel icon) only if `isAdmin` with items: Manage challenges `/admin/challenges`, Manage teams `/admin/teams`, Submissions `/admin/submissions`, Settings `/admin/settings`.
- **Active state** (`navigation-button.svelte`): `/` requires exact pathname match; other items use `pathname.startsWith(activePath)`; admin trigger highlights on `/admin`.
- **isAdmin** = `user.perms != null && (perms & Permissions.challsRead) !== 0`.
- **Right** (hidden on <md): `NavigationCountdown`; then if `user && !isArchived`: lazy-imported `NavigationTeamStats` + **user dropdown** (trigger shows team name (truncated, max-w-64), country flag image from `/flags/{file}` when `countryCode`, `·` separator, `statusText` (truncated) or, if neither flag nor status, division label from `clientConfig.divisions[user.division]` fallback raw key fallback "No Division"; avatar with initials fallback, re-keyed on avatarUrl change). Dropdown items: **Copy login URL** (writes `${origin}/login?token=<teamToken>` to clipboard + toast), **Manage team** → `/profile`, **Log out**. Else if `!isArchived`: Login icon button → `/login`. Always: `ThemeToggle`. **In archived mode: no login button, no user menu — only countdown + theme toggle.**
- **Logout**: `clearToken()`, `queryClient.setQueryData(['user','self'], null)`, `goto('/login')`. (Client-side only; no API call.)

### 2.3 Mobile navigation (`navigation-mobile.svelte`, shown <md)

- Hamburger opens a left Sheet (drawer) with wordmark + close button, then a flat button list from a declarative `navItems` array with `show` flags: Home/Challenges/Scoreboard (always), **Manage team** (`/profile`) if `user && !isArchived`, four admin items if `isAdmin`. Buttons call `goto` and close the sheet; same active-path logic (accent background).
- Footer row: ThemeToggle + (if `user && !isArchived`) Copy-login-URL and Logout icon buttons with tooltips; else (if `!isArchived`) Login icon button.

### 2.4 Countdown (`navigation-countdown.svelte`)

- Rendered only when `clientConfig && (startTime > 0 || endTime > 0)`; hidden below `lg`. 1 s tick.
- Target = `startTime` before start, else `endTime`. Label: `isArchived` → "Archived"; ended → "CTF ended" with `--:--:--`; started → "to CTF end"; else "to CTF start". Format `Dd HH:MM:SS` (days omitted when 0), tabular-nums.

### 2.5 Team stats sparkline (`navigation-team-stats.svelte`)

- Rendered only when `user && user.globalPlace`; hidden below `lg`. Shows ordinal place ("1st/2nd/3rd…") and "of {total} teams" (total from `useLeaderboard({limit:1, offset:0})` → GET `/v2/leaderboard/now`).
- Sparkline of own score over trailing `SPARKLINE_WINDOW` via `useSelfUserGraph`: GET `/v2/leaderboard/graph?limit=1&offset=globalPlace-1`, entry validated to match own user id; refetch 30 s. Renders layerchart Spline with fade-in gradient; flat placeholder line when <2 points.
- Place-based color variants: gold (1st), silver (2nd), bronze (3rd), neutral otherwise.

### 2.6 Theme (`theme-toggle.svelte`)

- Theme = `data-theme` attribute on `<html>`, persisted in `localStorage['theme']` (`'dark'|'light'`); initial = stored value else `prefers-color-scheme`, default state `dark`.
- **FOUC prevention**: inline `<script>` injected via `<svelte:head>` `{@html}` runs before paint, sets `data-theme` and writes back to localStorage.
- Toggle: temporarily disables all CSS transitions (add class, force reflow via `offsetHeight`, remove on next rAF), flips attribute + storage. Icon shows the theme you'd switch to (sun in dark mode, moon in light); tooltip "Light mode"/"Dark mode".

### 2.7 CTF-not-started gate (`ctf-not-started.svelte`)

- Full-page centered card "CTF not started" with live D:HH:MM:SS countdown to `startTime` (1 s tick; days segment only when >0).
- **On reaching zero, invalidates query keys `fullLeaderboard`, `challenges`, `clientConfig` once** so the gated page re-fetches and unlocks without reload.
- Shows a Login button when `!isAuthenticated()`.
- Used by `/challenges` and `/scores` pages (rendered when the respective API returns `badNotStarted` — checked via `ApiError.isNotStarted`, kind `badNotStarted`). Not used by home.

### 2.8 Archived mode

- Driven entirely by `clientConfig.isArchived`. Effects: `/login`, `/register`, `/recover`, `/external-auth/authorize` replace content with `ArchivedNotice` (card: "Read-only archive", "This is a read-only archive of {ctfName}. This CTF has ended and the site is archived. {message}", Go-to-home button). Nav hides login button, user menu, team stats, and profile item; countdown label becomes "Archived". `/verify` is _not_ archived-gated.

### 2.9 Error page (`+error.svelte`)

- Centered card: 404 → "Page not found"/"The page you're looking for doesn't exist."; otherwise "Something went wrong"/generic copy. Shows `page.error.message` in destructive alert when present, "Error code: {status}", Go-to-home button.

---

## 3. Route guards (summary)

There are **no server/load-based guards** (SPA, `ssr=false`); gating is all component-level:

- **Root layout load** blocks first paint on clientConfig fetch; failure surfaces via `+error.svelte`.
- **Auth**: `isAuthenticated()` = localStorage token presence. No global redirect for logged-out users; pages degrade instead:
  - `/challenges` (list + flag submit + instancer + admin bot panels) and `ctf-not-started` show "Login" buttons/prompts inline when unauthenticated rather than redirecting.
  - `/external-auth/authorize` is the only route that **redirects** unauthenticated users → `/login?next=<self>` (onMount).
  - `/login` consumes `?next=` with same-origin sanitization (leading `/`, same origin, no `//`).
  - Stale/invalid tokens self-heal: any `badToken` API response clears the token; `userSelf` returns null → UI reverts to logged-out.
- **CTF start**: `/challenges` and `/scores` render `CtfNotStarted` on `badNotStarted` API errors.
- **Admin visibility**: nav admin entries gated on perms bitmask (`challsRead`); admin routes under `/admin/*` exist separately (out of scope here) — nav only controls discoverability.
- **Archived**: see 2.8.
- Login/register/recover pages are **not** hidden from logged-in users (no redirect-if-authenticated).

---

## 4. Home page (`routes/+page.svelte`)

- Data comes solely from layout `data.clientConfig` (no page load function, no extra fetches).
- Content: (1) Card rendering `clientConfig.homeContent` as **Markdown** (shared `Markdown` component); (2) **Sponsors card** only when `sponsors.length > 0` — responsive 1/2-col grid; each sponsor: optional full-width icon image (with `dark:invert`), name, markdown-rendered `description`; wrapped in external link (`target=_blank rel=noopener noreferrer`) when `url` present, plain `<article>` otherwise; (3) footer "Powered by rCTF" linking `https://rctf.osec.io`.
- Home is never gated by CTF start, auth, or archive.

---

## 5. API endpoints referenced (this scope)

| Method | Path                                               | Used by                             | Notes                                                                                      |
| ------ | -------------------------------------------------- | ----------------------------------- | ------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------- |
| GET    | `/api/v2/integrations/client/config`               | layout load, all pages              | `goodClientConfigV2`; staleTime ∞                                                          |
| GET    | `/api/v2/users/me`                                 | layout prefetch, nav, authorize     | `goodUserSelfDataV2`; null when logged out; 30 s poll                                      |
| POST   | `/api/v1/auth/login`                               | login, register (ctftime pre-check) | body `{teamToken?                                                                          | ctftimeToken?}`; `goodLogin{authToken}`; `badUnknownUser` drives ctftime→register handoff                         |
| POST   | `/api/v2/auth/register`                            | register                            | `{name, email?                                                                             | ctftimeToken?, captchaCode?}`; captcha action `register`; `goodRegisterV2{authToken,teamToken}`\|`goodVerifySent` |
| POST   | `/api/v2/auth/recover`                             | recover                             | `{email, captchaCode?}`; captcha action `recover`; `goodVerifySent`                        |
| GET    | `/api/v2/auth/verify-info?token=`                  | verify                              | `goodVerifyInfo{kind: register\|team\|update, email, name?}`                               |
| POST   | `/api/v2/auth/verify`                              | verify                              | `{verifyToken}`; `goodRegisterV2` \| `goodVerify{authToken}` \| `goodEmailSet`             |
| POST   | `/api/v1/integrations/ctftime/callback`            | ctftime button                      | `{ctftimeCode}` → `goodCtftimeToken{ctftimeToken, ctftimeName, ctftimeId}`                 |
| GET    | `/api/v2/external-auth/clients/:id`                | authorize                           | `goodExternalAuthClient{id,name,redirectUri}`                                              |
| POST   | `/api/v2/external-auth/authorize`                  | authorize                           | auth required; `{clientId, redirectUri, state?}` → `goodExternalAuthAuthorize{redirectTo}` |
| GET    | `/api/v2/leaderboard/now?limit&offset[&division]`  | nav team stats (total)              | `goodLeaderboardV2`                                                                        |
| GET    | `/api/v2/leaderboard/graph?limit=1&offset=place-1` | nav sparkline                       | `goodLeaderboardGraph`                                                                     |
| GET    | `/api/v2/integrations/analytics/script`            | analytics init                      | plain script, backend-proxied                                                              |

External (non-API) URLs: `https://oauth.ctftime.org/authorize` (popup), captcha provider scripts (`www.google.com/recaptcha/api.js`, `js.hcaptcha.com/1/api.js`, `challenges.cloudflare.com/turnstile/v0/api.js`), YouTube embeds (brainrot), `rctf.osec.io` (footer). Static assets: `/flags/{code}.svg` country flags, `/uploads` (dev-proxied, avatars).

Client-side storage: `localStorage`: `token` (auth), `theme`; `sessionStorage`: `ctftimeToken`, `ctftimeName` (login→register handoff, cleared on read).

### Rewrite-relevant coupling notes

- `bits-ui`'s `mergeProps` is used once (navigation tooltip+dropdown trigger composition) — Zag.js replacement must support composing trigger props.
- Tooltip provider config (300 ms delay, no hoverable content) is global shell behavior.
- Lazy `import()` of navigation-team-stats keeps layerchart out of the base bundle.
- TeamTokenCard is shared by register and verify (both `goodRegisterV2` outcomes).
- `useApiForm` + typed routes is the form backbone for all three auth forms; error model = per-field zod messages + `_form` from API `message`.
