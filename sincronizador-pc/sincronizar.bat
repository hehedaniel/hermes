@echo off
REM Descarga lo nuevo de Moodle y actualiza PENDIENTES.md y tareas.ics
cd /d "%~dp0"
where py >nul 2>nul
if %errorlevel%==0 (set "PY=py -3") else (set "PY=python")
%PY% moodle_sync.py sync
echo.
start "" "%~dp0..\PENDIENTES.md"
pause
