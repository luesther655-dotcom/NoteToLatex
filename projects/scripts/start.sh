#!/bin/bash
set -Eeuo pipefail

# 基于脚本位置定位项目根目录（scripts/ 的上一级）
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_DIR"

PORT="${DEPLOY_RUN_PORT:-5000}"

start_service() {
    echo "Starting HTTP service on port ${PORT} for deploy..."
    PORT=${PORT} node dist/server.js
}

start_service
