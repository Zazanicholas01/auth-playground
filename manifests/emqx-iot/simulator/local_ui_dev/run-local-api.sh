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
export DB_BOOTSTRAP_MAX_ATTEMPTS="${DB_BOOTSTRAP_MAX_ATTEMPTS:-20}"
export DB_BOOTSTRAP_RETRY_DELAY_MS="${DB_BOOTSTRAP_RETRY_DELAY_MS:-3000}"

export EVENT_HISTORY_SIZE="${EVENT_HISTORY_SIZE:-250}"
export HISTORY_POINTS="${HISTORY_POINTS:-300}"

# Sanity check on dependency files existing
required_files=(
  "${API_DIR}/index.js"
  "${API_DIR}/config.js"
  "${API_DIR}/container.js"
  "${API_DIR}/state.js"
  "${API_DIR}/db/client.js"
  "${API_DIR}/db/bootstrap.js"
  "${API_DIR}/db/queries.js"
  "${API_DIR}/mqtt/client.js"
  "${API_DIR}/services/telemetry-service.js"
  "${API_DIR}/synthetic/zones.js"
  "${API_DIR}/http/json.js"
  "${API_DIR}/http/router.js"
  "${API_DIR}/http/routes.js"
)

# Loop over required files
for file in "${required_files[@]}"; do
  if [[ ! -f "${file}" ]]; then
    echo "Missing required API module: ${file}" >&2
    exit 1
  fi
done

# Sanity check on DB Bootstrap files
required_sql=(
  "${DB_BOOTSTRAP_SQL_DIR}/01-init.sql"
  "${DB_BOOTSTRAP_SQL_DIR}/03-gold-layer.sql"
  "${DB_BOOTSTRAP_SQL_DIR}/04-gold-continuous-aggregates.sql"
)

for file in "${required_sql[@]}"; do
  if [[ ! -f "${file}" ]]; then
    echo "Missing SQL bootstrap file: ${file}" >&2
    exit 1
  fi
done

# Log API starting configuration
cat <<EOF
Starting local IoT API with:
  API_PORT=${API_PORT}
  MQTT_URL=${MQTT_URL}
  DB_HOST=${DB_HOST}
  DB_PORT=${DB_PORT}
  DB_NAME=${DB_NAME}
  DB_USER=${DB_USER}
  DB_BOOTSTRAP_SQL_DIR=${DB_BOOTSTRAP_SQL_DIR}
EOF

exec bun run ./index.js
