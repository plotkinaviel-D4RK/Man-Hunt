@echo off
cd /d "%~dp0"

set "PYTHON_EXE=C:\Users\binny\AppData\Local\Programs\Python\Python311\python.exe"
set "SCRIPT_PATH=%~dp0tools\generate_profile_model.py"

if not exist "%PYTHON_EXE%" (
  echo Python was not found at:
  echo %PYTHON_EXE%
  pause
  exit /b 1
)

"%PYTHON_EXE%" "%SCRIPT_PATH%"
pause
