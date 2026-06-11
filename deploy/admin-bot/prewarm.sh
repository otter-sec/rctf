#!/bin/sh
set -eu

cache_dir="${BROWSER_CACHE_DIR:-.browser-cache}"

for browser in chrome firefox; do
  bun /app/node_modules/@puppeteer/browsers/lib/cjs/main-cli.js install "${browser}@stable" --path "$cache_dir"
done
