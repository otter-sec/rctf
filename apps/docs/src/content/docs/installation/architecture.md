---
title: Architecture
description: Reference for the bundled rCTF container, its build pipeline, in-container processes, and horizontal scaling model.
order: 3
---

rCTF ships as a single container managed by `supervisord`. Inside the container, the Hono API server runs as a Bun process that also spawns the leaderboard worker as a Bun `Worker` thread. Alongside it, an nginx instance serves the SvelteKit static build and proxies `/api` and `/uploads` to the API.

The container sits behind a reverse proxy and connects to PostgreSQL and Redis. The bundled `compose.yml{:file}` starts all three services for a single-server deployment.

For deployment steps, see [Installation](/installation) and the [VPS setup walkthrough](/meta/running-a-successful-ctf/setup). The sections below describe the production image itself.

## Container layout

The production container has the following layout:

:::file-tree
- app/
  - apps/
    - api/
      - dist/ Bun-built API + leaderboard worker
      - templates/ Email templates
  - packages/
    - config/ Loader sources
    - db/
      - src/
      - migrations/ Drizzle SQL migrations
    - scoring/
    - types/
    - util/
  - node_modules/ Production-only deps
  - static/ SvelteKit static build, served by nginx
  - rctf.d/ Mounted config directory
  - uploads/ Local upload provider data (when used)
- etc/
  - supervisord.conf Process definitions
  - nginx/
    - nginx.conf Main config
    - http.d/
      - default.conf Static + /api proxy
- tmp/
  - nginx/
    - security-headers.conf CSP, generated at startup
:::

The `rctf.d/{:dir}` and `uploads/{:dir}` directories are mounted from the host by `compose.yml{:file}`. With the default local upload provider, files land under `/app/uploads/{:dir}`.

Everything the container writes at runtime lives under `/tmp/{:dir}`, so it can run with a read-only root filesystem; `compose.yml{:file}` sets `read_only: true{:yaml}` and mounts `/tmp/{:dir}` as a tmpfs.

## Build stages

The Dockerfile is at `deploy/rctf/Dockerfile{:file}` and uses `oven/bun:1.3.14-alpine` as both the build and runtime base. The stages:

| Stage | Base | Role |
| --- | --- | --- |
| `build-base` | `oven/bun:1.3.14-alpine` (BUILDPLATFORM) | Base for build steps that run on the build platform. |
| `runtime-base` | `oven/bun:1.3.14-alpine` (target platform) | Base for production dependencies and the final image. |
| `package-configs` | `build-base` | Copies workspace manifests and `bun.lock{:file}` so source changes do not invalidate the dependency layer. |
| `deps` | `build-base` | Full install (including devDependencies) for the API, web, and CLI workspaces. Filters out `@rctf/admin-bot`, `@rctf/docs`, and the test workspaces. |
| `prod-deps` | `runtime-base` | Production-only install (`<dim>--production</dim>`) on the same filter set, used as `node_modules/{:dir}` in the final image. |
| `build-src` | `build-base` | Assembles the full sources plus dev `node_modules/{:dir}` as the shared base for the build stages. |
| `build-api` / `build-web` / `build-cli` | `build-src` | Each runs its workspace's `$ <red>bun</red> run build`. Independent stages, so BuildKit builds all three in parallel. |
| `production` | `runtime-base` | Installs `supervisor`, `nginx`, and `nginx-mod-http-brotli`, then copies the API dist, prod node_modules, migrations, email templates, the [rctf CLI](/admin/cli), and the SvelteKit static output into `/app/{:dir}`. |

```dockerfile title="deploy/rctf/Dockerfile"
FROM oven/bun:1.3.14-alpine AS runtime-base
WORKDIR /app
# ...
FROM runtime-base AS production

RUN apk add --no-cache supervisor nginx nginx-mod-http-brotli \
    && addgroup -g 1001 rctf \
    && adduser -S -D -H -G rctf -u 1001 -s /sbin/nologin rctf

COPY deploy/rctf/supervisord.conf /etc/supervisord.conf
COPY deploy/rctf/nginx-main.conf /etc/nginx/nginx.conf
COPY deploy/rctf/nginx.conf /etc/nginx/http.d/default.conf
COPY deploy/rctf/docker-entrypoint.sh /usr/local/bin/docker-entrypoint
RUN chmod +x /usr/local/bin/docker-entrypoint

COPY --from=build-api /app/apps/api/dist ./apps/api/dist
COPY --from=prod-deps /app/node_modules ./node_modules
# ...
COPY --from=build-web /app/apps/web/build ./static

ENV NODE_ENV=production
ENV WORKER_EXTENSION=.js
ENTRYPOINT ["/usr/local/bin/docker-entrypoint"]
```

`<yellow>WORKER_EXTENSION</yellow>` is set to `<green>.js</green>` so the API process resolves its compiled worker entry (`./leaderboard.js{:file}`) rather than the `.ts` source used in development.

## Process supervision

`/etc/supervisord.conf{:file}` defines two long-running programs. Both stream stdout/stderr to the container's stdout/stderr without rotation.

| Program | Command | Role |
| --- | --- | --- |
| `api` | `$ <red>bun</red> run /app/apps/api/dist/index.js` | Hono server on `:3000`, running as the unprivileged `rctf` user. Spawns the leaderboard worker as a Bun `Worker` when `<red>instanceType</red>` is `<green>all</green>` or `<green>leaderboard</green>`. |
| `nginx` | `$ <red>nginx</red> <dim>-g</dim> <green>'daemon off;'</green>` | Serves `/app/static/{:dir}` and reverse-proxies `/api` and `/uploads` to `127.0.0.1:3000`. Workers run as the `nginx` user. |

