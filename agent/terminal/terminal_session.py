import asyncio
import os
import subprocess
import uuid
from typing import Dict, Optional, Callable, Awaitable

class TerminalSession:
    def __init__(self, session_id: str, shell_type: str = "powershell", on_output: Optional[Callable[[str], Awaitable[None]]] = None):
        self.session_id = session_id
        self.shell_type = shell_type.lower()
        self.on_output = on_output
        self.process: Optional[asyncio.subprocess.Process] = None
        self._reader_task: Optional[asyncio.Task] = None
        self.history: list[str] = []
        self.is_running = False

    async def start(self):
        cmd = ["powershell.exe", "-NoLogo", "-NoExit", "-Command", "-"] if self.shell_type == "powershell" else ["cmd.exe"]
        
        self.process = await asyncio.create_subprocess_exec(
            *cmd,
            stdin=asyncio.subprocess.PIPE,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.STDOUT,
            creationflags=subprocess.CREATE_NO_WINDOW
        )
        self.is_running = True
        self._reader_task = asyncio.create_task(self._read_output())

    async def _read_output(self):
        try:
            while self.is_running and self.process and self.process.stdout:
                line = await self.process.stdout.readline()
                if not line:
                    break
                text = line.decode("utf-8", errors="replace")
                if self.on_output:
                    await self.on_output(text)
        except asyncio.CancelledError:
            pass
        except Exception as e:
            if self.on_output:
                await self.on_output(f"\r\n[Terminal Error: {str(e)}]\r\n")
        finally:
            self.is_running = False

    async def write(self, data: str):
        if not self.process or not self.process.stdin or not self.is_running:
            raise RuntimeError("Terminal session is not running.")

        if data.strip() and data.endswith(("\n", "\r")):
            self.history.append(data.strip())
            if len(self.history) > 100:
                self.history.pop(0)

        self.process.stdin.write(data.encode("utf-8"))
        await self.process.stdin.drain()

    async def interrupt(self):
        """Sends Ctrl+C / interrupts active process."""
        if self.process and self.is_running:
            try:
                # On Windows, sending break to process
                self.process.terminate()
                await self.start()
                if self.on_output:
                    await self.on_output("\r\n^C\r\n")
            except Exception:
                pass

    async def close(self):
        self.is_running = False
        if self._reader_task:
            self._reader_task.cancel()
        if self.process:
            try:
                self.process.kill()
                await self.process.wait()
            except Exception:
                pass

class TerminalManager:
    def __init__(self):
        self.sessions: Dict[str, TerminalSession] = {}

    def create_session(self, shell_type: str = "powershell", on_output: Optional[Callable[[str], Awaitable[None]]] = None) -> TerminalSession:
        sid = f"term_{uuid.uuid4().hex[:8]}"
        session = TerminalSession(session_id=sid, shell_type=shell_type, on_output=on_output)
        self.sessions[sid] = session
        return session

    def get_session(self, session_id: str) -> Optional[TerminalSession]:
        return self.sessions.get(session_id)

    async def close_session(self, session_id: str):
        session = self.sessions.pop(session_id, None)
        if session:
            await session.close()

terminal_manager = TerminalManager()
