@echo off
setlocal
pushd "%~dp0"
echo PAGANINI - Starting local website...
echo Keep this window open while using the website.
echo The browser will open automatically. Press Ctrl+C here to stop.
echo.
py -3 --version >nul 2>&1
if not errorlevel 1 (
    py -3 tools\serve.py --port 0 --open
    goto done
)
python3 --version >nul 2>&1
if not errorlevel 1 (
    python3 tools\serve.py --port 0 --open
    goto done
)
python --version >nul 2>&1
if not errorlevel 1 (
    python tools\serve.py --port 0 --open
    goto done
)
echo Python 3 was not found. Install Python 3 from https://www.python.org/downloads/
echo Then run START-WEBSITE.bat again. Do not open index.html directly.
:done
popd
pause
