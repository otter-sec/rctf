# rCTF

## Package structure

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

## Prerequisites and setup

- Bun v1.0+
- PostgreSQL 12+
- Redis 6+ (for caching)

```bash
bun install
bun run db:generate
bun run db:migrate
bun run db:push # dev only
bun run dev
```

## Environment variables

Place project secrets alongside `package.json` as `.env` (checked-in template `.env.example`).

| Name            | Required | Default | Description                                                 |
| --------------- | -------- | ------- | ----------------------------------------------------------- |
| `DATABASE_URL`  | Yes      |         | Postgres connection string (`postgres://user:pass@host/db`) |
| `REDIS_URL`     | No       |         | Redis connection string for caching                         |
| `TOKEN_KEY`     | Yes      |         | Base64-encoded 32-byte secret for auth                      |
| `PORT`          | No       | `3000`  | API listen port                                             |
| `LOGIN_TIMEOUT` | No       | `3600`  | Token expiry in seconds for verify/CTFtime tokens           |

## Workspace commands

| Command                 | Description                    |
| ----------------------- | ------------------------------ |
| `bun run dev`           | Start API dev server           |
| `bun run dev:api`       | Start API only                 |
| `bun run dev:web`       | Start web frontend only        |
| `bun run db:generate`   | Generate migration files       |
| `bun run db:migrate`    | Run migrations                 |
| `bun run db:push`       | Push schema (dev only)         |
| `bun run db:studio`     | Open Drizzle Studio            |
| `bun run build`         | Build all packages             |
| `bun run test`          | Run all tests                  |
| `bun run test:coverage` | Run tests with coverage report |
| `bun run typecheck`     | Type-check all packages        |
| `bun run clean`         | Remove all `node_modules`      |

## Tech stack

| Component     | Technology  |
| ------------- | ----------- |
| Runtime       | Bun         |
| API Framework | Hono        |
| Web Framework | SvelteKit   |
| Database      | PostgreSQL  |
| ORM           | Drizzle ORM |
| Caching       | Redis       |
| Language      | TypeScript  |
