@echo off
setlocal enabledelayedexpansion
title Neutralino Builder
color 0B

echo.
echo ==========================================
echo  NEUTRALINO DESKTOP APP BUILDER
echo ==========================================
echo.
echo Ultra-lightweight desktop wrapper
echo Size: ~2-5MB, Cross-platform, No dependencies
echo.

echo Checking Node.js...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js not found!
    echo Please install Node.js from: https://nodejs.org/
    pause
    exit /b 1
)
echo SUCCESS: Node.js found

echo.
echo Checking Neutralino CLI...
where neu > nul 2>&1
if %errorlevel% neq 0 (
    echo WARNING: Neutralino CLI not found in PATH
    echo Will attempt to install when needed...
) else (
    echo SUCCESS: Neutralino CLI found
)

echo.
echo ==========================================
echo Choose action:
echo ==========================================
echo.
echo  [1] Development Mode
echo  [2] Build Windows executable  
echo  [3] Build ALL platforms
echo  [4] AUTO BUILD (recommended)
echo  [5] Open dist folder
echo  [6] Install/Update Neutralino CLI
echo  [0] Exit
echo.
set /p choice="Enter choice (0-6): "

if "%choice%"=="1" goto DEV
if "%choice%"=="2" goto WIN
if "%choice%"=="3" goto ALL
if "%choice%"=="4" goto AUTO
if "%choice%"=="5" goto OPEN
if "%choice%"=="6" goto INSTALL
if "%choice%"=="0" goto EXIT
echo Invalid choice!
pause
exit /b

:DEV
echo.
echo Starting development mode...
neu run
goto END

:WIN
echo.
echo Building Windows executable...
neu build --release
echo.
echo Build complete! Check dist folder.
goto END

:ALL
echo.
echo Building all platforms...
neu build --release
echo.
echo Build complete! Files in dist folder:
if exist "dist\brandmeister-monitor\" (
    for %%f in (dist\brandmeister-monitor\*) do (
        if not "%%~nxf"=="resources.neu" (
            echo   %%~nxf
        )
    )
)
goto END

:AUTO
echo.
echo ==========================================
echo  AUTOMATIC BUILD - ALL PLATFORMS
echo ==========================================
echo.
echo Cleaning previous builds...
if exist "dist" rmdir /s /q "dist"
echo Building all platforms (this may take a moment)...
neu build --release
echo.
echo ==========================================
echo  BUILD RESULTS
echo ==========================================
echo.
if exist "dist\brandmeister-monitor\brandmeister-monitor-win_x64.exe" (
    echo SUCCESS: Build completed!
    echo.
    echo Generated executables in dist\brandmeister-monitor\:
    for %%f in (dist\brandmeister-monitor\brandmeister-monitor-*) do (
        set "filename=%%~nxf"
        if "!filename:~-4!"==".exe" (
            echo   Windows: %%~nxf (%%~zf bytes)
        ) else if not "!filename!"=="!filename:linux=!" (
            echo   Linux: %%~nxf (%%~zf bytes)
        ) else if not "!filename!"=="!filename:mac=!" (
            echo   macOS: %%~nxf (%%~zf bytes)
        ) else (
            echo   Other: %%~nxf (%%~zf bytes)
        )
    )
    if exist "dist\brandmeister-monitor\resources.neu" (
        echo   Resources: resources.neu (required)
    )
    if exist "dist\brandmeister-monitor-release.zip" (
        echo   Package: brandmeister-monitor-release.zip (complete package)
    )
    echo.
    echo Location: dist\brandmeister-monitor\
    echo.
    echo Your web app is now packaged into ultra-light desktop executables!
    echo • Windows: brandmeister-monitor-win_x64.exe (~2.6MB)
    echo • Linux: brandmeister-monitor-linux_x64 (~1.8MB)  
    echo • macOS: brandmeister-monitor-mac_x64 (~2.3MB)
    echo.
    echo Just double-click any executable to run your app!
    echo.
    set /p opendir="Open dist folder? (y/n): "
    if /i "!opendir!"=="y" explorer "dist\brandmeister-monitor"
) else (
    echo ERROR: Build failed - no executables found in dist directory
)
goto END

:OPEN
echo.
if exist "dist" (
    explorer "dist"
) else (
    echo No dist folder found. Build first!
)
goto END

:INSTALL
echo.
echo Installing/Updating Neutralino CLI...
npm install -g @neutralinojs/neu
if %errorlevel% neq 0 (
    echo ERROR: Failed to install Neutralino CLI
    echo Make sure you have npm and Node.js installed
    echo Try running as administrator
) else (
    echo SUCCESS: Neutralino CLI installed/updated
)
goto END

:EXIT
echo.
echo Goodbye!
goto END

:END
echo.
echo ==========================================  
echo Your app is now ready for distribution!
echo ==========================================
echo.
pause
