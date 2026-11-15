import socket
import psutil
import uuid
import wakeonlan
from typing import Dict, Any, List

class WakeOnLanManager:
    def __init__(self):
        pass

    def get_network_hardware_info(self) -> List[Dict[str, Any]]:
        """Discovers network adapters with their MAC addresses and IPs."""
        adapters = []
        try:
            for if_name, snics in psutil.net_if_addrs().items():
                mac_addr = None
                ipv4_addr = None
                netmask = None

                for snic in snics:
                    if snic.family == psutil.AF_LINK or getattr(snic, "family", None) == -1:
                        mac_addr = snic.address.replace("-", ":").upper()
                    elif snic.family == socket.AF_INET and not snic.address.startswith("127."):
                        ipv4_addr = snic.address
                        netmask = snic.netmask

                if mac_addr and len(mac_addr.split(":")) == 6:
                    adapters.append({
                        "interface": if_name,
                        "mac_address": mac_addr,
                        "ip_address": ipv4_addr,
                        "netmask": netmask,
                        "is_up": psutil.net_if_stats().get(if_name, None).isup if if_name in psutil.net_if_stats() else False
                    })
        except Exception:
            pass
            
        # Fallback to uuid.getnode() if list is empty
        if not adapters:
            raw_mac = ':'.join(['{:02x}'.format((uuid.getnode() >> ele) & 0xff) for ele in range(0,8*6,8)][::-1])
            adapters.append({
                "interface": "Default Primary Adapter",
                "mac_address": raw_mac.upper(),
                "ip_address": "192.168.1.7",
                "netmask": "255.255.255.0",
                "is_up": True
            })

        return adapters

    def send_wake_packet(self, mac_address: str, broadcast_ip: str = "255.255.255.255", port: int = 9) -> Dict[str, Any]:
        """Dispatches UDP magic packet to target MAC address."""
        clean_mac = mac_address.replace("-", ":").strip().upper()
        wakeonlan.send_magic_packet(clean_mac, ip_address=broadcast_ip, port=port)
        return {
            "status": "packet_dispatched",
            "target_mac": clean_mac,
            "broadcast_ip": broadcast_ip,
            "port": port
        }

    def check_reachability(self, host: str, port: int = 8000, timeout: float = 2.0) -> bool:
        """Tests whether target host and port are listening."""
        try:
            with socket.create_connection((host, port), timeout=timeout):
                return True
        except (socket.timeout, ConnectionRefusedError, OSError):
            return False

wol_manager = WakeOnLanManager()
