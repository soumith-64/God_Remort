<#
.SYNOPSIS
    Starts a Cloudflare Tunnel for GOD REMORT Agent.
    Provides instant secure public HTTPS access from phone (5G/Wi-Fi) with no port forwarding or firewall blocks.
#>

$CloudflaredPath = "C:\Program Files (x86)\cloudflared\cloudflared.exe"

if (-not (Test-Path $CloudflaredPath)) {
    Write-Host "[*] cloudflared not found in Program Files. Installing via winget..." -ForegroundColor Yellow
    winget install --id Cloudflare.cloudflared -e --accept-source-agreements --accept-package-agreements
}

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "GOD REMORT — SECURE CLOUDFLARE HTTPS TUNNEL" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "Forwarding: http://localhost:8000" -ForegroundColor Gray
Write-Host "Look for the '*.trycloudflare.com' URL below..." -ForegroundColor Green
Write-Host ""

& $CloudflaredPath tunnel --url http://localhost:8000
