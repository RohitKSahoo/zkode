@echo off
setlocal
cd /d "%~dp0"
title ZKode Platform Launcher

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0launch.ps1" %*

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] Launcher encountered an issue. See logs\ folder for error diagnostics.
    pause
)
