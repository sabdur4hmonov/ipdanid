@echo off
setlocal
chcp 65001 >nul
cd /d "%~dp0.."
if not exist "output\p2-lan-dist\build-runtime.json" (
  set "VITE_SERVER_GENERATION=1"
  set "VITE_NATIVE_API_BASE= "
  call node_modules\.bin\vite.cmd build --outDir output/p2-lan-dist
  if errorlevel 1 exit /b 1
)
node --import tsx scripts\start-lan-build.mjs %*
if errorlevel 1 pause
