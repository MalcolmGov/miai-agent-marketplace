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

exec gosu node "$@"
