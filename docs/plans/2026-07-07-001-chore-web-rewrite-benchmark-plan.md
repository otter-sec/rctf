---
artifact_contract: ce-unified-plan/v1
artifact_readiness: implementation-ready
product_contract_source: ce-brainstorm
execution: code
date: 2026-07-07
---

# Web Rewrite Benchmark (v1 vs v2) - Plan

## Goal Capsule

**Objective:** Produce a one-time benchmark comparing `apps/web` (v1) and `apps/web-new` (v2) that backs three claims for a rewrite-justification writeup: faster for users, leaner codebase, better UX.

**Product authority:** enscribe. Audience is the PR/writeup reader.

**Open blockers:** none. Product Contract unchanged.

---

## Product Contract

### Scope

One-off measurement, not CI automation. Both apps built for production, served against the same running API with the same seeded dataset, measured in the same browser with the same throttling. Report medians of 5 runs for runtime metrics.

**Dataset:** realistic large-CTF scale — 1,000 teams (`SEED_TEAM_COUNT=1000`) and ~75 challenges, generated via `apps/seed`. The seed currently hardcodes 22 challenges (`SEED_GENERATED_CHALLENGE_COUNT = 18` + 4 fixed in `apps/seed/src/data.ts`); U1 makes the generated count env-overridable, mirroring the existing `SEED_TEAM_COUNT` pattern.

### Metrics — Faster for users (R1)

- R1a: Bundle size per route (initial JS + CSS transferred, brotli) for: home, challenges, scoreboard, profile.
- R1b: Core Web Vitals per route via Lighthouse: LCP, TBT, CLS.
- R1c: Scoreboard stress case at 1k+ teams: time to first rendered rows, scroll frame rate, JS heap after load.
- R1d: Client-side navigation latency between routes.

### Metrics — Leaner codebase (R2)

- R2a: Fair LOC: non-style, non-test source lines. Baseline already computed: v1 = 36,887 lines / 486 files; v2 = 30,141 lines / 342 files. Styling excluded because v1 uses Tailwind (inline classes) and v2 uses native CSS; v2's tests (10,234 lines) excluded because v1 has none.
- R2b: Production dependency count and `node_modules` size per app.
- R2c: Cold production build time and dev-server startup time.

### Metrics — Better UX (R3)

- R3a: INP on the two hot interactions: flag submission and challenge filtering.
- R3b: Keyboard-navigation / focus-visible checklist across key flows (qualitative, pass/fail table).
- R3c: Small-viewport correctness at 360px: no horizontal scroll, CLS.

### Out of scope

- Test coverage and type-strictness comparisons.
- Full accessibility audit beyond the keyboard checklist.
- Continuous tracking, perf budgets, or CI integration.

### Success criteria

A results table per metric group with identical methodology noted, usable verbatim in the rewrite writeup. Where v2 loses or ties a metric, report it plainly rather than omitting it.

---

## Planning Contract

### Key Technical Decisions

- **KTD1 — Harness location:** benchmark scripts live in `bench/` at repo root (new directory), results in `docs/benchmarks/`. They are one-off tooling, not app code; keeping them out of `apps/` avoids implying CI ownership.
- **KTD2 — Runtime measurement via Lighthouse CLI + Playwright:** Lighthouse (via `bunx lighthouse`) for R1a/R1b; Playwright (`bunx playwright`, with a one-time `bunx playwright install chromium` in setup — it is not a repo dependency) for the scoreboard stress case, navigation latency, INP probes, and the R3c 360px viewport run, since Lighthouse cannot script the flag-submit/filter interactions.
- **KTD3 — Same-origin serving:** each app is served with `vite preview` (static adapter output) on its own port, both proxying to the same local API + seeded database. Note: `apps/web-new/vite.config.ts` currently proxies to a remote dev host (`DEV_API_URL`); U1 points it at the same local API as v1 via a temporary, uncommitted config edit recorded in `bench/README.md`. Seed once with `SEED_TEAM_COUNT=1000`; do not reseed between apps.
- **KTD4 — Static metrics are shell-scripted and reproducible:** the fair-LOC methodology (exclude `<style>` blocks, css files, tests) is encoded in a script so the numbers in the report are regenerable, not hand-computed.
- **KTD5 — Medians of 5:** all runtime numbers are median of 5 runs, reported with the run count; throttling fixed at the Lighthouse desktop preset (`--preset desktop`, mobile emulation off) for all runs, matching a CTF audience.
- **KTD6 — Authenticated, idempotent interactions:** Playwright contexts are authenticated by injecting a seeded team's token into localStorage once (captured in U1); the flag-submit INP probe submits a deliberately wrong flag so all 5 runs and both apps measure the same code path. Auth state per route is recorded in the methodology.

### Assumptions

- v1 still builds and runs against the current API (verify in U1; if it needs small fixes, note them in the report rather than fixing v1 substantively).
- Local dev API setup (`bun run dev:api` + `rctf.d/00-dev.yaml` dummy instancer) serves both frontends.

---

## Implementation Units

### U1. Environment and dataset prep

