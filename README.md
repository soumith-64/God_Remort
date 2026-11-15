# OMNICONTROL — Complete Laptop Remote Control Platform

[![Vercel Deployment](https://img.shields.io/badge/Deploy-Vercel-black?style=for-the-badge&logo=vercel)](docs/DEPLOY_VERCEL.md)
[![License: Proprietary](https://img.shields.io/badge/License-Proprietary%20All%20Rights%20Reserved-red.svg?style=for-the-badge)](LICENSE)
[![Collaboration](https://img.shields.io/badge/Collaboration-Isolated%20Environments-blue.svg?style=for-the-badge)](CONTRIBUTING.md)
[![CI Verification](https://img.shields.io/badge/CI-Passing-brightgreen.svg?style=for-the-badge)](#acceptance-testing)

**OMNICONTROL** turns your smartphone or tablet into a wireless, encrypted, low-latency command centre for your personal Windows workstation.

Designed with an ultra-sleek, dark-mode visual aesthetic inspired by Linear, Raycast, and macOS, OMNICONTROL pairs native Windows system management with touch-optimized remote desktop streaming.

---

## Key Features

1. **Live Remote Desktop Streaming & Touch Controls**:
   - Ultra low-latency screen streaming over WebSocket binary frames (MSS frame capture engine with GDI cursor burn-in and leaky-bucket `frame_ack` flow control).
   - Precision Virtual Mouse Panel: Nudge D-pad, Left/Right click triggers, Drag Lock, and 2-axis wheel scrolling.
   - On-screen keyboard with special keys (`Ctrl`, `Alt`, `Win`, `Shift`, `Esc`, `Tab`, `Enter`, `Delete`, arrow keys) and instant hotkey triggers (`Ctrl+C`, `Ctrl+V`, `Ctrl+Z`, `Win+D`, `Alt+Tab`, `Ctrl+Shift+Esc`, `Win+L`).
2. **Developer Centre & App Orchestration**:
   - Dedicated 1-tap launchers for **Google Antigravity IDE**, **Visual Studio Code**, **Windows Terminal**, **PowerShell**, **Explorer**, and **Task Manager**.
   - Universal App Launcher: Launches any installed Windows application or Start Menu program directly from your phone.
   - Scan installed Windows applications and manage running top-level windows (Bring to front, Minimize, Maximize, Close).
3. **Chrooted File Manager**:
   - Safe remote file browser with path traversal protection.
   - 1-tap bookmarks for Home, Documents, Downloads, Desktop.
   - File upload (phone to laptop) and file download (laptop to phone).
   - Previews for text, source code (syntax styled), images (high-res), and PDFs.
   - Create folders, rename, delete with safety confirmation.
4. **Interactive PowerShell Terminal**:
   - Bidirectional interactive shell session streaming real-time stdout/stderr.
   - ANSI escape rendering and command history.
   - Ctrl+C interrupt signal and quick snippet launcher.
5. **System Hardware & Power Administration**:
   - Live hardware telemetry: CPU load % (overall + per core), RAM memory (used/free/total), storage partitions, upload/download network speed (KB/s), battery charging state.
   - Windows Core Audio master volume slider & mute toggle.
   - Screen display brightness slider.
   - Supported workstation power operations: Lock, Sleep, Restart, Shutdown, and Cancel Scheduled Shutdown (with safety confirmation dialogs).
6. **Wake-on-LAN (WOL) Management**:
   - Network adapter MAC address discovery.
   - UDP magic packet broadcast engine on port 9.
   - Live host reachability check and BIOS/ACPI configuration guide.
7. **Enterprise Security & Pairing**:
   - Ephemeral 6-digit PIN and QR code pairing ceremony.
   - Cryptographically signed HMAC-SHA256 JWT tokens with inline authorization for voice and remote commands.
   - Granular permission scopes (`desktop:control`, `apps:manage`, `files:read`, `files:write`, `terminal:exec`, `system:admin`, `power:admin`).
   - 1-click device revocation and persistent audit logging in SQLite.

---

## Architecture Overview

```
[Smartphone / Tablet / Web App] (Next.js 14, React 18, Tailwind, Zustand)
                          ▲
                          │ Encrypted WebSocket & REST (LAN / Cloudflare Tunnel / Tailscale)
                          ▼
[Laptop Companion Agent] (Python 3.12, FastAPI, MSS, PyAutoGUI, PyWin32, Pycaw)
                          ▲
                          │ Direct Windows APIs
                          ▼
[Windows 11 Workstation Desktop, File System, Registry, Audio & Power Subsystem]
```

---

## Deployment & Collaboration

### 1. Deploying Frontend to Vercel
OMNICONTROL supports zero-config deployment to Vercel with automated preview builds for pull requests.
For complete instructions on importing to Vercel and connecting to your laptop via Cloudflare Tunnel or local IP, see the [Vercel Deployment Guide](docs/DEPLOY_VERCEL.md).

### 2. Collaborating in Isolated Environments
To protect workstations and avoid state collisions, all team members collaborate in **isolated environments**:
- **Local Sandbox**: Every developer runs an independent agent on `http://127.0.0.1:8000` with their own gitignored local database (`data/omnicontrol.db`).
- **Vercel Preview Deployments**: Feature branches automatically receive dedicated, ephemeral Vercel preview URLs for testing without touching production.
- See [CONTRIBUTING.md](CONTRIBUTING.md) for full branch rules, PR templates, and test checklists.

---

## Quick Start Guide

### 1. Prerequisites
- Windows 11 (64-bit) for the workstation agent
- Python 3.12+ (in `agent/.venv`)
- Node.js v20+ and npm

### 2. Start the Agent & Web Frontend
Run the all-in-one launcher script:
```powershell
.\scripts\start-all.ps1
```
Or start each service independently:
```powershell
# Start Python Agent (serves API & bundled web UI on port 8000)
.\agent\.venv\Scripts\python.exe agent\main.py

# Start Next.js Frontend Dev Server (port 3000)
npm --prefix apps/web run dev
```

### 3. Connect from Your Phone
1. Open the URL shown in the terminal (e.g. `http://192.168.0.109:8000` or your Vercel deployment URL).
2. When prompted, enter the 6-digit PIN displayed on your laptop screen.
3. Your phone is paired and granted administrative control!

---

## Publishing to GitHub

To publish this project to your GitHub account:

```powershell
# 1. Initialize git
git init

# 2. Stage all files (respecting .gitignore)
git add .

# 3. Create initial commit
git commit -m "feat: initial commit of OMNICONTROL platform with copyright and duplication controls"

# 4. Add your GitHub remote repository
git remote add origin https://github.com/YOUR_USERNAME/omnicontrol.git

# 5. Push to main
git branch -M main
git push -u origin main
```

---

## Acceptance Testing

Run automated unit and end-to-end acceptance tests:
```powershell
# Python unit tests
.\agent\.venv\Scripts\pytest.exe agent\tests

# 20/20 End-to-end acceptance verification
.\agent\.venv\Scripts\python.exe scripts\verify-acceptance.py
```

---

## Copyright & Duplication Notice

**Copyright (c) 2026 OMNICONTROL. All Rights Reserved.**

This software and its documentation are proprietary and confidential. Unauthorized copying, downloading, duplication, reverse engineering, republishing, or redistribution of this repository or any portion thereof without express written permission is strictly prohibited. See [LICENSE](LICENSE) for full terms.
