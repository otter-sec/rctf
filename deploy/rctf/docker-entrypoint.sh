#!/bin/sh
set -eu

mkdir -p /tmp/nginx
mkdir -p /tmp/supervisor
# writable only by root
chmod 0755 /tmp/nginx
# accessible only by root
chmod 0700 /tmp/supervisor

# v1 migration (forward only)
# its pretty slow if you have a lot of files, so do this only once
if [ -d /app/uploads ] && [ "$(stat -c '%u' /app/uploads)" != "$(id -u rctf)" ]; then
    chown -R rctf:rctf /app/uploads
fi

rctf deployment generate-csp --web-build /app/static > /tmp/nginx/security-headers.conf
rctf deployment generate-avatar-body-limit > /tmp/nginx/avatar-body-limit.conf
nginx -t -e stderr

exec supervisord -c /etc/supervisord.conf
