# OMNICONTROL: Start All Services (Agent + Web Frontend)
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "        OMNICONTROL — REMOTE CONTROL PLATFORM            " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

# 1. Start Agent in background job or new window
Write-Host "[1/2] Starting OMNICONTROL Python Laptop Agent on :8000..." -ForegroundColor Yellow
$AgentProc = Start-Process -FilePath "$Root\agent\.venv\Scripts\python.exe" -ArgumentList "$Root\agent\main.py" -PassThru -WindowStyle Normal

Start-Sleep -Seconds 2

# 2. Start Web Frontend
Write-Host "[2/2] Starting Next.js Web Interface on :3000..." -ForegroundColor Green
Write-Host ""
Write-Host "Local Access:   http://localhost:3000" -ForegroundColor Cyan
$WifiIP = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.InterfaceAlias -like "*Wi-Fi*" -or $_.InterfaceAlias -like "*Ethernet*" }).IPAddress
foreach ($ip in $WifiIP) {
    Write-Host "Mobile Access:  http://$($ip):3000" -ForegroundColor Green
}
Write-Host ""
Write-Host "Press Ctrl+C to stop the Web server (Agent PID: $($AgentProc.Id))" -ForegroundColor Gray

npm --prefix "$Root\apps\web" run start
