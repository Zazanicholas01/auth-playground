#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
UI_DIR="${ROOT_DIR}/../ui"

cd "${UI_DIR}"

if ! command -v bun >/dev/null 2>&1; then
  echo "bun is required to run the local UI." >&2
  exit 1
fi

if [[ ! -d node_modules ]]; then
  bun install
fi

export UI_PORT="${UI_PORT:-8081}"
export IOT_UPSTREAM_BASE="${IOT_UPSTREAM_BASE:-http://127.0.0.1:8080}"

exec bun run ./local-server.mjs
