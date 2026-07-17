#!/bin/sh
set -eu

bun /app/deploy/rctf/csp/dist/index.js
nginx -t

exec "$@"
