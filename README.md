# rCTF

## Package structure

This is a monorepo using Bun workspaces:

```
rctf/
├── apps/
│   ├── api/          # Hono
│   └── web/          # SvelteKit
├── packages/
│   ├── types/        # Types
│   └── db/           # Drizzle
```

| Package       | Description                 |
| ------------- | --------------------------- |
| `@rctf/types` | Shared TypeScript types     |
| `@rctf/db`    | Database schema and helpers |
| `@rctf/api`   | API backend (Hono)          |
| `@rctf/web`   | Frontend (SvelteKit)        |

## Getting started

### Prerequisites

- [Bun](https://bun.sh) v1.0+
- PostgreSQL 12+
- Redis 6+ (for caching)

### Setup

```bash
bun install
cp .env.example .env
bun run db:generate
bun run db:migrate
bun run db:push # dev only
bun run dev
```

## Workspace commands

| Command               | Description               |
| --------------------- | ------------------------- |
| `bun run dev`         | Start API dev server      |
| `bun run dev:api`     | Start API only            |
| `bun run dev:web`     | Start web frontend only   |
| `bun run db:generate` | Generate migration files  |
| `bun run db:migrate`  | Run migrations            |
| `bun run db:push`     | Push schema (dev only)    |
| `bun run db:studio`   | Open Drizzle Studio       |
| `bun run build`       | Build all packages        |
| `bun run test`        | Run all tests             |
| `bun run typecheck`   | Type-check all packages   |
| `bun run clean`       | Remove all `node_modules` |

### Tech stack

| Component     | Technology  |
| ------------- | ----------- |
| Runtime       | Bun         |
| API Framework | Hono        |
| Web Framework | SvelteKit   |
| Database      | PostgreSQL  |
| ORM           | Drizzle ORM |
| Caching       | Redis       |
| Language      | TypeScript  |