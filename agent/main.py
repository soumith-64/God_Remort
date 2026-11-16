import asyncio
import json
import logging
import sys
from pathlib import Path

# Ensure root directory is on Python path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from contextlib import asynccontextmanager
from typing import Optional, List

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, Depends, UploadFile, File, Form, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse
from pydantic import BaseModel

from agent.core.config import settings
from agent.core.database import init_db, get_paired_devices, revoke_device, get_audit_logs, log_audit
from agent.security.auth import (
    generate_pairing_session,
    verify_pairing_request,
    get_current_device,
    require_scope,
    get_current_pairing_pin
)
from agent.monitoring.system_monitor import monitor
from agent.desktop.screen_streamer import screen_streamer
from agent.applications.app_manager import app_manager
from agent.files.file_manager import file_manager
from agent.terminal.terminal_session import terminal_manager
from agent.system.system_control import system_control
from agent.power.wake_on_lan import wol_manager
from agent.voice.voice_handler import voice_handler

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("omnicontrol.agent")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Initializing GOD REMORT Agent SQLite Database...")
    await init_db()
    
    # Generate initial pairing session
    pairing_info = await generate_pairing_session()
    logger.info("=" * 60)
    logger.info("GOD REMORT AGENT ONLINE")
    logger.info(f"Host: {settings.HOST}:{settings.PORT}")
    logger.info(f"Active Network IPs: {[iface['ip'] for iface in pairing_info['network_interfaces']]}")
    logger.info(f"PAIRING PIN: [ {pairing_info['pin']} ] (Valid for 5 minutes)")
    logger.info("=" * 60)
    yield
    # Shutdown
    logger.info("Shutting down GOD REMORT Agent...")

