@echo off
REM Muestra tus cursos de Moodle y la carpeta local de cada uno
cd /d "%~dp0"
where py >nul 2>nul
if %errorlevel%==0 (set "PY=py -3") else (set "PY=python")
%PY% moodle_sync.py cursos
pause
