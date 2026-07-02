# web-new implementation plan

Living document. Check items off as they land; add discoveries as new items
rather than silently expanding scope. Architecture rationale lives in
[ARCHITECTURE.md](./ARCHITECTURE.md); behavioral specs live in
[research/](./research/).

**Status: Phase 0 complete (2026-07-01), including the doc-grounded audit
pass — 7 audits in [../docs/audits/](./audits/), all findings applied and
re-verified (check clean, prod build passes, browser gate incl. forged-
placeholder inertness).** Plan drafted 2026-07-01.

## Ordering rationale

Foundation → auth → challenges → scoreboard → profile → admin. Auth first
because every later phase needs a logged-in session to exercise. Challenges
before scores because it exercises the widest primitive surface (tabs,
accordion, splitter, dialog-as-drawer, markdown, polling) on moderate data
sizes. Scoreboard isolated because it is the single hardest surface (67
revisions of `+page.svelte` in the old app). Admin last: it reuses everything
and its filter framework deserves a settled foundation. Heavyweight separable
features (screenshot export, extended analytics, brainrot) are the explicit
tail of their phases so cutting them is a one-line decision, not surgery.

## Phase 0 — Scaffold & foundation

The goal: an empty-ish app that boots against a real backend with the whole
platform layer (styles, api, query, toasts, primitives) proven by the home page.

- [x] Package scaffold: `apps/web-new` (`@rctf/web-new`), SvelteKit +
      adapter-static (fallback `index.html`, precompress, strict), exact pins
      copied from apps/web (svelte 5.55.7, kit 2.60.1, vite 8.0.10, TS 5.9.3),
      workspace registration, `dev`/`build`/`check`/`typecheck` scripts,
      dev proxy for `/api` + `/uploads` → `127.0.0.1:3000`
- [x] Port CSP config block from `apps/web/svelte.config.ts` (prod-only meta CSP)
- [x] Root `+layout.ts`: `ssr = false`, QueryClient creation, blocking
      `clientConfig` fetch, `userSelf` prefetch
- [x] `src/styles/` chain: reset (verbatim from erudite), fonts (Outfit +
      Geist Mono + metric-adjusted fallbacks), color (full Layer C token
      contract via `light-dark()` — every documented token name; values
      vendored from Radix Colors per research/13-radix-colors.md), typography
      (fluid steps + constant leading), layout (fluid space scale), shape,
      layers (z-index scale), prose
- [x] Theme mechanism: pre-paint script in `app.html`, `data-theme` +
      `color-scheme` override rules, theme-toggle component,
      `localStorage.theme` compat
- [x] `lib/api/client.ts` port + `lib/api/errors.ts` (`ApiError`, rate-limit
      message helper)
- [x] `lib/query/`: core (client defaults), config, user domains;
      `queryKeys` registry
- [x] Captcha util port (provider loaders, invisible execution, `CaptchaError`)
- [x] Analytics init port (`/api/v2/integrations/analytics/script` loader)
- [x] Zag plumbing: vendored `Portal.svelte`, machine-wrapper conventions doc
      in code, pinned `@zag-js/*` install
- [x] Toast system: Zag toast group in root layout + `lib/toast.ts` shim
      (`toast.success/error/info/warning/loading`)
- [x] Primitive batch 1: button, input, textarea, checkbox, label, field,
      card/section elements, spinner, empty-state, dialog (center presentation),
      tooltip, chip/badge
- [x] `use-api-form.svelte.ts` port with the two fixes (per-field submit
      errors; `goodResponses`-based success detection)
- [x] Pure utils port: time (Intl-based), initials, filesize, flags,
      permissions, script-loader, categories (color→hue mapping is declarative
      CSS keyed on `data-category-color`, not a JS style-string builder)
- [x] Markdown pipeline port: marked extensions (alerts incl. CONNECTION,
      `<timer/>`), DOMPurify config, `<Markdown>` with island hydration,
      alert + timer components
- [x] Home page (`/`): homeContent markdown, sponsor cards, page titles from
      `ctfName`
- [x] `apps/web-new/CLAUDE.md` pointing agents at docs/

**Gate:** `bun run dev:mock` + web-new boots; home renders markdown incl. a
`<timer/>` and an alert; theme toggles without FOUC; toasts fire; `check` clean.

Phase 0 notes (2026-07-01):

- Gate verified in-browser: timer ticks, NOTE + CONNECTION alerts render, Zag
  toast fires, theme toggles and persists, light/dark backgrounds are Radix
  gray-1 exactly. `check`: 704 files, 0 errors, 0 warnings. Prod build passes.
- `@zag-js/*` pinned at 1.41.2 (not 1.42.0): the repo's 7-day
  `minimumReleaseAge` cooldown blocks 1.42.0 until ~2026-07-06. Bump when it
  clears if wanted.
