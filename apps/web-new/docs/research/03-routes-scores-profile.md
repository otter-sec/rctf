# rCTF Web Frontend — Scores & Profile Routes: Behavior/Requirements Report

Source: `apps/web/src/routes/scores/*` (23 files), `apps/web/src/routes/profile/*` (17 files), plus `$lib/query/{leaderboard,user,profile,config}.ts`, `$lib/constants/scores.ts`, `packages/types/src/routes/**`.

---

## 1. Scoreboard (`/scores`)

### 1.1 Data model

- Infinite query `useInfiniteLeaderboardWithGraph` — page size **100** (`LEADERBOARD_PAGE_SIZE`), params `{limit, offset, division?, search?}`. Each page returns `{leaderboard: ScoreEntry[], graph: ScoreGraphEntry[], total}`; pages are flat-mapped client-side. `getNextPageParam = offset + page.length` until `total`.
- `ScoreEntry`: `{id, name, avatarUrl, countryCode, statusText, score, solves: {id, solveTime}[], dynamicScores: {id, points, pointDelta}[], globalPlace, division, divisionPlace}`.
- Separate `useLeaderboardChallenges` query → `Record<challengeId, {name, category, points, solves, scoringKind: 'decay'|'dynamic', firstSolvers?: {id}[]}>`. Sanity-category challenges are filtered out of the board.
- `useCurrentUser` (self team) and `useClientConfig` (divisions map, ctfName, start/end time).
- CTF-not-started: leaderboard query error `ApiError.isNotStarted` → render `<CtfNotStarted />` page state. Empty states: "No scores yet", "No teams found" (search), "No solves" (challenge-focused with no matches).
- `dataEpoch = max(dataUpdatedAt of leaderboard/challenges/user)` — used as a render/cache-invalidation key for the SVG strip cache.

### 1.2 Polling / refresh

- Leaderboard-with-graph, challenges, leaderboard-graph, self-graph queries: **`refetchInterval: 30s` + `refetchOnWindowFocus: true`**.
- Self user query: `staleTime` 5 min, `refetchInterval` 30s.
- No websockets; pure polling.

### 1.3 Table layout (two-pane, virtualized)

- **Left sticky column ("team cell")** per row: rank delta indicator (▲/▼ rank change vs 2h ago, ≥80rem only), global rank `#N` (+ small division rank `#N` when >1 division), avatar (image with initials fallback + onerror reset when row is recycled), team name (link → `/profile/{id}`), country flag image + `·` + statusText, total score `N pts` + `N solves` (dynamic-scoring challenges excluded from solve count), and a **sparkline** (last **12h** score history, hand-rolled monotone-cubic SVG path with horizontal fade gradient; hover on sparkline highlights that team's line in the big graph; visible ≥80rem).
- Rank styling variants: `first/second/third` (gold/silver/bronze glow gradient), `self` (accent), `nth` (default). Current-user row gets a distinct background.
- **Right scrollable column ("content cell", desktop ≥48rem only)** — one cell per challenge (or per category in categories view). Rendered as a **single cached `<svg>` strip per row** (not DOM cells) for performance: solved = green circle, unsolved = dashed circle, blood 1st/2nd/3rd = gold/silver/bronze medal icons, dynamic-scoring challenge = wider cell (76px vs 48px) showing live points + pointDelta (▲/▼ colored). Category view cell: full-clear check icon / partial progress ring (percent) / dashed empty / dash when category is all-dynamic. Alternating column/group background stripes. Strip SVGs cached in a module-level LRU (512 entries), invalidated on theme change (`data-theme` MutationObserver → `themeRenderEpoch`) and on data epoch change.
- Cell hover tooltips computed by **hit-testing mouse position against cell geometry** (circle radius / dynamic hit box), not per-cell DOM: challenge tooltip = name, pts, Solved/Unsolved/First-Second-Third blood!, local solve time; dynamic tooltip = current pts + last update delta; category tooltip = "X / Y solved" or "Dynamic scoring". Tooltip suppressed during scrolling.
- **Header row** (sticky, desktop): 45°-rotated challenge name labels (clickable buttons → focus challenge; dynamic challenges not clickable), points badge per challenge (or `n/a` for dynamic), category blocks with icon + name, category tooltips with `N challenges · N pts (+ N dynamic)` subtitles. Header horizontal scroll is synced to body scrollLeft. Mobile: header hidden; graph shown in its own panel above list.
- **Virtualization**: `@tanstack/svelte-virtual` via custom `useInfiniteVirtualScroll` wrapper — fixed row height 68px (64 + 4 gap), overscan 10, `onLoadMore` fetches next page, scroll-margin equals measured header height. Loading state renders 10 skeleton rows; rows beyond loaded entries render loading skeletons.
- **Scroll edge fades** on all 4 edges (top/bottom/left/right + variants around self row and header), driven by scroll metrics + ResizeObserver/rAF refresh.

### 1.4 Self-row pinning

- If logged-in user's row is not fully visible in the viewport (and no active search), a **sticky self row** is pinned to bottom (or top when user's rank is above the viewport), duplicating the full row (team cell + solve strip). Position decided from virtualizer item geometry (`userClippedTop` etc.). Row shown even during loading if user is known.

