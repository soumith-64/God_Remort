<#
.SYNOPSIS
    Starts a Secure Cloudflare HTTPS Tunnel for GOD REMORT Agent.
    - Saves the public tunnel URL into .tunnel_url
    - Automatically opens an instant Pair QR code in your laptop's browser.
    - Any phone can connect simply by pointing its camera at the laptop screen!
#>

$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

$CloudflaredPath = "C:\Program Files (x86)\cloudflared\cloudflared.exe"

if (-not (Test-Path $CloudflaredPath)) {
    Write-Host "[*] cloudflared not found in Program Files. Installing via winget..." -ForegroundColor Yellow
    winget install --id Cloudflare.cloudflared -e --accept-source-agreements --accept-package-agreements
}

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "GOD REMORT — ZERO-CONFIG MOBILE CONNECT TUNNEL" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "Forwarding local port 8000 over secure Cloudflare HTTPS..." -ForegroundColor Gray
Write-Host "Waiting for tunnel URL..." -ForegroundColor Yellow

$LogFile = "$Root\.tunnel_log.txt"
if (Test-Path $LogFile) { Remove-Item $LogFile -Force }

# Launch cloudflared with output captured
$proc = Start-Process -FilePath $CloudflaredPath -ArgumentList "tunnel --url http://localhost:8000" -RedirectStandardError $LogFile -PassThru -WindowStyle Hidden

$tunnelUrl = $null
for ($i = 0; $i -lt 30; $i++) {
    Start-Sleep -Seconds 1
    if (Test-Path $LogFile) {
        $content = Get-Content $LogFile -Raw -ErrorAction SilentlyContinue
        if ($content -match '(https://[a-zA-Z0-9-]+\.trycloudflare\.com)') {
            $tunnelUrl = $matches[1]
            break
        }
    }
}

if ($tunnelUrl) {
    Set-Content -Path "$Root\.tunnel_url" -Value $tunnelUrl -Force
    Write-Host ""
    Write-Host "==========================================================" -ForegroundColor Green
    Write-Host "TUNNEL READY: $tunnelUrl" -ForegroundColor Green
    Write-Host "==========================================================" -ForegroundColor Green

    # Read current PIN
    $envPin = "101228"
    if (Test-Path "$Root\.env") {
        $envContent = Get-Content "$Root\.env" -Raw
        if ($envContent -match 'GOD_REMORT_PIN=([0-9]+)') {
            $envPin = $matches[1]
        }
    }

    # Publish to Global Cloud Discovery Registry for 1-Number Connection
    try {
        Invoke-RestMethod -Uri "https://ntfy.sh/godremort_$envPin" -Method Post -Body $tunnelUrl -Headers @{ Title = "GOD REMORT Tunnel"; Priority = "high" } | Out-Null
        Write-Host "[OK] Published to Cloud Discovery Registry for System ID: $envPin" -ForegroundColor Cyan
    } catch {
        Write-Host "[i] Registry publish notice: $($_.Exception.Message)" -ForegroundColor Yellow
    }

    $pairUrl = "$tunnelUrl/?pin=$envPin"

    # Generate an elegant visual QR card HTML file and open it on the laptop
    $pairHtml = @"
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>GOD REMORT — 1-Tap Phone Connect</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <script src="https://cdn.jsdelivr.net/npm/qrcode@1.5.3/build/qrcode.min.js"></script>
    <style>
        body {
            background-color: #0A0A0C;
            color: #FFFFFF;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            margin: 0;
            padding: 20px;
        }
        .card {
            background: #141419;
            border: 1px solid rgba(0, 229, 255, 0.25);
            border-radius: 28px;
            padding: 36px 32px;
            max-width: 420px;
            width: 100%;
            text-align: center;
            box-shadow: 0 25px 50px -12px rgba(0, 229, 255, 0.15);
        }
        h1 { font-size: 20px; font-weight: 800; letter-spacing: 1px; color: #00E5FF; margin: 0 0 6px 0; }
        p { color: #8A8F9E; font-size: 13px; margin: 0 0 24px 0; }
        .qr-box {
            background: #000;
            padding: 16px;
            border-radius: 20px;
            display: inline-block;
            border: 1px solid rgba(255,255,255,0.08);
            margin-bottom: 20px;
        }
        canvas { border-radius: 8px; display: block; }
        .pin-badge {
            background: rgba(0, 229, 255, 0.1);
            border: 1px solid rgba(0, 229, 255, 0.3);
            color: #00E5FF;
            font-family: monospace;
            font-size: 18px;
            font-weight: bold;
            letter-spacing: 4px;
            padding: 10px 20px;
            border-radius: 14px;
            display: inline-block;
            margin-bottom: 16px;
        }
        .url-text {
            font-size: 11px;
            color: #555A68;
            word-break: break-all;
            font-family: monospace;
        }
        .instructions {
            background: rgba(255,255,255,0.03);
            border-radius: 12px;
            padding: 12px;
            margin-top: 20px;
            font-size: 12px;
            color: #A0A5B5;
            line-height: 1.5;
        }
    </style>
</head>
<body>
    <div class="card">
        <h1>GOD REMORT</h1>
        <p>Scan with ANY phone camera to connect instantly</p>
        <div class="qr-box">
            <canvas id="qr"></canvas>
        </div>
        <div>
            <div class="pin-badge">$envPin</div>
        </div>
        <div class="instructions">
            📸 Point your iPhone or Android camera at the QR code above.<br>
            Tap the yellow link &rarr; You will connect instantly!
        </div>
        <div style="margin-top: 16px;">
            <a href="$pairUrl" target="_blank" class="url-text">$tunnelUrl</a>
        </div>
    </div>
    <script>
        QRCode.toCanvas(document.getElementById('qr'), '$pairUrl', {
            width: 240,
            margin: 1,
            color: { dark: '#00E5FF', light: '#000000' }
        });
    </script>
</body>
</html>
"@

    Set-Content -Path "$Root\pair.html" -Value $pairHtml -Force
    Start-Process "$Root\pair.html"
    Write-Host "[OK] Opened Pairing QR Card in your laptop browser!" -ForegroundColor Cyan
    Write-Host "     Just point ANY phone's camera at the screen to connect automatically!" -ForegroundColor Green
    Write-Host ""
}
else {
    Write-Host "[!] Could not automatically capture tunnel URL. Check .tunnel_log.txt" -ForegroundColor Red
}

# Keep process alive
Wait-Process -Id $proc.Id
