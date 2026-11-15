# Registers OMNICONTROL Agent to automatically run when Windows boots
$Root = Split-Path -Parent $PSScriptRoot
$PythonPath = "$Root\agent\.venv\Scripts\python.exe"
$AgentScript = "$Root\agent\main.py"

$ShortcutPath = "$env:APPDATA\Microsoft\Windows\Start Menu\Programs\Startup\OmniControlAgent.lnk"

$WScriptShell = New-Object -ComObject WScript.Shell
$Shortcut = $WScriptShell.CreateShortcut($ShortcutPath)
$Shortcut.TargetPath = $PythonPath
$Shortcut.Arguments = "`"$AgentScript`""
$Shortcut.WorkingDirectory = $Root
$Shortcut.WindowStyle = 7 # Minimized
$Shortcut.Description = "OMNICONTROL Background Laptop Companion Agent"
$Shortcut.Save()

Write-Host "Successfully registered OMNICONTROL Agent in Windows Startup: $ShortcutPath" -ForegroundColor Green
