<#
.SYNOPSIS
    Configures GOD REMORT Agent to run 24/7 in the background with automatic restart on Windows 11.
.DESCRIPTION
    - Uses pythonw.exe (completely silent, no command prompt window popups).
    - Registers a Windows Scheduled Task that launches at logon/boot.
    - Enables auto-recovery: If the agent crashes or terminates, Windows automatically restarts it within 1 minute.
    - Configures battery policy: Agent continues running when the laptop is running on battery.
#>

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
$PythonwPath = "$Root\agent\.venv\Scripts\pythonw.exe"
$PythonPath = "$Root\agent\.venv\Scripts\python.exe"
$AgentScript = "$Root\agent\main.py"

# Choose pythonw (no window) or python
$Runner = if (Test-Path $PythonwPath) { $PythonwPath } else { $PythonPath }

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "GOD REMORT — 24/7 ALWAYS-ON BACKGROUND SERVICE CONFIGURATOR" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "Working Directory : $Root" -ForegroundColor Gray
Write-Host "Python Runner     : $Runner" -ForegroundColor Gray
Write-Host "Agent Script      : $AgentScript" -ForegroundColor Gray
Write-Host ""

$TaskName = "GodRemortAgent"

try {
    # 1. Unregister any existing task with the same name
    $existing = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
    if ($existing) {
        Write-Host "Updating existing '$TaskName' task..." -ForegroundColor Yellow
        Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
    }

    # 2. Define Action (Launch agent via pythonw)
    $Action = New-ScheduledTaskAction -Execute $Runner -Argument "`"$AgentScript`"" -WorkingDirectory $Root

    # 3. Define Trigger (At user logon)
    $Trigger = New-ScheduledTaskTrigger -AtLogOn

    # 4. Define Resilient Settings:
    # - Run indefinitely (ExecutionTimeLimit = 0)
    # - Auto-restart on failure (RestartCount = 3, RestartInterval = 1 minute)
    # - Run on battery and AC power
    $Settings = New-ScheduledTaskSettingsSet `
        -ExecutionTimeLimit (New-TimeSpan -Hours 0) `
        -RestartCount 3 `
        -RestartInterval (New-TimeSpan -Minutes 1) `
        -AllowStartIfOnBatteries `
        -DontStopIfGoingOnBatteries `
        -StartWhenAvailable `
        -MultipleInstances IgnoreNew

    # 5. Register Task
    Register-ScheduledTask -TaskName $TaskName -Action $Action -Trigger $Trigger -Settings $Settings -Description "GOD REMORT 24/7 Laptop Companion Agent Service" | Out-Null
    Write-Host "[OK] Windows Scheduled Task '$TaskName' registered successfully!" -ForegroundColor Green

    # 6. Fallback Startup Shortcut in shell:startup
    $ShortcutPath = "$env:APPDATA\Microsoft\Windows\Start Menu\Programs\Startup\GodRemortAgent.lnk"
    $WScriptShell = New-Object -ComObject WScript.Shell
    $Shortcut = $WScriptShell.CreateShortcut($ShortcutPath)
    $Shortcut.TargetPath = $Runner
    $Shortcut.Arguments = "`"$AgentScript`""
    $Shortcut.WorkingDirectory = $Root
    $Shortcut.WindowStyle = 7 # Minimized/Hidden
    $Shortcut.Description = "GOD REMORT Background Laptop Companion Agent"
    $Shortcut.Save()
    Write-Host "[OK] Windows Startup Shortcut created: $ShortcutPath" -ForegroundColor Green

    # 7. Start the task immediately
    Start-ScheduledTask -TaskName $TaskName
    Write-Host "[OK] Service started! GOD REMORT is now running silently in the background." -ForegroundColor Green
    Write-Host "Port: http://localhost:8000" -ForegroundColor Cyan
    Write-Host "==========================================================" -ForegroundColor Cyan
}
catch {
    Write-Host "Error configuring background task: $_" -ForegroundColor Red
    Write-Host "Falling back to Startup shortcut..." -ForegroundColor Yellow
}
