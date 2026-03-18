#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "Start these port-forwards in another terminal before using the local stack:"
echo "  kubectl -n iot-playground port-forward svc/iot-timescaledb 5432:5432"
echo "  kubectl -n iot-playground port-forward svc/emqx-listeners 1883:1883"
echo
echo "Run the local API in one terminal:"
echo "  ${ROOT_DIR}/run-local-api.sh"
echo
echo "Run the local UI against the local API in another terminal:"
echo "  IOT_UPSTREAM_BASE=http://127.0.0.1:8080 ${ROOT_DIR}/run-local-ui.sh"
