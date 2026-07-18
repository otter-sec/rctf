#!/bin/sh
set -eu

rctf deployment generate-csp > /etc/nginx/http.d/security-headers.conf
nginx -t

exec "$@"
