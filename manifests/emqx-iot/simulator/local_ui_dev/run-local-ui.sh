#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VENV_DIR="${ROOT_DIR}/.venv"

if [[ ! -d "${VENV_DIR}" ]]; then
  python3 -m venv "${VENV_DIR}"
fi

source "${VENV_DIR}/bin/activate"
python -m pip install -r "${ROOT_DIR}/requirements.txt"

export UI_STATIC_DIR="${UI_STATIC_DIR:-${ROOT_DIR}/../ui}"
export IOT_UPSTREAM_BASE="${IOT_UPSTREAM_BASE:-http://iot.local:8080}"

echo "Serving local UI from ${UI_STATIC_DIR}"
echo "Proxying API and simulator requests to ${IOT_UPSTREAM_BASE}"

exec python -m uvicorn --app-dir "${ROOT_DIR}" app:app --host 0.0.0.0 --port 3200 --reload
