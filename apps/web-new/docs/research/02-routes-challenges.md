# rCTF Challenges Page — Behavior & Requirements Report

Source: `apps/web/src/routes/challenges/*` (23 files) + supporting `$lib` modules. All paths relative to `/Users/enscribe/Repositories/jktrn/rctf-new/apps/web/src/`.

## 1. Page shell & top-level states (`+page.svelte`, `+page.ts`, `challenges.svelte`)

- `+page.ts` load: prefetches `challengesQueryOptions` via TanStack Query client from parent layout (SSR-friendly prefetch; queries otherwise `enabled: browser` only).
- `<title>` = `Challenges | {clientConfig.ctfName}`.
- Render branches in order:
  1. `challenges` data present → main `<Challenges/>` component.
  2. `isPending` → centered spinner.
  3. Error kind `badNotStarted` (`ApiError.isNotStarted`) → `<CtfNotStarted/>` full-page component.
  4. Any other error → card with `error.message` + a "Login" button if `!isAuthenticated()` (auth = `localStorage.token` present).
- Zero challenges (started, empty array) → full-height empty state "No challenges yet / Check back soon for challenges!".

### Master-detail layout

- Desktop (`innerWidth >= 768`, tailwind `md:`): horizontal **resizable two-pane split** (paneforge-style `Resizable.PaneGroup`): list pane defaultSize 40 / minSize 40 (20 when `innerWidth >= 1280`) / maxSize 50; detail pane defaultSize 60 / minSize 40; draggable handle with grip.
- Mobile (<768px): list fills screen; selecting a challenge opens the detail in a full-height **Drawer** (bottom sheet, `bind:open`). Height everywhere is `calc(100dvh - 72px)` (72px = nav).
- Transition mobile→desktop closes drawer; desktop→mobile with a selection open re-opens drawer. Tracked via `wasMobile` state + `svelte:window bind:innerWidth`.
- Detail pane with no selection → empty state "Select a challenge / Choose a challenge from the list to view details".

### Solved-state derivation

