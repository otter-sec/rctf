# rCTF Web Frontend: Data/Logic Layer & Theming Audit (for apps/web-new rewrite)

## 1. API Client (`src/lib/api/index.ts` — single file, ~250 LOC)

**Design: route-definition-driven, fully typed, zero codegen.** Every call goes through `apiRequest<TRoute>(route, args?)` where `route` is a `RouteDefinition` object imported from `@rctf/types` (e.g. `LoginRoute`, `GetChallengesRouteV2`). The route object carries: `method`, `path` (with `:param` placeholders), zod-mini schemas for `body`/`params`/`query`, `goodResponses`/`badResponses` (each a `ResponseDefinition {kind, status, message, dataSchema, schema}`), `bodyFormat` (`'json' | 'form-data'`), and `captchaAction`.

- **Base URL**: no env var, no runtime config. Hardcoded `new URL('/api/' + path, window.location.origin)` (SSR fallback origin `http://localhost`; queries are disabled on server anyway). Same-origin `/api/` prefix is the entire contract.
- **Args**: `InlineArgs<TRoute>` is a flat merge of params + query + body inputs; `pickArgs` splits the single flat object back into sections by running each section's zod schema `.parse()` on it (client-side validation before send). `applyPath` substitutes `:key` with `encodeURIComponent`, throws on missing param. `applyQuery` skips `undefined` values.
- **Auth token**: bearer token in `localStorage['token']`; helpers `setToken`/`clearToken`/`isAuthenticated` (`getToken` is private). No refresh mechanism — token is long-lived; on any response with kind `BadToken.kind` the token is silently cleared (`parseResponse`). `Authorization: Bearer <token>` attached when present.
- **Captcha integration**: if `route.captchaAction` set and body exists, `getCaptchaCode(action, cachedClientConfig)` runs before fetch and injects `captchaCode` into body; `CaptchaError` is toasted and rethrown.
- **Body encoding**: JSON default; `bodyFormat: 'form-data'` builds `FormData` (handles arrays, `File`/Blob via `isFileField`, `Date`→ISO, null→`''`).
- **Response envelope**: every API response is `{kind: string, message: string, data?: unknown}`. `parseResponse` finds the matching `ResponseDefinition` by `kind` among good+bad responses and validates the full envelope with its zod schema (message is a `z.literal` too). Unknown kind or schema failure → thrown `Error`. So **`apiRequest` resolves for both good and bad kinds** — callers discriminate with `response.kind === GoodX.kind`; it only _throws_ on network failure/unknown kind/validation failure/captcha failure.
- **`showApiError(response)`**: toast helper (svelte-sonner) used ad-hoc in ~15 components; special-cases `BadRateLimit` to render `data.timeLeft` as "Try again in Ns".
- **Client-config side channel**: `setClientConfig`/`getClientConfig` module-level cache (set by the config query) so `apiRequest` can read captcha config without a hook.
- `fetch` always `cache: 'no-store'`.

Rewrite requirement: preserve the route-definition + kind-discriminated envelope pattern — it's the backbone of type safety across the whole app.

## 2. TanStack Query (`src/lib/query/*`, `@tanstack/svelte-query`)

**Client defaults** (`core.ts` `createQueryClient`): `enabled: browser` (no SSR fetching at all), `staleTime: 60s`, retry: never for `ApiError` (name check), else up to 3. `ApiError extends Error` carries `kind`; static `ApiError.isNotStarted(err)` checks `BadNotStarted.kind` (used to gate "CTF not started" UI).

**Pattern**: each domain file exports `queryOptions(...)` factories (so keys and fetchers are reusable/composable) plus thin `useX(() => args)` wrappers using `createQuery(() => options)` (Svelte 5 reactive-callback form). Query fns call `apiRequest`, return `response.data` on the expected good kind, else `throw new ApiError(kind, message)` (some return `null` instead of throwing: userSelf, adminBotStatus, instancerSchema, self/user graph).

**Query key structure** (hierarchical arrays, centralized in `query/index.ts` as `queryKeys`):

