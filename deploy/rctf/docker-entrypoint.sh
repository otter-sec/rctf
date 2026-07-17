#!/bin/sh
set -eu

rctf deployment generate-csp > /etc/nginx/security-headers.conf
nginx -t

exec "$@"
