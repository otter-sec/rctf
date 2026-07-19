#!/bin/sh
set -eu

rctf deployment generate-csp --web-build /app/static > /etc/nginx/http.d/security-headers.conf
nginx -t

supervisord -c /etc/supervisord.conf