app = FastAPI(
    title="GOD REMORT Agent",
    description="High-Performance Laptop Companion Agent & Remote Control Engine",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Permits local network, Tailscale mesh, and custom domains
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ----------------- Models -----------------
class PairVerifyRequest(BaseModel):
    pin: str
    device_name: str
    device_id: Optional[str] = None

class CustomPinRequest(BaseModel):
    pin: str

class PowerActionRequest(BaseModel):
    action: str  # lock, sleep, restart, shutdown, cancel

class AppLaunchRequest(BaseModel):
    app_id_or_path: str
    args: Optional[List[str]] = None

class WindowControlRequest(BaseModel):
    hwnd: int
    action: str  # focus, minimize, maximize, close

class ProcessTerminateRequest(BaseModel):
    pid: int

class AudioVolumeRequest(BaseModel):
    percent: int
    mute: Optional[bool] = None

class DisplayBrightnessRequest(BaseModel):
    percent: int

class FileOperationRequest(BaseModel):
    action: str  # create_folder, rename, delete
    path: str
    new_name: Optional[str] = None

class WolRequest(BaseModel):
    mac_address: str
    broadcast_ip: Optional[str] = "255.255.255.255"
    port: Optional[int] = 9

class VoiceCommandRequest(BaseModel):
    command: str

# ----------------- Health & Info -----------------
@app.get("/api/v1/health")
async def health_check():
    interfaces = settings.get_network_interfaces()
    return {
        "status": "online",
        "service": "GOD REMORT Agent",
        "version": "1.0.0",
        "interfaces": interfaces,
        "has_active_pairing": get_current_pairing_pin() is not None
    }

# ----------------- Pairing & Auth -----------------
@app.post("/api/v1/auth/pair/initiate")
async def initiate_pairing():
    """Generates a fresh PIN and QR code."""
    session = await generate_pairing_session()
    logger.info(f"New pairing session requested. PIN: {session['pin']}")
    return session

@app.post("/api/v1/auth/pair/verify")
async def verify_pairing(req: PairVerifyRequest, request: Request):
    client_ip = request.client.host if request.client else "unknown"
    return await verify_pairing_request(
        pin=req.pin,
        device_name=req.device_name,
        requested_device_id=req.device_id,
        ip=client_ip
    )

@app.get("/api/v1/auth/devices")
async def list_devices(current_device: dict = Depends(get_current_device)):
    return await get_paired_devices()

@app.post("/api/v1/auth/pin")
async def set_custom_pin_endpoint(req: CustomPinRequest, current_device: dict = Depends(get_current_device)):
    from agent.core.database import set_custom_pin
    if len(req.pin.strip()) < 4:
        raise HTTPException(status_code=400, detail="PIN must be at least 4 digits")
    await set_custom_pin(req.pin.strip())
    return {"status": "success", "message": f"Custom PIN configured: '{req.pin.strip()}'"}

@app.post("/api/v1/auth/devices/{device_id}/revoke")
async def revoke_device_endpoint(device_id: str, current_device: dict = Depends(get_current_device)):
    await revoke_device(device_id)
    return {"status": "revoked", "device_id": device_id}

@app.get("/api/v1/auth/audit")
async def get_audit_trail(current_device: dict = Depends(get_current_device)):
    return await get_audit_logs(limit=100)

# ----------------- System Monitoring -----------------
@app.get("/api/v1/system/status")
async def get_system_status(current_device: dict = Depends(get_current_device)):
    return monitor.get_system_metrics()

# ----------------- Hardware & Power Control -----------------
@app.get("/api/v1/system/audio")
async def get_audio(current_device: dict = Depends(get_current_device)):
    return system_control.get_audio_volume()

@app.post("/api/v1/system/audio")
async def set_audio(req: AudioVolumeRequest, current_device: dict = Depends(require_scope("system:admin"))):
    return system_control.set_audio_volume(percent=req.percent, mute=req.mute)

@app.get("/api/v1/system/brightness")
async def get_brightness(current_device: dict = Depends(get_current_device)):
    return system_control.get_display_brightness()

@app.post("/api/v1/system/brightness")
async def set_brightness(req: DisplayBrightnessRequest, current_device: dict = Depends(require_scope("system:admin"))):
    return system_control.set_display_brightness(percent=req.percent)

@app.post("/api/v1/system/power")
async def power_operation(req: PowerActionRequest, request: Request, current_device: dict = Depends(require_scope("power:admin"))):
    client_ip = request.client.host if request.client else "unknown"
    return await system_control.execute_power_action(
        action=req.action,
        device_id=current_device.get("sub"),
        ip=client_ip
    )

# ----------------- Voice Command Engine -----------------
@app.post("/api/v1/voice/command")
async def execute_voice_command_endpoint(req: VoiceCommandRequest, current_device: dict = Depends(get_current_device)):
    """Executes a voice command transcript on the laptop system."""
    try:
        return await voice_handler.execute_voice_command(
            command_text=req.command,
            device_id=current_device.get("sub")
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# ----------------- Applications & Dev Centre -----------------
@app.get("/api/v1/apps/shortcuts")
async def get_shortcuts(current_device: dict = Depends(get_current_device)):
    return app_manager.get_developer_shortcuts()

@app.get("/api/v1/apps/installed")
async def get_installed_apps(refresh: bool = False, current_device: dict = Depends(get_current_device)):
    return app_manager.list_installed_apps(refresh=refresh)

@app.get("/api/v1/apps/running")
async def get_running_apps(current_device: dict = Depends(get_current_device)):
    return app_manager.list_running_apps()

@app.post("/api/v1/apps/launch")
async def launch_app_endpoint(req: AppLaunchRequest, current_device: dict = Depends(require_scope("apps:manage"))):
    try:
        res = app_manager.launch_app(req.app_id_or_path, req.args)
        await log_audit("app_launched", device_id=current_device.get("sub"), details=f"Launched '{req.app_id_or_path}'")
        return res
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/v1/apps/window")
async def control_window_endpoint(req: WindowControlRequest, current_device: dict = Depends(require_scope("apps:manage"))):
    try:
        return app_manager.control_window(req.hwnd, req.action)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/v1/apps/terminate")
async def terminate_proc(req: ProcessTerminateRequest, current_device: dict = Depends(require_scope("apps:manage"))):
    try:
        res = app_manager.terminate_process(req.pid)
        await log_audit("process_terminated", device_id=current_device.get("sub"), details=f"Terminated PID {req.pid}")
        return res
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# ----------------- File Manager -----------------
@app.get("/api/v1/files/bookmarks")
async def get_file_bookmarks(current_device: dict = Depends(get_current_device)):
    return file_manager.get_bookmarks()

@app.get("/api/v1/files/browse")
async def browse_files(path: str = "", current_device: dict = Depends(require_scope("files:read"))):
    try:
        return file_manager.list_directory(path)
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/api/v1/files/preview")
async def preview_file_endpoint(path: str, current_device: dict = Depends(require_scope("files:read"))):
    try:
        return file_manager.preview_file(path)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/api/v1/files/download")
async def download_file(path: str, current_device: dict = Depends(require_scope("files:read"))):
    try:
        resolved = file_manager.resolve_safe_path(path)
        if not resolved.exists() or resolved.is_dir():
            raise HTTPException(status_code=404, detail="File not found")
        return FileResponse(path=str(resolved), filename=resolved.name)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/v1/files/upload")
async def upload_file(
    destination_dir: str = Form(...),
    file: UploadFile = File(...),
    current_device: dict = Depends(require_scope("files:write"))
):
    try:
        target_dir = file_manager.resolve_safe_path(destination_dir)
        dest_file = target_dir / file.filename
        
        # Write chunks
        with open(dest_file, "wb") as f:
            while chunk := await file.read(1024 * 64):
                f.write(chunk)
                
        await log_audit("file_uploaded", device_id=current_device.get("sub"), details=f"Uploaded '{file.filename}' to '{target_dir}'")
        return {"status": "uploaded", "path": str(dest_file), "filename": file.filename}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/v1/files/operations")
async def file_operations(req: FileOperationRequest, current_device: dict = Depends(require_scope("files:write"))):
    try:
        if req.action == "create_folder":
            if not req.new_name:
                raise ValueError("Folder name required")
            return file_manager.create_directory(req.path, req.new_name)
        elif req.action == "rename":
            if not req.new_name:
                raise ValueError("New name required")
            return file_manager.rename_item(req.path, req.new_name)
        elif req.action == "delete":
            return file_manager.delete_item(req.path)
        else:
            raise ValueError(f"Unknown operation: {req.action}")
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# ----------------- Wake-on-LAN -----------------
@app.get("/api/v1/power/wol/adapters")
async def get_wol_adapters(current_device: dict = Depends(get_current_device)):
    return wol_manager.get_network_hardware_info()

@app.post("/api/v1/power/wol/wake")
async def send_wol(req: WolRequest, current_device: dict = Depends(require_scope("power:admin"))):
    return wol_manager.send_wake_packet(
        mac_address=req.mac_address,
        broadcast_ip=req.broadcast_ip or "255.255.255.255",
        port=req.port or 9
    )

@app.get("/api/v1/power/wol/check")
async def check_power_reachability(host: str, port: int = 8000):
    reachable = wol_manager.check_reachability(host, port)
    return {"host": host, "port": port, "reachable": reachable}

# ----------------- WebSockets: Telemetry Events -----------------
@app.websocket("/ws/events")
async def websocket_events(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            metrics = monitor.get_system_metrics()
            await websocket.send_json({
                "type": "telemetry",
                "data": metrics
            })
            await asyncio.sleep(1.0)
    except WebSocketDisconnect:
        pass
    except Exception:
        pass

# ----------------- WebSockets: Remote Desktop Stream & Input -----------------
@app.websocket("/ws/desktop")
async def websocket_desktop(websocket: WebSocket):
    await websocket.accept()
    
    stream_active = True
    target_fps = 30
    min_frame_interval = 1.0 / target_fps
    
    # Client-ready event for zero-latency leaky bucket flow control
    client_ready = asyncio.Event()
    client_ready.set()  # Allow initial frame immediately
    
    # Task to capture and send frames continuously without bufferbloat
    async def frame_sender():
        try:
            while stream_active:
                t0 = asyncio.get_event_loop().time()
                
                # Wait until client has rendered previous frame or fallback timeout (max 100ms)
                try:
                    await asyncio.wait_for(client_ready.wait(), timeout=0.10)
                except asyncio.TimeoutError:
                    pass
                client_ready.clear()

                # Offload capture & encode to background thread pool (never freezes event loop)
                jpeg_bytes = await asyncio.to_thread(screen_streamer.capture_frame)
                await websocket.send_bytes(jpeg_bytes)
                
                elapsed = asyncio.get_event_loop().time() - t0
                sleep_time = max(0.002, min_frame_interval - elapsed)
                await asyncio.sleep(sleep_time)
        except (WebSocketDisconnect, asyncio.CancelledError):
            pass
        except Exception as e:
            logger.debug(f"Frame sender error: {e}")

    sender_task = asyncio.create_task(frame_sender())

    try:
        while True:
            # Receive input commands from client with 0.0ms delay
            msg = await websocket.receive_text()
            data = json.loads(msg)
            cmd_type = data.get("type")

            if cmd_type == "frame_ack":
                # Client finished rendering last frame, ready for the next one immediately
                client_ready.set()

            elif cmd_type == "mouse_move":
                screen_streamer.handle_mouse_move(data.get("x", 0), data.get("y", 0))

            elif cmd_type in ("mouse_move_relative", "mouse_nudge"):
                screen_streamer.handle_mouse_move_relative(data.get("dx", 0), data.get("dy", 0))

            elif cmd_type == "mouse_click":
                screen_streamer.handle_mouse_click(
                    x_ratio=data.get("x"),
                    y_ratio=data.get("y"),
                    button=data.get("button", "left"),
                    double=data.get("double", False)
                )

            elif cmd_type == "mouse_down":
                screen_streamer.handle_mouse_down(data.get("button", "left"))

            elif cmd_type == "mouse_up":
                screen_streamer.handle_mouse_up(data.get("button", "left"))

            elif cmd_type == "mouse_scroll":
                screen_streamer.handle_mouse_scroll(data.get("dx", 0), data.get("dy", 0))

            elif cmd_type == "key_press":
                screen_streamer.handle_key_press(data.get("key", ""))

            elif cmd_type == "type_text":
                screen_streamer.handle_type_text(data.get("text", ""))

            elif cmd_type == "hotkey":
                screen_streamer.handle_hotkey(data.get("keys", []))

            elif cmd_type == "set_quality":
                screen_streamer.set_stream_params(
                    quality=data.get("quality"),
                    scale=data.get("scale")
                )
    except WebSocketDisconnect:
        pass
    except Exception as e:
        logger.debug(f"Desktop WS error: {e}")
    finally:
        stream_active = False
        sender_task.cancel()

# ----------------- WebSockets: Interactive Terminal -----------------
@app.websocket("/ws/terminal")
async def websocket_terminal(websocket: WebSocket):
    await websocket.accept()
    
    async def send_output(text: str):
        try:
            await websocket.send_json({"type": "output", "data": text})
        except Exception:
            pass

    session = terminal_manager.create_session(shell_type="powershell", on_output=send_output)
    await session.start()

    try:
        while True:
            msg = await websocket.receive_text()
            data = json.loads(msg)
            msg_type = data.get("type")

            if msg_type == "input":
                await session.write(data.get("data", ""))
            elif msg_type == "interrupt":
                await session.interrupt()
    except WebSocketDisconnect:
        pass
    except Exception:
        pass
    finally:
        await terminal_manager.close_session(session.session_id)

# ----------------- Unified Static Web Hosting -----------------
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

web_out_dir = Path(__file__).resolve().parent.parent / "apps" / "web" / "out"

if web_out_dir.exists():
    next_static = web_out_dir / "_next"
    if next_static.exists():
        app.mount("/_next", StaticFiles(directory=str(next_static)), name="next_static")

    @app.get("/")
    async def serve_index():
        return FileResponse(str(web_out_dir / "index.html"))

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        file_path = web_out_dir / full_path
        if file_path.exists() and file_path.is_file():
            return FileResponse(str(file_path))
        return FileResponse(str(web_out_dir / "index.html"))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("agent.main:app", host=settings.HOST, port=settings.PORT, reload=False, log_level="info")
