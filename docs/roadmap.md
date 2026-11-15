# OMNICONTROL: Implementation Roadmap & Technical Limitations

## 1. Phased Implementation Roadmap

- [x] **Phase 0: Environment Inspection & System Discovery**
  - Inspected Windows 11 Home (Build 26300), Python 3.12.6, Node v20.18.0, npm 10.8.2.
  - Verified network adapters (Ethernet: `192.168.0.104`, Wi-Fi: `192.168.1.7`).
  - Verified installed application paths:
    - VS Code: `C:\Users\soumi\AppData\Local\Programs\Microsoft VS Code\bin\code.cmd`
    - Antigravity IDE: `C:\Users\soumi\AppData\Local\Programs\Antigravity IDE\Antigravity IDE.exe` and `C:\Users\soumi\AppData\Local\Programs\antigravity\Antigravity.exe`
  - Created modular monorepo structure (`apps/web`, `agent`, `shared`, `docs`, `scripts`).
  - Installed Python agent requirements (FastAPI, uvicorn, psutil, pywin32, mss, pillow, pyautogui, pynput, wakeonlan, pycaw, screen-brightness-control).
  - Installed Next.js 14 frontend dependencies.

- [ ] **Phase 1: Foundation (Dashboard, Live System Health, Pairing & Security)**
  - Agent Core: FastAPI server, CORS, WebSocket manager, SQLite database for paired devices and logs.
  - Pairing protocol: 6-digit PIN and QR generation, token verification, permission verification.
  - System monitoring: Real-time CPU, RAM, disk, battery, network rate polling and WebSocket broadcasts.
  - Frontend: Responsive Dark/Light theme, Linear/Raycast design system, Live Dashboard cards, connection manager.
  - Acceptance Test: Phone/browser connects, pairs with PIN, and views accurate live hardware stats.

- [ ] **Phase 2: Remote Desktop Engine**
  - Agent: MSS low-latency screen grabber, adaptive resolution & JPEG compression, binary WebSocket stream.
  - Agent: Mouse and keyboard event handler (absolute touch mapping, single/double/right click, scroll, keyboard shortcuts).
  - Frontend: Interactive HTML5 Canvas, mobile touch gestures (tap, double tap, 2-finger scroll, pinch zoom), floating toolbar, on-screen keyboard with special keys (Ctrl, Alt, Win, Tab, Esc).
  - Acceptance Test: Live screen stream visible on mobile, touch gestures control cursor and launch actions.

- [ ] **Phase 3: Application Management & Dev Centre**
  - Agent: Windows Registry & Start Menu application discovery, running process listing, window manipulation (focus, minimize, maximize, close).
  - Agent: Specialized launch handlers for VS Code, Antigravity IDE, Terminal, Chrome, Edge, etc.
  - Frontend: Installed and running apps grid, one-tap launch, window focus control, dev process manager with active port inspection.
  - Acceptance Test: Launch VS Code and Antigravity directly from phone and switch to their windows.

- [ ] **Phase 4: Chrooted File Manager**
  - Agent: Sandboxed path traversal defense, directory listing, file streaming download, multipart upload, rename, copy, move, delete.
  - Frontend: Mobile file browser, breadcrumb navigation, preview modal (images, text, PDF), upload progress, sort & search.
  - Acceptance Test: Browse laptop directories, upload file from phone, download file to phone.

- [ ] **Phase 5: Interactive Terminal Engine**
  - Agent: Bidirectional shell runner (PowerShell / CMD), real-time stdout/stderr streaming over WebSocket, signal cancellation (Ctrl+C).
  - Frontend: Terminal interface, ANSI colors, command history, quick command snippets, mobile-friendly keyboard keys.
  - Acceptance Test: Run commands (e.g., `Get-Process`, `dir`, `python --version`) with real-time output.

- [ ] **Phase 6: System Control Centre & Power Operations**
  - Agent: Volume and mute control via Windows Core Audio (pycaw), brightness control via WMI, power operations (lock workstation, sleep, reboot, shutdown).
  - Frontend: Volume and brightness sliders, power action cards with safety confirmation dialogs.
  - Acceptance Test: Change laptop volume, lock laptop screen, verify confirmation dialogs.

- [ ] **Phase 7: Remote Power Management & Wake-on-LAN**
  - Agent: MAC address detection, subnet broadcast configuration, WOL magic packet emitter.
  - Documentation & Wizard: BIOS/UEFI ACPI S5 wake settings, network card "Magic Packet" settings, LAN gateway proxy explanation.
  - Acceptance Test: Send WOL packet and verify packet dispatch.

- [ ] **Phase 8: Remote Networking (Tailscale & Multi-Network Access)**
  - Tailscale integration guide & automatic Tailscale IP address binding.
  - Mobile data / cellular access verification.

- [ ] **Phase 9: Final Polish & Automated Verification**
  - Automated tests for agent endpoints and protocols.
  - PWA manifest, offline/reconnection indicators, audit logging.

---

## 2. Technical Limitations & Engineering Tradeoffs

1. **Wake-on-LAN on Laptops**:
   - Modern laptops (especially on Wi-Fi and running on battery) enter deep sleep / hibernate states where wireless cards are fully unpowered.
   - Wake-on-LAN over Wi-Fi (WoWLAN) requires AC power connection, supported Wi-Fi chipset drivers, and router ARP table retention.
   - Over cellular / external networks, UDP broadcast packets are dropped by Internet routers; a LAN gateway or Tailscale node is required to relay the magic packet.
2. **Windows UAC & Secure Desktop**:
   - Certain Windows security prompts (UAC dialogs, Ctrl+Alt+Del) run on a separate isolated desktop (`Winlogon` / `SecureDesktop`). Standard user-mode applications cannot capture or inject keystrokes into the Secure Desktop without running as a privileged Windows Service (SYSTEM account).
   - OMNICONTROL runs in the active user session for direct access to user apps and environment; elevation workflows are clearly documented.
3. **Hardware Brightness & Sensors**:
   - Desktop monitors connected via HDMI/DisplayPort without DDC/CI do not support software brightness changes. Laptop internal displays support WMI brightness control, which OMNICONTROL utilizes.
