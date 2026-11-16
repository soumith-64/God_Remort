<#
.SYNOPSIS
    Configures GOD REMORT Agent to run 24/7 silently in the background with auto-start on Windows 11.
.DESCRIPTION
    - Uses pythonw.exe (completely silent, no command prompt window popups).
    - Creates a Startup shortcut in shell:startup for automatic launch at login.
    - If running with Administrator rights, also configures a resilient Windows Scheduled Task with crash recovery.
#>

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

# 1. ALWAYS CREATE WINDOWS STARTUP SHORTCUT (Works without Admin privileges)
try {
    $ShortcutPath = "$env:APPDATA\Microsoft\Windows\Start Menu\Programs\Startup\GodRemortAgent.lnk"
    $WScriptShell = New-Object -ComObject WScript.Shell
    $Shortcut = $WScriptShell.CreateShortcut($ShortcutPath)
    $Shortcut.TargetPath = $Runner
    $Shortcut.Arguments = "`"$AgentScript`""
    $Shortcut.WorkingDirectory = $Root
    $Shortcut.WindowStyle = 7 # Minimized/Hidden
    $Shortcut.Description = "GOD REMORT Background Laptop Companion Agent"
    $Shortcut.Save()
    Write-Host "[OK] Windows Startup Shortcut installed successfully!" -ForegroundColor Green
    Write-Host "     Location: $ShortcutPath" -ForegroundColor Gray
    Write-Host "     The agent will automatically start silently every time you log in to Windows." -ForegroundColor Green
}
catch {
    Write-Host "[!] Failed to create Startup Shortcut: $($_.Exception.Message)" -ForegroundColor Red
}

# 2. OPTIONAL: SCHEDULED TASK (Crash Recovery & Battery Policy if Admin)
$TaskName = "GodRemortAgent"
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if ($isAdmin) {
    try {
        $existing = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
        if ($existing) {
            Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
        }

        $Action = New-ScheduledTaskAction -Execute $Runner -Argument "`"$AgentScript`"" -WorkingDirectory $Root
        $Trigger = New-ScheduledTaskTrigger -AtLogOn
        $Settings = New-ScheduledTaskSettingsSet `
            -ExecutionTimeLimit (New-TimeSpan -Hours 0) `
            -RestartCount 3 `
            -RestartInterval (New-TimeSpan -Minutes 1) `
            -AllowStartIfOnBatteries `
            -DontStopIfGoingOnBatteries `
            -StartWhenAvailable `
            -MultipleInstances IgnoreNew

        Register-ScheduledTask -TaskName $TaskName -Action $Action -Trigger $Trigger -Settings $Settings -Description "GOD REMORT 24/7 Laptop Companion Agent Service" | Out-Null
        Write-Host "[OK] Windows Scheduled Task '$TaskName' registered with auto-restart crash recovery!" -ForegroundColor Green
    }
    catch {
        Write-Host "[i] Scheduled Task registration skipped: $($_.Exception.Message)" -ForegroundColor Yellow
    }
}
else {
    Write-Host "[i] Running in standard user mode. Windows Startup shortcut is active." -ForegroundColor Yellow
    Write-Host "    (Tip: Run PowerShell as Administrator if you wish to also enable Task Scheduler crash recovery)" -ForegroundColor Gray
}

# 3. VERIFY / LAUNCH AGENT IMMEDIATELY
$healthCheck = $null
try {
    $healthCheck = Invoke-RestMethod -Uri "http://127.0.0.1:8000/api/v1/health" -TimeoutSec 1 -ErrorAction SilentlyContinue
}
catch {}

if (-not $healthCheck) {
    Write-Host "Starting GOD REMORT background agent..." -ForegroundColor Cyan
    Start-Process -FilePath $Runner -ArgumentList "`"$AgentScript`"" -WorkingDirectory $Root -WindowStyle Hidden
    Start-Sleep -Seconds 2
}

Write-Host ""
Write-Host "==========================================================" -ForegroundColor Green
Write-Host "GOD REMORT IS NOW RUNNING SILENTLY IN THE BACKGROUND" -ForegroundColor Green
Write-Host "Local URL : http://localhost:8000" -ForegroundColor Cyan
Write-Host "Network   : Connect from phone using laptop's IP or Cloudflare tunnel" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Green
