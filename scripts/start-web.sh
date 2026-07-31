#!/usr/bin/env sh
set -eu
PORT="${PORT:-3000}"
export CATALOG_DIR="${CATALOG_DIR:-$(pwd)/data/catalog}"
export OAUTH_TOKEN_STORE_PATH="${OAUTH_TOKEN_STORE_PATH:-$(pwd)/data/oauth-tokens.json}"
exec pnpm --filter @miai/web exec next start -H 0.0.0.0 -p "$PORT"
