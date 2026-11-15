import re
import logging
from typing import Dict, Any, Optional
from agent.applications.app_manager import app_manager
from agent.system.system_control import system_control
from agent.desktop.screen_streamer import screen_streamer
from agent.core.database import log_audit

logger = logging.getLogger("omnicontrol.voice")

class VoiceHandler:
    """Processes natural language voice transcripts and translates them into host system actions."""

    async def execute_voice_command(self, command_text: str, device_id: Optional[str] = None) -> Dict[str, Any]:
        text = command_text.strip()
        if not text:
            return {"status": "error", "message": "Voice command was empty."}

        norm = re.sub(r"[^\w\s]", "", text.lower()).strip()
        logger.info(f"Voice Command received: '{command_text}' (normalized: '{norm}')")

        # 1. Type / Write Text
        type_match = re.match(r"^(?:type|write|enter(?:\s+text)?)\s+(.+)$", text, re.IGNORECASE)
        if type_match:
            text_to_type = type_match.group(1).strip()
            screen_streamer.handle_type_text(text_to_type)
            await log_audit("voice_type", device_id=device_id, details=f"Typed text via voice: {text_to_type}")
            return {
                "status": "success",
                "action": "type_text",
                "message": f"Typed: \"{text_to_type}\"",
                "spoken_response": f"Typed {text_to_type}"
            }

        # 2. Volume Controls
        if any(p in norm for p in ["mute audio", "mute volume", "mute sound"]) or norm == "mute":
            system_control.set_audio_volume(percent=0, mute=True)
            return {"status": "success", "action": "mute", "message": "Audio muted", "spoken_response": "Muted audio"}

        if any(p in norm for p in ["unmute audio", "unmute volume", "unmute sound"]) or norm == "unmute":
            curr = system_control.get_audio_volume()
            vol = curr.get("volume_percent", 50)
            if vol == 0:
                vol = 30
            system_control.set_audio_volume(percent=vol, mute=False)
            return {"status": "success", "action": "unmute", "message": f"Audio unmuted to {vol}%", "spoken_response": f"Unmuted to {vol} percent"}

        vol_set_match = re.search(r"(?:set\s+)?volume\s+(?:to\s+)?(\d+)", norm)
        if vol_set_match:
            target_vol = max(0, min(100, int(vol_set_match.group(1))))
            system_control.set_audio_volume(percent=target_vol, mute=False)
            return {"status": "success", "action": "set_volume", "message": f"Volume set to {target_vol}%", "spoken_response": f"Volume set to {target_vol} percent"}

        if any(p in norm for p in ["volume up", "increase volume", "raise volume", "louder", "turn up sound"]):
            curr = system_control.get_audio_volume()
            target_vol = min(100, curr.get("volume_percent", 50) + 15)
            system_control.set_audio_volume(percent=target_vol, mute=False)
            return {"status": "success", "action": "volume_up", "message": f"Volume increased to {target_vol}%", "spoken_response": f"Volume at {target_vol} percent"}

        if any(p in norm for p in ["volume down", "decrease volume", "lower volume", "quieter", "turn down sound"]):
            curr = system_control.get_audio_volume()
            target_vol = max(0, curr.get("volume_percent", 50) - 15)
            system_control.set_audio_volume(percent=target_vol, mute=False)
            return {"status": "success", "action": "volume_down", "message": f"Volume decreased to {target_vol}%", "spoken_response": f"Volume at {target_vol} percent"}

        # 3. Brightness Controls
        bright_set_match = re.search(r"(?:set\s+)?brightness\s+(?:to\s+)?(\d+)", norm)
        if bright_set_match:
            target_b = max(0, min(100, int(bright_set_match.group(1))))
            try:
                system_control.set_display_brightness(percent=target_b)
                return {"status": "success", "action": "set_brightness", "message": f"Brightness set to {target_b}%", "spoken_response": f"Brightness set to {target_b} percent"}
            except Exception as e:
                return {"status": "error", "message": str(e), "spoken_response": "Brightness adjustment not supported on this display"}

        if any(p in norm for p in ["brightness up", "increase brightness", "brighter", "screen brighter"]):
            try:
                curr = system_control.get_display_brightness()
                target_b = min(100, curr.get("brightness_percent", 70) + 20)
                system_control.set_display_brightness(percent=target_b)
                return {"status": "success", "action": "brightness_up", "message": f"Brightness increased to {target_b}%", "spoken_response": f"Brightness at {target_b} percent"}
            except Exception as e:
                return {"status": "error", "message": str(e), "spoken_response": "Brightness adjustment not supported"}

        if any(p in norm for p in ["brightness down", "decrease brightness", "dim screen", "darker"]):
            try:
                curr = system_control.get_display_brightness()
                target_b = max(10, curr.get("brightness_percent", 70) - 20)
                system_control.set_display_brightness(percent=target_b)
                return {"status": "success", "action": "brightness_down", "message": f"Brightness dimmed to {target_b}%", "spoken_response": f"Brightness dimmed to {target_b} percent"}
            except Exception as e:
                return {"status": "error", "message": str(e), "spoken_response": "Brightness adjustment not supported"}

        # 4. Power Management
        if any(p in norm for p in ["lock laptop", "lock screen", "lock computer", "lock pc"]) or norm == "lock":
            res = await system_control.execute_power_action("lock", device_id=device_id)
            return {"status": "success", "action": "lock", "message": "Laptop locked", "spoken_response": "Workstation locked"}

        if any(p in norm for p in ["sleep laptop", "put to sleep", "sleep pc"]) or norm == "sleep":
            res = await system_control.execute_power_action("sleep", device_id=device_id)
            return {"status": "success", "action": "sleep", "message": "Laptop entering sleep mode", "spoken_response": "Entering sleep state"}

        if any(p in norm for p in ["restart laptop", "restart computer", "reboot computer", "reboot laptop"]):
            res = await system_control.execute_power_action("restart", device_id=device_id)
            return {"status": "success", "action": "restart", "message": "Restart scheduled in 5 seconds", "spoken_response": "Restart initiated"}

        if any(p in norm for p in ["shutdown laptop", "shut down laptop", "turn off laptop", "turn off computer"]):
            res = await system_control.execute_power_action("shutdown", device_id=device_id)
            return {"status": "success", "action": "shutdown", "message": "Shutdown scheduled in 5 seconds", "spoken_response": "Shutdown initiated"}

        if any(p in norm for p in ["cancel shutdown", "cancel restart", "abort shutdown"]):
            res = await system_control.execute_power_action("cancel", device_id=device_id)
            return {"status": "success", "action": "cancel", "message": "Scheduled shutdown/restart cancelled", "spoken_response": "Power operation cancelled"}

        # 5. Application Launching
        app_targets = {
            "vscode": ["vs code", "vscode", "visual studio code", "code editor", "code"],
            "antigravity": ["antigravity", "anti gravity", "google antigravity"],
            "chrome": ["chrome", "google chrome", "browser", "web browser", "internet"],
            "edge": ["edge", "microsoft edge"],
            "terminal": ["terminal", "windows terminal", "powershell"],
            "cmd": ["cmd", "command prompt"],
            "explorer": ["file explorer", "files", "my files", "open explorer", "explorer"],
            "taskmgr": ["task manager", "taskmgr", "activity monitor"]
        }

        for app_id, trigger_list in app_targets.items():
            for trigger in trigger_list:
                # e.g., "open vs code", "launch chrome", "start antigravity"
                if norm == f"open {trigger}" or norm == f"launch {trigger}" or norm == f"start {trigger}" or norm == trigger:
                    try:
                        launch_res = app_manager.launch_app(app_id)
                        name = app_manager.known_apps.get(app_id, {}).get("name", app_id)
                        await log_audit("voice_app_launch", device_id=device_id, details=f"Launched {name} via voice")
                        return {
                            "status": "success",
                            "action": "launch_app",
                            "app": name,
                            "message": f"Launched {name}",
                            "spoken_response": f"Opening {name}"
                        }
                    except Exception as e:
                        return {"status": "error", "message": f"Failed to open {trigger}: {str(e)}", "spoken_response": f"Could not open {trigger}"}

        # 6. Window Management & Hotkeys
        if any(p in norm for p in ["close window", "close app", "close current window", "exit app"]):
            screen_streamer.handle_hotkey(["alt", "f4"])
            return {"status": "success", "action": "close_window", "message": "Closed active window (Alt+F4)", "spoken_response": "Closed window"}

        if any(p in norm for p in ["switch window", "switch app", "alt tab", "next window"]):
            screen_streamer.handle_hotkey(["alt", "tab"])
            return {"status": "success", "action": "switch_window", "message": "Switched application window (Alt+Tab)", "spoken_response": "Switched window"}

        if any(p in norm for p in ["show desktop", "minimize all", "go to desktop", "hide windows"]):
            screen_streamer.handle_hotkey(["win", "d"])
            return {"status": "success", "action": "show_desktop", "message": "Toggled desktop (Win+D)", "spoken_response": "Showing desktop"}

        if any(p in norm for p in ["open search", "windows search", "search laptop"]):
            screen_streamer.handle_hotkey(["win", "s"])
            return {"status": "success", "action": "search", "message": "Opened Windows Search (Win+S)", "spoken_response": "Opening search"}

        # 7. Common Keyboard Actions
        if norm in ["press enter", "hit enter", "enter"]:
            screen_streamer.handle_key_press("enter")
            return {"status": "success", "action": "key_press", "message": "Pressed Enter", "spoken_response": "Enter"}

        if norm in ["press backspace", "hit backspace", "backspace", "delete that"]:
            screen_streamer.handle_key_press("backspace")
            return {"status": "success", "action": "key_press", "message": "Pressed Backspace", "spoken_response": "Backspace"}

        if norm in ["press escape", "escape", "cancel that"]:
            screen_streamer.handle_key_press("escape")
            return {"status": "success", "action": "key_press", "message": "Pressed Escape", "spoken_response": "Escape"}

        if norm in ["press tab", "tab"]:
            screen_streamer.handle_key_press("tab")
            return {"status": "success", "action": "key_press", "message": "Pressed Tab", "spoken_response": "Tab"}

        if norm in ["copy", "copy text", "copy that"]:
            screen_streamer.handle_hotkey(["ctrl", "c"])
            return {"status": "success", "action": "hotkey", "message": "Copied to clipboard (Ctrl+C)", "spoken_response": "Copied"}

        if norm in ["paste", "paste text", "paste that"]:
            screen_streamer.handle_hotkey(["ctrl", "v"])
            return {"status": "success", "action": "hotkey", "message": "Pasted from clipboard (Ctrl+V)", "spoken_response": "Pasted"}

        if norm in ["select all", "select everything"]:
            screen_streamer.handle_hotkey(["ctrl", "a"])
            return {"status": "success", "action": "hotkey", "message": "Selected All (Ctrl+A)", "spoken_response": "Selected all"}

        if norm in ["undo", "undo that"]:
            screen_streamer.handle_hotkey(["ctrl", "z"])
            return {"status": "success", "action": "hotkey", "message": "Undo (Ctrl+Z)", "spoken_response": "Undone"}

        if norm in ["save", "save file"]:
            screen_streamer.handle_hotkey(["ctrl", "s"])
            return {"status": "success", "action": "hotkey", "message": "Saved (Ctrl+S)", "spoken_response": "Saved"}

        # 8. Mouse Clicks & Scrolling
        if norm in ["click", "left click", "tap"]:
            screen_streamer.handle_mouse_click(button="left")
            return {"status": "success", "action": "mouse_click", "message": "Left click executed", "spoken_response": "Clicked"}

        if norm in ["right click", "context menu"]:
            screen_streamer.handle_mouse_click(button="right")
            return {"status": "success", "action": "mouse_click", "message": "Right click executed", "spoken_response": "Right clicked"}

        if norm in ["double click"]:
            screen_streamer.handle_mouse_click(button="left", double=True)
            return {"status": "success", "action": "mouse_click", "message": "Double click executed", "spoken_response": "Double clicked"}

        if any(p in norm for p in ["scroll down", "page down"]):
            screen_streamer.handle_mouse_scroll(0, -3)
            return {"status": "success", "action": "scroll_down", "message": "Scrolled down", "spoken_response": "Scrolled down"}

        if any(p in norm for p in ["scroll up", "page up"]):
            screen_streamer.handle_mouse_scroll(0, 3)
            return {"status": "success", "action": "scroll_up", "message": "Scrolled up", "spoken_response": "Scrolled up"}

        # 9. Universal / Any App Launch ("open discord", "open calculator", "open word", etc.)
        open_generic = re.match(r"^(?:open|launch|start|run)\s+(.+)$", norm)
        if open_generic:
            raw_target = open_generic.group(1).strip()
            try:
                res = app_manager.launch_app(raw_target)
                display_name = raw_target.title()
                await log_audit("voice_app_launch", device_id=device_id, details=f"Launched '{raw_target}' via voice")
                return {
                    "status": "success",
                    "action": "launch_app",
                    "app": display_name,
                    "message": f"Launched {display_name} on your laptop",
                    "spoken_response": f"Opening {display_name}"
                }
            except Exception as e:
                logger.warning(f"Voice launch failed for '{raw_target}': {e}")

        # Unrecognized fallback with helpful instructions
        return {
            "status": "unrecognized",
            "message": f"Command '{command_text}' not recognized. Try: 'open vs code', 'volume up', 'brightness 80', 'type <message>', or 'lock laptop'.",
            "spoken_response": f"I didn't understand '{command_text}'. Try saying open VS Code or volume up."
        }

voice_handler = VoiceHandler()
