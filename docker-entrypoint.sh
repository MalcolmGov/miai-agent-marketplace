#!/bin/sh
# Container entrypoint.
#
# The persistent volume is mounted at /data owned by root, but the app runs as the unprivileged
# `node` user — so without this, every file-store write (oauth, knowledge, rentals, and the consumer
# memory / life-graph / reminders / brief stores) fails with EACCES and a person's memory is lost.
# We start as root only to make the volume writable, then drop privileges and exec the server as node.
set -e

if [ -d /data ]; then
  chown -R node:node /data 2>/dev/null || true
fi

# Normalize command: Railway or pnpm defaults may pass "pnpm start", "next start", etc.
# In standalone mode, next CLI is stripped for IP protection. Always run apps/web/server.js.
if [ "$#" -eq 0 ] || [ "$1" = "pnpm" ] || [ "$1" = "next" ] || [ "$1" = "start" ]; then
  set -- node apps/web/server.js
elif [ "$1" = "sh" ] && [ "$2" = "-c" ]; then
  case "$3" in
    *pnpm*|*next*)
      set -- node apps/web/server.js
      ;;
  esac
fi

exec gosu node "$@"