### 1.5 Score graph (top of page / left header panel)

- **layerchart (svg)** `ChartCore + Axis + Spline + Highlight + Tooltip` over flattened `{teamId, teamName, time, score, color…}` points. X domain = `[ctf startTime, max point time]`; x-axis has exactly **6 divisions** (`X_AXIS_DIVISIONS`), labels formatted as relative hours (`+Nh`) or hours:minutes when range < 7h; y from 0, `yNice`. Tooltip (quadtree mode): relative time + local time, team swatch/name/score.
- **Which teams are drawn** = teams visible in the viewport rows (min→max visible rank, capped at `PAGE_SIZE`=15 window), plus optional context:
  - **"Pin top 3" toggle** (`showTop3Context`, default on): always include ranks 1–3; if outside viewport they render as context (0.3 opacity; medal colors when off current page — fetched via cached first-page `useLeaderboardWithGraph({limit:15, offset:0})`).
  - **"Pin self" toggle** (`showSelfContext`, default on): always include self line (3px stroke, self color); if self not in loaded page, fetch own graph point via `GET /v2/leaderboard/graph?limit=1&offset=globalPlace-1` (`useSelfUserGraph`).
  - Both toggles persist to localStorage; controls fade in on graph hover.
- Graph team set is **frozen while scrolling** (`isScrolling`) to avoid flicker; updates on settle.
- Line colors: rank-based palette (10 named rank colors), self color, hashed fallback (via `getRankColorForPosition`).
- Hover interactions: hovering a row sparkline or a solve-cell tooltip highlights that team's line and dims others (0.15 opacity); hovering a solved cell also draws crosshair dashed lines + dot at that solve's (time, score) on the graph (`solveHighlight`).
- Rank delta (row indicator): computed client-side by re-ranking all teams' scores now vs **2h ago** (`DELTA_WINDOW`) from graph data; disabled during search.

### 1.6 Toolbar

- **View toggle**: `challenges` (one cell per challenge) | `categories` (one aggregate cell per category).
- **Sort toggle** (challenges view only): `categories` (grouped by category order, then points desc) | `solves` (difficulty: ascending solve count).
- **Division filter dropdown** (only when >1 division in clientConfig): "All divisions" or specific division; passed as query param to API (server-side filter). Invalid division param in URL is ignored.
- **Search box** (mobile full-width + desktop compact): min 2 chars, **400ms debounce**, server-side search param; spinner while fetching; clear button; **Ctrl/Cmd+F** focuses it (preventDefault on browser find). Search disables self-row pinning and rank deltas; ranks shown are search-result-relative.
- **Loaded/total count** (`123 / 4,567`, ≥80rem).
- **Screenshot button** → export modal (below).
- **Focused-challenge chip** ("Filtering by <challenge>", link to `/challenges?challenge=id`, X to clear).
- Toolbar buttons form a roving-focus `role="toolbar"` with arrow-key navigation; tooltips on all icon buttons.

### 1.7 Challenge focus mode

- Clicking a (non-dynamic) challenge header filters rows to teams that solved it, **sorted by solve time** (blood order); ranks displayed are the teams' original global ranks; other columns dim (0.25). Requires **all pages loaded** — an effect chain-fetches every leaderboard page while focus is active (known FIXME). Focusing scrolls list to top; focusing a dynamic challenge is auto-cleared. Infinite-load disabled while focused.

