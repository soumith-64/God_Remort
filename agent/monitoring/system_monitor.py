import time
import platform
import psutil
from typing import Dict, Any, List

class SystemMonitor:
    def __init__(self):
        self._last_net_io = psutil.net_io_counters()
        self._last_net_time = time.time()
        # Initialize cpu_percent
        psutil.cpu_percent(interval=None)

    def get_network_rates(self) -> Dict[str, float]:
        """Calculates instantaneous upload and download speed in KB/s."""
        now = time.time()
        elapsed = now - self._last_net_time
        if elapsed <= 0:
            elapsed = 0.001
            
        current_net = psutil.net_io_counters()
        bytes_sent = current_net.bytes_sent - self._last_net_io.bytes_sent
        bytes_recv = current_net.bytes_recv - self._last_net_io.bytes_recv
        
        self._last_net_io = current_net
        self._last_net_time = now
        
        upload_kbs = round((bytes_sent / 1024.0) / elapsed, 1)
        download_kbs = round((bytes_recv / 1024.0) / elapsed, 1)
        
        return {
            "upload_kbs": max(0.0, upload_kbs),
            "download_kbs": max(0.0, download_kbs),
            "total_sent_mb": round(current_net.bytes_sent / (1024 * 1024), 1),
            "total_recv_mb": round(current_net.bytes_recv / (1024 * 1024), 1),
        }

    def get_battery_info(self) -> Dict[str, Any]:
        battery = psutil.sensors_battery()
        if battery is None:
            return {
                "available": False,
                "percent": 100,
                "power_plugged": True,
                "status_text": "AC Powered (No battery)"
            }
        
        status_text = "Charging" if battery.power_plugged else "Discharging"
        if battery.power_plugged and battery.percent >= 99:
            status_text = "Fully Charged"
            
        return {
            "available": True,
            "percent": round(battery.percent, 1),
            "power_plugged": battery.power_plugged,
            "seconds_left": battery.secsleft if battery.secsleft != psutil.POWER_TIME_UNLIMITED and battery.secsleft != psutil.POWER_TIME_UNKNOWN else None,
            "status_text": status_text
        }

    def get_disk_info(self) -> List[Dict[str, Any]]:
        disks = []
        try:
            partitions = psutil.disk_partitions(all=False)
            for part in partitions:
                # Filter out CD-ROM / removable if not ready
                if "cdrom" in part.opts or part.fstype == "":
                    continue
                try:
                    usage = psutil.disk_usage(part.mountpoint)
                    disks.append({
                        "device": part.device,
                        "mountpoint": part.mountpoint,
                        "fstype": part.fstype,
                        "total_gb": round(usage.total / (1024**3), 1),
                        "used_gb": round(usage.used / (1024**3), 1),
                        "free_gb": round(usage.free / (1024**3), 1),
                        "percent": usage.percent
                    })
                except PermissionError:
                    continue
        except Exception:
            pass
        return disks

    def get_system_metrics(self) -> Dict[str, Any]:
        """Returns comprehensive live hardware status and metrics."""
        vm = psutil.virtual_memory()
        cpu_overall = psutil.cpu_percent(interval=None)
        cpu_cores = psutil.cpu_percent(percpu=True)
        cpu_freq = psutil.cpu_freq()
        
        boot_time = psutil.boot_time()
        uptime_seconds = int(time.time() - boot_time)
        
        net_rates = self.get_network_rates()
        battery = self.get_battery_info()
        disks = self.get_disk_info()
        
        # Primary disk
        primary_disk = disks[0] if disks else {
            "total_gb": 0, "used_gb": 0, "free_gb": 0, "percent": 0
        }

        # Temperature sensor (psutil on Windows typically returns empty for sensors_temperatures, so handled gracefully)
        temp_data = "Not supported by hardware/OS"
        try:
            temps = getattr(psutil, "sensors_temperatures", lambda: {})()
            if temps:
                temp_data = temps
        except Exception:
            pass

        return {
            "timestamp": time.time(),
            "cpu": {
                "overall_percent": cpu_overall,
                "cores_percent": cpu_cores,
                "core_count_logical": psutil.cpu_count(logical=True),
                "core_count_physical": psutil.cpu_count(logical=False),
                "freq_current_mhz": round(cpu_freq.current, 1) if cpu_freq else None,
                "temperature": temp_data
            },
            "memory": {
                "total_gb": round(vm.total / (1024**3), 2),
                "used_gb": round(vm.used / (1024**3), 2),
                "available_gb": round(vm.available / (1024**3), 2),
                "percent": vm.percent
            },
            "disk": {
                "disks": disks,
                "primary": primary_disk
            },
            "battery": battery,
            "network": net_rates,
            "system": {
                "hostname": platform.node(),
                "os": platform.system(),
                "os_release": platform.release(),
                "os_version": platform.version(),
                "architecture": platform.machine(),
                "uptime_seconds": uptime_seconds,
                "boot_time": boot_time
            }
        }

monitor = SystemMonitor()
