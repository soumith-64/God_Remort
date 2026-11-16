<#
.SYNOPSIS
    Stops and removes the GOD REMORT 24/7 background task.
#>

$TaskName = "GodRemortAgent"
$ShortcutPath = "$env:APPDATA\Microsoft\Windows\Start Menu\Programs\Startup\GodRemortAgent.lnk"

Write-Host "Stopping and removing GOD REMORT background task..." -ForegroundColor Yellow

# Stop task
Stop-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue

# Unregister task
Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false -ErrorAction SilentlyContinue

# Remove shortcut
if (Test-Path $ShortcutPath) {
    Remove-Item $ShortcutPath -Force -ErrorAction SilentlyContinue
}

# Kill running pythonw processes running agent/main.py
Get-Process -Name "pythonw", "python" -ErrorAction SilentlyContinue | Where-Object {
    $_.CommandLine -like "*agent\main.py*"
} | Stop-Process -Force -ErrorAction SilentlyContinue

Write-Host "GOD REMORT background task stopped and removed." -ForegroundColor Green
