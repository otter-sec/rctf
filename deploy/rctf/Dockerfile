FROM --platform=$BUILDPLATFORM oven/bun:1.3.10-alpine AS build-base
WORKDIR /app

FROM oven/bun:1.3.10-alpine AS runtime-base
WORKDIR /app

# TODO(es3n1n): deduplicate it once we settle on a sane shared Docker build pattern
FROM build-base AS package-configs

COPY package.json bun.lock ./
COPY packages/config/package.json ./packages/config/
COPY packages/db/package.json ./packages/db/
COPY packages/types/package.json ./packages/types/
COPY packages/util/package.json ./packages/util/
COPY tests/server/package.json ./tests/server/
COPY tests/admin-bot/package.json ./tests/admin-bot/
COPY tests/admin-bot-e2e/package.json ./tests/admin-bot-e2e/
COPY apps/admin-bot/package.json ./apps/admin-bot/
COPY apps/api/package.json ./apps/api/
COPY apps/docs/package.json ./apps/docs/
COPY apps/export/package.json ./apps/export/
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
    --filter '!@rctf/export' \
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
    --filter '!@rctf/export' \
    --filter '!server-tests' \
    --filter '!admin-bot-tests' \
    --filter '!admin-bot-e2e-tests'

FROM build-base AS build

COPY --from=deps /app/node_modules ./node_modules
COPY --from=package-configs /app/package.json /app/bun.lock ./

COPY apps ./apps
COPY packages ./packages
COPY tsconfig.json ./

ENV NODE_ENV=production
RUN bun run --filter '@rctf/api' build
RUN bun run --filter '@rctf/web' build

FROM runtime-base AS production

RUN apk add --no-cache supervisor nginx nginx-mod-http-brotli
COPY deploy/rctf/supervisord.conf /etc/supervisord.conf
COPY deploy/rctf/nginx.conf /etc/nginx/http.d/default.conf

COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY --from=prod-deps /app/node_modules ./node_modules

COPY --from=build /app/packages/config/package.json ./packages/config/package.json
COPY --from=build /app/packages/db/package.json ./packages/db/package.json
COPY --from=build /app/packages/types/package.json ./packages/types/package.json
COPY --from=build /app/packages/util/package.json ./packages/util/package.json
COPY --from=build /app/packages/config/src ./packages/config/src
COPY --from=build /app/packages/db/src ./packages/db/src
COPY --from=build /app/packages/db/migrations ./packages/db/migrations
COPY --from=build /app/packages/types/src ./packages/types/src
COPY --from=build /app/packages/util/src ./packages/util/src
COPY --from=build /app/apps/api/templates ./apps/api/templates

COPY --from=build /app/package.json ./
COPY --from=build /app/apps/api/package.json ./apps/api/

COPY --from=build /app/apps/web/build ./static

ENV NODE_ENV=production
ENV WORKER_EXTENSION=.js
CMD ["supervisord", "-c", "/etc/supervisord.conf"]
