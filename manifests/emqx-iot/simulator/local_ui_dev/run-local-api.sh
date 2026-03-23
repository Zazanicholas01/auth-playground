#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
API_DIR="${ROOT_DIR}/../api"
SQL_DIR="${ROOT_DIR}/../sql"
VENV_DIR="${API_DIR}/.venv"
PYTHON_BIN="${VENV_DIR}/bin/python"
PIP_BIN="${VENV_DIR}/bin/pip"
UVICORN_BIN="${VENV_DIR}/bin/uvicorn"

cd "${API_DIR}"

if ! command -v python3 >/dev/null 2>&1; then
  echo "python3 is required to run the local API." >&2
  exit 1
fi

if [[ ! -d "${VENV_DIR}" ]]; then
  python3 -m venv "${VENV_DIR}"
fi

if [[ ! -x "${PIP_BIN}" ]]; then
  echo "Missing pip in virtualenv: ${PIP_BIN}" >&2
  exit 1
fi

if ! "${PYTHON_BIN}" - <<'PY' >/dev/null 2>&1
import importlib.util
mods = ["fastapi", "uvicorn", "asyncpg", "aiomqtt", "pydantic_settings"]
raise SystemExit(0 if all(importlib.util.find_spec(m) for m in mods) else 1)
PY
then
  "${PIP_BIN}" install -r requirements.txt
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

required_files=(
  "${API_DIR}/app/main.py"
  "${API_DIR}/app/settings.py"
  "${API_DIR}/app/db.py"
  "${API_DIR}/app/bootstrap.py"
  "${API_DIR}/app/state.py"
  "${API_DIR}/app/api/routes.py"
  "${API_DIR}/app/mqtt/client.py"
  "${API_DIR}/app/repositories/telemetry.py"
  "${API_DIR}/app/services/telemetry.py"
  "${API_DIR}/app/synthetic/zones.py"
  "${API_DIR}/requirements.txt"
)

for file in "${required_files[@]}"; do
  if [[ ! -f "${file}" ]]; then
    echo "Missing required API module: ${file}" >&2
    exit 1
  fi
done

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

cat <<EOF
Starting local FastAPI IoT API with:
  API_PORT=${API_PORT}
  MQTT_URL=${MQTT_URL}
  DB_HOST=${DB_HOST}
  DB_PORT=${DB_PORT}
  DB_NAME=${DB_NAME}
  DB_USER=${DB_USER}
  DB_BOOTSTRAP_SQL_DIR=${DB_BOOTSTRAP_SQL_DIR}
  VENV_DIR=${VENV_DIR}
EOF

exec "${UVICORN_BIN}" app.main:app --host 0.0.0.0 --port "${API_PORT}"
