@echo off
setlocal
cd /d "%~dp0"

echo Setting up Java Exam Portal...
echo.

where node >nul 2>nul
if errorlevel 1 goto missing_node

for /f "tokens=1 delims=v." %%a in ('node --version') do set "NODE_MAJOR=%%a"
if not defined NODE_MAJOR goto bad_node_version
if %NODE_MAJOR% LSS 18 goto old_node

where python >nul 2>nul
if errorlevel 1 goto missing_python

if not exist ".venv\Scripts\python.exe" (
  echo Creating the project's private Python environment...
  python -m venv .venv
  if errorlevel 1 goto venv_failed
)

".venv\Scripts\python.exe" -c "import cv2, numpy; assert hasattr(cv2, 'CascadeClassifier')" >nul 2>nul
if errorlevel 1 (
  echo Installing the required camera-check packages. Internet access is needed for this step...
  ".venv\Scripts\python.exe" -m pip install -r requirements.txt
  if errorlevel 1 goto install_failed
)

".venv\Scripts\python.exe" -c "import cv2, numpy; assert hasattr(cv2, 'CascadeClassifier')" >nul 2>nul
if errorlevel 1 goto verify_failed

if not exist "data" mkdir data
if errorlevel 1 goto data_failed

echo.
echo Setup complete.
echo Start the portal with start.bat or run "npm start" in this folder.
echo The app reads GEMINI_API_KEY from .env. Keep your API key private.
echo.
pause
exit /b 0

:missing_node
echo Node.js 18 or newer is required. Install it from https://nodejs.org/ and run setup again.
goto failed

:bad_node_version
echo Could not determine the installed Node.js version. Reinstall Node.js 18 or newer.
goto failed

:old_node
echo Node.js 18 or newer is required. Found major version %NODE_MAJOR%.
goto failed

:missing_python
echo Python 3 is required for server-side camera checks. Install Python 3 and run setup again.
goto failed

:venv_failed
echo Could not create .venv. Check that Python is installed correctly and try again.
goto failed

:install_failed
echo Could not install Python packages. Check your internet connection and try setup again.
goto failed

:verify_failed
echo OpenCV setup did not complete successfully. Review the install output and try again.
goto failed

:data_failed
echo Could not create the data folder. Check folder permissions and try again.
goto failed

:failed
echo.
pause
exit /b 1