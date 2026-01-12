ARG LOW_RESOURCE=0

FROM oven/bun:1.3-alpine AS base
WORKDIR /app

FROM base AS package-configs

COPY package.json bun.lock ./
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/
COPY packages/config/package.json ./packages/config/
COPY packages/db/package.json ./packages/db/
COPY packages/types/package.json ./packages/types/
COPY packages/util/package.json ./packages/util/

FROM base AS deps

ARG LOW_RESOURCE
COPY --from=package-configs /app/ ./
RUN if [ "$LOW_RESOURCE" = "1" ]; then \
    bun --smol install --frozen-lockfile --linker=hoisted --backend=copyfile --no-cache --concurrent-scripts=1; \
  else \
    bun install --frozen-lockfile --linker=hoisted --backend=copyfile --no-cache; \
  fi

FROM base AS prod-deps

ARG LOW_RESOURCE
COPY --from=package-configs /app/ ./
RUN if [ "$LOW_RESOURCE" = "1" ]; then \
    bun --smol install --production --frozen-lockfile --linker=hoisted --backend=copyfile --no-cache --concurrent-scripts=1; \
  else \
    bun install --production --frozen-lockfile --linker=hoisted --backend=copyfile --no-cache; \
  fi

FROM base AS build

ARG LOW_RESOURCE
COPY --from=deps /app/node_modules ./node_modules
COPY --from=package-configs /app/package.json /app/bun.lock ./

COPY apps ./apps
COPY packages ./packages
COPY scripts ./scripts
COPY tsconfig.json ./

ENV NODE_ENV=production
RUN if [ "$LOW_RESOURCE" = "1" ]; then \
    LOW_RESOURCE=1 bun --smol ./scripts/build-low-resource.ts; \
  else \
    bun run build; \
  fi

FROM base AS production

RUN apk add --no-cache supervisor nginx nginx-mod-http-brotli
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
ENV WORKER_EXTENSION=.js
CMD ["supervisord", "-c", "/etc/supervisord.conf"]