### 1.8 URL state & preferences

- Query params: `?view=categories`, `?sort=solves`, `?division=<id>`, `?search=<q>`, `?challenge=<id>`. Defaults omitted from URL. Navigation uses `replaceState + keepFocus + noScroll`; search commits via `history.replaceState` directly. Changing view/sort clears `challenge`.
- localStorage `rctf:scores:preferences`: `{viewMode, sortMode, showTop3Context, showSelfContext}` (validated on parse). URL param wins over saved pref; saved pref applies only before first in-session interaction.

### 1.9 Screenshot export modal

- Dialog with live preview + controls: teams in list (3/5/10/20), teams in graph (3/5/10/20), subtitle text, toggles for header/graph/avatars/flags/statuses/solve count/sparklines/category matrix/"show your team", "emphasize listed teams", "emphasize self only" (mutual dependency rules with tooltips on disabled states). Export via **`modern-screenshot`** (dynamic import) at 1x/2x/3x as PNG/JPEG/WebP; download named `leaderboard-YYYY-MM-DD.ext`; toasts for success/failure.
- Preview renders: CTF logo wordmark (clientConfig `logoDarkUrl` fallback bundled asset), CTF name + date range + duration (`date-fns` format/formatDuration/intervalToDuration), reused `ScoresGraph` (context greyed per emphasis options), team rows (rank variant colors, avatar, flag, status, score, solve count, sparkline), per-team **category matrix** (check/progress-ring/dashed circle per category), self row appended after a "My team" separator if outside top N, "Powered by rCTF" footer, checkerboard backdrop.

---

## 2. Own profile (`/profile`)

Auth-gated: if no user → "You need to be logged in" card + Login button. Title: `Profile | {ctfName}`.

**Layout**: mobile/tablet = single column with 3 tabs (Challenges / Analytics / Settings); desktop (≥lg) = two panes — left pane: ProfileHeader + tabs (Challenges | Analytics), right pane: Settings (always visible). Panels use ScrollArea with edge fades. Currently styled with Tailwind utility classes (unlike scores/, which is already scoped-CSS custom elements).

### 2.1 Header (shared with public profile)

Avatar (image or initials fallback, re-keyed on avatarUrl change), team name, key–value grid: Division label (from clientConfig.divisions), Country (flag img + full region name via `ALL_REGIONS`, "(unspecified)" fallback), Status ("(unspecified)" fallback), CTFtime link (`https://ctftime.org/team/{ctftimeId}`, external) when linked. Right side: `#N global` / `#N division` ranks (hidden when null).

### 2.2 Challenges tab (`ProfileSolves`, shared component)

- Merges all leaderboard challenges with user's solves (shows unsolved too when challenge list is available; falls back to solves-only otherwise). Dynamic-scoring challenges shown with current dynamic points, never "solved".
- Header stats: `pointsEarned` (static solved + dynamic current) `/ pointsTotal` (only when no dynamic challs), `solved / total` counts (static only).
- Controls: text search (name/category), hide-solved toggle, sort cycle **category → time (most recent first) → points (desc)**, collapse/expand-all accordion toggle (category mode only).
- Category mode: accordion per category (ordered by canonical category order, alphabetical fallback), sticky headers, per-category `solved / total` counts; rows sorted solved-first → solve count desc → name.
- Row: `catShort / name`, blood award icon (1st/2nd/3rd gradient + icon color) or green check, solve time as CTF-relative offset (`formatCtfOffset`) falling back to local datetime, points + `pts`.
- Optional injected actions (used by admin elsewhere, not on profile): `onRevoke`, `onViewSubmissions`, `revokingId`.

### 2.3 Analytics tab — see §3.3 (identical component; own profile passes self data with `splitDynamicScore` behavior identical).

### 2.4 Settings pane

Three (or four) sections:

