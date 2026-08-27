#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "Démarrage du service de génération de CV (port 8000)..."
(cd "$SCRIPT_DIR/services/cv-generator" && ./venv/bin/uvicorn main:app --port 8000) &
GENERATOR_PID=$!

trap "kill $GENERATOR_PID 2>/dev/null" EXIT

sleep 1
echo "Démarrage du dashboard (http://localhost:3000)..."
cd "$SCRIPT_DIR/dashboard" && npm run dev