- Fixed an upstream bug found during gate testing: a standalone `<timer />`
  line is a CommonMark HTML _block_, so the old inline-only marked extension
  never saw it and DOMPurify deleted it (broken in apps/web too). web-new adds
  a block-level twin extension; both standalone and inline forms work.
- Radix palette vendored at 3.0.0 (88 hex values verified against unpkg);
  fonts carry real capsize metrics for the Arial/Courier fallbacks.
- `apps/web-new/src/styles/` added to `.prettierignore` (hand-aligned token
  blocks, same reason erudite disables CSS formatting).
- Dev environment needs `rctf.d/*.yaml` (gitignored): a local `00-dev.yaml`
  (ctfName/origin/tokenKey/start/end/database) was created for the gate;
  `database.migrate: before` lets the API run migrations itself (drizzle-kit
  migrate exits 1 silently under bunx on this machine).
- Audit pass (same day): 7 parallel doc-grounded audits (zod-mini, tanstack
  v6, svelte idioms, zag, marked+dompurify, css nesting, time/Intl) — reports
  in docs/audits/. Fixes applied: markdown pipeline rewritten (Marked
  instance, preprocess/postprocess hooks, per-session nonce +
  afterSanitizeAttributes so forged placeholders never hydrate, fence-aware
  html-block separation), time.ts rewritten (formatToParts local time,
  collapsed offset helpers; 32/32 output-compat checks), QueryClient hoisted
  to module scope, gcTime Infinity on client config, v1 captcha field keyed
  by route version, portal rebuilt on the documented attach pattern, tooltip
  z-index moved to the content part (real stacking bug), field.svelte grew
  $props.id() + aria-describedby, single-$effect island hydration (fixes
  double-mount), CSS nesting refactor across all components. Conventions
  going forward: nested style blocks with data-attribute variants and the
  --accent custom-property map; logical properties; background shorthand;
  Snippet-vs-Component props never disambiguated by arity.
- Category theming (post-audit polish): removed `getCategoryStyle()` (a JS
  CSS-string builder) in favor of declarative `[data-category-color='<hue>']`
  blocks in color.css that remap the generic `--category-*` tokens; consumers
  set `data-category-color={config.color}`. `CategoryColor` union added so a
  bad hue fails typecheck. Verified in-browser (red/teal/fallback resolve
  distinctly). Zero consumers existed, so the contract change was free.

## Phase 1 — App chrome & auth

- [ ] Navigation (desktop): links + active state, permission-gated admin menu
      (Zag menu), user menu, countdown, theme toggle
- [ ] Navigation (mobile): hamburger → dialog side-sheet presentation;
      copy-login-URL + logout actions
- [ ] Nav team-stats sparkline (first chart-kit consumer: hand-rolled path,
      no axes) — may slip to Phase 3 if chart kit isn't ready
- [ ] `ctf-not-started` (invalidates queries at T0) and `archived-notice`
- [ ] `(auth)` layout + `/login`: token form, URL-paste tolerance, `?token=`
      auto-login, `?next` sanitization (shared `getRedirectPath` util —
      old TODO, fix here), archived gate
- [ ] `/register`: division handling, CTFtime prefill via sessionStorage,
      email-verification vs immediate-token outcomes, team-token card,
      captcha notice
- [ ] `/recover`, `/verify` (3 verify flows: registration, login/recovery,
      email-change)
- [ ] CTFtime OAuth: login button, `/integrations/ctftime/callback`
      (postMessage + redirect variants)
- [ ] `/external-auth/authorize` consent page (client lookup, login redirect,
      approve → `redirectTo`)
- [ ] Logged-out/archived gating verified on every route that exists so far

**Gate:** full register → verify → login → logout cycle against seeded API;
CTFtime flow manually stubbed; `?next` open-redirect cases covered by unit
tests for the sanitizer.

## Phase 2 — Challenges

- [ ] Challenges query domain (30s poll) + solved/blood derivation from
      `userSelf`
- [ ] Master-detail: Zag splitter (desktop ≥48rem), dialog bottom-drawer
      (mobile), `?challenge=` deep link with replaceState + scroll-to,
      single shared list/detail instance (fix the old dual-render)
- [ ] List: category accordion (Zag, controlled multi + collapse/expand-all),
      sticky headers, search, hide-solved, header stats, category
      colors/icons/aliases
- [ ] Detail: header (points, tags, category chip), tabs (details/solves/
      scores visibility rules), markdown description, files list +
      download-all
- [ ] Flag submit ladder (archived → ended → login → solved → form) +
      optimistic solve + delayed refetch trio (`invalidateAfterSolve()`)
- [ ] Solves tab: virtual list port, pinned self-row, blood styling,
      relative-time semantics
