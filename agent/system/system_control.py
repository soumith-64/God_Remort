import os
import ctypes
import subprocess
from typing import Dict, Any, Optional
from agent.core.database import log_audit

class SystemControl:
    def __init__(self):
        pass

    def _get_volume_endpoint(self):
        from pycaw.pycaw import AudioUtilities, IAudioEndpointVolume
        from comtypes import CLSCTX_ALL

        speakers = AudioUtilities.GetSpeakers()
        if hasattr(speakers, "EndpointVolume") and speakers.EndpointVolume is not None:
            return speakers.EndpointVolume
        if hasattr(speakers, "Activate"):
            interface = speakers.Activate(IAudioEndpointVolume._iid_, CLSCTX_ALL, None)
            return ctypes.cast(interface, ctypes.POINTER(IAudioEndpointVolume))
        if hasattr(speakers, "_dev"):
            interface = speakers._dev.Activate(IAudioEndpointVolume._iid_, CLSCTX_ALL, None)
            return ctypes.cast(interface, ctypes.POINTER(IAudioEndpointVolume))
        raise RuntimeError("No compatible audio endpoint volume found")

    def get_audio_volume(self) -> Dict[str, Any]:
        """Retrieves Windows Master Audio volume and mute status via Core Audio."""
        try:
            volume = self._get_volume_endpoint()
            level = volume.GetMasterVolumeLevelScalar()
            mute = volume.GetMute()
            return {
                "available": True,
                "volume_percent": int(round(level * 100)),
                "is_muted": bool(mute)
            }
        except Exception as e:
            return {
                "available": False,
                "volume_percent": 50,
                "is_muted": False,
                "error": str(e)
            }

    def set_audio_volume(self, percent: int, mute: Optional[bool] = None) -> Dict[str, Any]:
        """Sets Windows Master Audio volume level (0-100) and mute state."""
        try:
            volume = self._get_volume_endpoint()
            scalar = max(0.0, min(1.0, percent / 100.0))
            volume.SetMasterVolumeLevelScalar(scalar, None)

            if mute is not None:
                volume.SetMute(1 if mute else 0, None)

            return {
                "status": "success",
                "volume_percent": percent,
                "is_muted": bool(volume.GetMute())
            }
        except Exception as e:
            raise RuntimeError(f"Failed to set audio volume: {str(e)}")

    def get_display_brightness(self) -> Dict[str, Any]:
        """Retrieves screen brightness on supported laptop displays."""
        try:
            import screen_brightness_control as sbc
            current = sbc.get_brightness()
            val = current[0] if isinstance(current, list) and current else current
            return {
                "available": True,
                "brightness_percent": int(val)
            }
        except Exception:
            return {
                "available": False,
                "brightness_percent": 100,
                "error": "Brightness control not supported on this monitor/driver"
            }

    def set_display_brightness(self, percent: int) -> Dict[str, Any]:
        """Sets screen brightness (0-100%)."""
        try:
            import screen_brightness_control as sbc
            target = max(0, min(100, percent))
            sbc.set_brightness(target)
            return {"status": "success", "brightness_percent": target}
        except Exception as e:
            raise RuntimeError(f"Failed to set brightness: {str(e)}")

    async def execute_power_action(self, action: str, device_id: Optional[str] = None, ip: str = "") -> Dict[str, Any]:
        """Executes authorized power operations."""
        action = action.lower()
        await log_audit("power_action", device_id=device_id, details=f"Power action requested: '{action}'", ip_address=ip)

        if action == "lock":
            ctypes.windll.user32.LockWorkStation()
            return {"status": "success", "action": "lock", "message": "Workstation locked"}

        elif action == "sleep":
            # Windows standby/sleep
            subprocess.Popen(["rundll32.exe", "powrprof.dll,SetSuspendState", "0,1,0"])
            return {"status": "success", "action": "sleep", "message": "Entering sleep state"}

        elif action == "restart":
            subprocess.Popen(["shutdown", "/r", "/t", "5", "/c", "Restart initiated from OMNICONTROL mobile"])
            return {"status": "success", "action": "restart", "message": "Restart scheduled in 5 seconds"}

        elif action == "shutdown":
            subprocess.Popen(["shutdown", "/s", "/t", "5", "/c", "Shutdown initiated from OMNICONTROL mobile"])
            return {"status": "success", "action": "shutdown", "message": "Shutdown scheduled in 5 seconds"}

        elif action == "cancel":
            subprocess.Popen(["shutdown", "/a"])
            return {"status": "success", "action": "cancel", "message": "Scheduled shutdown/restart cancelled"}

        else:
            raise ValueError(f"Unknown power action: {action}")

system_control = SystemControl()