- `['clientConfig']`
- `['user','self']`, `['user', id]`
- `['members']`
- `['auth','verify-info', token]`
- `['challenges']`, `['challenges', id, 'solves', params|'infinite']`, `['challenges', id, 'scores', params|'infinite']`
- `['leaderboard', params]`, `['leaderboard','challenges']`, `['leaderboard','graph', params]`, `['leaderboard','with-graph', params]`, `['leaderboard','graph','self', userId, globalPlace]`, `['leaderboard','graph','user', userId, globalPlace]`, `['leaderboard','graph','infinite', params]`; broad prefix `queryKeys.fullLeaderboard = ['leaderboard']`
- `['admin','challenges']`, `['admin','challenges', id]`, `['admin','users', id]`, `['admin','users','infinite', pageSize, params]`, `['admin','user-verifications']`, `['admin','submissions', params]`, `['admin','submissions','infinite', params, pageSize]`, `['admin','settings']`, `['admin','admin-bot','status']`, `['admin','instancer','schema']`, `['admin','external-auth','clients']`

**Staleness/polling per domain**:

- `clientConfig`, `verify-info`, `adminBotStatus`, `instancerSchema`: `staleTime: Infinity`
- `challenges`: `refetchInterval: 30s`
- `challenge scores`: 30s poll; infinite variant `staleTime: 30s` + `keepPreviousData`
- `leaderboard` family: `refetchOnWindowFocus: true` + 30s poll (plain leaderboard: focus-refetch only); `userGraph`: `staleTime: 5min`
- `userSelf`: `staleTime: 5min` **and** `refetchInterval: 30s`
- admin lists: defaults, infinite ones use `keepPreviousData`; admin hooks add `enabled: browser` explicitly

**Infinite queries**: challenge solves/scores, leaderboard-with-graph, admin users, admin submissions. All use offset paging: `initialPageParam: 0`, `getNextPageParam` computes `offset + page.items.length < total ? nextOffset : undefined` (solves variant compares to an externally-passed `totalCount()`).

**Mutations**: `createApiMutation(route)` = one-liner `createMutation({mutationFn: args => apiRequest(route, args)})`. ~25 mutation hooks exist (login, register, verify, recover, ctftime callback, create user token; submit flag, delete challenge, delete solve; update/upload/settings/admin-user/avatar/delete/verification x2; external auth client create/delete; profile: update user, set/delete email, set/delete ctftime, create/delete member, update avatar). **No `onSuccess`/invalidation inside the hooks** — mutations resolve with the envelope and components decide.

**Invalidation strategy**: entirely caller-side in components. Patterns observed: login/register/verify → invalidate `userSelf`; profile settings → invalidate `userSelf`/`members`; flag submit & instancer actions → `refetchQueries(challenges)`, `refetchQueries(userSelf)`, `invalidateQueries(['leaderboard'])`; admin profile edits → invalidate adminUser(id), userById(id), `['admin','users']` prefix, full leaderboard, leaderboardChallenges; admin settings save → invalidate clientConfig + adminSettings; CTF-start countdown (`ctf-not-started.svelte`) → invalidates leaderboard/challenges/clientConfig when the clock hits start.

**Optimistic updates**: essentially none. Only direct `setQueryData`: logout sets `['user','self']` → `null` (navigation + mobile), admin settings page seeds `adminExternalAuthClients` after create. No `onMutate` rollback patterns anywhere.

## 3. `use-api-form.svelte.ts` — form abstraction

**API**: `useApiForm(route, {defaults?, onSuccess?, onError?})` returns `{data (get/set), errors, submitting, submit(e?), reset(), setData(partial), setError(field|'_form', msg|null), clearErrors(), validateField(field)}`. State via Svelte 5 runes (`$state`), returned through getter/setter object.

**Validation**: zod-mini, reusing `route.body` schema (no separate form schemas). `validateField` runs full-body `safeParse` and plucks the issue whose `path[0]` matches the field (per-field errors on blur/change). `validateAll` on submit collapses all issues into a single `_form` error via `prettifyError`. Server errors: any non-`good*` kind → `errors._form = response.message` + `onError(response)` (typed as `RouteErrorResponse<TRoute>`); success discriminated by `kind.startsWith('good')` → `onSuccess(response)` typed as `RouteSuccessResponse<TRoute>`. Thrown errors (network/captcha) → `_form`. Guards double-submit via `submitting`.

