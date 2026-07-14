FROM --platform=$BUILDPLATFORM oven/bun:1.3.14-debian AS build-base
WORKDIR /app

FROM oven/bun:1.3.14-debian AS runtime-base
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
    --filter '!@rctf/api' \
    --filter '!@rctf/cli' \
    --filter '!@rctf/config' \
    --filter '!@rctf/db' \
    --filter '!@rctf/docs' \
    --filter '!@rctf/scoring' \
    --filter '!@rctf/types' \
    --filter '!@rctf/web' \
    --filter '!server-tests' \
    --filter '!admin-bot-tests' \
    --filter '!admin-bot-e2e-tests'

FROM build-base AS build

COPY --from=deps /app/node_modules ./node_modules
COPY --from=package-configs /app/package.json /app/bun.lock ./

COPY tsconfig.json ./
COPY apps/admin-bot/package.json apps/admin-bot/tsconfig.json ./apps/admin-bot/
COPY apps/admin-bot/src/ ./apps/admin-bot/src/
COPY packages/util/package.json ./packages/util/
COPY packages/util/src/ ./packages/util/src/

RUN bun run --filter '@rctf/admin-bot' build

FROM runtime-base AS prod-deps

COPY --from=package-configs /app/ ./
RUN bun install \
    --production \
    --frozen-lockfile \
    --linker=hoisted \
    --backend=copyfile \
    --no-cache \
    --filter '!@rctf/api' \
    --filter '!@rctf/cli' \
    --filter '!@rctf/config' \
    --filter '!@rctf/db' \
    --filter '!@rctf/docs' \
    --filter '!@rctf/scoring' \
    --filter '!@rctf/types' \
    --filter '!@rctf/web' \
    --filter '!server-tests' \
    --filter '!admin-bot-tests' \
    --filter '!admin-bot-e2e-tests'

FROM runtime-base AS production

RUN groupadd -r adminbot && useradd -r -g adminbot -m -s /usr/sbin/nologin adminbot

RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    fontconfig \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libatspi2.0-0 \
    libcairo2 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libegl1 \
    libgbm1 \
    libglib2.0-0 \
    libnspr4 \
    libnss3 \
    libpango-1.0-0 \
    libx11-6 \
    libx11-xcb1 \
    libxcb1 \
    libxcomposite1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxkbcommon0 \
    libxrandr2 \
    libxrender1 \
    libxshmfence1 \
    # Firefox
    libgtk-3-0 \
    libdbus-glib-1-2 \
    libxt6 \
    libxtst6 \
    unzip \
    xz-utils \
    && rm -rf /var/lib/apt/lists/*

ENV BROWSER_CACHE_DIR=/data/browser-cache
ENV HOME=/tmp
# firefox my beloved:
ENV DBUS_SESSION_BUS_ADDRESS=/dev/null
ENV MOZ_REMOTE_SETTINGS_DEVTOOLS=1
ENV XDG_CACHE_HOME=/tmp/.cache
ENV XDG_CONFIG_HOME=/tmp/.config
ENV XDG_RUNTIME_DIR=/tmp/.run
RUN mkdir -p /data/browser-cache && chown -R adminbot:adminbot /data

COPY --from=prod-deps /app/node_modules ./node_modules

# prewarm stable browsers into the cache
COPY --chmod=755 deploy/admin-bot/prewarm.sh ./prewarm.sh
RUN ./prewarm.sh && chown -R adminbot:adminbot /data

COPY --from=build /app/packages/util/package.json ./packages/util/package.json
COPY --from=build /app/packages/util/src ./packages/util/src

COPY --from=build /app/package.json ./
COPY --from=build /app/apps/admin-bot/dist ./dist/

USER adminbot
EXPOSE 21337
CMD ["bun", "run", "dist/index.js"]
