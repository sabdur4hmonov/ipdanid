@echo off
setlocal
cd /d "%~dp0.."
node scripts/phone-usb.mjs
if errorlevel 1 (
  echo.
  echo Keep the phone unlocked, accept USB debugging, then try again.
  pause
  exit /b 1
)
echo.
echo Ip Rasm is ready. Keep this USB cable connected.
pause
