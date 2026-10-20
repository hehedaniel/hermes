@echo off
REM Crea una tarea programada de Windows que sincroniza Moodle a las 8:00 y a las 15:00
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0programar_tarea.ps1"
pause
