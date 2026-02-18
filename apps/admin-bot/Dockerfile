FROM oven/bun:1.3.9-debian AS base

FROM base AS build
WORKDIR /app

# TODO(es3n1n): actual lockfile whenever we consolidate all dockerfiles to something more sane
COPY package.json tsconfig.json ./
RUN bun install --frozen-lockfile

# TODO(es3n1n): this should be replaced with our actual tsconfig whenever we consolidate all dockerfiles to something sane
RUN echo '{"compilerOptions":{"lib":["ESNext"],"target":"ESNext","module":"Preserve","moduleDetection":"force","moduleResolution":"bundler","skipLibCheck":true,"outDir":"dist"},"include":["src/**/*"]}' > tsconfig.json

COPY src/ ./src/
RUN bun run build

FROM base
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

COPY package.json ./
RUN bun install --production

COPY --from=build /app/dist ./dist/

USER adminbot
EXPOSE 21337
CMD ["bun", "run", "dist/index.js"]
