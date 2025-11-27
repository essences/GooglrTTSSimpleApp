#!/usr/bin/env bash
# Simple launcher for macOS/Linux to mirror START_SERVER.bat behavior.
# - Starts the Gemini Pro TTS helper (Python) in the background.
# - Serves the frontend from src/ via python -m http.server.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FRONT_PORT="${FRONT_PORT:-8080}"
PRO_TTS_PORT="${PRO_TTS_PORT:-8788}"
PRO_TTS_SCRIPT="${SCRIPT_DIR}/server/pro_tts_service.py"
PYTHON_BIN="${PYTHON_BIN:-python3}"

echo "==== Narration Studio Dev Server (macOS/Linux) ===="
echo "[1/2] Starting Gemini Pro TTS helper (port ${PRO_TTS_PORT})"
echo "      Ensure GOOGLE_APPLICATION_CREDENTIALS is set before running."

PRO_TTS_PID=""
if [[ -f "${PRO_TTS_SCRIPT}" ]]; then
  "${PYTHON_BIN}" "${PRO_TTS_SCRIPT}" &
  PRO_TTS_PID=$!
  echo "      Pro TTS server started with PID ${PRO_TTS_PID}"
else
  echo " [Warning] Pro TTS script not found: ${PRO_TTS_SCRIPT}"
fi

cleanup() {
  if [[ -n "${PRO_TTS_PID}" ]] && ps -p "${PRO_TTS_PID}" > /dev/null 2>&1; then
    echo
    echo "Stopping Pro TTS helper (PID ${PRO_TTS_PID})..."
    kill "${PRO_TTS_PID}" 2>/dev/null || true
  fi
}
trap cleanup EXIT INT

echo
echo "[2/2] Starting frontend on http://localhost:${FRONT_PORT}"
echo "      Press Ctrl+C to stop both servers."
echo

cd "${SCRIPT_DIR}/src"

# Open default browser (macOS: open, Linux: xdg-open if available)
if command -v open >/dev/null 2>&1; then
  open "http://localhost:${FRONT_PORT}" || true
elif command -v xdg-open >/dev/null 2>&1; then
  xdg-open "http://localhost:${FRONT_PORT}" || true
fi

exec "${PYTHON_BIN}" -m http.server "${FRONT_PORT}"
