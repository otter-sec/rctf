# rCTF Admin Section — Behavior & Requirements Report

Source: `apps/web/src/routes/admin/**` (+ referenced libs: `$lib/query/admin.ts`, `$lib/query/challenges.ts`, `$lib/machines/index.ts`, `packages/types/src/routes/v2/admin.ts`, `.../v2/integrations.ts`).

## 0. Admin shell (`admin/+layout.svelte`)

- Gate: requires logged-in user AND `Permissions.challsRead` (bit `1<<0`). Otherwise renders an error card: "Admin access required" (→ `/login`) when logged out, "Access denied" (→ `/`) when lacking perms. No route-level redirect; children simply not rendered.
- Nav entry points (in global `navigation.svelte` "Admin menu" dropdown): `/admin/challenges`, `/admin/teams`, `/admin/submissions`, `/admin/settings`.
- Permission bits used across admin: `challsRead=1`, `challsWrite=2`, `challsSolveWrite=8`, `usersWrite=16`, `settingsWrite=32`. Per-feature gating is granular (see below), not just layout-level.
- All admin pages set `<title>… | {ctfName}</title>` from client config.

## 1. Admin challenges (`/admin/challenges`)

### Layout & navigation

- `+page.ts` prefetches `adminChallengesQueryOptions` via the shared queryClient; page shows spinner/error-card states.
- Desktop (≥768px): horizontal resizable two-pane split (list pane default 40%, min 20–40% depending on viewport <1280, max 50%; details pane default 60%, min 40%) with drag handle. Mobile: full-height list + bottom drawer for details. Drawer auto-opens when a challenge is selected or "create" starts on mobile; auto-closes when deselected or when leaving mobile widths.

### List pane (`admin-challenges-list*.svelte`)

- Header stats: total challenge count + distinct category count.
- Client-side text search over name, category, author (no server round-trip).
- Categories rendered as a multi-open accordion, grouped by category, sorted by configured category order (`getCategoryOrder`; unknown categories sort last alphabetically); challenges within a category sorted by name. Sticky category headers with per-category icon/color theme and entry count. Active search force-expands all groups.
- Collapse-all/expand-all toggle button; "New challenge" button shown only with `challsWrite`.
- List item shows: `categoryShort / name`, status icons (hidden eye-closed, dynamic-scoring chart, instancer cloud, admin-bot robot), points label (`max` or `min-max`, or the word "Dynamic" for dynamic scoring). Selected item highlighted. Empty states for "no challenges found" (search vs. never-created).

### Editor state machine (XState `editorMachine`, `$lib/machines/index.ts`)

States: `idle → viewing → editing / creating → saving / confirmDiscard / confirmDelete / deleting`. Key behaviors the rewrite must preserve:

- Selecting a challenge seeds form from list-row data immediately, then a detail fetch (`GET /v2/admin/challs/:id`, includes `flag` + full `description`) fires a `DETAIL_LOADED` that re-seeds form + originalForm (guarded so it applies once per id).
- Dirty tracking = JSON compare of form vs. originalForm (for create: any non-empty field). Any `SELECT`/`CREATE`/`CANCEL` while dirty routes through `confirmDiscard` ("Unsaved changes" dialog: Keep editing / Discard changes).
- Save error returns to `editing`; delete error returns to `editing`; delete success resets to `idle`.
- Default new-challenge form: pointsMin 50, pointsMax 500, tiebreakEligible true, decay scoring, hidden false, no files/tags/instancer/adminbot.

### Details header

- Title: name or "New Challenge"/"Untitled"; "by {author}"; category pill with icon+color (or "No category").
- Action buttons (duplicated desktop-header + mobile-footer variants): View mode → "Edit" (requires `challsWrite`). Edit/create mode → Delete (existing only), Cancel, Save/Create. Save disabled while pending or when `formValid`/`instancerValid` false, with tooltip "Resolve all issues to save".

### Form (`admin-challenges-details-form.svelte`) — 6 tabs, error badges on tabs with invalid fields

