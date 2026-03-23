#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="${ROOT_DIR}/../api"
API_DIR="${PROJECT_DIR}/app"
SQL_DIR="${API_DIR}/sql"
VENV_DIR="${API_DIR}/.venv"

cd "${PROJECT_DIR}"

export PATH="${HOME}/.local/bin:${PATH}"

if ! command -v python3 >/dev/null 2>&1; then
  echo "python3 is required to run the local API." >&2
  exit 1
fi

UV_BIN="$(command -v uv || true)"
if [[ -z "${UV_BIN}" && -x "${HOME}/.local/bin/uv" ]]; then
  UV_BIN="${HOME}/.local/bin/uv"
fi

if [[ -z "${UV_BIN}" ]]; then
  echo "uv is required to run the local API." >&2
  exit 1
fi

if [[ ! -d "${VENV_DIR}" ]]; then
  (cd "${API_DIR}" && "${UV_BIN}" sync --frozen --no-dev)
elif [[ ! -x "${VENV_DIR}/bin/uvicorn" ]]; then
  (cd "${API_DIR}" && "${UV_BIN}" sync --frozen --no-dev)
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

exec "${UV_BIN}" run --project "${API_DIR}" uvicorn app.main:app --host 0.0.0.0 --port "${API_PORT}"
