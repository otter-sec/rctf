FROM oven/bun:1.3-alpine AS base
WORKDIR /app

FROM base AS package-configs

COPY package.json bun.lock ./
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/
COPY packages/config/package.json ./packages/config/
COPY packages/db/package.json ./packages/db/
COPY packages/types/package.json ./packages/types/

FROM base AS deps

COPY --from=package-configs /app/ ./
RUN bun install --frozen-lockfile

FROM base AS prod-deps

COPY --from=package-configs /app/ ./
RUN bun install --production --frozen-lockfile

FROM base AS build

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Symlinks :(
RUN bun install --frozen-lockfile

ENV NODE_ENV=production
RUN bun run build

FROM base AS production

# We need this for runtime
RUN bun install sharp

RUN apk add --no-cache supervisor nginx
COPY docker/supervisord.conf /etc/supervisord.conf
COPY docker/nginx.conf /etc/nginx/http.d/default.conf

COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY --from=prod-deps /app/node_modules ./node_modules

COPY --from=build /app/packages ./packages
COPY --from=build /app/apps/api/templates ./apps/api/templates

COPY --from=build /app/package.json ./
COPY --from=build /app/apps/api/package.json ./apps/api/

COPY --from=build /app/apps/web/build ./static

ENV NODE_ENV=production
ENV FRONTEND_STATIC_ROOT=/app/static/
ENV WORKER_EXTENSION=.js

CMD ["supervisord", "-c", "/etc/supervisord.conf"]