**Used by**: login, register, recover, profile account settings, profile members, flag submit (6 call sites).

**Assessment: worth keeping conceptually — yes.** It's small (~130 LOC), dependency-free beyond zod, decoupled from TanStack Query, and derives validation from the shared route contract, which is exactly the right altitude. Weaknesses to fix in rewrite: (a) `validateAll` dumps all issues into one `_form` string instead of per-field mapping — inconsistent with `validateField`; (b) success detection by string prefix `'good'` instead of checking `route.goodResponses` kinds; (c) no dirty tracking/touched state. It does not need to become a library — reimplement the same shape natively.

## 4. XState machines

**Exactly one machine exists**: `editorMachine` (`src/lib/machines/index.ts`) — the admin challenge editor. States: `idle → viewing → editing/creating → saving → confirmDiscard/confirmDelete/deleting`. Context: `{challenge, form, originalForm}` with a `FormData` shape (name/category/author/description/flag/pointsMin/pointsMax/tiebreakEligible/sortWeight/tags/files/instancerConfig/adminBotConfig/hidden/releaseTime/scoring). Guards: `dirty`/`clean` via `JSON.stringify` compare against `originalForm` (or non-empty heuristic when creating). Events cover select/create/detail-loaded/edit/cancel/save(+success/error)/delete(+confirm/success/error/cancel)/discard/keep-editing plus five field-update events that are just `assign` reducers. Consumed only in `admin/challenges/admin-challenges.svelte` via `useMachine` from `@xstate/svelte`; the details component types itself against `SnapshotFrom<typeof editorMachine>`.

**Assessment: the rewrite does not need xstate.** Two runtime deps (`xstate` 5.28.0 + `@xstate/svelte` 5.0.0) for one machine whose real value is (a) an explicit mode enum, (b) dirty-check gating on navigation, (c) confirm-discard/confirm-delete interception. A `$state` class with a `mode: 'idle'|'viewing'|'editing'|'creating'|'saving'|'confirmDiscard'|'confirmDelete'|'deleting'` union, a `dirty` derived, and plain methods reproduces it in less code and fewer concepts. The five `UPDATE_*` events are pure boilerplate under runes. Preserve the _behavioral_ contract: unsaved-changes guard on select/create/cancel, save/delete async states blocking input, form snapshot/restore (`originalForm`) semantics, and the server↔form mapping helpers (`fromChallenge`, `fromDetail`, `scoringFromServer`, `adminBotConfigFromServer`).

## 5. Utils inventory (`src/lib/utils/`, plus `src/lib/actions/`, barrel `src/lib/utils.ts`)