All inputs disabled unless editing/creating (view mode = read-only rendering of same form at 60% opacity).

**Details tab**: Name*, Category* (free text, placeholder "web, pwn, crypto, etc."), Author*, Tags (comma-separated → deduped trimmed array on change), Description* (Markdown textarea, 12 rows, with Preview button → dialog rendering Markdown "as players will see it"), Flag\* (monospace; placeholder from `clientConfig.flagFormatPlaceholder`; required unless dynamic scoring; disabled+blanked for dynamic). Validation: required-field messages surfaced per-field after blur ("touched"); name input autofocused on create.

**Scoring tab**:

- Scoring kind select: `DECAY` ("points scale max→min as solves accumulate") | `DYNAMIC` ("points pushed via webhook by external service"). Kind change is **locked when the challenge has ≥1 solve** (tooltip: "Delete all solves before changing the scoring kind."). Switching to dynamic clears the flag and generates a `crypto.randomUUID()` webhook secret.
- Dynamic-only: Webhook secret\* (transport fixed to `WEBHOOK`), with Regenerate button; required.
- Min points ("at max solves") / Max points ("at zero solves") number inputs — dimmed/disabled for dynamic.
- Sort weight (number, "higher = first"), Tiebreak eligibility select (Eligible/Ineligible), Visibility select (Visible/Hidden from players), Release time (`datetime-local` ↔ Unix ms; Clear button).

**Files tab** (`admin-challenges-details-attachments.svelte`): drag-and-drop + click-to-browse multi-file upload zone (any file type). Upload = `POST /v2/admin/upload` (multipart, `challsWrite`); returns `{name,url,size}[]` appended to form `files`. File rows: icon, name, formatted size, open-in-new-tab link, hover-revealed delete button (removes from form only — server files not deleted). Read-only empty state "No files attached".

**Instancer tab** (`admin-challenges-details-instancer.svelte`):

- Availability from `GET /v2/admin/instancer/schema` (staleTime ∞; `null` → "Instancer not configured").
- Enable select (Disabled/Enabled). Enabling seeds default config: `challengeIntegrationId:''`, instancer = default/first, provider `config` = instancer schema defaults, one expose `{kind:HTTPS, hostPrefix:'test-challenge', containerName:'app', containerPort:80, shouldDisplay:true}`, `timeoutMilliseconds:120000`.
- Instancer picker shown only when >1 instancer registered (shows "(default)" marker); switching instancers resets provider config to target defaults only if schemas differ.
- Integration ID (mono text), Timeout (seconds in UI ↔ ms in model), Allow extending select (default true).
- Provider config: schema-driven `SchemaForm` (JSON-schema from backend, contributes `instancerValid`) with an "Advanced (YAML)" toggle — YAML textarea parsed live via `yaml` lib, parse errors shown and block validity; exiting advanced mode re-parses into config.
- Exposed ports: master-detail list (sidebar of ports + Add button; per-port remove ×). Port fields: Protocol (all `ExposeKind` values except `RAW`), Host prefix, Container name, Container port (1–65535), Display title (optional), Visibility (visible/hidden to players).
- Instance management section (existing challenges only): reuses the player-facing instancer widget (`routes/challenges/challenges-details-overview-instancer.svelte`) to start/stop/extend a live instance and view status/endpoints/time-left; extendable/stoppable gated by config + instancer capabilities (`canExtend`, `canStop`).

**Admin bot tab** (`admin-challenges-details-adminbot.svelte`): availability from `GET /v2/admin/admin-bot/status` (null → "Admin bot not configured on backend"; response supplies `configLanguage`, default "typescript"). Enable select; when enabled, a monospace code textarea ("Challenge code") for the bot script. Saved as `adminBotConfig: {code}` or `null`.

**Solves tab** (`admin-challenges-details-solves.svelte`):

