#!/bin/sh
set -e

# Runs automatically before nginx starts (nginx's official image executes
# every executable script in /docker-entrypoint.d/). Injects the API_URL
# env var into a small runtime-config.js the built SPA reads at load time,
# so this same image works against any backend host without a rebuild.
: "${API_URL:=http://localhost:3000}"
export API_URL

envsubst '${API_URL}' < /usr/share/nginx/html/runtime-config.template.js > /usr/share/nginx/html/runtime-config.js

echo "AlarmLock web configured with API_URL=${API_URL}"
