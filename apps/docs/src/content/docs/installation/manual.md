---
title: Manual installation
description: Set up rCTF from source for development or custom deployments.
order: 1
---

This guide covers setting up rCTF from source without Docker, suitable for development or environments where you need full control over the stack.

## Prerequisites

- [Bun](https://bun.sh/) 1.2 or later
- PostgreSQL 15+
- Redis 7+

## Project structure

rCTF is a (mostly) Bun monorepo with the following layout:

:::file-tree
- apps/
  - api/ Hono REST API server
  - web/ SvelteKit frontend (static build)
  - admin-bot/ Puppeteer-based admin bot service
  - k8s-operator/ Kubernetes challenge instancer (Go)
  - docker-instancer/ Docker challenge instancer (Python)
  - docs/ Documentation site
  - cli/ Operational CLI
- packages/
  - config/ YAML/JSON config loader with Zod validation
  - db/ Drizzle ORM schema and migrations
  - scoring/ Pluggable scoring algorithms
  - types/ Shared route definitions and validators
  - util/ Small shared utilities
:::

## Setup

::::steps
1. **Clone and install dependencies**

   ```console
   $ <red>git</red> clone https://github.com/otter-sec/rctf.git
   $ <red>cd</red> rctf
   $ <red>bun</red> i
   ```

2. **Create a configuration directory**

   rCTF loads configuration from a `rctf.d/{:dir}` directory. Files inside it (YAML or JSON) are loaded alphabetically and deep-merged. Create one with `$ <red>mkdir</red> rctf.d` at the project root.

   :::file-tree
   - rctf.d/
     - **01-base.yaml** create this next
   :::

   Create a minimal configuration file:

   ```yaml title="rctf.d/01-base.yaml" showLineNumbers
   ctfName: My CTF
   origin: https://ctf.example.com
   tokenKey: <dim><base64-encoded-32-byte-key></dim>

   database:
     sql: postgres://user:password@localhost:5432/rctf
     redis: redis://localhost:6379
     migrate: before

   startTime: 1735689600000
   endTime: 1735776000000

   divisions:
     open: Open
   ```

   :::tip[Generating a token key]
   The `<red>tokenKey</red>` must be a base64-encoded 32-byte random key used for AES-GCM token encryption. Generate one with `$ <red>openssl</red> rand <dim>-base64</dim> 32`.
   :::

   You can also set configuration values through environment variables. See [Configuration](/configuration) for the full reference.

3. **Run database migrations**

   ```console
   $ <red>bun</red> run db:migrate
   ```

   Alternatively, set `<red>database.migrate</red>` to `<green>before</green>` in your config to run migrations automatically on startup.

4. **Start the development servers**

   ```console
   $ <red>bun</red> dev
   ```

   This starts both the API server on `http://127.0.0.1:3000` and the SvelteKit dev server on `http://127.0.0.1:5173`. The dev server proxies API requests to the backend.

   To run them separately:

   ```console
   $ <red>bun</red> run dev:api   <dim># API only on :3000</dim>
   $ <red>bun</red> run dev:web   <dim># Frontend only on :5173</dim>
   ```

   :::tip[One-shot dev setup]
   For a fresh local environment, `$ <red>bun</red> run dev:mock` chains `$ <red>bun</red> run db:migrate`, `$ <red>bun</red> run dev:seed`, and `$ <red>bun</red> run dev` together. The seed resets the database and populates it with an admin account, 250 teams, 20 challenges across `<orange>rev</orange>`/`<red>pwn</red>`/`<yellow>crypto</yellow>`/`<blue>web</blue>`/`<magenta>misc</magenta>`, plus realistic solves and submissions. Login URLs for the admin and a sample team are printed to the console.
   :::
::::

## Production build

For production deployments, use our prebuilt Docker images rather than running a source build by hand. The image bundles the API, the compiled leaderboard worker, and the static frontend, and it runs Drizzle migrations on boot:

```yaml
image: ghcr.io/otter-sec/rctf-new:latest
```

See [Quick start with Docker](/installation/) for the full Compose setup. The manual-from-source path above is meant for development; running `bun` directly in production means owning the build, worker wiring, and reverse proxy yourself, which the image already handles.

## Scaling

The `<red>instanceType</red>` config option lets you split an rCTF process into `<green>frontend</green>`-only or `<green>leaderboard</green>`-only roles for horizontal scaling. See [Scaling](/installation/scaling) for the full table.

## Running tests

Tests use PGlite (in-process PostgreSQL) and ioredis-mock, so no external services are needed:

```console
$ <red>bun</red> run test                 <dim># Run all tests from root</dim>
$ <red>bun</red> run test:server:coverage <dim># Server tests with coverage</dim>
$ <red>bun</red> run typecheck            <dim># Typecheck all workspaces</dim>
```
