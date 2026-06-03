# Contributing to rCTF

Thanks for helping out. This page covers the practical bits: where to ask things, how to get a dev environment running, and what we expect from a PR.

## Where to go

- Questions and support: [GitHub Discussions](https://github.com/otter-sec/rctf/discussions)
- Bugs and feature requests: [issues](https://github.com/otter-sec/rctf-new/issues)
- Security vulnerabilities: email [rctf@osec.io](mailto:rctf@osec.io). See the [security policy](SECURITY.md).

## Development setup

The [README](../README.md#development) walks through it: install [Bun](https://bun.sh), run `bun i`, start the dev containers with `docker compose -f compose.dev.yml up -d`, drop a config into `rctf.d/`, and run `bun dev`. For frontend work, `bun dev:mock` seeds the database with reproducible mock teams, challenges, and solves.

## Before you open a PR

Run the same checks CI runs:

- `bun test` (no external services needed; tests run on PGlite and a Redis mock)
- `bun run typecheck`
- `bun run prettier:check` (or `bun run prettier` to fix formatting)

A few conventions:

- PR titles follow conventional commits, scoped to the workspace: `feat(api): ...`, `fix(web): ...`, `docs: ...`. PRs are squash-merged, so the title becomes the commit message.
- Database schema changes need a generated migration: `bun run db:generate`.
- Behavior changes should update the docs (`apps/docs`) in the same PR.
- Keep PRs focused. Small and reviewable beats big and complete.

By contributing you agree that your contributions are licensed under the [Apache License 2.0](../LICENSE).
