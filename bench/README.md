# Web rewrite benchmark harness

One-off benchmark comparing `apps/web` (v1) and `apps/web-new` (v2). See
`docs/plans/2026-07-07-001-chore-web-rewrite-benchmark-plan.md` for methodology
and `docs/benchmarks/` for results.

## Setup

1. Postgres + Redis running (docker), then:

   ```sh
   bun run db:migrate
   SEED_TEAM_COUNT=1000 SEED_GENERATED_CHALLENGE_COUNT=71 bun run dev:seed
   bun run dev:api
   ```

   Save the "Sample team login" URL the seed prints — the harness uses its
   `token` query param to authenticate.

2. Point v2 at the local API (temporary, do not commit): in
   `apps/web-new/vite.config.ts` set `DEV_API_URL = 'http://127.0.0.1:3000'`.
   v1 already targets the local API.

3. Build and serve both apps (`vite preview` inherits `server.proxy`):

   ```sh
   (cd apps/web && bun run build && bunx --bun vite preview --port 4173 --strictPort) &
   (cd apps/web-new && bun run build && bunx --bun vite preview --port 4174 --strictPort) &
   ```

4. One-time: `bunx playwright install chromium`

## Running

- `bench/static-metrics.sh [--build]` — leaner-codebase table (R2); `--build`
  adds timed cold builds.
- `bench/lighthouse.sh` — LCP/TBT/CLS + transfer sizes per route per app (R1a/R1b).
- `bun bench/stress-scoreboard.ts <base-url> <login-token>` — scoreboard stress,
  nav latency, JS heap (R1c/R1d).
- `bun bench/interactions.ts <base-url> <login-token>` — INP probes + 360px
  viewport check (R3a/R3c).

All runtime numbers are medians of 5 runs; Lighthouse uses `--preset desktop`.
The flag-submit probe submits a deliberately wrong flag so every run measures
the same code path.