**Goal:** Both apps running as production builds against one seeded API at benchmark scale.
**Requirements:** prerequisite for R1, R3.
**Dependencies:** none.
**Files:** `bench/README.md` (setup steps recorded); `apps/seed/src/data.ts` (make `SEED_GENERATED_CHALLENGE_COUNT` env-overridable, mirroring `SEED_TEAM_COUNT`); temporary uncommitted proxy edit in `apps/web-new/vite.config.ts`.
**Approach:** make the seed challenge count env-overridable, run migrations, seed with `SEED_TEAM_COUNT=1000` and ~71 generated challenges, start API, point v2's dev proxy at the local API, `bun run build` + `vite preview` for each app on distinct ports, `bunx playwright install chromium`. Capture one seeded team's auth token for KTD6. Verify v1 builds and its scoreboard/challenges/profile routes load with real data; record any incompatibilities.
**Test scenarios:** Test expectation: none — environment setup; verification is the smoke check below.
**Verification:** all four target routes render with seeded data in both apps.

### U2. Static metrics script

**Goal:** Reproducible script emitting the leaner-codebase numbers (R2a–R2c).
**Requirements:** R2.
**Dependencies:** none.
**Files:** `bench/static-metrics.sh` (or `bench/static-metrics.ts` if shell gets unwieldy).
**Approach:** encode the fair-LOC method (fd + awk style-block exclusion, tests excluded), prod dependency counts from `package.json`, `node_modules` sizes via `du`, timed cold `bun run build` and dev-server time-to-ready per app. Output a markdown table fragment.
**Patterns to follow:** `set -euo pipefail`, shellcheck-clean.
**Test scenarios:** run twice → identical LOC/dep numbers (deterministic); numbers match the baseline already computed in the Product Contract (36,887 / 30,141).
**Verification:** script runs from repo root with no args and prints the R2 table.

### U3. Runtime perf harness

**Goal:** Scripted collection of R1a–R1d for both apps.
**Requirements:** R1.
**Dependencies:** U1.
**Files:** `bench/lighthouse.sh`, `bench/stress-scoreboard.ts` (Playwright script), `bench/results/` (raw JSON output, gitignored except summaries).
**Approach:** Lighthouse CLI x5 per route per app → extract LCP/TBT/CLS + transfer sizes, compute medians. Playwright script loads the scoreboard, measures time-to-first-rows (row selector visible), scripted scroll with frame timing (CDP `Performance` domain), JS heap via CDP `Performance.getMetrics` (`JSHeapUsedSize` — not `performance.memory`, which is deprecated and quantized), and client-side nav latency between the four routes.
**Test scenarios:** harness run against both apps completes without manual steps; medians computed from exactly 5 samples; a rerun produces numbers within normal variance (sanity, not asserted).
**Verification:** one command per app emits a JSON/markdown summary for all R1 metrics.

### U4. UX metrics collection

**Goal:** Collect R3a–R3c.
**Requirements:** R3.
**Dependencies:** U1, U3 (reuses the Playwright setup).
**Files:** `bench/interactions.ts` (extend the U3 Playwright harness), `bench/keyboard-checklist.md`.
**Approach:** scripted INP-style measurement (event-to-next-paint) for flag submission (dialog open → submit → feedback) and challenge filtering (type in filter → list update) in both apps; 360px viewport run asserting no horizontal overflow and capturing CLS. Keyboard checklist executed manually per app against a fixed flow list (login, browse challenges, open challenge, submit flag, scoreboard paging) and recorded as pass/fail.
**Test scenarios:** interaction script fails loudly if a selector is missing (no silent zero measurements); 360px check flags overflow when introduced deliberately (spot-verify once).
**Verification:** R3 table complete for both apps, checklist filled in.

### U5. Results report

**Goal:** The deliverable writeup artifact.
**Requirements:** all; success criteria.
**Dependencies:** U2, U3, U4.
**Files:** `docs/benchmarks/2026-07-web-rewrite-benchmark.md`.
**Approach:** one table per metric group (R1/R2/R3), methodology section (dataset scale, run counts, throttling, fair-LOC rules), and a plain-language findings summary. Losses and ties reported explicitly per the success criteria.
**Test scenarios:** Test expectation: none — documentation; verification below.
**Verification:** every R-ID from the Product Contract appears in the report with a measured value or an explicit "not measured because X".

---

## Verification Contract

- The static-metrics script (shellcheck-clean if `.sh`, oxlint-clean if `.ts`) reproduces the Product Contract baseline LOC numbers.
- Runtime harness completes end-to-end against both apps with the 1k-team dataset.
- Report covers every R-ID; no metric silently dropped.

## Definition of Done

`docs/benchmarks/2026-07-web-rewrite-benchmark.md` exists with measured medians for R1–R3 across both apps, methodology documented, and reproducible scripts in `bench/`.

## Outstanding Questions (deferred to implementation)

- Exact solve density in the seed data — affects scoreboard render cost; use seed defaults and record what they were.
- Whether frame-rate capture uses CDP tracing or rAF sampling — pick whichever is stable in the Playwright version available.