- [ ] Podium (flag + dynamic variants, container-query column collapse)
- [ ] Dynamic scoring: scores tab (rank deltas — derive from page 0 rather
      than duplicate queries), point-delta chips
- [ ] Chart kit v1: linear/time scales, axis with CTF-relative ticks, line
      (monotone cubic), hover/tooltip; per-challenge scores graph with
      visible-teams windowing (simplified: top-N + pinned self/top-3 rule)
- [ ] Instancer panel: status polling (2s/10s), endpoints + copy, countdown
      progress, extend/stop/custom actions, action-returned-flag auto-submit,
      captcha notices
- [ ] Admin-bot panel: inputs with regex validation, submit (captcha), 3s
      job polling with queue position, JSONL log viewer + download, history
      with lazy log fetch, config download

**Gate:** solve a challenge end-to-end on seeded data (toast, optimistic
update, list refresh); instancer + admin-bot lifecycles exercised against a
configured backend or recorded fixtures; deep links restore state.

## Phase 3 — Scoreboard

The hardest phase. Design the data model first (leaderboard pages + challenge
metadata + graph + self position as one cohesive module), then render.

- [ ] Leaderboard query domain: infinite `with-graph` pages (100), challenges
      metadata, self graph, 30s poll + focus refetch
- [ ] Data model: flat-mapped pages, rank variants, division labels,
      `dataEpoch` equivalent only if profiling demands caching
- [ ] Virtualized table shell: fixed-height rows, sticky header, both-axis
      scroll, skeleton rows, edge fades (ported fade logic, fewer moving parts)
- [ ] Team cell: rank + delta indicator, avatar fallback chain, name link,
      flag/status, score/solves, sparkline (hand-rolled, 12h window)
- [ ] Solve matrix: decide DOM-per-cell + `content-visibility` first;
      fall back to the old cached-SVG-strip approach only if profiling on
      ~5k-team fixtures says so (keep the perf outcome, not the mechanism)
- [ ] Cell tooltips via event delegation (`data-tooltip` pattern), suppressed
      while scrolling
- [ ] Category-aggregate view + view/sort toggles
- [ ] Sticky self-row pinning (top/bottom) — shared mechanism with challenge
      solves list
- [ ] Score graph: visible-rows windowing + pin-top-3/pin-self toggles
      (localStorage prefs), hover cross-highlighting with rows/sparklines,
      solve crosshairs
- [ ] Toolbar: division filter (Zag select), debounced server search
      (Ctrl/Cmd+F focus), loaded/total, roving toolbar focus, URL state
      (`view/sort/division/search/challenge`)
- [ ] CTF-not-started / empty / search-empty states
- [ ] Tail (deferred until core scoreboard ships):
  - [ ] Challenge focus mode (needs chain-fetch-all-pages wart until the API
        grows a filter param — flag to API team)
  - [ ] Screenshot export island (lazy `modern-screenshot`, preview modal,
        emphasis options)

**Gate:** 5k-team seeded fixture scrolls at 60fps on a mid-tier laptop; search,
division filter, deep links, self-pinning all correct; archived-mode scoreboard
(static dump) still filters/searches.

## Phase 4 — Profile

- [ ] Shared profile header (avatar, ranks, division/country/status/CTFtime)
- [ ] Solves list component (search / hide-solved / sort cycle / accordion;
      shared with admin profile later; injectable row actions)
- [ ] Own profile `/profile`: responsive two-pane vs tabs layout
- [ ] Settings: profile form (dirty-gated), division select, flag-picker
      (Zag combobox — this kills command/popover), status