- Infinite virtual list (row height 68, overscan 10, page size 100) over `GET /v2/challs/:id/solves` (the public endpoint). Total from the player challenges query (`GET /v2/challs` → `solves` count).
- Row: rank variant styling, user name/avatar/country, global & division placement (division shown only if >1 division configured), first-blood absolute time for #1 else time relative to first blood, plus local timestamp.
- **Delete solve**: shown per row only with `challsSolveWrite`; confirm dialog ("cannot be undone and will affect the leaderboard") → `DELETE /v2/admin/challs/:challengeId/solves/:userId`; invalidates solves + full leaderboard queries.
- Empty states: no challenge selected / not yet solved; spinner while loading.

### Save/delete plumbing

- Save: `PUT /v2/admin/challs/:id` with full form payload; **create is the same endpoint** with a client-generated `crypto.randomUUID()` id. Dynamic scoring forces empty flag; `adminBotConfig` sent as `{code}` or `null`; `sortWeight||undefined`. Distinct error toasts for `BadAdminBotConfig` ("Admin bot config error: …"), `BadInstancerConfig`, `BadBody` (reason), else generic. Success invalidates `adminChallenges` (+ per-challenge detail), toast "Challenge created!/saved!". Response's canonical `adminBotConfig` is fed back into machine state.
- Delete: **v1 endpoint** `DELETE /v1/admin/challs/:id` with confirm dialog. Success → toast, invalidate list, reset to idle.
- **No YAML/bulk import-export of challenges exists** (YAML appears only in the instancer provider-config editor).

## 2. Admin teams (`/admin/teams`)

### Data model & querying

- Rows are a union: registered users (server-paged) + **pending email verifications** (separate full-list fetch, client-filtered). Types derived from route types in `teams-model.ts`.
- Registered: infinite query `POST /v2/admin/users` (query: `limit=100/offset/search/sortBy/sortOrder`; body: `{status?: {include|exclude: AdminTeamStatus[]}, division?: {include|exclude: string[]}}`), `usersWrite` required, keepPreviousData. Server does search/sort/filter/pagination; total-driven next-page.
- Pending: `GET /v2/admin/user-verifications` (fetched only with `usersWrite`), filtered client-side by status/division/search (`pendingVerificationMatchesFilters` — searches name/email/division id/division label/"unverified").
- Merged rows are re-sorted **client-side** (`sortTeamRows`) by the active column with name tiebreak — meaning pending rows interleave with the currently loaded registered pages.
- Search input debounced 400ms before hitting the server. Registered fetch is skipped entirely when the status filter can't match any registered status (e.g. include=[unverified] only) — `registeredRowsMayMatch`.

### Filter system

- Families: **Status** (Active / Banned / Admin / Unverified — `unverified` is a client-side pseudo-status excluded from the server body) and **Division** (from `clientConfig.divisions`). Plus free-text search box ("Search teams or email...").
- Each family is a `MultiFilter<T> = {mode: 'include'|'exclude', selected: T[]}`. Operator label: "is" (1), "is any of" (>1), "is not" (exclude).
- Desktop UI: filter-funnel dropdown button (accent-tinted when any filter active) with Status/Division submenus of checkbox items; active families render as **chips**: `[icon+label | operator dropdown | value dropdown (single value shows dot+label, else "N statuses") | × clear]`.
- Mobile (<768px): bottom drawer with two-level navigation (root rows with summaries → per-family page with include/exclude segmented buttons + Clear + checkbox list; back button, close button).
- Toolbar also has a Clear-all button (hidden when no filters) and a fetching spinner. Toolbar is sticky/pinned to viewport width above the sticky column header inside a both-axis ScrollArea.
- Status derivation for registered teams: `perms>0 → Admin`, `banned → Banned`, else Active; tones: success/danger/accent/warning(unverified); rendered as colored dot + label.

### Table

