# web-new documentation

Working documentation for the ground-up rewrite of the rCTF web frontend
(`apps/web` → `apps/web-new`). Read these before touching code.

| Document                             | Purpose                                                                                                                   |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------- |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Every architectural decision with rationale: stack, CSS system, component tiers, Zag.js rules, data layer                 |
| [PLAN.md](./PLAN.md)                 | Phased implementation plan with per-phase checklists, verification gates, and current status                              |
| [research/](./research/)             | Deep-research reports on the old app, the API contract, and external references (produced 2026-07-01, 12 parallel agents) |

## Research index

| Report                                                                  | Contents                                                                                                                              |
| ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| [01-routes-auth-shell.md](./research/01-routes-auth-shell.md)           | Auth flows (login/register/recover/verify/CTFtime/external-auth), app shell, route guards, client-config boot                         |
| [02-routes-challenges.md](./research/02-routes-challenges.md)           | Challenges page behavioral spec: master-detail, flag submit ladder, solves/scores tabs, instancer, admin bot                          |
| [03-routes-scores-profile.md](./research/03-routes-scores-profile.md)   | Scoreboard (virtualized grid, graph, focus mode, export) and profile pages (settings, analytics)                                      |
| [04-routes-admin.md](./research/04-routes-admin.md)                     | Admin: challenge editor, teams, submissions, settings; filter-architecture duplication analysis                                       |
| [05-lib-core-layer.md](./research/05-lib-core-layer.md)                 | API client, TanStack Query layer, useApiForm, xstate assessment, utils inventory, theming token contract, storage keys                |
| [06-ui-inventory.md](./research/06-ui-inventory.md)                     | All 36 shadcn families: usage counts + per-family rewrite recommendation (Zag / native / custom / drop); top-10 hardest problems      |
| [07-product-requirements.md](./research/07-product-requirements.md)     | Requirements extracted from apps/docs: client config, markdown spec, theming contract, scoring, archiving, integrations, scope bounds |
| [08-api-contract-public.md](./research/08-api-contract-public.md)       | Definitive public API catalog (method/path/auth/schemas/errors)                                                                       |
| [09-api-contract-admin.md](./research/09-api-contract-admin.md)         | Definitive admin API catalog incl. filter query languages and full challenge schema                                                   |
| [10-style-astro-erudite.md](./research/10-style-astro-erudite.md)       | astro-erudite CSS architecture + component patterns; verbatim artifacts to copy (reset, tokens, theme mechanism)                      |
| [11-zag-and-philosophy.md](./research/11-zag-and-philosophy.md)         | Zag.js + Svelte 5 integration (versions, patterns, 12 risks) and the two philosophy posts distilled                                   |
| [12-repo-churn-conventions.md](./research/12-repo-churn-conventions.md) | Git churn analysis (pain points), repo conventions, deploy/serving model constraints                                                  |
| [13-radix-colors.md](./research/13-radix-colors.md)                     | Radix Colors palette decision: 12-step scale semantics, Layer C token → Radix step mapping, vendoring procedure                       |

Reports describe `apps/web` as of branch `enscribe/fable-web-rewrite`, 2026-07-01.
They are snapshots — verify against source when something looks stale.
