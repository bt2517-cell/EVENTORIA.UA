@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0"
title EVENTORIA - Local Web Server
echo.
echo    ================================================
echo     EVENTORIA  -  Local Website Test
 echo    ================================================
echo.
echo Website: http://localhost:8000/index.html
echo Admin:   http://localhost:8000/admin.html
echo.
echo Stop server: Ctrl+C, then Y
 echo.
python --version >nul 2>&1
if %errorlevel%==0 goto usingPython
py -3 --version >nul 2>&1
if %errorlevel%==0 goto usingLauncher
 echo Python 3 was not found.
 echo Install Python 3 from python.org, or use: py -3 -m http.server 8000
pause
exit /b 1
:usingPython
start "" "http://localhost:8000/index.html"
python -m http.server 8000
goto done
:usingLauncher
start "" "http://localhost:8000/index.html"
py -3 -m http.server 8000
:done
 echo.
 echo Server stopped.
pause