- Virtualized infinite list (row height 48, overscan 12, min table width 376 = horizontal scroll on narrow screens). Alternating row backgrounds; ResizeObservers keep the pinned toolbar and scrollbar margins in sync with header height/viewport width; tooltips suppressed while scrolling.
- Columns (all sortable; `AdminTeamSortBy`): Team (avatar+name, links to `/profile/{id}`; banned rows dimmed), Status (dot+label), Division (label from config), Email (click-to-copy w/ tooltip; "No email" fallback), Score, Solves (numbers; `-` for pending), Registered (local time + CTF-relative offset; pending rows show "Expires {time}"; tooltip shows UTC ISO), Actions.
- Sort toggle: clicking active column flips order; new column gets default order (DESC for score/solves, ASC otherwise; initial sort = createdAt DESC).
- Empty states differentiated (filters active vs. none).

### Per-team actions (icon buttons w/ shared tooltip tether; all require `usersWrite`)

- Registered non-admin: **Manage team** (→ `/admin/profile/{id}`; also requires `challsRead`), **Copy login token** (`POST /v2/admin/users/:id/token` → clipboard), **Ban/Unban** (ban → confirm dialog "removes team from leaderboard but keeps account and solve history"; unban is immediate; `PUT /v2/admin/users/:id {data:{banned}}`), **Delete team** (confirm dialog "removes the team and its solves from the database"; `DELETE /v2/admin/users/:id`).
- Registered admin accounts: actions replaced by a static "Admin account" shield badge (admins can't be banned/deleted from here; API also rejects via `BadUserPrivileged`).
- Pending verification rows: **Resend verification** (`POST /v2/admin/user-verifications/:id/resend`), **Verify team** (`POST /v2/admin/user-verifications/:id/complete`).
- Per-row in-flight state tracked by id (`copyingTeamId`, `updatingTeamId`, `deletingTeamId`, `completingVerificationId`, `resendingVerificationId`) → spinner in that button.
- Mutation success invalidates: `['admin','users']` (all pages), per-user detail, full leaderboard, leaderboard challenges; verification actions additionally invalidate the verifications list.
- **No bulk actions exist** (no multi-select).

## 3. Admin submissions (`/admin/submissions`)

### Data & querying

- Infinite query `POST /v2/admin/submissions` (query: `limit=100/offset/sortBy/sortOrder`; body: include/exclude filters `challenge, team, kind, result, teamStatus, category, division` + `createdAfter`/`createdBefore` ISO strings; server validates after≤before). Requires `usersWrite|challsRead`. keepPreviousData.
- **No polling/live refresh** — data refetches only on filter/sort change or pagination (contrast: player-side challenge/leaderboard queries poll at 30s). A rewrite could add polling but current behavior is static + manual.
- Sort columns (`SubmissionSortBy`): createdAt (default, DESC), challenge, team, ip, kind, result; toggling matches teams behavior (createdAt defaults DESC, others ASC).
- Any filter/sort change (`queryFingerprint`) collapses the expanded row and scrolls to top.
- **Deep-linking**: `/admin/submissions?team=<id>&challenge=<id>` pre-applies include-filters once both referenced entities resolve (team via `GET /v2/admin/users/:id`, challenge via admin challenges list). Used by admin profile ("View submissions") and per-solve jump.

### Filter system (the generalized one — `filters/` subdir)

- **Core** (`core.ts`): `MultiFilter`/`SearchFilter` (adds `search: string`), create/clear/toggle/setMode helpers, operator labels, fingerprints.
- **Value filter families** (`families.ts` builds 7 `ValueFilterFamily` descriptor objects per render):
  - **Challenge** — searchable menu (server-agnostic: options from admin challenges list, client-filtered by name/category/category-display-name); option view = category-colored `cat / name`; chip max-width wide.
  - **Team** — searchable menu backed by **server search** (`POST /v2/admin/users` w/ `limit 16, search` once ≥2 chars); options = selected teams ∪ suggestions (deduped); option view = avatar + name.
  - **Kind** — static: Flag, Admin bot (icons).
  - **Result** — static 7 values: Correct, Queued, Already solved, Active job, Incorrect, Invalid input, Bad instancer; tone dots (success: correct/queued; warning: already-solved/active-job; danger: rest).
  - **Team status** — Banned / Not banned.
  - **Category** — distinct categories from admin challenges, category-colored w/ icon.
  - **Division** — from client config.
- Family descriptor contract: `{id, label, pluralLabel, icon, menuSize('search'|'narrow'|'medium'), chipWidth?, searchTerms?, clear(), search?{value,placeholder,onInput}, options(), rootSearchOptions?(), optionKey, optionSearchValues, optionSelected, toggleOption, optionView, loading?/loadingLabel, emptyLabel}`. `optionView` returns `{textValue, segments[{text,tone}], style?, icon?, iconTone?, avatar?, resultTone?}` so one option renderer (`filter-option.svelte`) serves menus, chips-dropdowns, mobile lists, and root-search results.
- **Time filter** (`time.ts`): separate `TimeRangeFilter {mode:'absolute'|'relative', start, end, relativeStart, relativeEnd}`. Absolute = `datetime-local` from/to. Relative = free-text offsets from CTF start supporting `+`/`-`, bare minutes, and unit combos (`2d 4h`, `90min`, `t -30m`; units d/h/m/s w/ synonyms) → resolved against `clientConfig.startTime` to `createdAfter/createdBefore` ISO. Validation errors ("Enter a valid…", "Start must happen before end.", "CTF start time is unavailable.") surface in editor, chip border, and toolbar; invalid range sends **no** time params. Chip summary shows "X to Y"/"After X"/"Before Y" (relative endpoints formatted as CTF offsets).
- **Root filter menu** (desktop): funnel button → dropdown with a **"Search filters…" input** that matches (a) family names/searchTerms, (b) individual options across all families (limit 8/family; teams searched server-side while typing, with "Searching teams…" spinner), rendering matched options inline with a `Family >` breadcrumb path; otherwise lists families as submenus (searchable families get an embedded search input + scroll area).
- **Chips row** (desktop): per-active-family chip `[icon+label | mode menu | value dropdown | ×]`; single-selection chips render richly (category-colored challenge, avatar'd team, icon'd kind/status, toned result), multi shows "N pluralLabel". Time chip analogous with editor dropdown.
- **Mobile drawer**: same two-level pattern as teams' but generated from the family array + time row; per-family search input variant, include/exclude segmented controls, checkbox option list.
- Clear-all button; filters bar pinned above sortable header inside the both-axis scroll container.

### Table

- Virtualized (row height 48, overscan 6, min width 296) with manual translated absolutely-positioned rows (unkeyed for recycling), loading spinner row when fetching next page.
- Columns: expander chevron, Time (local + CTF offset, UTC ISO tooltip), Challenge (category-colored link → `/challenges?challenge={id}`), Team (avatar + profile link + "banned" tag, dimmed when banned), IP (mono badge; external lookup link to `check-host.net` when IP is real), Kind (badge w/ flag/robot icon), Result (tone dot + label).
- Row click (or Enter/Space, or chevron) toggles an **inline detail row** inserted below it in the virtual list: label "Submitted" + horizontally scrollable pills of `detailEntries`: for FLAG kind → `flag: <submittedFlag>`; for ADMIN_BOT → `revision`, `job` (relatedId), each admin-bot input key/value, `error` (wider pill), `instances` count. Close button. Only one row expandable at a time; expansion cleared when the row disappears from the filtered set.
- **No actions** on submissions (read-only audit trail — no delete/replay).
- Empty state copy: "Submission IPs will appear here once teams submit flags or admin bot jobs".

## 4. Admin settings (`/admin/settings`)

Single scrollable form (max-w-3xl) + fixed bottom "Save changes" bar. Requires `settingsWrite` (route-level). Core concept: **overrides vs. config defaults** — `GET /v2/admin/settings` returns `{overrides, defaults}`; each section tracks an `overridden` flag; editing marks it; "Reset to default" reverts the field(s) and clears the flag; save builds a patch where un-overridden-but-previously-overridden fields are sent as `null` (= delete override). Empty patch → "No changes to save." toast. Save = `PUT /v2/admin/settings`; success invalidates clientConfig + adminSettings.

Settings exposed (override groups):

1. **General**: `ctfName`, `faviconUrl`.
2. **Timing**: `startTime`/`endTime` (datetime-local ↔ Unix ms; client validation: both required and start<end when overridden).
3. **Logo**: `logoLightUrl` + `logoDarkUrl` — image upload via `POST /v2/admin/upload` (image/\* validated client-side), preview on light/dark swatches with default wordmark fallback, Change/Delete buttons.
4. **Home content**: `homeContent` Markdown textarea with Edit/Preview tabs (live Markdown render).
5. **Open Graph**: `meta.description`, `meta.imageUrl`.
6. **Sponsors**: master-detail list editor (add/remove/select) with per-sponsor Name, Icon URL, Description, URL (url optional in payload).
7. **External apps (OAuth clients)** — NOT part of the settings patch; direct API: list `GET /v2/admin/external-auth/clients`, create `POST …/clients {name≤100, redirectUri≤1024}` (requires `usersWrite`) → **one-time secret reveal dialog** ("shown only once… delete the app and register a new one"; copy button; optimistic cache insert), delete `DELETE …/clients/:id` (confirm dialog noting existing tokens stay valid). Detail panel shows client name, registered date, click-to-copy Client ID, redirect URI; hint that issued tokens grant full account access.

## 5. Admin profile (`/admin/profile/[id]`)

- Prefetches public profile (`GET /v2/users/:id`). Composes the **player-facing** profile components (header, solves, analytics + score graph via `useUserGraph`) with an admin "Manage" column. Desktop: two columns (profile w/ Solves|Analytics tabs; manage panel). Mobile: single column with Manage|Solves|Analytics tabs (Manage default). "Team not found" card with back-link on error.
- Manage panel requires `usersWrite` (+ data from `GET /v2/admin/users/:id`); keyed remount per team id:
  1. **Avatar** (`AvatarUpload`): upload/remove via `PATCH /v2/admin/users/:id/avatar` (multipart; omitting file = remove).
  2. **Edit profile** form: Team name (2–64, required), Division select (only when >1 division), Country (FlagPicker, nullable), Status text (≤60, nullable). Save disabled until dirty; `PUT /v2/admin/users/:id`.
  3. **Actions**: Copy login token, Copy login **URL** (`{origin}/login?token=…`), View submissions (→ `/admin/submissions?team={id}`), Ban/Unban (ban confirmed via dialog, unban immediate), Delete team (confirm dialog; on success navigate to `/admin/teams`).
- Solves list (shared `ProfileSolves`) gains admin affordances: **Revoke solve** per row when viewer has `challsSolveWrite` (`DELETE /v2/admin/challs/:challengeId/solves/:userId`) and **View submissions** per challenge when `usersWrite` (→ deep-linked submissions).
- Shared invalidation helper (`invalidateAdminTeamQueries`): per-team admin+public queries; listing/scoring changes also invalidate `['admin','users']`, full leaderboard, leaderboard challenges.

## 6. API endpoints referenced (method + path)

| Method               | Path                                           | Used for                                                                       | Perms                  |
| -------------------- | ---------------------------------------------- | ------------------------------------------------------------------------------ | ---------------------- |
| GET                  | `/v2/admin/challs`                             | challenge list                                                                 | challsRead             |
| GET                  | `/v2/admin/challs/:id`                         | challenge detail (incl. flag)                                                  | challsRead             |
| PUT                  | `/v2/admin/challs/:id`                         | create+update challenge (client-generated UUID for create)                     | challsWrite            |
| DELETE               | `/v1/admin/challs/:id`                         | delete challenge (**still v1**)                                                | —                      |
| POST                 | `/v2/admin/upload`                             | file/logo uploads (multipart `files[]`)                                        | challsWrite            |
| GET                  | `/v2/admin/instancer/schema`                   | instancer availability + per-instancer JSON schema/defaults/capabilities       | —                      |
| GET                  | `/v2/admin/admin-bot/status`                   | admin-bot availability + configLanguage                                        | —                      |
| GET                  | `/v2/challs/:id/solves`                        | solves list in admin solves tab (public route)                                 | —                      |
| GET                  | `/v2/challs`                                   | player challenge list (solve counts)                                           | —                      |
| DELETE               | `/v2/admin/challs/:challengeId/solves/:userId` | delete/revoke solve                                                            | challsSolveWrite       |
| POST                 | `/v2/admin/users`                              | filtered/paged team list (body = filters)                                      | usersWrite             |
| GET                  | `/v2/admin/users/:id`                          | team admin detail                                                              | —                      |
| PUT                  | `/v2/admin/users/:id`                          | ban/unban, name/division/country/status edits                                  | usersWrite             |
| PATCH                | `/v2/admin/users/:id/avatar`                   | set/remove avatar (multipart)                                                  | usersWrite             |
| DELETE               | `/v2/admin/users/:id`                          | delete team                                                                    | usersWrite             |
| POST                 | `/v2/admin/users/:id/token`                    | mint login token                                                               | —                      |
| GET                  | `/v2/admin/user-verifications`                 | pending verifications                                                          | —                      |
| POST                 | `/v2/admin/user-verifications/:id/complete`    | force-verify                                                                   | —                      |
| POST                 | `/v2/admin/user-verifications/:id/resend`      | resend email                                                                   | —                      |
| POST                 | `/v2/admin/submissions`                        | filtered/paged submissions (body = filters + createdAfter/Before)              | usersWrite\|challsRead |
| GET                  | `/v2/admin/settings`                           | settings overrides+defaults                                                    | settingsWrite          |
| PUT                  | `/v2/admin/settings`                           | patch settings (null = clear override)                                         | settingsWrite          |
| GET                  | `/v2/admin/external-auth/clients`              | list OAuth clients                                                             | usersWrite             |
| POST                 | `/v2/admin/external-auth/clients`              | create client (returns one-time secret)                                        | usersWrite             |
| DELETE               | `/v2/admin/external-auth/clients/:id`          | delete client                                                                  | usersWrite             |
| GET/PUT/DELETE/PATCH | `/v2/integrations/challs/:id/instance`         | instance status/start/stop/extend (admin instancer tab, shared with player UI) | —                      |
| GET                  | `/v2/users/:id`                                | public profile (admin profile page)                                            | —                      |

(Unused-by-UI but existing: GET variants of `/v2/admin/users` & `/v2/admin/submissions`, admin-bot job queue routes, `POST /v2/admin/upload/query`.)

## 7. Teams vs. submissions filter architecture — duplication analysis

**Two parallel implementations exist.** Submissions has the _generalized_ one; teams has an older _hard-coded_ copy of the same visual/interaction language.

Duplicated nearly verbatim (copy-level duplication):

- `MultiFilter`/`FilterMode` types, `createFilter`, `clearFilter`, `setFilterMode`, `toggleFilterOption`, `filterOperatorLabel`, `filterFingerprint` — exist both in `submissions/filters/core.ts` and re-implemented inside `teams/teams-model.ts` (identical semantics; teams adds `selectedCountLabel`).
- The include/exclude → `{include:[…]} | {exclude:[…]}` route-body serialization (`routeSearchFilter` in teams-model vs. `addFilterParams` in submissions/filters/query.ts).
- Chip anatomy: `[icon+label | operator dropdown | value dropdown | × remove]` — `teams-desktop-filter-chips.svelte` re-implements what `desktop-filter-chips.svelte` + `filter-mode-menu.svelte` do, including identical operator menu markup.
- Desktop funnel menu with submenus of `CheckboxItem`s (`teams-desktop-filter-menu.svelte` + `teams-filter-options.svelte` ≈ `desktop-filter-menu.svelte` + `filter-option-list.svelte`/`filter-option.svelte`, minus root search).
- Mobile drawer: `teams-mobile-filter-drawer.svelte` is a structural clone of `mobile-filter-drawer.svelte` (root rows → per-family page, include/exclude segmented buttons, checkbox rows, back/close header) but hard-codes its two families rather than iterating a family array.
- Toolbar (pinned width, funnel + chips + Clear + spinner), sticky header/scroll-margin ResizeObserver plumbing, sortable-header snippets, virtualized-table wiring — near-identical between `teams-table.svelte`/`teams/+page.svelte` and `submissions/+page.svelte`/`table/header.svelte`.

Genuinely different (must stay configurable in a unified design):

- **Family definition style**: submissions families are data-driven descriptor objects consumed by generic components; teams families are hard-coded (two families, bespoke chip-value snippets, bespoke option snippets with status dots).
- **Search semantics**: teams has one global debounced _server-side_ text search (name/email, query param) and no per-family search; submissions has per-family search (client for challenges, server for teams) plus a root "search filters" typeahead across families/options. Teams has no root filter search; submissions has no global free-text search.
- **Pseudo-options requiring client behavior**: teams' `unverified` status isn't a server value — it gates a _second data source_ (verifications list) and is stripped from the server body, and can short-circuit the registered query entirely. Submissions' analog is the time family, which is not a MultiFilter at all (mode/absolute/relative + validation + resolution against ctfStart).
- **Row model**: teams merges two heterogeneous row kinds and re-sorts client-side; submissions is a single server-sorted stream with an expandable detail row.
- Sort enums/default-order rules differ (`AdminTeamSortBy`+`SortOrder` vs `SubmissionSortBy`+`SubmissionSortOrder`).

What a unified design needs (rewrite requirements):

1. Promote `filters/core.ts` (MultiFilter, SearchFilter, mode/toggle/clear/fingerprint/operator-label) and the include/exclude body serializer to a shared lib module — both pages already agree on these semantics exactly.
2. Keep the submissions `ValueFilterFamily` descriptor contract as the single abstraction; express teams' Status and Division as two families (status option view = dot+label, division = plain label). The descriptor already supports icons, tones, avatars, async loading, per-family search, and root-search — it covers every teams need.
3. Generalize the family list consumed by: root menu (with optional cross-family option search), chips row, mobile drawer, and mobile per-family pages — all four already iterate families generically on the submissions side; teams just needs to feed its two families in. Chip "rich single-value" rendering should come from `optionView` (as `filter-option.svelte` proves) instead of per-family snippets (`desktop-filter-chips.svelte` currently still has a per-id snippet switch that `optionView` could replace).
4. Support non-MultiFilter "special" families as a first-class variant (time-range editor panel is the existing example; a global search input could be modeled similarly or kept as toolbar-level).
5. Allow family hooks for: (a) mutating the outgoing query (strip pseudo-values like `unverified`), (b) gating auxiliary queries (`registeredRowsMayMatch`-style "can this data source match at all"), (c) client-side predicate for locally sourced rows (pending verifications).
6. Shared table shell: pinned toolbar + sticky sortable header + both-axis ScrollArea + `useInfiniteVirtualScroll` + ResizeObserver margin sync + empty-state (filtered vs. unfiltered copy) + hover-tooltip suppression while scrolling — this whole assembly is duplicated today and should be one component parameterized by column defs, row renderer, and optional expandable-row support.
7. Keep fingerprint-driven side effects (reset scroll, collapse expansion, keepPreviousData) in the shared shell.

Absolute file paths of primary sources: `/Users/enscribe/Repositories/jktrn/rctf-new/apps/web/src/routes/admin/` (all files listed above), `/Users/enscribe/Repositories/jktrn/rctf-new/apps/web/src/lib/machines/index.ts`, `/Users/enscribe/Repositories/jktrn/rctf-new/apps/web/src/lib/query/admin.ts`, `/Users/enscribe/Repositories/jktrn/rctf-new/apps/web/src/lib/query/challenges.ts`, `/Users/enscribe/Repositories/jktrn/rctf-new/packages/types/src/routes/v2/admin.ts`, `/Users/enscribe/Repositories/jktrn/rctf-new/packages/types/src/routes/v2/integrations.ts`.
