import os
import socket
import psutil
from pathlib import Path
from typing import List, Dict

class Settings:
    HOST: str = os.getenv("OMNICONTROL_HOST", "0.0.0.0")
    PORT: int = int(os.getenv("OMNICONTROL_PORT", "8000"))
    SECRET_KEY: str = os.getenv("OMNICONTROL_SECRET_KEY", "omnicontrol-secure-secret-key-3.12-production")
    DATA_DIR: Path = Path(os.getenv("OMNICONTROL_DATA_DIR", "./data")).resolve()
    
    ALLOWED_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
    ]
    
    # Full system access: all active Windows drives and user home directories
    STORAGE_ROOTS: List[Path] = []

    def __init__(self):
        import string
        self.DATA_DIR.mkdir(parents=True, exist_ok=True)
        
        # Discover all active Windows drives (C:\, D:\, etc.)
        for d in string.ascii_uppercase:
            drive_path = Path(f"{d}:\\")
            if drive_path.exists():
                self.STORAGE_ROOTS.append(drive_path)

        # Fallback to home if no drives found
        if not self.STORAGE_ROOTS:
            self.STORAGE_ROOTS = [Path.home()]
            
        # Parse additional origins if set
        extra_origins = os.getenv("OMNICONTROL_ALLOWED_ORIGINS")
        if extra_origins:
            for origin in extra_origins.split(","):
                clean = origin.strip()
                if clean and clean not in self.ALLOWED_ORIGINS:
                    self.ALLOWED_ORIGINS.append(clean)
                    
        # Parse additional storage roots
        extra_roots = os.getenv("OMNICONTROL_STORAGE_ROOTS")
        if extra_roots:
            for root_path in extra_roots.split(","):
                p = Path(root_path.strip()).resolve()
                if p.exists() and p not in self.STORAGE_ROOTS:
                    self.STORAGE_ROOTS.append(p)

    @staticmethod
    def get_network_interfaces() -> List[Dict[str, str]]:
        """Detect all active IPv4 addresses including LAN, Wi-Fi, and Tailscale."""
        interfaces = []
        try:
            for name, snics in psutil.net_if_addrs().items():
                for snic in snics:
                    if snic.family == socket.AF_INET and not snic.address.startswith("127."):
                        is_tailscale = "tailscale" in name.lower() or snic.address.startswith("100.")
                        interfaces.append({
                            "name": name,
                            "ip": snic.address,
                            "netmask": snic.netmask or "",
                            "type": "tailscale" if is_tailscale else ("wifi" if "wi-fi" in name.lower() or "wlan" in name.lower() else "ethernet")
                        })
        except Exception:
            pass
        return interfaces

settings = Settings()