- [ ] Email set/change/remove with verify-sent handling + auth-method
      invariants (can't drop last method)
- [ ] CTFtime link/unlink (OAuth popup + postMessage + state check)
- [ ] Team members (tag-input port, add/remove by email)
- [ ] Avatar upload (validation, preview, optimistic remove, captcha notice)
- [ ] Public profile `/profile/[id]`: prefetch, not-found state, read-only
      solves, score graph (`offset=globalPlace-1` hack — flag to API team)
- [ ] Analytics: score-over-time graph (chart kit: line + solve dots + splits)
- [ ] Tail: remaining analytics charts — category bars, solve timeline,
      cadence histogram, difficulty bins (pure data layer ports + chart kit
      bars/dots; consolidate the duplicated category-stat logic with scores)

**Gate:** every settings mutation round-trips against seeded API with error
paths (validation, rate limit, captcha) exercised; public profile of another
seeded team renders.

## Phase 5 — Admin

- [ ] Admin shell: permission gate (challsRead) + per-feature bit gating
- [ ] **Filter framework** (before either table): `MultiFilter` core,
      `ValueFilterFamily` descriptors, chips row, funnel menu with root
      search, mobile drawer, time-range family (absolute + relative CTF
      offsets), include/exclude serialization — acceptance test is expressing
      BOTH teams and submissions configs
- [ ] Shared admin table shell: pinned toolbar + sticky sortable header +
      virtualized rows + fingerprint effects + empty states + optional
      expandable row
- [ ] Admin challenges: list (accordion, search, status icons), editor state
      class (dirty/confirm-discard/confirm-delete), 6-tab form (details,
      scoring incl. kind-lock + webhook secret, files upload, instancer
      config + schema-form port + YAML toggle + expose ports editor + live
      instance panel reuse, admin-bot code editor, solves with revoke),
      markdown preview dialog, create-via-UUID
- [ ] Admin teams: registered + pending-verification row merge, filters,
      sortable columns, per-row actions (manage/copy-token/ban/delete,
      verification resend/complete), confirm dialogs
- [ ] Admin submissions: filtered/paged table, expandable detail row,
      `?team=&challenge=` deep-link pre-filters
- [ ] Admin settings: overrides-vs-defaults model (dirty tracking, null-to-
      reset patches), all 6 groups, logo uploads with previews, external-auth
      clients (one-time secret dialog)
- [ ] Admin profile `[id]`: manage panel (avatar/edit/actions), shared solves
      list with revoke + view-submissions deep links

**Gate:** full challenge lifecycle (create → edit → upload files → configure
instancer via schema-form → solve as player → revoke solve → delete) against
seeded API; teams/submissions filters produce correct server queries (inspect
network); settings save/reset round-trips.

## Phase 6 — Hardening & cutover prep

- [ ] Brainrot easter egg port (tail; drop if unloved)
- [ ] Accessibility pass: focus order, roving toolbar/list navigation
      (arrow-navigation action port where Zag doesn't cover), aria labels,
      `prefers-reduced-motion`
- [ ] Archived-mode full pass (every page against an export fixture)
- [ ] CSP verification in prod build (captcha + analytics + storage origins)
- [ ] Error/empty/loading state audit per route
- [ ] Unit tests (vitest): redirect sanitizer, filter core, time utils,
      markdown pipeline, analytics data layer, chart scales
- [ ] Bundle audit (`vite build` report): no accidental heavy deps
- [ ] Docs updates in the same PR train: `theming/colors.md`,
      `theming/components.md`, `theming/categories.md`, `admin/markdown.md`
      (paths + mechanism now describe web-new)
- [ ] Cutover plan: rename dance (`apps/web` → retired, `apps/web-new` →
      `apps/web`), Dockerfile build path, CI paths-filter, README

## Deferred decisions (revisit when reached)

| Decision                            | Default                        | Revisit when                               |
| ----------------------------------- | ------------------------------ | ------------------------------------------ |
| Screenshot export                   | Keep, as lazy island           | Phase 3 tail                               |
| Analytics charts beyond score graph | Keep all 4                     | Phase 4 tail                               |
| Brainrot                            | Keep                           | Phase 6                                    |
| Challenge focus mode                | Keep (with chain-fetch wart)   | Phase 3 tail; ask API for a filter param   |
| Drag-to-dismiss on mobile drawers   | Drop                           | If users miss it                           |
| Solve-matrix rendering mechanism    | DOM cells + content-visibility | Phase 3, after profiling 5k-team fixture   |
| date-fns                            | Drop for Intl                  | Phase 0, if Intl formatting proves painful |

## Bugs found in apps/web during the Phase 0 audit (worth upstream fixes)

- v1 captcha routes (`register`/`recover`) declare `recaptchaCode`, but the api
  client always injects `captchaCode`; zod strips the unknown key server-side,
  so captcha-gated v1 register/recover always fails when captcha is enabled
  (`apps/web/src/lib/api/index.ts:203`). Fixed in web-new by keying the field
  on the route version.
- `ensureHtmlBlockSeparation` regex inserts blank lines inside fenced code
  blocks, corrupting rendered code (`apps/web/src/lib/utils/markdown.ts:89`).
  Fixed in web-new with a fence-aware preprocess hook.
- Hand-written `data-alert`/`data-timer` attributes in user markdown survive
  DOMPurify (`ALLOW_DATA_ATTR` defaults to true — the `ADD_ATTR` config is a
  no-op) and hydrate into live components, violating the documented "no effect"
  contract. Fixed in web-new with a per-session nonce + sanitizer hook.
- A standalone `<timer />` line is a CommonMark HTML block; the inline-only
  extension never sees it and it is silently sanitized away. Fixed in web-new
  with a block-level twin extension.

## API asks (not blockers; file issues)

- Server-side "teams that solved challenge X" filter on leaderboard
  (removes challenge-focus chain-fetching).
- `GET /v2/leaderboard/graph/team/:id` (removes the `offset=globalPlace-1`
  hack used by self/public-profile graphs).
- Post-submit leaderboard-cache lag (the 500ms delay workaround in
  `invalidateAfterSolve`).
