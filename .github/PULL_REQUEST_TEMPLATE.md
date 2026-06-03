<!-- Title: conventional commits, scoped to the workspace ("feat(api): add foo", "fix(web): align bar"). PRs are squash-merged, so the title becomes the commit message. -->

## What does this PR do?

<!-- Short description. Link issues with "Fixes #123". -->

## Checklist

- [ ] New backend features are covered with tests
- [ ] `bun test` passes
- [ ] `bun run typecheck` passes
- [ ] `bun run prettier:check` passes
- [ ] Schema changes come with a generated migration (`bun run db:generate`)
- [ ] Docs updated if behavior changed (`apps/docs`)
