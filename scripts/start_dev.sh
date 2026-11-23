#!/usr/bin/env bash
set -Eeuo pipefail
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

[[ -x .venv/bin/python ]] || { echo "Run bash scripts/setup_ubuntu.sh first." >&2; exit 1; }
[[ -f backend/.env ]] || { echo "backend/.env is missing. Run setup first." >&2; exit 1; }
[[ -f .env.local ]] || printf 'VITE_API_URL=http://localhost:5000/api\n' > .env.local
command -v npm >/dev/null || { echo "npm is required." >&2; exit 1; }
sudo systemctl is-active --quiet mysql || { echo "Start MySQL: sudo systemctl start mysql" >&2; exit 1; }

.venv/bin/python -m backend.app &
BACKEND_PID=$!
cleanup() {
  kill "$BACKEND_PID" 2>/dev/null || true
  wait "$BACKEND_PID" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

for _ in $(seq 1 40); do
  if curl --silent --fail http://127.0.0.1:5000/api/health >/dev/null; then
    break
  fi
  if ! kill -0 "$BACKEND_PID" 2>/dev/null; then
    echo "Flask backend exited. Check the MySQL credentials in backend/.env." >&2
    exit 1
  fi
  sleep 1
done
curl --silent --fail http://127.0.0.1:5000/api/health >/dev/null || {
  echo "Flask API did not become ready on port 5000." >&2
  exit 1
}

echo "Flask API: http://127.0.0.1:5000/api"
echo "React app: http://127.0.0.1:5173"
echo "Press Ctrl+C to stop both development services."
npm run dev -- --host 127.0.0.1