| file                          | purpose                                                                                                                                                                                                                                                                                                                    | pure/reusable as-is?                                                                                                                   |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `analytics.ts`                | Init GA4 or Cloudflare Web Analytics from `ClientConfig.analytics` (loads `/api/v2/integrations/analytics/script`, sets gtag)                                                                                                                                                                                              | Reusable as-is (browser side-effects; framework-free)                                                                                  |
| `captcha.ts`                  | Invisible-captcha orchestration for reCAPTCHA/hCaptcha/Turnstile: `isCaptchaProtected`, `requestCaptchaCode`, `getCaptchaCode`, `getCaptchaProvider`, `CaptchaError`; per-provider hidden widget + promise plumbing                                                                                                        | Reusable as-is; framework-free; **required** by API client                                                                             |
| `categories.ts`               | CTF category registry: display order (challenges vs scoreboard), aliases (binary→pwn, rev→reverse), per-category name/icon/color config, `getCategoryStyle` emits inline `--category-*` CSS var mapping to `--{fg,bg}-{color}-*` tokens                                                                                    | Data mostly pure; icon imports tie it to `$lib/icons`; `getCategoryStyle` couples to token contract (§6) — keep the mechanism          |
| `filesize.ts`                 | `formatFileSize(bytes)` → "1.5 MB" (1024-based, null→"Unknown size")                                                                                                                                                                                                                                                       | Pure, reusable                                                                                                                         |
| `flags.ts`                    | `countryCodeToFlagFilename('US')` → regional-indicator codepoint SVG filename `1f1fa-1f1f8.svg`                                                                                                                                                                                                                            | Pure, reusable                                                                                                                         |
| `hover-tooltip.svelte.ts`     | `createHoverTooltip` — rune-based controller for manually-anchored tooltips (virtual anchor DOMRect, hover delay 300ms) + `createDataAttrTooltipHandlers` for event-delegated `[data-tooltip-label]` targets in virtualized lists                                                                                          | Svelte-runes; concept must survive (virtualized rows can't have per-cell triggers); reimplement against Zag positioning                |
| `initials.ts`                 | `getInitials(name)` — 2 capitals if ≥2, else first alnum of first words                                                                                                                                                                                                                                                    | Pure, reusable                                                                                                                         |
| `markdown.ts`                 | marked + DOMPurify pipeline; custom block extension for GitHub-style alerts `> [!NOTE/TIP/IMPORTANT/WARNING/CAUTION/CONNECTION]` rendered as `<div data-alert data-type data-content>` placeholders (hydrated by a component), inline `<timer/>` extension → `<span data-timer>`, plus an html-block-separation regex hack | Reusable as-is; the data-attr placeholder + component hydration pattern is a real requirement (challenge descriptions)                 |
| `permissions.ts`              | `hasPermissions(user, required)` — bitmask AND on `user.perms`                                                                                                                                                                                                                                                             | Pure, reusable                                                                                                                         |
| `rank.ts`                     | Leaderboard rank/blood styling: variant (first/second/third/self/nth) → **tailwind class strings** (`bg-background-gold` etc.), blood gradient classes, `getStableRankColor` (id hash → CSS var), `getRankColorForPosition` (medals/rank palette/self)                                                                     | Logic pure; class-string maps are tailwind-coupled — rewrite must convert to CSS-var/data-attr equivalents while keeping variant logic |
| `script-loader.ts`            | `loadScriptOnce(src)` — dedupes `<script>` injection via `data-loaded`, promise-based                                                                                                                                                                                                                                      | Pure-ish, reusable                                                                                                                     |
| `time.ts`                     | CTF time formatting: custom `intervalToDuration` (days cap, no months), `formatFirstBloodTime`, `formatRelativeToFirstBlood` (`+2h, 5m`), `formatCtfOffset` (`T+…/T-…`), `formatLocalTime` (date-fns `format`), `formatRelativeHours(Minutes)`, `formatCountdown` (`m:ss`)                                                 | Pure, reusable (only dep: date-fns `format`)                                                                                           |
| `virtualizer.svelte.ts`       | `createInfiniteVirtualizer` + `useInfiniteVirtualScroll`: wraps `@tanstack/svelte-virtual` with custom rect/offset observers (rAF polling for late-mounting scroll elements, ResizeObserver-cached metrics), scroll-percentage (70%) load-more trigger, `isScrolling` state                                                | Svelte-runes + tanstack-virtual coupled; heavy but battle-tested — port, don't rewrite casually                                        |
| `actions/arrow-navigation.ts` | Svelte action: roving Left/Right/Home/End focus within a container (RTL-aware, loop, `[data-arrow-navigation-exclude]`, visibility checks)                                                                                                                                                                                 | Reusable as-is (plain DOM); Zag may subsume some uses                                                                                  |
| `constants/scores.ts`         | `PAGE_SIZE=15`, `X_AXIS_DIVISIONS=6`, `SPARKLINE_WINDOW=12h`, `DELTA_WINDOW=2h`, `MEDAL_COLORS`/`RANK_COLORS` (10-color top-10 graph palette)/`SELF_COLOR` — all `var(--foreground-*)` references                                                                                                                          | Pure; depends on token contract                                                                                                        |
| `utils.ts` (barrel)           | `cn()` (clsx+tailwind-merge — **dies with tailwind**), re-exports of the above + `@rctf/util`, bits-ui helper types `WithoutChild(ren)`, `WithElementRef` — **die with bits-ui**                                                                                                                                           | Barrel itself is disposable                                                                                                            |

## 6. Theming token contract

Docs promise themability; the contract has **three layers**, all `:root`-scoped custom properties. Dark mode = `[data-theme='dark']` attribute on `<html>` (set by inline head script pre-hydration; see §8).

**Layer A — `theme-tokens.css` (scale tokens, theme-invariant, tailwind-derived):**

- `--spacing` (0.25rem base unit)
- `--breakpoint-{sm,md,lg,xl,2xl}` (40/48/64/80/96rem)
- `--container-{3xs,2xs,xs,sm,md,lg,xl,2xl,3xl,4xl,5xl,6xl,7xl}` (16–80rem)
- `--text-{xs,sm,base,lg,xl,2xl,3xl,4xl,5xl,6xl,7xl,8xl,9xl}` + paired `--text-*--line-height`
- `--font-weight-{thin,extralight,light,normal,medium,semibold,bold,extrabold,black}` (100–900)
- `--tracking-{tighter,tight,normal,wide,wider,widest}`
- `--leading-{tight,snug,normal,relaxed,loose}`
- `--radius-{xs,sm,md,lg,xl,2xl,3xl,4xl,full}`
- `--blur-{xs,sm,md,lg,xl,2xl,3xl}`
- `--aspect-video`

**Layer B — `tailwind.css` (raw palette, theme-invariant):** full Tailwind v4 oklch scales `--color-{red,orange,amber,yellow,lime,green,emerald,teal,cyan,sky,blue,indigo,violet,purple,fuchsia,pink,rose,slate,gray,zinc,neutral,stone}-{50..950}` (stone lacks 950). Semantic tokens reference these.

**Layer C — `app.css` semantic tokens (light `:root` + dark `[data-theme='dark']` overrides).** This is the actual themable contract the rewrite must honor:

- `--radius` (0.625rem; shadcn-style derived `--radius-{sm,md,lg,xl}` in `@theme inline` — collides with Layer A names, resolve in rewrite)
- Surfaces: `--background-l0..l5` (elevation ladder), text: `--foreground-l0..l5` (emphasis ladder)
- `--border`, `--ring`
- Accent: `--background-accent`, `--background-accent-hover`, `--foreground-accent`
- Medals: `--background-{gold,silver,bronze}`, `--foreground-{gold,silver,bronze}-{l0,l1}`
- Self-row highlight: `--background-self-{l0,l1}`, `--foreground-self-{l0,l1}`
- Other-rows: `--background-nth`, `--foreground-nth-{l0,l1}`
- Graph top-10 series: `--foreground-{first,second,third,fourth,fifth,sixth,seventh,eighth,ninth,tenth}`
- Status: `--background-destructive`, `--background-destructive-hover`, `--foreground-destructive`, `--background-success`, `--foreground-success`
- Prose: `--foreground-prose`, `--foreground-prose-link`, `--foreground-prose-inline-code`
- Category color slots (indirection filled per-element by `getCategoryStyle`): `--category-background-{l0,l1,l1-hover}`, `--category-foreground-{l0,l1}`
- Per-hue category ramps, for each of `red, orange, yellow, green, teal, blue, purple, pink, fuchsia, gray`: `--background-{hue}-{l0,l1,l1-hover}`, `--foreground-{hue}-{l0,l1}` (light: transparent color-mixes of 400/900; dark: mixes of 950/100–300)
- Fonts (in `@theme inline`, keep as vars): `--font-sans` (Outfit variable) / `--font-mono` (Geist Mono variable), self-hosted `@font-face` from `/fonts/`.
- `typography.css` defines a `.prose` component (headings/lists/tables/kbd/katex margins + colors) referencing the semantic tokens — behavior to reproduce sans `@apply`.
- Misc global behaviors in app.css: `tracking-tight` on everything, `body` = `bg l0`/`fg l0`, `.grecaptcha-badge { visibility: hidden }`.

Rewrite must keep the _names and semantics_ of Layer C (that's the documented theming surface) and can regenerate Layers A/B as plain CSS vars.

## 7. Workspace package consumption

**`@rctf/types`** (zod 4 mini based; `packages/types/src`) — the web consumes:

- **Route definitions** (`routes/v1`,`v2` via index): ~50 imported (`LoginRoute`, `RegisterRouteV2`, `VerifyRouteV2`, `RecoverRouteV2`, `CtftimeCallbackRoute`, `CreateUserTokenRouteV2`, `GetVerifyInfoRouteV2`, `GetChallengesRouteV2`, `SubmitFlagRoute`, `GetChallengeSolves/ScoresRouteV2`, `DeleteChallenge(Solve)Route(V2)`, `GetClientConfigRouteV2`, `GetUser(Self)RouteV2`, `GetMembersRoute`, `Create/DeleteMemberRoute`, `UpdateUserRouteV2`, `Set/DeleteEmailRoute(V2)`, `Set/DeleteCtftimeRoute`, `UpdateAvatarRoute`, leaderboard x4, all admin routes incl. `FilterAdminUsers/SubmissionsRouteV2`, `UploadFilesRouteV2`, `UpdateChallengeRouteV2`, settings/user/verification/external-auth routes, `GetInstancerSchemaRouteV2`).
- **Response definitions** for kind-discrimination: all `Good*` consts used in query fns and components (`GoodLogin`, `GoodFlag`, `GoodVerifySent`, `GoodEmailSet`, `GoodAvatarUpdated`, `GoodMemberDelete`, `GoodFilesUploadV2`, `GoodCreateUserTokenV2`, `GoodChallengeSolveDeleteV2`, `GoodAdminUserUpdate/DeleteV2`, etc.) and select `Bad*` (`BadToken`, `BadRateLimit`, `BadNotStarted`, `BadUnknownUser`, `BadAlreadySolvedChallenge`).
- **Type helpers** (`internal/routes.ts`): `AnyRouteDefinition`, `RouteResponse`, `RouteBody(Input)`, `RouteParams(Input)`, `RouteQuery(Input)`, `RouteSuccessResponse`, `RouteErrorResponse`, `ResponseDefinition`.
- **Model types** (`util/models.ts`, derived from response schemas): `Challenge`, `AdminChallenge`, `AdminChallengeDetail`, `ClientConfig`, `UserProfile`, `PublicUserProfile`, `Solve`, `LeaderboardGraphEntry`, `InstancerConfig`.
- **Enums**: `Permissions` (bitmask: challsRead/Write, leaderboardRead, challsSolveWrite, usersWrite, settingsWrite), `ProtectedAction` (register/recover/setEmail/instancerStart/instancerExtend/avatarUpload/adminBotSubmit), `ChallengeScoringKind`, `DynamicScoringTransport`, `ExposeKind`, `SubmissionKind`, `SubmissionSortBy`, `SubmissionSortOrder`, `SubmissionTeamStatus`, `AdminTeamSortBy`, `SortOrder`.
- **Runtime helper**: `isFileField` (Blob-with-name check for form-data encoding).

**`@rctf/util`** — web consumes: `ALL_REGIONS` (COUNTRIES + TERRITORIES + SPECIAL_REGIONS, `{code,name}`) in flag-picker/profile/challenge rows; and via the `export * from '@rctf/util'` barrel, `getTimeOrdinal` and `withTimeout` are available (barrel re-export; direct imports only use `ALL_REGIONS`).

Both are source-exported workspace packages (`exports: "./src/index.ts"`) — the rewrite can keep importing them unchanged.

## 8. localStorage / sessionStorage keys

| key                       | store          | writer/reader                                                                                             | purpose                                                         |
| ------------------------- | -------------- | --------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `token`                   | localStorage   | `lib/api/index.ts`                                                                                        | auth bearer token; cleared automatically on `badToken` response |
| `theme`                   | localStorage   | `lib/components/theme-toggle.svelte` (+ inline `<svelte:head>` bootstrap script)                          | `'dark'                                                         | 'light'`; falls back to `prefers-color-scheme`; drives `data-theme`attr on`<html>`; bootstrap script also _writes_ the resolved theme |
| `rctf:scores:preferences` | localStorage   | `routes/scores/scores-page-preferences.ts`                                                                | JSON `{viewMode:'challenges'                                    | 'categories', sortMode:'categories'                                                                                                   | 'solves', showTop3Context:bool, showSelfContext:bool}`; validated on read, merged on write, try/catch-guarded |
| `ctftimeToken`            | sessionStorage | write: `(auth)/login` (CTFtime OAuth callback when account doesn't exist); read+remove: `(auth)/register` | carries CTFtime token across the login→register redirect        |
| `ctftimeName`             | sessionStorage | same as above                                                                                             | pre-fills team name on register from CTFtime profile            |

All five keys are behavioral contract for the rewrite (existing deployments have tokens/prefs stored under these names).
