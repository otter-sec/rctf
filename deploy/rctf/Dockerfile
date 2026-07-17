FROM --platform=$BUILDPLATFORM oven/bun:1.3.14-alpine AS build-base
WORKDIR /app

FROM oven/bun:1.3.14-alpine AS runtime-base
WORKDIR /app

# TODO(es3n1n): deduplicate it once we settle on a sane shared Docker build pattern
FROM build-base AS package-configs

COPY package.json bun.lock ./
COPY packages/config/package.json ./packages/config/
COPY packages/db/package.json ./packages/db/
COPY packages/scoring/package.json ./packages/scoring/
COPY packages/types/package.json ./packages/types/
COPY packages/util/package.json ./packages/util/
COPY tests/server/package.json ./tests/server/
COPY tests/admin-bot/package.json ./tests/admin-bot/
COPY tests/admin-bot-e2e/package.json ./tests/admin-bot-e2e/
COPY apps/admin-bot/package.json ./apps/admin-bot/
COPY apps/api/package.json ./apps/api/
COPY apps/cli/package.json ./apps/cli/
COPY apps/docs/package.json ./apps/docs/
COPY apps/web/package.json ./apps/web/

FROM build-base AS deps

COPY --from=package-configs /app/ ./
RUN bun install \
    --frozen-lockfile \
    --linker=hoisted \
    --backend=copyfile \
    --no-cache \
    --filter '!@rctf/admin-bot' \
    --filter '!@rctf/docs' \
    --filter '!server-tests' \
    --filter '!admin-bot-tests' \
    --filter '!admin-bot-e2e-tests'

FROM runtime-base AS prod-deps

COPY --from=package-configs /app/ ./
RUN bun install \
    --production \
    --frozen-lockfile \
    --linker=hoisted \
    --backend=copyfile \
    --no-cache \
    --filter '!@rctf/admin-bot' \
    --filter '!@rctf/docs' \
    --filter '!server-tests' \
    --filter '!admin-bot-tests' \
    --filter '!admin-bot-e2e-tests'

FROM build-base AS build-src

COPY --from=deps /app/node_modules ./node_modules
COPY --from=package-configs /app/package.json /app/bun.lock ./

COPY apps ./apps
COPY packages ./packages
COPY tsconfig.json ./

ENV NODE_ENV=production

FROM build-src AS build-api
RUN bun run --filter '@rctf/api' build

FROM build-src AS build-web
RUN bun run --filter '@rctf/web' build

FROM build-src AS build-cli
RUN bun run --filter '@rctf/cli' build

FROM runtime-base AS production

RUN apk add --no-cache supervisor nginx nginx-mod-http-brotli
COPY deploy/rctf/supervisord.conf /etc/supervisord.conf
COPY deploy/rctf/nginx.conf /etc/nginx/http.d/default.conf
COPY deploy/rctf/docker-entrypoint.sh /usr/local/bin/docker-entrypoint
RUN chmod +x /usr/local/bin/docker-entrypoint

COPY --from=build-api /app/apps/api/dist ./apps/api/dist
COPY --from=prod-deps /app/node_modules ./node_modules

COPY --from=build-src /app/packages/db/migrations ./packages/db/migrations
COPY --from=build-src /app/apps/api/templates ./apps/api/templates

COPY --from=build-cli /app/apps/cli/dist ./apps/cli/dist
RUN printf '#!/bin/sh\ncd /app\nexec bun /app/apps/cli/dist/index.js "$@"\n' > /usr/local/bin/rctf \
    && chmod +x /usr/local/bin/rctf

COPY --from=build-web /app/apps/web/build ./static

ENV NODE_ENV=production
ENV WORKER_EXTENSION=.js
ENTRYPOINT ["/usr/local/bin/docker-entrypoint"]
CMD ["supervisord", "-c", "/etc/supervisord.conf"]