- `solvedIds` = union of `userSelf.solves[].id` (server) + `localSolvedIds` (optimistic, added on successful submit before server refetch).
- `bloodIds` = three Sets from `userSelf.solves[].bloodIndex` (0/1/2 = first/second/third solve of that challenge by anyone; index is the user's own blood position).
- `handleSolve(challengeId)`: add to local set, then **after 500ms delay** (`FIXME` comment: gives server leaderboard worker time to update cache) → `refetchQueries(challenges)`, `refetchQueries(userSelf)`, `invalidateQueries(fullLeaderboard)`.

## 2. List pane (`challenges-list.svelte`, `-header`, `-item`)

- **Header stats** (computed over ALL challenges, unfiltered): `pointsEarned / pointsTotal pts` (sum of `points ?? 0` of solved / all) and `solved / total` count. `toLocaleString()` formatting, tabular-nums.
- **Search input**: plain controlled text input, no debounce. Case-insensitive substring match against `name`, `category`, `author`.
- **Hide-solved toggle**: icon button with tooltip ("Hide solved"/"Show solved"), filters out solvedIds; active state styled accent.
- **Collapse/expand-all toggle**: single button; if any category open → collapse all, else expand all. Tooltip label flips.
- **Grouping**: challenges grouped by `category` into an **accordion** (`type="multiple"`, one item per category, all open by default on first load; while a search query is active all groups are forced open). Category header is sticky (`sticky top-0`) while scrolling, shows category icon + display name + `solvedInCategory / total` counter, chevron.
- **Category ordering**: fixed priority list (`lib/utils/categories.ts`): `koth, sanity, pwn, reverse, crypto, forensics, blockchain, web, misc, ppc, osint`; unknown categories sort last alphabetically. Aliases: `binary→pwn`, `rev→reverse`, `cryptography→crypto`. Each known category has display name (e.g. `pwn` → "Binary Exploitation"), icon, and a color token; unknown → flag icon, gray, name = lowercased key. Colors applied via CSS custom-property indirection: `getCategoryStyle(color)` sets `--category-foreground-l0/l1`, `--category-background-l0/l1/l1-hover` from theme vars — components use `category-*` tokens.
- **Within-category sort**: by `solves` desc, tie-break `name.localeCompare`. (Note: `sortWeight` field exists in API but is **unused** by the UI.)
- **List item** (button, `id="chall-{id}"` for scroll-into-view):
  - Shows `category / name` (category prefix hidden on narrow containers), author line.
  - Right side (only when `hasFlag || scoringKind === 'dynamic'`): points (`yourScore ?? 0` for dynamic; else `points`) + either dynamic point-delta component or "N solve(s)" text.
  - Solved indicator: green check icon + green left gradient; blood solves (bloodIndex 0/1/2) instead get gold/silver/bronze award icon + tinted gradient.
  - Selected state: inset ring + right-edge gradient.
- **Empty filter result**: empty state with context-sensitive subtitle (search only / hideSolved only / both / none).
- List and detail both use a custom `ScrollArea` with edge fade masks (`fadeSize`, `fadeColor`).

## 3. Detail pane (`challenges-details.svelte`, `-header`)

- Wrapped in `{#key challenge.id}` — full remount per challenge (resets tab, forms, sub-queries' local state).
- **Header**: name, "by {author}", category chip (icon + name, category colors), extra `tags[]` as plain chips. Right side (when `hasFlag || dynamic`): big points value; below it dynamic delta OR "N solves".
- **Tabs**: `details` always; `solves ({count})` only when `challenge.hasFlag`; `scores ({count})` only when `!hasFlag && scoringKind === 'dynamic'` (king-of-the-hill style). Guard: if current tab becomes invalid for the selected challenge, falls back to `details`.
- **Footer** (below tab body): when `hasFlag`: podium (only on details tab) + flag submit bar (always). When dynamic and on details tab: dynamic podium only (no submit bar).

## 4. Details/overview tab (`challenges-details-overview.svelte`)

- **Description**: markdown-rendered (see §10), in a bordered "Description" box.
- **Files** (if `files.length > 0`): bordered "Files" box, max-h scroll list; each file = link (`target=_blank`, `noopener noreferrer`) with file icon, name, `formatFileSize(size)` (B/KB/MB/GB/TB, 1024-based, 1 decimal <10, "Unknown size" for null/negative). If >1 file: "Download all" button — programmatically creates+clicks an `<a download target=_blank>` per file.
- **Instancer** box if `challenge.instancerLifetime` non-null (§8).
- **Admin bot** box if `challenge.adminBotInputs` non-null (§9). Boxes lay out in a 1/2-col responsive grid (container queries).

## 5. Flag submission (`challenges-details-submit.svelte`)

State ladder (first match wins):

1. `clientConfig.isArchived` → static bar "The CTF is archived."
2. `now > clientConfig.endTime` (client clock ticked every 1s) → "The CTF has ended."
3. `!isAuthenticated()` → "Login to submit" button → `/login`.
4. Solved (`isSolved`) → green "Challenge solved!" bar; submit button disabled.
5. Otherwise: monospace text input, placeholder = `clientConfig.flagFormatPlaceholder ?? 'flag{...}'`, `autocomplete/autocorrect/spellcheck` off + icon submit button (spinner while submitting).

Submission via generic `useApiForm(SubmitFlagRoute)`:

- Client-side: trims flag; empty → no-op. Zod body validation (max length 1024).
- `POST /api/v1/challs/:id/submit` `{flag}`.
- `goodFlag` → toast "Flag correct!", `onSolve(id)` (optimistic + refetches, §1), clear input.
- `badAlreadySolvedChallenge` → toast info "You already solved this challenge", `onSolve(id)`.
- Other errors → `showApiError`: generic error toast, except `badRateLimit` which reads `data.timeLeft` (ms) → toast "Try again in N second(s)". **Rate limiting is server-side only**; no client throttle. No captcha on flag submit.
- `aria-invalid` on input when form-level error.

## 6. Solves tab (`challenges-details-solves.svelte`, `-solves-self`, `-row`)

- Infinite query, page size 100: `GET /api/v2/challs/:id/solves?limit=100&offset=N`; next page while `offset+len < challenge.solves` (total from the challenge object). No refetch interval.
- **Virtualized list** (custom `useInfiniteVirtualScroll`, rowHeight 68px, overscan 10, load-more triggered at 70% scroll depth; +1 phantom row while `hasNextPage`).
- Rows show: rank `#N`, avatar (fallback = initials), name → link to `/profile/{userId}`, country flag image (`/flags/{emoji-codepoint}.svg` via `countryCodeToFlagFilename`) with country-name tooltip, `#G global`, `#D {division}` (division column hidden if config has ≤1 division), right side: primary = solve time, secondary = local time `MMM d, h:mm a`.
- **Time semantics**: rank 1 shows time since CTF start (`formatTime` "2d, 3h, 4m" style); all others show `+delta` relative to first blood.
- **Rank styling**: rank 1/2/3 = gold/silver/bronze background + gradients; current user's row = "self" background even at other ranks (`getRankVariant`).
- **Pinned self row**: if the current user solved the challenge but their row is scrolled out of the virtual viewport, an absolutely-positioned copy of their row pins to top or bottom (whichever side it's off), with the scroll fade offset adjusted so it doesn't fade under the pin. Pinned row fetches `GET .../solves?limit=10&offset=0` separately to get `mySolvePosition` + first-blood time.
- Empty (`solves === 0`): "No solves yet / Be the first to solve this challenge!". Query error → toast.

## 7. Scores tab — dynamic/KotH challenges (`challenges-details-scores.svelte`, `-scores-self`, graph files)

- Infinite query, page 100: `GET /api/v2/challs/:id/scores?limit&offset`, `refetchInterval` 30s (per-page single-query variant), infinite variant has `staleTime` 30s + `keepPreviousData`. Response: `{total, myPosition, scores[], graph[]}` — graph entries dedup'd by team id across pages.
- Virtualized ranked list identical to solves rows, but right side = `points pts` + point-delta component; plus **rank delta** chevron under the rank number, computed client-side: re-rank all loaded teams by `points - pointDelta` (previous points) and diff vs current index.
- **Pinned self row** same mechanism; self points/delta come from `challenge.yourScore`/`yourPointDelta`; position from a `limit:1` scores query.
- **Score graph** (layerchart SVG, 176px tall, above the list):
  - Multi-team line chart (Spline per team) of cumulative score vs time; x-domain `[ctf startTime, max(maxTime, startTime)]`, y from 0, `yNice`.
  - X axis: exactly 7 evenly-spaced ticks (X_AXIS_DIVISIONS=6), labels `+Nh` or `+Nh Mm` (minutes format when span < 7h), first/last tick anchored start/end.
  - **Visible teams = teams whose rows are in the virtual scroll viewport** (fallback: top 10 before metrics exist), plus optional pinned context: top-3 (dimmed 0.3 opacity when off-screen) and self. Visibility is frozen while scrolling (`stableVisibility` updates only when not scrolling) to avoid churn.
  - Hover controls (appear on graph hover/focus): two toggle buttons "Pin top 3 to graph" (pin icon) and "Pin self to graph" (smiley icon), local state, default on.
  - Team colors: self = `--foreground-self-l0`; ranks 1-3 = medal colors; other ranks cycle 10 `--foreground-first..tenth` vars; unknown → stable hash-of-id color. Self line strokeWidth 3 vs 2. `hoveredTeamId` prop supports dimming (only used elsewhere).
  - Tooltip (quadtree hit-testing): relative time + local time, color swatch, team name, `N pts`.
- Empty (`total === 0`): "No scores yet / Scores appear here once the scoring feed publishes them."

## 8. Podium (`challenges-details-podium.svelte`, `-podium-dynamic`, `-podium-grid`)

- Flag challenges: from `GET .../solves?limit=10&offset=0` take top 4. Grid of 4 slots: 1st/2nd/3rd (ordinal labels via `getTimeOrdinal`) + 4th slot logic:
  - If current user in top 3 or logged out → show 4th solver (or empty dashed slot).
  - Else if user solved → self slot with their ordinal + `+delta` vs first blood.
  - Else → placeholder slot "You / {name} / Unsolved" (dashed border).
  - Details: slot 1 = time from CTF start; slots 2-4 = `+delta` from first blood.
- Dynamic challenges: same grid from `GET .../scores?limit=4&offset=0`; detail = `N pts`; self fallback uses `myPosition` + `challenge.yourScore`; placeholder "No score".
- Responsive: container queries progressively hide non-self slots (4→3→2→1 columns), hiding order prefers keeping the self slot visible.
- Slots colored by rank variant (gold/silver/bronze/self/nth backgrounds); avatar with initials fallback.

## 9. Instancer (`challenges-details-overview-instancer.svelte`)

Shown when `challenge.instancerLifetime != null`. Props from challenge: `instancerLifetime` (ms), `instancerExtendable`, `instancerStoppable`, `instancerActions[] {id,label}`.

- **States**: archived → "Instancer is not available in archived mode."; unauthenticated → login prompt; loading spinner; error string + Retry button; `stopped` → "No instance running." + Start button; else running view.
- **Running view**: status line for `starting`/`stopping` (spinner) or `errored`; endpoint cards (label = `title` ?? "Endpoint"/"Endpoint N", right side shows protocol tag except RAW); formatted values: HTTP(S) URLs (port elided when 80/443), TCP → `nc host port`, TCP_SSL → `ncat --ssl host port`, RAW → server-provided `text`; copy-to-clipboard button per endpoint (toast success/fail); endpoints dimmed + copy hidden while starting/stopping.
- **Countdown**: `Progress` bar `value=timeLeft max=instanceLifetime` + `M:SS remaining`; timeLeft decremented locally every 1s while running/starting.
- **Buttons row**: each custom action (`RunInstanceActionRouteV2`), Extend (if extendable), Stop (destructive, if stoppable); all disabled while any action in flight or status stopping.
- **Instancer actions can return a flag**: `goodInstancerActionResult {message?, submitFlag?}` → toast message; if `submitFlag`, shows the flag in a 15s toast then auto-submits via `SubmitFlagRoute` and triggers the same solved-state refetch trio.
- **Polling**: `fetchStatus` on mount; then while status ≠ stopped, poll every **2s** if starting/stopping, else **10s** (running/errored).
- **Captcha**: create + extend routes have `captchaAction` (`instancerStart`/`instancerExtend`); the generic `apiRequest` layer transparently runs invisible captcha (see §11) and injects `captchaCode` into body. `CaptchaNotice` legal text shown beneath Start and running view.

## 10. Admin bot (`challenges-details-overview-adminbot.svelte`)

Shown when `challenge.adminBotInputs != null` (record: inputName → `{pattern, flags?}` regex rule).

- Unauthenticated → login prompt. Initial load: fetch current job status; loading spinner.
- **Inputs form**: one text input per key; placeholder = the regex pattern; validation on blur + re-validate on input after first error: required + must match `new RegExp(pattern, flags)` (invalid server regex silently skips). Inline field errors. Submit disabled while submitting or a job is active (queued/running).
- **Submit**: `POST .../admin-bot {inputs}` (captcha action `adminBotSubmit`). `goodAdminBotJobSubmitted` → toast, optimistic job = QUEUED, immediate status refetch (gets real queuePosition). `badAdminBotConfig`/`badInstancerState` → error toast with `data.error`. Rate-limited server-side (`badRateLimit` in route).
- **Job status card**: queued (`(position N)` if present) / running (spinner) / completed / failed; **poll status every 3s while queued/running** (each status fetch also refreshes history).
- **Logs**: job `logs` is JSONL; each line parsed as `{time, level(info|warn|error|fatal), prefix, line, extra{}}`; collapsible log viewer with per-line expandable `extra` key-values, level letter colored, HH:MM:SS timestamps, "Download logs" button (blob download `admin-bot-{jobId}.jsonl`).
- **History**: "Previous jobs (N)" collapsible list (excludes current job); each row: status icon, date, status text; if `hasLogs`, clicking lazily fetches `GET .../admin-bot/jobs/:jobId/logs` and toggles an inline log viewer (guards against stale in-flight responses on rapid switching).
- **Download config** button: `GET .../admin-bot/config` → blob-download `bot{.ext}` with the bot source code.
- `CaptchaNotice` under submit.

## 11. Cross-cutting mechanisms

### Markdown (`lib/components/markdown.svelte`, `lib/utils/markdown.ts`)

- `marked` + `DOMPurify.sanitize` (allows `data-alert/-type/-content/-timer` attrs). Rendered via `{@html}` into `.prose` container.
- Custom block extension: GitHub-style alerts `> [!NOTE|TIP|IMPORTANT|WARNING|CAUTION|CONNECTION]` → mounted as Svelte components post-render (manual `mount()` hydration of `[data-alert]` placeholders, re-hydrated on content change via microtask). Regular alerts = colored left-border with icon + label + nested-markdown body. **CONNECTION** is special: bordered box with copy button; content trimmed of backticks; auto-links if `https?://`.
- Custom inline extension: `<timer/>` → live CTF countdown component (starts-in/ends-in D:HH:MM:SS, "The CTF is over.", archived variant), ticks 1s. Uses cached client config (module-level, set by config query).
- Workaround regex inserts blank lines after closing block-level HTML tags so marked doesn't swallow following markdown.

### Captcha (`lib/utils/captcha.ts`, `captcha-notice.svelte`)

- Config-driven: `clientConfig.captcha {provider, publicOptions.siteKey, protectedEndpoints{action:bool}}`. Providers: `captcha/recaptcha`, `captcha/hcaptcha`, `captcha/turnstile` — each lazily script-loaded once, rendered invisible in hidden div, executed on demand; token injected as `captchaCode` body field by `apiRequest` for routes declaring `captchaAction`. Errors → `CaptchaError` toast. `CaptchaNotice` renders the provider-specific ToS/privacy legal line only when that action is protected.

### API layer (`lib/api/index.ts`)

- All calls: `fetch` to `/api/{route.path}`, `Authorization: Bearer {localStorage.token}`, JSON (or FormData) body, `cache: no-store`. Responses are discriminated envelopes `{kind, message, data}` validated against per-route zod response schemas; unknown kind throws. `badToken` response auto-clears stored token. `useApiForm` provides zod field validation, `_form` error, submitting flag.

### Query/polling summary (TanStack Query; global defaults staleTime 60s, no retry on ApiError, retry<3 otherwise)

| Query                                        | Endpoint                                     | Polling                                                                  |
| -------------------------------------------- | -------------------------------------------- | ------------------------------------------------------------------------ |
| challenges                                   | `GET /api/v2/challs`                         | refetchInterval **30s**                                                  |
| userSelf                                     | `GET /api/v2/users/me`                       | refetchInterval **30s**, staleTime 5m; returns null when unauthenticated |
| clientConfig                                 | `GET /api/v2/integrations/client/config`     | staleTime Infinity                                                       |
| challengeSolves (podium/self: limit 10 or 1) | `GET /api/v2/challs/:id/solves?limit&offset` | none                                                                     |
| infinite solves (pages of 100)               | same                                         | none                                                                     |
| challengeScores (podium/self: limit 4 or 1)  | `GET /api/v2/challs/:id/scores?limit&offset` | refetchInterval **30s**                                                  |
| infinite scores (pages of 100)               | same                                         | staleTime 30s, keepPreviousData                                          |

Imperative (non-query) calls: flag submit `POST /api/v1/challs/:id/submit`; instance `GET/PUT/DELETE/PATCH /api/v2/integrations/challs/:id/instance` (status/create/stop/extend), `POST .../instance/actions/:action`; admin bot `GET .../admin-bot/config`, `GET .../admin-bot/status` (poll 3s while active), `GET .../admin-bot/history`, `GET .../admin-bot/jobs/:jobId/logs`, `POST .../admin-bot`. Instance status poll: 2s starting/stopping, 10s running/errored, none stopped. Local 1s tickers: instance countdown, CTF-ended check in submit bar, markdown `<timer>`.

## 12. URL / deep-link state

- **Single query param**: `?challenge={id}` on `/challenges`.
  - Write: on selection, `url.searchParams.set('challenge', id)` + `history.replaceState` (no SvelteKit navigation, no history entries, no back-button traversal of selections).
  - Read: once, after challenges load (`hasInitializedFromUrl` latch): if id exists in list → select it and `scrollIntoView({behavior:'instant', block:'center'})` on `#chall-{id}` after `tick()`. Invalid id silently ignored. On mobile the initial deep-link does NOT auto-open the drawer (drawer only opens via explicit select or desktop→mobile transition with selection).
- NOT in URL (session-local only): active tab, search text, hide-solved, accordion open/closed, graph pin toggles, pane sizes.

## 13. Data model fields the UI depends on

`Challenge` (from `GET /v2/challs`): `id, name, description(markdown), category, author, files[{name,url,size|null}], points, solves, sortWeight(unused), tags[]|null, instancerLifetime|null, instancerExtendable, instancerStoppable, instancerActions[{id,label}], adminBotInputs|null (record name→{pattern,flags?}), hasFlag, scoringKind?('decay'|'dynamic'), yourScore?, yourPointDelta?`. UI defensively treats `points`/`solves` as nullable although the v2 schema says int.
`ClientConfig` fields used here: `ctfName, startTime, endTime, isArchived, flagFormatPlaceholder, divisions (record; division UI hidden when ≤1), captcha`. `ProtectedAction`: `instancerStart, instancerExtend, adminBotSubmit` (+register/recover/setEmail/avatarUpload elsewhere).
Solves rows: `{id, createdAt(ms), userId, userName, userAvatarUrl|null, userCountryCode|null, userStatusText|null(unused here), globalPlace, division, divisionPlace, bloodIndex|null}` + `mySolvePosition|null`.
Scores: `{total, myPosition|null, scores[{userId,userName,userAvatarUrl,userCountryCode,userStatusText,points,pointDelta,globalPlace,division,divisionPlace}], graph[{id,name,points[{time,score}]}]}`.
Enums: `InstanceStatus` stopped/running/starting/stopping/errored; `ExposeKind` tcp/tcp-ssl/http/https/raw; `AdminBotJobStatus` queued/running/completed/failed; `ChallengeScoringKind` decay/dynamic.
Note: `lib/components/flag-picker.svelte` is a **country picker** (combobox over `ALL_REGIONS`, "No country" option, flag SVGs from `/flags/`) — used by profile/registration, not challenges; challenges only reuse `countryCodeToFlagFilename` (regional-indicator codepoints → `1F1FA-1F1F8.svg`).

## 14. Complexity assessment for the rewrite

**Essential (keep):**

- Master-detail with mobile drawer fallback; `?challenge=` deep link with scroll-to + replaceState.
- Category grouping/ordering/aliasing + per-category color theming via CSS vars (the `--category-*` indirection is a clean pattern that survives the Tailwind removal as-is).
- Optimistic solve + delayed (500ms) refetch trio — compensates for a real server-side cache lag; keep until API fixes it (it's flagged `FIXME`).
- Static vs dynamic (`scoringKind`) branching everywhere: points display, delta chips, solves-vs-scores tab, both podium variants.
- Instancer state machine, adaptive polling (2s/10s), action-returned-flag auto-submit; admin-bot job lifecycle, 3s polling, regex input validation, JSONL log viewer.
- Invisible-captcha injection at the API layer keyed on route `captchaAction` (components stay captcha-unaware except the notice).
- Rate-limit toast with `data.timeLeft`; archived/ended/unauthenticated/solved submit-bar ladder; blood (first/second/third) indicators; pinned self-row concept (high UX value in both solves and scores lists).
- Markdown alerts + `<connection>` copy box + `<timer>` — CTF authors rely on these.

**Incidental (candidates to simplify or drop):**

- `useInfiniteVirtualScroll` + `virtualizer.svelte.ts` (~420 lines wrapping @tanstack/svelte-virtual with RAF polling for late elements, cached ResizeObservers, manual scroll-metrics plumbing). Most CTFs have hundreds of solves at most; consider plain infinite scroll with IntersectionObserver, or a much thinner virtualizer. The viewport-window → pinned-row + graph-visibility coupling is the hairiest code on the page.
- Graph "visible teams = rows in viewport" syncing with scroll-frozen `stableVisibility` — clever but fragile; a simpler "top N + pinned self/top3" rule loses little.
- Client-side rank-delta recomputation (re-sorting all loaded scores by `points - pointDelta`) is O(n log n) per render and only correct for loaded pages — either get it from the API or drop it.
- Duplicate small queries for pinned self rows (`limit:1` / `limit:10` offset:0 refetches of data already in the infinite query's first page) — derive from page 0 instead.
- Manual `mount()`/`unmount()` hydration of markdown placeholders with microtask re-hydration — brittle; in the rewrite consider rendering markdown to an AST and mapping nodes to Svelte components directly.
- The `Tabs.Content` `child` snippet destructuring that strips/reapplies `role`/`tabindex` is a bits-ui workaround — irrelevant once Zag.js tabs are used.
- Two fully duplicated layout trees (desktop panes vs mobile drawer) render `ChallengeList`/`ChallengeDetails` twice in the DOM; unify with one instance + conditional container.
- `downloadAll` (per-file synthetic anchor clicks) is popup-blocker-fragile; acceptable but worth revisiting (zip endpoint or sequential with delay).
- `challenge.points !== null` / `solves !== null` defensive nulls contradict the v2 schema — pick one truth in the rewrite.
- `sortWeight` is fetched but never used — implement or remove.
- Blood-gradient/rank-style class maps (`getRankStyles`, `getBloodStyles` returning Tailwind class strings) must be redesigned anyway for scoped CSS — fold into data-attribute + CSS variants.