1. **Avatar** (`ProfileSettingsAvatar` → `AvatarUpload` component): upload file / remove. Mutation `PATCH /v2/users/me/avatar` (multipart; empty body = remove). Success toast → invalidate `user.self`. Captcha notice for `ProtectedAction.AvatarUpload` when configured.
2. **Update profile** (`useApiForm(UpdateUserRouteV2)` → `PATCH /v2/users/me` body `{name?, division?, countryCode?, statusText?}`):
   - Team name (2–64 chars, required), Division select (only shown when `allowedDivisions` intersection with configured divisions has >1 option), Country via `FlagPicker`, Status (max 60 chars). Submit disabled until dirty (field-level diff vs current user). Per-field + form-level API validation errors. Toast + invalidate on success.
3. **Email**: `PUT /v2/users/me/auth/email` body `{email}` (captcha `ProtectedAction.SetEmail`). Response kinds: `goodEmailSet` (updated immediately) vs `goodVerifySent` (verification email flow). Client regex validation. **Remove email** = clearing field + submit → `DELETE /v1/users/me/auth/email`; only allowed when a CTFtime account is linked (must keep ≥1 auth method); button label switches "Update email"/"Remove email".
4. **CTFtime** (only when `clientConfig.ctftime` set): link via **OAuth popup** to `https://oauth.ctftime.org/authorize` (scope `team:read`, client_id from config, redirect `/integrations/ctftime/callback`, random 16-byte hex `state`); callback page posts `{kind:'ctftimeCallback', state, ctftimeCode}` via `postMessage`; then `POST /v1/integrations/ctftime/callback {ctftimeCode}` → `goodCtftimeToken` → `PUT /v1/users/me/auth/ctftime {ctftimeToken}`. Unlink: `DELETE /v1/users/me/auth/ctftime`, only allowed when email exists (otherwise hint text). Linked state shows team card + external link.
5. **Team members** (only when `clientConfig.userMembers`): `GET /v1/users/me/members` list rendered as a `TagInput` of emails; adding a tag → `POST /v1/users/me/members {email}`; removing a tag → `DELETE /v1/users/me/members/:id`. Client email regex validation; error resets input via key bump; count badge.

**Not present on profile**: no team-token display (teamToken exists in `GET /v2/users/me` response but its UI lives in the (auth) routes, `team-token-card.svelte`), no delete-account, no password (rCTF is passwordless).

---

## 3. Public profile (`/profile/[id]`)

- `+page.ts` load prefetches `userByIdQueryOptions(id)` (`GET /v2/users/:id`) through the layout's queryClient (SSR/navigation warm cache).
- States: user found → content; pending → spinner; error → "Profile not found" card (API error message) + "View leaderboard" button. Title `{name} | ctfName`.
- **Layout**: mobile = header + 2 tabs (Challenges | Analytics); desktop = two columns: left = header + solves list, right = analytics (always visible, min 520px).
- Shows the same `ProfileHeader` (no email/CTFtime edit; ctftimeId link shown if present) with global/division rank, and the same `ProfileSolves` (read-only) — includes **unsolved** challenges of the current board, blood badges, solve times.
- Score graph data: `useUserGraph(id, globalPlace)` — hack: `GET /v2/leaderboard/graph?limit=1&offset=globalPlace-1` and verifies `entry.id === userId` (returns null on mismatch, i.e. graph unavailable for unranked or stale-rank teams). `staleTime` 5 min, no polling.

### 3.3 Analytics section (`ProfileAnalytics`, shared by both profile pages)

Five stacked chart sections, all layerchart/svg (`ChartCore/Axis/Bars/Bar/Points/Spline/Highlight/Tooltip`), all tooltips custom-rendered, x time axes labeled relative to CTF start:

1. **Score over time** (`ProfileGraph`, h-176px): consumes `LeaderboardGraphEntry` (`points[{time,score}]`, optional `dynamicPoints`) + user solves + dynamicScores. Draws up to 3 lines: total sampled score (solid), static-only (total minus dynamic, solid thinner), dynamic component (dashed) — split only when `splitDynamicScore` and dynamic data exists. Overlays a **dot per solve** colored by category; solve tooltip = time (relative+local), `cat / challenge`, `before + points = after` arithmetic. Sample tooltip = dynamic/static/total breakdown. X domain clamped to `[startTime, min(endTime, maxTime)]`. Y left axis with compact-number ticks (e.g. `1.5k`). Empty → "No score graph data."
   Insight: score trajectory and which solves contributed when; dynamic vs static composition.
