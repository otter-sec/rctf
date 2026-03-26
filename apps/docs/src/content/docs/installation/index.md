---
title: Installation
description: Deploy rCTF in minutes with Docker or set it up manually.
---

rCTF can be deployed in minutes using the automated installation script, or set up manually for more control over the environment.

## Prerequisites

- **PostgreSQL 15+** with the `pg_trgm` extension (used for fuzzy team name search)
- **Redis 7+** for caching, rate limiting, and leaderboard computation
- **Bun 1.2+** (only required for [manual installation](/installation/manual))

For a production deployment, a VPS with at least 2 CPU cores and 4 GiB RAM is recommended. See the [Setting Up a CTF Platform](/running-a-successful-ctf/03-setup) guide for a complete walkthrough including Nginx, TLS, and firewall configuration.

## Quick start with Docker

The fastest way to get rCTF running is the automated installation script:

```bash title="Terminal"
curl -L https://get.rctf.osec.io | sh
```

This installs rCTF to `/opt/rctf` with Docker Compose, including PostgreSQL, Redis, and the rCTF server. When prompted, answer `y` to start the platform immediately.

After installation, configure your instance by editing files in `/opt/rctf/rctf.d/`:

```bash title="Terminal"
cd /opt/rctf && docker compose up -d --force-recreate --build
```

See [Configuration](/configuration) for the full reference of available options.

## Project structure

rCTF is a Bun monorepo with the following layout:

| Directory             | Description                                 |
| --------------------- | ------------------------------------------- |
| `apps/api`            | Hono REST API server                        |
| `apps/web`            | SvelteKit frontend (static build)           |
| `apps/admin-bot`      | Puppeteer-based admin bot service           |
| `apps/k8s-controller` | Kubernetes challenge instancer              |
| `apps/docs`           | Documentation site                          |
| `packages/config`     | YAML/JSON config loader with Zod validation |
| `packages/db`         | Drizzle ORM schema and migrations           |
| `packages/types`      | Shared route definitions and validators     |
| `packages/util`       | Small shared utilities                      |

## Next steps

- [Manual installation](/installation/manual) for development or custom deployments
- [Configuration](/configuration) for the full configuration reference
- [Upgrading from v1](/installation/upgrading) if migrating from an older version
