FROM --platform=$BUILDPLATFORM oven/bun:1.3.14-debian AS build
WORKDIR /app

COPY apps/admin-bot/package.json ./
RUN bun install --frozen-lockfile

COPY tsconfig.json /tsconfig.json
COPY apps/admin-bot/tsconfig.json ./
COPY apps/admin-bot/src/ ./src/
RUN bun run build

FROM oven/bun:1.3.14-debian
WORKDIR /app

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

COPY apps/admin-bot/package.json ./
RUN bun install --production

COPY --from=build /app/dist ./dist/

USER adminbot
EXPOSE 21337
CMD ["bun", "run", "dist/index.js"]
