#!/bin/sh
set -eu

mkdir -p /tmp/nginx
chmod 0755 /tmp/nginx

rctf deployment generate-csp --web-build /app/static > /tmp/nginx/security-headers.conf
nginx -t -e stderr

supervisord -c /etc/supervisord.conf