```ini title="deploy/rctf/supervisord.conf"
[program:api]
command=/usr/local/bin/bun run /app/apps/api/dist/index.js
user=rctf
autostart=true
autorestart=true
# ...

[program:nginx]
command=/usr/sbin/nginx -g 'daemon off;'
autostart=true
autorestart=true
```

If either process exits non-zero, `supervisord` restarts it. The leaderboard worker is not a separate supervised program. It is a thread inside the API process, so it restarts together with the API.

:::note[Leaderboard updates without a worker thread]
When `<red>instanceType</red>` is `<green>frontend</green>`, the API process does not start the worker. Another process running with `<green>leaderboard</green>` or `<green>all</green>` must be reachable on the same Redis instance for cached leaderboard reads to stay fresh.
:::

## Nginx

The container's nginx is built from Alpine's `nginx` package together with `nginx-mod-http-brotli`. The site config at `deploy/rctf/nginx.conf{:file}` is copied to `/etc/nginx/http.d/default.conf{:file}`. Before supervisor starts, the container entrypoint generates the security-header configuration from `rctf.d/{:dir}`, writes it to `/tmp/nginx/security-headers.conf{:file}`, and runs `$ <red>nginx</red> <dim>-t -e stderr</dim>` to validate the complete configuration.

```nginx title="deploy/rctf/nginx.conf"
server {
    listen 80 default_server;
    root /app/static;
    gzip_static on;
    brotli_static on;
    include /tmp/nginx/security-headers.conf;
    # ...

    location ~ ^/api/v[12]/admin/upload$ {
        proxy_pass http://127.0.0.1:3000;
        client_max_body_size 0;
        proxy_request_buffering off;
    }

    location ~ ^/(api|uploads) {
        proxy_pass http://127.0.0.1:3000;
    }

    location /_app/immutable/ {
        add_header Cache-Control "public, max-age=86400, immutable";
        include /tmp/nginx/security-headers.conf;
        try_files $uri $uri/ /index.html;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

## Content Security Policy

CSP is generated in two places. SvelteKit writes a `<meta http-equiv="Content-Security-Policy">{:html}` tag into each page, including hashes for the generated scripts. At container startup, `$ <red>rctf</red> deployment generate-csp` extracts all directives from the built `index.html{:file}`, merges and deduplicates them with the configured upload, captcha, and analytics provider rules, and emits a nginx `Content-Security-Policy{:http}` response header. Startup fails if the built policy cannot be read.

```ts title="apps/web/svelte.config.ts"
csp: dev
  ? undefined
  : {
      directives: {
        'script-src': [
          'self',
          // captcha script origins
          // ...
        ],
      },
    },
```

Together, the build-time and runtime policies contain the following sources. The generated nginx policy starts with the base sources below and adds only those required by the active providers:

| Directive | Sources |
| --- | --- |
| `default-src` | `<green>'none'</green>` |
| `script-src` | `<green>'self'</green>`, SvelteKit's generated hashes, `https://www.google.com/recaptcha/`, `https://www.gstatic.com/recaptcha/`, `https://hcaptcha.com`, `https://*.hcaptcha.com`, and `https://challenges.cloudflare.com` |
| `style-src` | `<green>'self'</green>`, `<green>'unsafe-inline'</green>`, plus the active captcha provider |
| `connect-src` | `<green>'self'</green>`, `data:`, `blob:`, plus the active upload, captcha, and analytics providers |
| `font-src` | `<green>'self'</green>` |
| `img-src` | `http:`, `https:`, `blob:`, `data:` |
| `frame-src` | `https://www.youtube.com`, `https://youtube.com`, `https://www.youtube-nocookie.com`, plus the active captcha provider |
| `base-uri` | `<green>'self'</green>` |
| `form-action` | `<green>'self'</green>` |
| `object-src` | `<green>'none'</green>` |
| `media-src` | `<green>'none'</green>` |
| `manifest-src` | `<green>'none'</green>` |

Provider-specific `style-src{:http}`, `connect-src{:http}`, and `frame-src{:http}` sources are selected at runtime, so disabled providers are excluded from the nginx policy. For R2, `connect-src{:http}` uses the configured `<red>publicBaseUrl</red>`. Captcha script origins remain build-time entries because SvelteKit owns the generated script hashes.

:::warning[frame-ancestors]
The CSP omits `frame-ancestors` because it is ignored from `<meta>{:html}` tags. Click-jacking protection is enforced via the nginx `X-Frame-Options: DENY{:http}` header instead.
:::

## External dependencies

The container only contains the rCTF application, nginx, and supervisor. Everything else is external.

| Service | Version pinned in `compose.yml{:file}` | Required by |
| --- | --- | --- |
| PostgreSQL | `<green>postgres:18.0</green>` (any 15+) | Core data store. The `pg_trgm` extension is installed by migration `0015_add_trigram_search.sql{:file}` for team-name fuzzy search. |
| Redis | `<green>redis:8.2.2</green>` (any 7+) | Cache for leaderboard snapshots, rate limiting, and provider locks. |

Optional dependencies that the deployer must supply when the matching provider is enabled:

- **S3, R2, or GCS** for non-local upload provider. See [Uploads](/providers/uploads).
- **SES, SMTP, or another email provider** for the email integration.
- **OpenAI** (or another moderation provider) for avatar moderation.
- **Docker instancer** or a Kubernetes cluster running the rCTF k8s-operator for per-team challenge instances. See [Instancer](/integrations/instancer).
- **Captcha provider** (reCAPTCHA, hCaptcha, or Turnstile). The CSP already permits all three.

The bundled `compose.yml{:file}` pins one PostgreSQL and one Redis container alongside `rctf`. The `rctf` service exposes `127.0.0.1:8080` and expects a reverse proxy (typically nginx or Caddy on the host) to terminate TLS and forward to it.
