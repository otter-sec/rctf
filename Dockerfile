FROM oven/bun:1.3-alpine AS base
WORKDIR /app

FROM base AS deps

COPY package.json bun.lock ./
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/
COPY packages/config/package.json ./packages/config/
COPY packages/db/package.json ./packages/db/
COPY packages/types/package.json ./packages/types/

RUN bun install --frozen-lockfile

FROM base AS prod-deps

COPY package.json bun.lock ./
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/
COPY packages/config/package.json ./packages/config/
COPY packages/db/package.json ./packages/db/
COPY packages/types/package.json ./packages/types/

RUN bun install --production

FROM base AS build

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NODE_ENV=production
RUN bun run build

FROM base AS production

WORKDIR /app

COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY --from=prod-deps /app/node_modules ./node_modules

COPY --from=build /app/packages ./packages
COPY --from=build /app/apps/api/templates ./apps/api/templates

COPY --from=build /app/package.json ./
COPY --from=build /app/apps/api/package.json ./apps/api/

COPY --from=build /app/apps/web/build ./static

ENV NODE_ENV=production
ENV PORT=80
ENV FRONTEND_STATIC_ROOT=/app/static/
CMD ["bun", "run", "/app/apps/api/dist/index.js"]
