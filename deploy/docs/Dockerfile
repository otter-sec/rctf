FROM oven/bun:1.3.9-alpine AS base
WORKDIR /app

FROM base AS build

RUN apk add --no-cache git

COPY apps/docs/package.json apps/docs/bun.lock ./
RUN bun install --frozen-lockfile --linker=hoisted --backend=copyfile --no-cache

COPY tsconfig.json /tsconfig.json
COPY apps/docs/ .

ENV NODE_ENV=production
RUN bun run build

FROM base AS production

RUN apk add --no-cache nginx nginx-mod-http-brotli
COPY deploy/docs/nginx-static.conf /etc/nginx/http.d/default.conf

COPY --from=build /app/docs/dist ./static

ENV NODE_ENV=production
CMD ["/usr/sbin/nginx", "-g", "daemon off;"]
