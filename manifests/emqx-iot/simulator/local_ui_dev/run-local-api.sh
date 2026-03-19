#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
API_DIR="${ROOT_DIR}/../api"
SQL_DIR="${ROOT_DIR}/../sql"

cd "${API_DIR}"

if ! command -v bun >/dev/null 2>&1; then
  echo "bun is required to run the local API." >&2
  exit 1
fi

if [[ ! -d node_modules ]]; then
  bun install
fi

export API_PORT="${API_PORT:-8080}"
export MQTT_URL="${MQTT_URL:-mqtt://127.0.0.1:1884}"
export MQTT_TOPIC_ROOT="${MQTT_TOPIC_ROOT:-site/alpha/devices}"
export DB_HOST="${DB_HOST:-127.0.0.1}"
export DB_PORT="${DB_PORT:-5432}"
export DB_NAME="${DB_NAME:-iot_playground}"
export DB_USER="${DB_USER:-iot_app}"
export DB_PASSWORD="${DB_PASSWORD:-password123}"
export DB_BOOTSTRAP_SQL_DIR="${DB_BOOTSTRAP_SQL_DIR:-${SQL_DIR}}"
export EVENT_HISTORY_SIZE="${EVENT_HISTORY_SIZE:-250}"
export HISTORY_POINTS="${HISTORY_POINTS:-300}"

exec bun run ./index.js