2. **Points by category** (`ProfileCategoryChart`, horizontal stacked bars, dynamic height 28px/row): per category — grey track = total available points; stacked segments = each solved challenge (per-solve hover with name + pts), hatched segments = dynamic points earned, muted segments = unsolved challenges (name + pts on hover); separators between segments; category-colored outline over earned width; **full-clear** = green check icon + green gradient. Detail line: `earned/total pts` (+ `N dynamic pts`). Segment hover uses layerchart's manual tooltip mode with pointer events per segment. Insight: category coverage and where remaining points are.
3. **Solve timeline** (`ProfileTimelineChart`, dot plot, dynamic height 26px/category-row): x = time over `activityDomain` (CTF start → last solve, bucket-aligned), y = category lanes; one dot per solve, same solve tooltip. Empty → "No solves yet." Insight: when each category was worked.
4. **Solve cadence** (`ProfileCadenceChart`, vertical bar histogram, h-176px): solves bucketed into ~8 adaptive buckets (bucket size chosen from 15min…2d ladder based on active duration; domain anchored at CTF start, extended past last solve); bar tooltip = `N solves` + bucket time range. Insight: activity bursts/pace.
5. **Difficulty profile** (`ProfileDifficultyChart`, horizontal bars, h-176px): fixed bins by challenge solve-count — `1 solve / 2-5 / 6-20 / 21-50 / 51+`; grey track = challenges available in bin, filled = user's solves in bin; tooltip = `x/y challenges` + points earned in bin. Insight: whether the team solves rare/hard vs common challenges.

Supporting data layer (`profile-analytics-data.ts`, pure functions ~650 LoC): category stats (handles deleted/hidden challenges by counting orphan solves into totals; dynamic scores fold into earned/total), point segments (solved → dynamic → unsolved ordering, each sorted by value), difficulty bins, cadence buckets, timeline running-score, category ordering via canonical `getCategoryOrder`. `profile-chart-utils.ts`: integer/uniform tick generation, compact number formatting, tick text-anchor.

---

## 4. API endpoints referenced

| Method | Path                                                      | Used by / purpose                                                                                                                   |
| ------ | --------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| GET    | `/v2/leaderboard/with-graph?limit&offset&division&search` | scoreboard infinite pages (rows + graph + total); also cached first page for top-3 context (limit 15, offset 0)                     |
| GET    | `/v2/leaderboard/now?limit&offset&division`               | `useLeaderboard` (options exist; not used by these routes directly)                                                                 |
| GET    | `/v2/leaderboard/graph?limit&offset&division`             | self graph (`limit=1&offset=globalPlace-1`), public-profile user graph (same trick), `useTopGraphData`                              |
| GET    | `/v2/leaderboard/challs`                                  | challenge metadata for board columns, profile solves list, analytics (30s poll)                                                     |
| GET    | `/v2/users/me`                                            | current user (score data incl. solves w/ createdAt+bloodIndex, dynamicScores, email, teamToken, allowedDivisions, perms) — 30s poll |
| GET    | `/v2/users/:id`                                           | public profile (name, division, score, ranks, solves, dynamicScores, avatar, country, status, ctftimeId)                            |
| PATCH  | `/v2/users/me`                                            | update name/division/countryCode/statusText                                                                                         |
| PATCH  | `/v2/users/me/avatar`                                     | upload/remove avatar (multipart, captcha-protected)                                                                                 |
| PUT    | `/v2/users/me/auth/email`                                 | set/change email (captcha-protected; may return verify-sent)                                                                        |
| DELETE | `/v1/users/me/auth/email`                                 | remove email                                                                                                                        |
| PUT    | `/v1/users/me/auth/ctftime`                               | link CTFtime (with ctftimeToken)                                                                                                    |
| DELETE | `/v1/users/me/auth/ctftime`                               | unlink CTFtime                                                                                                                      |
| POST   | `/v1/integrations/ctftime/callback`                       | exchange OAuth code → ctftimeToken                                                                                                  |
| GET    | `/v1/users/me/members`                                    | list team members                                                                                                                   |
| POST   | `/v1/users/me/members`                                    | add member `{email}`                                                                                                                |
| DELETE | `/v1/users/me/members/:id`                                | remove member                                                                                                                       |
| GET    | `/v2/integrations/client/config`                          | clientConfig: divisions, ctfName, startTime/endTime, emailEnabled, ctftime{clientId}, userMembers, logoDarkUrl, captcha config      |

