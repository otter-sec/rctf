#!/bin/sh
set -eu

mkdir -p /tmp/nginx
chmod 0755 /tmp/nginx

# v1 compatibility (forward only)
if [ -d /app/uploads ]; then
    chown -R rctf:rctf /app/uploads
fi

rctf deployment generate-csp --web-build /app/static > /tmp/nginx/security-headers.conf
nginx -t -e stderr

exec supervisord -c /etc/supervisord.conf
