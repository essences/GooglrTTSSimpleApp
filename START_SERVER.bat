@echo off
setlocal

set "SCRIPT_DIR=%~dp0"
set "FRONT_PORT=8080"
set "PRO_TTS_PORT=8788"
set "PRO_TTS_SCRIPT=%SCRIPT_DIR%server\pro_tts_service.py"

echo ==== Narration Studio Dev Server ====
echo [1/2] Starting Gemini Pro TTS helper (port %PRO_TTS_PORT%)
echo        Ensure GOOGLE_APPLICATION_CREDENTIALS is set before running.

if exist "%PRO_TTS_SCRIPT%" (
  start "Gemini Pro TTS" cmd /k ^"cd /d \"%SCRIPT_DIR%\" ^&^& set PRO_TTS_SERVER_PORT=%PRO_TTS_PORT% ^&^& python \"server\pro_tts_service.py\"^"
) else (
  echo [Warning] Pro TTS script not found: %PRO_TTS_SCRIPT%
)

echo.
echo [2/2] Starting frontend on http://localhost:%FRONT_PORT%
echo        Press Ctrl+C in this window to stop the server.
echo.

pushd "%SCRIPT_DIR%src"
start "" "http://localhost:%FRONT_PORT%"
python -m http.server %FRONT_PORT%
popd

endlocal
