#!/usr/bin/env sh
set -eu
PORT="${PORT:-3000}"
export CATALOG_DIR="${CATALOG_DIR:-$(pwd)/data/catalog}"
export PLATFORM_DIR="${PLATFORM_DIR:-$(pwd)/data/platform}"
export OAUTH_TOKEN_STORE_PATH="${OAUTH_TOKEN_STORE_PATH:-$(pwd)/data/oauth-tokens.json}"
export ASK_LEADS_PATH="${ASK_LEADS_PATH:-$(pwd)/data/ask-leads.json}"
export TURN_TRANSCRIPTS_PATH="${TURN_TRANSCRIPTS_PATH:-$(pwd)/data/turn-transcripts.json}"

if [ -f "apps/web/server.js" ]; then
  exec node apps/web/server.js
elif [ -f "server.js" ]; then
  exec node server.js
else
  exec pnpm --filter @miai/web exec next start -H 0.0.0.0 -p "$PORT"
fi
