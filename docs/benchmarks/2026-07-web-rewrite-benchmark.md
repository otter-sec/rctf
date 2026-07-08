# Web rewrite benchmark: apps/web (v1) vs apps/web-new (v2)

Measured 2026-07-07/08 on an M-series MacBook (macOS 25.5), Chromium 149
(Playwright), local API. Harness: `bench/` (see `bench/README.md` to reproduce).

## Methodology

- **Dataset:** 1,000 teams (`SEED_TEAM_COUNT=1000`), 75 challenges
  (`SEED_GENERATED_CHALLENGE_COUNT=71` + 4 fixed), seeded via `apps/seed`.
  Default seed solve density (~900+ solves on early challenges).
- **Serving:** both apps as production static builds (`vite build` +
  `vite preview`), same local API and database; v1 on :4173, v2 on :4174.
- **Runs:** all runtime numbers are medians of 5. Lighthouse uses
  `--preset desktop` (mobile emulation off), unauthenticated, on the three
  public routes (`/profile` is auth-gated via localStorage token, which
  Lighthouse cannot inject — covered by the Playwright probes instead).
- **Auth state:** Playwright probes run logged in (token injected via the seed
  login URL). The flag-submit probe submits a deliberately wrong flag so all
  runs and both apps measure the same code path.
- **Fair LOC:** non-style, non-test lines. v1 styles with Tailwind (inline
  classes, not separable) while v2 uses native CSS (`<style>` blocks +
  stylesheets, fully excluded), so this measure slightly favors v1. v2's
  10,234 lines of tests are excluded; v1 has none.

## R1 — Faster for users

Lighthouse, median of 5 (`bench/lighthouse.sh`):

| Route | Metric | v1 | v2 | Winner |
|---|---|---|---|---|
| `/` | LCP (ms) | 773 | 856 | v1 |
| `/` | Transfer (KB) | 410 | 322 | v2 |
| `/challenges` | LCP (ms) | 982 | 1048 | v1 |
| `/challenges` | Transfer (KB) | 497 | 359 | v2 |
| `/scores` | LCP (ms) | 1001 | 937 | v2 |
| `/scores` | TBT (ms) | 79 | 23 | v2 |
| `/scores` | Transfer (MB) | 8.52 | 7.16 | v2 |

TBT was 0 and CLS ≤ 0.001 on all other routes for both apps.

Scoreboard stress at 1,000 teams, authenticated, median of 5
(`bench/stress-scoreboard.ts`):

| Metric | v1 | v2 | Winner |
|---|---|---|---|
| Time to first rendered rows (ms) | 463 | 298 | v2 |
| Scroll frame rate (fps) | 120.5 | 119 | tie (display cap) |
| JS heap after load (MB) | 61.3 | 119.1 | **v1** |

Client-side navigation latency (R1d) was measured but is not meaningful against
a local API — both apps complete SPA navigations in under 5 ms.

## R2 — Leaner codebase

`bench/static-metrics.sh` (deterministic across reruns):

| Metric | v1 (web) | v2 (web-new) | Winner |
|---|---|---|---|
| Raw src lines | 40,437 | 44,127 | — (unfair: CSS methodology differs) |
| Styling lines (style blocks + css) | 3,550 | 13,994 | — |
| Fair LOC (non-style, non-test) | 36,887 | 30,133 | v2 (−18%) |
| Source files | 491 | 342 | v2 |
| Prod dependencies | 14 | 24 | **v1** (v2's 11 `@zag-js/*` packages counted individually) |
| node_modules size | 20 MB | 13 MB | v2 |
| Cold prod build time (s) | 5.0 | 2.6 | v2 |
| Dev server ready (ms) | 485 | 279 | v2 |

v2 additionally carries 10,234 lines of tests (excluded above); v1 has no test
suite. v1 also vendors a 7,145-line shadcn UI kit inside its fair-LOC total,
while v2's hand-written UI primitives (2,142 lines) are likewise included.

## R3 — Better UX

Input-to-next-paint, authenticated, median of 5 (`bench/interactions.ts`;
values include a fixed settle-wait of 300 ms for submit / 150 ms for filter, so
the signal is the delta above those):

| Interaction | v1 | v2 | Verdict |
|---|---|---|---|
| Flag submit (wrong flag) | 319 ms | 321 ms | parity (~20 ms real work each) |
| Challenge filter keystroke | 166 ms | 166 ms | parity (~1 frame each) |
| 360px viewport: horizontal overflow | none on `/`, `/challenges`, `/scores` | none | parity |
| Keyboard nav (see `bench/keyboard-checklist.md`) | 15/15 focus-visible, some unlabeled controls | 15/15 focus-visible, full aria-labels | v2 slightly ahead |

## Findings

- **v2 is faster where it matters at scale:** 36% faster scoreboard
  time-to-rows at 1k teams, 3.4× lower total blocking time and 1.4 MB less
  transfer on the scoreboard, and 20–28% smaller bundles on every route.
- **v2 loses two metrics, reported plainly:** LCP on the two lightest routes is
  ~70–80 ms higher (sub-second in both apps), and JS heap after scoreboard load
  is roughly double (119 MB vs 61 MB) — the virtualizer keeps more row state
  resident. Prod dependency *count* is higher only because Zag.js ships one
  package per component; the installed footprint is 35% smaller.
- **Codebase claims hold:** 18% less non-style code while adding a 10k-line
  test suite v1 never had, half the build time, and a smaller dependency
  footprint.
- **UX is at parity on interaction latency** (both apps respond within a frame
  or two) with v2 ahead on accessibility labeling and equal on small-viewport
  correctness.