External: `https://oauth.ctftime.org/authorize` (popup), `https://ctftime.org/team/{id}` (links), `/flags/{code}.svg` static assets.

---

## 5. Essential vs incidental complexity

**Essential (product requirements to preserve):**

- Infinite/virtualized leaderboard (events can have 10k+ teams; 100-per-page fetch, fixed-height virtual rows).
- 30s polling with focus refetch; live scoreboard feel.
- Division filter, server-side team search (debounced, min 2 chars), URL-shareable state (view/sort/division/search/challenge).
- Self-row pinning + self/top-3 graph pinning — core UX for "where am I".
- Solve matrix with blood medals, dynamic-scoring cells (points + delta), category aggregate view, challenge focus (blood-order) mode.
- Top-N score-over-time graph windowed to visible rows, with hover cross-highlighting.
- Profile: header/ranks, solves list (search/sort/hide-solved/accordion), settings mutations (profile, email, CTFtime OAuth, members, avatar) with dirty-checking, captcha notices, and auth-method invariants (can't remove last auth method).
- Public profile prefetch + not-found state.

**Incidental / implementation-specific (candidates to redesign or drop in rewrite):**

- **SVG-strip row rendering + module-level LRU cache + manual hit-testing + theme MutationObserver + CSS-var color resolution** (`scores-leaderboard-team-row-solve-cells.svelte`, ~750 lines) — a perf workaround for thousands of DOM cells; a rewrite must keep the perf outcome but can choose a different mechanism (canvas, content-visibility, etc.). The `renderEpoch/themeEpoch/paletteScope` keying is pure incidental complexity.
- **Scroll-fade choreography** (12 positioned fade elements + rAF/ResizeObserver refresher) — visual polish, high maintenance.
- **Graph-visibility freezing during scroll**, first-page cache reliance ("heavily relying on a fact that this will be cached"), self-graph fetch via `offset=globalPlace-1` (fragile rank-offset hack, silently nulls on mismatch — also used for public profile graphs). A dedicated `GET graph for team id` endpoint would remove a whole class of code.
- **Challenge-focus chain-fetching all pages** (marked FIXME) — needs a server-side filter param instead.
- **Screenshot export** (modal + preview + `modern-screenshot` dep + emphasis option matrix, ~1350 lines) — nice-to-have, fully separable feature; keep as lazy-loaded island or defer.
- **Profile analytics** (5 charts + ~650-line data layer): "Score over time" is arguably core; category/timeline/cadence/difficulty charts are nice-to-have insight features. All are read-only derivations of `solves + challs + graph` — cleanly separable module.
- **Charting deps**: layerchart(svg)+d3-array used in 7 components (scores graph, profile graph, category/timeline/cadence/difficulty charts, screenshot preview via ScoresGraph). Usage is shallow — `ChartCore/Axis/Bars/Bar/Spline/Points/Highlight/Tooltip` with heavy custom SVG inside snippets (category chart hand-draws segments/clips/hatch patterns; profile graph hand-builds line paths; custom tick generation everywhere because layerchart defaults were insufficient). The row sparkline already dropped layerchart ("too heavy") for a hand-rolled path. A rewrite could plausibly replace layerchart with a small hand-rolled scale+path layer (d3-scale or manual), since axes/tooltips/quadtree hover are the only real value consumed; tooltip quadtree/band modes are the hardest part to replicate.
- Tailwind/shadcn usage: `profile/*` is still fully Tailwind-class based (plus `cn`, Card/Tabs/Accordion/Select/Field/TagInput/Tooltip/Dialog/ScrollArea from shadcn-style lib, `bits-ui mergeProps` in scores toolbar/header, `svelte-sonner` toasts); `scores/*` is already migrated to custom-element scoped CSS with CSS vars (`--spacing`, `--background-l*`, category vars) — the scores styling approach is the template the rewrite extends.
- localStorage preference plumbing (`hasInteracted` URL-vs-pref precedence dance) — keep the feature, simplify the resolution rule.
- Duplicate `isDynamicChallenge`/category-stat logic exists in both `scores-leaderboard-data-transforms.ts` and `profile-analytics-data.ts` — consolidate.
