# Registra la tarea programada "Moodle IA_BD" para el usuario actual (no necesita administrador)
$ErrorActionPreference = 'Stop'
$dir = Split-Path -Parent $MyInvocation.MyCommand.Path
$script = Join-Path $dir 'moodle_sync.py'

$pyw = Get-Command pyw.exe -ErrorAction SilentlyContinue
if ($pyw) {
    $exe = $pyw.Source
    $argList = "-3 `"$script`" sync --auto"
} else {
    $p = Get-Command pythonw.exe -ErrorAction SilentlyContinue
    if (-not $p) { throw "No encuentro pyw.exe ni pythonw.exe. Instala Python desde python.org." }
    $exe = $p.Source
    $argList = "`"$script`" sync --auto"
}

$action   = New-ScheduledTaskAction -Execute $exe -Argument $argList -WorkingDirectory $dir
$triggers = @(
    (New-ScheduledTaskTrigger -Daily -At 8:00),
    (New-ScheduledTaskTrigger -Daily -At 15:00)
)
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -RunOnlyIfNetworkAvailable -ExecutionTimeLimit (New-TimeSpan -Minutes 30)

Register-ScheduledTask -TaskName 'Moodle IA_BD' -Action $action -Trigger $triggers -Settings $settings -Description 'Descarga el material de Moodle y actualiza PENDIENTES.md' -Force | Out-Null

Write-Host ""
Write-Host "Tarea 'Moodle IA_BD' creada: se ejecuta a las 8:00 y a las 15:00 (o en cuanto enciendas el PC si se la salto)."
Write-Host "Para quitarla:  Unregister-ScheduledTask -TaskName 'Moodle IA_BD'"
