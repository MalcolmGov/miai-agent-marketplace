#!/usr/bin/env bash
# Offline validation of Azure Bicep — no subscription deploy required.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BICEP="$ROOT/infra/azure/main.bicep"
OUT="${TMPDIR:-/tmp}/miai-main.json"

if ! command -v az >/dev/null 2>&1; then
  echo "az CLI not found; trying bicep binary..."
  if command -v bicep >/dev/null 2>&1; then
    bicep build "$BICEP" --outfile "$OUT"
  else
    echo "ERROR: install Azure CLI (az) or bicep to validate templates." >&2
    exit 1
  fi
else
  az bicep build --file "$BICEP" --outfile "$OUT"
fi

echo "OK: bicep build → $OUT"
wc -c "$OUT"
