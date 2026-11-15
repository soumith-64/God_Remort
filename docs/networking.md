# OMNICONTROL: Networking & Remote Access Guide

OMNICONTROL is engineered to operate seamlessly across three network environments:

## 1. Local Network (Same Wi-Fi / LAN)
- When your phone and laptop are on the same Wi-Fi network, the web interface communicates directly with the laptop agent over LAN IP (e.g. `http://192.168.1.7:8000` or `http://192.168.0.104:8000`).
- Latency is minimal (<10ms).
- No internet access is required.

## 2. Remote Access via Tailscale Mesh VPN (Recommended)
- **Tailscale** creates an encrypted WireGuard-based peer-to-peer mesh network between your devices without opening router ports or exposing your laptop to public scanners.
- Both the laptop and smartphone install Tailscale and join the same Tailnet.
- The laptop is assigned a 100.x.y.z Tailscale IP (e.g. `100.85.12.34`).
- Access OMNICONTROL anywhere (even on mobile 5G/4G data) using the laptop's Tailscale IP or MagicDNS name (e.g. `http://omnicontrol-laptop:8000`).

## 3. Remote Access via Reverse Proxy or Cloudflare Tunnel
- Run `cloudflared tunnel` or a self-hosted Nginx reverse proxy with HTTPS/WSS if a public custom domain is preferred.
- Token authentication and pairing security prevent unauthorized access.

## 4. Wake-on-LAN (WOL) Considerations
- WOL sends an Ethernet magic packet (UDP broadcast) on port 9.
- Internet routers drop broadcast packets by default.
- To wake a sleeping laptop remotely:
  1. Have an always-on device on your home network (e.g., Raspberry Pi, home server, or router with WOL support).
  2. Send the wake request to the local device, which emits the magic packet onto the local broadcast domain `192.168.1.255`.
