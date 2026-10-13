@echo off
cd /d "%~dp0"
set IP_RASM_LOCAL_PORT=4194
set IP_RASM_API_PORT=4331
call npm run local
if errorlevel 1 pause
