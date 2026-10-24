@echo off
cd /d "%~dp0"
set CSC_IDENTITY_AUTO_DISCOVERY=false
set WIN_CSC_LINK=

where node >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo.
    echo ERROR: Node.js not found.
    echo Download from: https://nodejs.org
    echo.
    pause
    exit /b 1
)

echo.
echo [1/2] Installing dependencies...
call npm install
if %ERRORLEVEL% neq 0 (
    echo ERROR: npm install failed.
    pause
    exit /b 1
)

echo.
echo [2/2] Building app...
call npm run build:win
if %ERRORLEVEL% neq 0 (
    echo ERROR: Build failed.
    pause
    exit /b 1
)

echo.
echo Done.
echo Run the app: dist\win-unpacked\Salarium.exe
echo.
pause
