FROM --platform=$BUILDPLATFORM oven/bun:1.3.14-alpine AS build-base
WORKDIR /app

RUN apk add --no-cache git

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
COPY apps/docs/package.json ./apps/docs/
COPY apps/export/package.json ./apps/export/
COPY apps/seed/package.json ./apps/seed/
COPY apps/web/package.json ./apps/web/

FROM build-base AS build

COPY --from=package-configs /app/ ./
RUN bun install \
    --frozen-lockfile \
    --linker=hoisted \
    --backend=copyfile \
    --no-cache \
    --filter '@rctf/docs'

COPY apps/docs/ ./apps/docs/
COPY packages/scoring/ ./packages/scoring/
COPY packages/types/ ./packages/types/
COPY packages/util/ ./packages/util/
COPY tsconfig.json ./

ENV NODE_ENV=production
WORKDIR /app/apps/docs
RUN bun run build

FROM alpine:3.21 AS production

RUN apk add --no-cache nginx nginx-mod-http-brotli
COPY deploy/docs/nginx-static.conf /etc/nginx/http.d/default.conf

COPY --from=build /app/apps/docs/dist /app/static

ENV NODE_ENV=production
CMD ["/usr/sbin/nginx", "-g", "daemon off;"]
