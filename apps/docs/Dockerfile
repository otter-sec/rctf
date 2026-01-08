FROM oven/bun:1.3-alpine AS base
WORKDIR /app

FROM base AS build

RUN apk add --no-cache git

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --linker=hoisted --backend=copyfile --no-cache

COPY . .
RUN echo '{"include": ["docs/**/*"]}' > tsconfig.json

ENV NODE_ENV=production
RUN bun run build

FROM base AS production

RUN apk add --no-cache nginx nginx-mod-http-brotli
COPY nginx.conf /etc/nginx/http.d/default.conf

COPY --from=build /app/docs/dist ./static

ENV NODE_ENV=production
CMD ["/usr/sbin/nginx", "-g", "daemon off;"]
