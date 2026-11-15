# OMNICONTROL: Architecture & Systems Specification

## 1. Executive Overview

**OMNICONTROL** is an enterprise-grade, low-latency, mobile-first remote personal laptop control platform. It bridges smartphones and tablets to a host Windows workstation (with future Linux/macOS capability), enabling complete remote system administration, desktop streaming, application orchestration, file lifecycle management, interactive shell sessions, and hardware power control.

---

## 2. Core Architectural Pillars

```
+-----------------------------------------------------------------------------------+
|                            OMNICONTROL ECOSYSTEM                                  |
+-----------------------------------------------------------------------------------+
|  [Mobile / Tablet / Desktop Web Browser]                                          |
|  - Next.js 14+ App Router, React 18, TypeScript, Tailwind CSS, Framer Motion      |
|  - Bottom Navigation (Mobile) / Responsive Expansive Sidebar (Tablet/Desktop)      |
|  - Low-Latency Canvas Stream Engine + Gesture Mapper                              |
|  - WebSocket Event Dispatcher + Reconnection Backoff Engine                       |
+-----------------------------------------------------------------------------------+
                                  |
              Encrypted Channel (WSS / HTTPS / Tailscale Mesh)
                                  |
+-----------------------------------------------------------------------------------+
|  [Laptop Companion Agent - Windows 11 / 10]                                       |
|  - Python 3.12+ AsyncIO & FastAPI High-Performance Service                       |
|  - MSS Ultra-Fast Screen Capture Engine (Sub-15ms frame grab)                    |
|  - Input Injection Engine (PyAutoGUI, PyWin32, Windows User32 SendInput)          |
|  - System & Hardware Metrics Monitor (psutil, pycaw, screen_brightness_control)   |
|  - Process & Window Management Engine (Win32 EnumWindows, SetForegroundWindow)    |
|  - Chrooted / Sandboxed File Management Engine                                    |
|  - Interactive Shell Runner (PowerShell, CMD with ANSI escape streaming)         |
|  - Power & Wake-on-LAN Subsystem (ACPI Sleep/Lock/Hibernate, WOL Magic Packets)  |
|  - SQLite Async Security Vault (Paired devices, audit logs, revoked tokens)       |
+-----------------------------------------------------------------------------------+
```

---

## 3. Communication Protocol & Channels

1. **REST API (`/api/v1/`)**:
   - `POST /api/v1/auth/pair/initiate`: Generates 6-digit PIN and QR data for device onboarding.
   - `POST /api/v1/auth/pair/verify`: Verifies PIN and returns signed device token with assigned scopes.
   - `GET /api/v1/system/status`: Real-time hardware health, memory, CPU, disk, battery, network rates.
   - `POST /api/v1/system/power`: Safe power management (lock, sleep, restart, shutdown, cancel).
   - `GET /api/v1/apps/list`: Enumerates installed applications, running processes, and window handles.
   - `POST /api/v1/apps/launch`: Launches verified application executables (VS Code, Antigravity, etc.).
   - `POST /api/v1/apps/window`: Controls application windows (focus, minimize, maximize, close).
   - `GET /api/v1/files/browse`: Safe directory listing with path traversal defense.
   - `POST /api/v1/files/upload`: Multipart chunked file upload to laptop.
   - `GET /api/v1/files/download`: Streaming file download to client.
   - `POST /api/v1/files/operations`: Rename, copy, move, delete with confirmation.

2. **WebSocket Real-Time Channels**:
   - `/ws/desktop`: Dedicated ultra-low latency desktop stream and input processing.
     - Outbound (Laptop -> Client): Binary compressed frames (JPEG/WebP) with frame headers (timestamp, resolution, FPS).
     - Inbound (Client -> Laptop): JSON input payloads (mouse_move, mouse_click, mouse_scroll, key_press, hotkey).
   - `/ws/terminal`: Interactive bidirectional terminal stream (PowerShell / CMD) supporting ANSI escape codes and resizing.
   - `/ws/events`: Push notifications, hardware alerts (high CPU, low battery), connection heartbeats.

---

## 4. Remote Desktop Low-Latency Engine

Rather than naive HTTP polling, OMNICONTROL uses an asynchronous pipeline:
1. **MSS Desktop Grab**: Takes direct desktop memory buffer in ~8-12ms on Windows 11.
2. **Dynamic Compression**: Uses Pillow with adjustable quality (30-85%) and adaptive resolution scaling (0.5x, 0.75x, 1.0x) matching network bandwidth.
3. **Delta Detection & Throttle**: Only transmits when the screen changes or at the target frame rate (default 25-30 FPS on LAN/Tailscale).
4. **Touch-to-Mouse Engine**:
   - Single tap: Left click.
   - Two-finger tap: Right click.
   - Two-finger drag: Smooth vertical/horizontal scroll.
   - Long press: Context menu / right click.
   - Pinch-to-zoom: Client-side CSS transform with pan offset.
   - Absolute coordinate mapping: Normalizes touch percentage `(x: 0..1, y: 0..1)` directly to Windows screen coordinates `(w * x, h * y)`.

---

## 5. Security & Device Pairing Architecture

- **Pairing Ceremony**: Agent displays ephemeral 6-digit pairing code and QR code. The mobile device sends the code within the 5-minute validity window.
- **Device Credential**: Upon approval, client receives a cryptographically secure device token signed with HMAC-SHA256 containing device ID, role, and granted scopes.
- **Granular Permissions (Scopes)**:
  - `view`: System dashboard and live monitoring.
  - `desktop:control`: Remote desktop viewing and input injection.
  - `apps:manage`: Launch and switch applications.
  - `files:read`: Read-only file browsing and download.
  - `files:write`: File upload, deletion, modification.
  - `terminal:exec`: Interactive shell execution.
  - `power:admin`: Workstation lock, sleep, reboot, shutdown.
- **Defense in Depth**:
  - Path traversal defense: canonical path resolution checks against permitted directory roots.
  - Command sanitization: Shell execution runs through controlled PTY rather than raw `eval`.
  - Rate limiting on authentication attempts.
  - Device revocation: Revoked device IDs are rejected instantly via SQLite device registry.
