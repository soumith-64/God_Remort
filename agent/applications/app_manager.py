import os
import subprocess
import winreg
import win32gui
import win32process
import win32con
import psutil
from pathlib import Path
from typing import List, Dict, Any, Optional

class AppManager:
    def __init__(self):
        self._cached_installed: List[Dict[str, Any]] = []
        # Pre-resolve known developer application paths on this system
        self.known_apps = {
            "vscode": {
                "name": "Visual Studio Code",
                "paths": [
                    r"C:\Users\soumi\AppData\Local\Programs\Microsoft VS Code\Code.exe",
                    r"C:\Users\soumi\AppData\Local\Programs\Microsoft VS Code\bin\code.cmd",
                    "code"
                ],
                "icon": "code",
                "category": "developer"
            },
            "antigravity": {
                "name": "Google Antigravity",
                "paths": [
                    r"C:\Users\soumi\AppData\Local\Programs\Antigravity IDE\Antigravity IDE.exe",
                    r"C:\Users\soumi\AppData\Local\Programs\antigravity\Antigravity.exe",
                    r"C:\Users\soumi\AppData\Local\Programs\Antigravity IDE\bin\antigravity-ide.cmd"
                ],
                "icon": "sparkles",
                "category": "developer"
            },
            "terminal": {
                "name": "Windows Terminal",
                "paths": ["wt.exe", "powershell.exe"],
                "icon": "terminal",
                "category": "developer"
            },
            "powershell": {
                "name": "PowerShell",
                "paths": ["powershell.exe"],
                "icon": "terminal",
                "category": "system"
            },
            "cmd": {
                "name": "Command Prompt",
                "paths": ["cmd.exe"],
                "icon": "terminal",
                "category": "system"
            },
            "explorer": {
                "name": "File Explorer",
                "paths": ["explorer.exe"],
                "icon": "folder",
                "category": "system"
            },
            "taskmgr": {
                "name": "Task Manager",
                "paths": ["taskmgr.exe"],
                "icon": "activity",
                "category": "system"
            },
            "chrome": {
                "name": "Google Chrome",
                "paths": [
                    r"C:\Program Files\Google\Chrome\Application\chrome.exe",
                    r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
                    "chrome"
                ],
                "icon": "globe",
                "category": "browser"
            },
            "edge": {
                "name": "Microsoft Edge",
                "paths": [
                    r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
                    "msedge"
                ],
                "icon": "globe",
                "category": "browser"
            },
            "notepad": {
                "name": "Notepad",
                "paths": ["notepad.exe"],
                "icon": "file-text",
                "category": "system"
            },
            "calculator": {
                "name": "Calculator",
                "paths": ["calc.exe"],
                "icon": "calculator",
                "category": "system"
            },
            "paint": {
                "name": "Paint",
                "paths": ["mspaint.exe"],
                "icon": "image",
                "category": "system"
            },
            "settings": {
                "name": "Windows Settings",
                "paths": ["ms-settings:"],
                "icon": "settings",
                "category": "system"
            },
            "word": {
                "name": "Microsoft Word",
                "paths": ["winword.exe"],
                "icon": "file-text",
                "category": "productivity"
            },
            "excel": {
                "name": "Microsoft Excel",
                "paths": ["excel.exe"],
                "icon": "table",
                "category": "productivity"
            },
            "powerpoint": {
                "name": "Microsoft PowerPoint",
                "paths": ["powerpnt.exe"],
                "icon": "presentation",
                "category": "productivity"
            },
            "discord": {
                "name": "Discord",
                "paths": ["discord.exe"],
                "icon": "message-square",
                "category": "social"
            },
            "cursor": {
                "name": "Cursor",
                "paths": ["cursor.cmd", "cursor.exe"],
                "icon": "code",
                "category": "developer"
            },
            "notion": {
                "name": "Notion",
                "paths": ["notion.exe"],
                "icon": "file-text",
                "category": "productivity"
            },
            "pycharm": {
                "name": "PyCharm",
                "paths": ["pycharm.exe", "pycharm64.exe"],
                "icon": "code",
                "category": "developer"
            },
            "zoom": {
                "name": "Zoom Workplace",
                "paths": ["zoom.exe"],
                "icon": "video",
                "category": "communication"
            }
        }

    def resolve_executable(self, candidate_paths: List[str]) -> Optional[str]:
        for path_str in candidate_paths:
            if os.path.isabs(path_str) and os.path.exists(path_str):
                return path_str
            # Check system PATH
            from shutil import which
            found = which(path_str)
            if found:
                return found
        return None

    def get_developer_shortcuts(self) -> List[Dict[str, Any]]:
        """Returns verified shortcuts for critical dev and system tools."""
        shortcuts = []
        for app_id, meta in self.known_apps.items():
            resolved = self.resolve_executable(meta["paths"])
            shortcuts.append({
                "id": app_id,
                "name": meta["name"],
                "available": resolved is not None,
                "resolved_path": resolved,
                "icon": meta["icon"],
                "category": meta["category"]
            })
        return shortcuts

    def list_installed_apps(self, refresh: bool = False) -> List[Dict[str, Any]]:
        """Scans Windows Registry for installed software."""
        if self._cached_installed and not refresh:
            return self._cached_installed

        apps = []
        seen_names = set()

        # 1. Add all launchable Start Menu apps
        for sm in self.list_start_menu_apps():
            seen_names.add(sm["name"].lower())
            apps.append({
                "name": sm["name"],
                "version": "",
                "publisher": "Start Menu Application",
                "install_location": sm["path"],
                "launchable": True
            })

        registry_keys = [
            (winreg.HKEY_LOCAL_MACHINE, r"SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall"),
            (winreg.HKEY_LOCAL_MACHINE, r"SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall"),
            (winreg.HKEY_CURRENT_USER, r"SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall"),
        ]

        for root_hive, sub_key in registry_keys:
            try:
                with winreg.OpenKey(root_hive, sub_key) as key:
                    for i in range(winreg.QueryInfoKey(key)[0]):
                        try:
                            subkey_name = winreg.EnumKey(key, i)
                            with winreg.OpenKey(key, subkey_name) as app_key:
                                try:
                                    name, _ = winreg.QueryValueEx(app_key, "DisplayName")
                                except FileNotFoundError:
                                    continue

                                if not name or name in seen_names:
                                    continue

                                # Ignore system components / updates
                                try:
                                    system_comp, _ = winreg.QueryValueEx(app_key, "SystemComponent")
                                    if system_comp == 1:
                                        continue
                                except FileNotFoundError:
                                    pass

                                version = ""
                                try:
                                    version, _ = winreg.QueryValueEx(app_key, "DisplayVersion")
                                except FileNotFoundError:
                                    pass

                                publisher = ""
                                try:
                                    publisher, _ = winreg.QueryValueEx(app_key, "Publisher")
                                except FileNotFoundError:
                                    pass

                                install_loc = ""
                                try:
                                    install_loc, _ = winreg.QueryValueEx(app_key, "InstallLocation")
                                except FileNotFoundError:
                                    pass

                                seen_names.add(name)
                                apps.append({
                                    "name": str(name).strip(),
                                    "version": str(version).strip(),
                                    "publisher": str(publisher).strip(),
                                    "install_location": str(install_loc).strip()
                                })
                        except Exception:
                            continue
            except Exception:
                continue

        apps.sort(key=lambda x: x["name"].lower())
        self._cached_installed = apps
        return apps

    def list_running_apps(self) -> List[Dict[str, Any]]:
        """Finds all running top-level applications with resilient process fallback."""
        running = []

        try:
            def enum_window_callback(hwnd, extra):
                try:
                    if not win32gui.IsWindowVisible(hwnd):
                        return True
                    title = win32gui.GetWindowText(hwnd).strip()
                    if not title or title in ("Default IME", "MSCTFIME UI"):
                        return True

                    _, pid = win32process.GetWindowThreadProcessId(hwnd)
                    try:
                        proc = psutil.Process(pid)
                        name = proc.name()
                        mem_mb = round(proc.memory_info().rss / (1024 * 1024), 1)
                        cpu_pct = proc.cpu_percent()
                        extra.append({
                            "hwnd": hwnd,
                            "pid": pid,
                            "title": title,
                            "process_name": name,
                            "memory_mb": mem_mb,
                            "cpu_percent": cpu_pct
                        })
                    except (psutil.NoSuchProcess, psutil.AccessDenied):
                        pass
                except Exception:
                    pass
                return True

            win32gui.EnumWindows(enum_window_callback, running)
        except Exception:
            pass

        # Fallback to active user processes if EnumWindows returned empty or timed out
        if not running:
            # Common user GUI processes to highlight
            gui_names = {
                "code.exe": "Visual Studio Code",
                "antigravity ide.exe": "Google Antigravity IDE",
                "antigravity.exe": "Google Antigravity",
                "chrome.exe": "Google Chrome",
                "msedge.exe": "Microsoft Edge",
                "windowsterminal.exe": "Windows Terminal",
                "powershell.exe": "PowerShell",
                "cmd.exe": "Command Prompt",
                "explorer.exe": "Windows Explorer",
                "taskmgr.exe": "Task Manager",
                "node.exe": "Node.js Process",
                "python.exe": "Python Process"
            }
            seen_pids = set()
            for p in psutil.process_iter(['pid', 'name', 'memory_info', 'cpu_percent']):
                try:
                    info = p.info
                    name = (info.get('name') or '').lower()
                    pid = info.get('pid')
                    if not name or pid in seen_pids:
                        continue
                    
                    if name in gui_names:
                        seen_pids.add(pid)
                        mem_mb = round(info['memory_info'].rss / (1024 * 1024), 1) if info.get('memory_info') else 0
                        running.append({
                            "hwnd": 0,
                            "pid": pid,
                            "title": gui_names[name],
                            "process_name": info['name'],
                            "memory_mb": mem_mb,
                            "cpu_percent": info.get('cpu_percent') or 0.0
                        })
                except Exception:
                    continue

        running.sort(key=lambda x: x["title"].lower())
        return running

    def list_start_menu_apps(self) -> List[Dict[str, Any]]:
        """Scans Windows Start Menu directories for launchable user applications."""
        import glob
        start_dirs = [
            os.path.expandvars(r"%ProgramData%\Microsoft\Windows\Start Menu\Programs"),
            os.path.expandvars(r"%APPDATA%\Microsoft\Windows\Start Menu\Programs")
        ]
        results = []
        seen = set()
        skip_terms = ["uninstall", "help", "manual", "readme", "documentation", "license", "homepage"]

        for sdir in start_dirs:
            if not os.path.exists(sdir):
                continue
            for f in glob.glob(sdir + "/**/*.lnk", recursive=True):
                base = os.path.splitext(os.path.basename(f))[0].strip()
                lower = base.lower()
                if any(t in lower for t in skip_terms):
                    continue
                if lower in seen:
                    continue
                seen.add(lower)
                results.append({
                    "name": base,
                    "path": f,
                    "type": "shortcut",
                    "launchable": True
                })

        results.sort(key=lambda x: x["name"].lower())
        return results

    def resolve_any_app(self, query: str) -> Optional[str]:
        """Resolves any app by ID, shortcut (.lnk), executable name, URI protocol, or partial match."""
        q = query.strip().lower()
        if not q:
            return None

        # 1. Direct path check
        if os.path.exists(query):
            return query

        # 2. Known apps dictionary
        if q in self.known_apps:
            res = self.resolve_executable(self.known_apps[q]["paths"])
            if res:
                return res

        for app_id, meta in self.known_apps.items():
            if q == meta["name"].lower():
                res = self.resolve_executable(meta["paths"])
                if res:
                    return res

        # 3. System application / URI protocols mapping
        system_map = {
            "calculator": "calc.exe",
            "calc": "calc.exe",
            "notepad": "notepad.exe",
            "paint": "mspaint.exe",
            "mspaint": "mspaint.exe",
            "settings": "ms-settings:",
            "windows settings": "ms-settings:",
            "task manager": "taskmgr.exe",
            "taskmgr": "taskmgr.exe",
            "file explorer": "explorer.exe",
            "explorer": "explorer.exe",
            "files": "explorer.exe",
            "terminal": "wt.exe",
            "windows terminal": "wt.exe",
            "powershell": "powershell.exe",
            "cmd": "cmd.exe",
            "command prompt": "cmd.exe",
            "word": "winword.exe",
            "excel": "excel.exe",
            "powerpoint": "powerpnt.exe",
            "edge": "msedge.exe",
            "chrome": "chrome.exe",
            "control panel": "control.exe",
        }
        if q in system_map:
            val = system_map[q]
            if val.endswith(":"):
                return val
            from shutil import which
            w = which(val)
            if w:
                return w
            return val

        # 4. Check system PATH via which
        from shutil import which
        w = which(query) or which(f"{query}.exe") or which(f"{query}.cmd")
        if w:
            return w

        # 5. Search Start Menu shortcuts
        start_apps = self.list_start_menu_apps()
        # Exact match first
        for app in start_apps:
            if app["name"].lower() == q:
                return app["path"]
        # Prefix match
        for app in start_apps:
            if app["name"].lower().startswith(q):
                return app["path"]
        # Substring match
        for app in start_apps:
            if q in app["name"].lower():
                return app["path"]

        return None

    def launch_app(self, app_id_or_path: str, args: Optional[List[str]] = None) -> Dict[str, Any]:
        """Launches ANY application by name, ID, shortcut (.lnk), URI protocol, or direct path."""
        target = self.resolve_any_app(app_id_or_path) or app_id_or_path

        # If target is a directory, find primary executable inside
        if os.path.isdir(target):
            candidates = list(Path(target).glob("*.exe"))
            if candidates:
                dir_name = Path(target).name.lower()
                matched = [c for c in candidates if dir_name in c.name.lower()]
                target = str(matched[0] if matched else candidates[0])

        args_str = " ".join(args) if args else ""

        # Method 1: Win32 ShellExecute (launches visible window directly in active user session)
        try:
            import win32api
            import win32con
            res = win32api.ShellExecute(0, "open", target, args_str, None, win32con.SW_SHOWNORMAL)
            if res > 32:
                return {
                    "status": "launched",
                    "executable": target,
                    "method": "win32_shellexecute"
                }
        except Exception:
            pass

        # Method 2: os.startfile (Windows native ShellExecute wrapper)
        try:
            if not args_str:
                os.startfile(target)
                return {
                    "status": "launched",
                    "executable": target,
                    "method": "os_startfile"
                }
        except Exception:
            pass

        # Method 3: cmd.exe start (Windows shell process launcher)
        try:
            cmd = f'start "" "{target}" {args_str}'.strip()
            subprocess.Popen(cmd, shell=True)
            return {
                "status": "launched",
                "executable": target,
                "method": "shell_cmd_start"
            }
        except Exception:
            pass

        # Method 4: direct subprocess.Popen
        from shutil import which
        resolved_bin = target if os.path.exists(target) else which(target)
        if resolved_bin:
            cmd_list = [resolved_bin]
            if args:
                cmd_list.extend(args)
            proc = subprocess.Popen(cmd_list)
            return {
                "status": "launched",
                "pid": proc.pid,
                "executable": resolved_bin,
                "method": "subprocess_popen"
            }

        raise FileNotFoundError(f"Could not open application '{app_id_or_path}'.")

    def control_window(self, hwnd: int, action: str) -> Dict[str, Any]:
        """Controls window state: focus, minimize, maximize, restore, close."""
        if hwnd == 0:
            return {"status": "success", "hwnd": 0, "action": action}
        if not win32gui.IsWindow(hwnd):
            raise ValueError(f"Window handle {hwnd} is invalid or closed.")

        action = action.lower()
        if action == "focus" or action == "restore":
            win32gui.ShowWindow(hwnd, win32con.SW_RESTORE)
            win32gui.SetForegroundWindow(hwnd)
        elif action == "minimize":
            win32gui.ShowWindow(hwnd, win32con.SW_MINIMIZE)
        elif action == "maximize":
            win32gui.ShowWindow(hwnd, win32con.SW_MAXIMIZE)
        elif action == "close":
            win32gui.PostMessage(hwnd, win32con.WM_CLOSE, 0, 0)
        else:
            raise ValueError(f"Unsupported window action: {action}")

        return {"status": "success", "hwnd": hwnd, "action": action}

    def terminate_process(self, pid: int) -> Dict[str, Any]:
        proc = psutil.Process(pid)
        proc_name = proc.name()
        proc.terminate()
        return {"status": "terminated", "pid": pid, "process_name": proc_name}

app_manager = AppManager()
