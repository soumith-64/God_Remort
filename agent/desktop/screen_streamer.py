import io
import time
import ctypes
import mss
import cv2
import numpy as np
from PIL import Image, ImageDraw
from typing import Dict, Any, List, Optional

user32 = ctypes.windll.user32
gdi32 = ctypes.windll.gdi32

# Win32 Mouse Flags
MOUSEEVENTF_MOVE = 0x0001
MOUSEEVENTF_LEFTDOWN = 0x0002
MOUSEEVENTF_LEFTUP = 0x0004
MOUSEEVENTF_RIGHTDOWN = 0x0008
MOUSEEVENTF_RIGHTUP = 0x0010
MOUSEEVENTF_MIDDLEDOWN = 0x0020
MOUSEEVENTF_MIDDLEUP = 0x0040
MOUSEEVENTF_WHEEL = 0x0800
MOUSEEVENTF_ABSOLUTE = 0x8000

# Win32 Virtual Key Codes
VK_MAP = {
    "enter": 0x0D,
    "return": 0x0D,
    "backspace": 0x08,
    "tab": 0x09,
    "space": 0x20,
    "escape": 0x1B,
    "esc": 0x1B,
    "win": 0x5B,
    "windows": 0x5B,
    "super": 0x5B,
    "ctrl": 0x11,
    "control": 0x11,
    "alt": 0x12,
    "shift": 0x10,
    "up": 0x26,
    "down": 0x28,
    "left": 0x25,
    "right": 0x27,
    "delete": 0x2E,
    "home": 0x24,
    "end": 0x23,
    "pageup": 0x21,
    "pagedown": 0x22,
    "f1": 0x70, "f2": 0x71, "f3": 0x72, "f4": 0x73,
    "f5": 0x74, "f6": 0x75, "f7": 0x76, "f8": 0x77,
    "f9": 0x78, "f10": 0x79, "f11": 0x7A, "f12": 0x7B,
    "a": 0x41, "b": 0x42, "c": 0x43, "d": 0x44, "e": 0x45,
    "f": 0x46, "g": 0x47, "h": 0x48, "i": 0x49, "j": 0x4A,
    "k": 0x4B, "l": 0x4C, "m": 0x4D, "n": 0x4E, "o": 0x4F,
    "p": 0x50, "q": 0x51, "r": 0x52, "s": 0x53, "t": 0x54,
    "u": 0x55, "v": 0x56, "w": 0x57, "x": 0x58, "y": 0x59,
    "z": 0x5A,
}

class POINT(ctypes.Structure):
    _fields_ = [("x", ctypes.c_long), ("y", ctypes.c_long)]

class CURSORINFO(ctypes.Structure):
    _fields_ = [
        ("cbSize", ctypes.c_uint),
        ("flags", ctypes.c_uint),
        ("hCursor", ctypes.c_void_p),
        ("ptScreenPos", POINT)
    ]

def ensure_input_desktop():
    """Attaches current thread to user interactive desktop if in background."""
    try:
        hInput = user32.OpenInputDesktop(0, False, 0x01FF)
        if hInput:
            user32.SetThreadDesktop(hInput)
    except Exception:
        pass

class ScreenStreamer:
    def __init__(self):
        ensure_input_desktop()
        self._sct = mss.MSS()
        self._monitor = self._sct.monitors[1] if len(self._sct.monitors) > 1 else self._sct.monitors[0]
        self.width = self._monitor.get("width", 1920)
        self.height = self._monitor.get("height", 1080)
        self.quality = 40  # Ultra-low latency JPEG quality (35-45KB vs 135KB)
        self.scale = 0.50  # Ultra-responsive low latency scale (960x540)
        self._accum_dx = 0.0
        self._accum_dy = 0.0

    def get_screen_info(self) -> Dict[str, Any]:
        return {
            "width": self.width,
            "height": self.height,
            "quality": self.quality,
            "scale": self.scale
        }

    def set_stream_params(self, quality: Optional[int] = None, scale: Optional[float] = None):
        if quality is not None:
            self.quality = max(20, min(95, quality))
        if scale is not None:
            self.scale = max(0.25, min(1.0, scale))

    def _generate_standby_frame(self, reason: str = "Display session in standby") -> bytes:
        target_w = int(self.width * self.scale) if self.width else 1280
        target_h = int(self.height * self.scale) if self.height else 720
        
        img = Image.new("RGB", (target_w, target_h), color="#090A0F")
        draw = ImageDraw.Draw(img)
        center_x = target_w // 2
        center_y = target_h // 2
        
        card_w = min(500, target_w - 40)
        card_h = 160
        x0 = center_x - card_w // 2
        y0 = center_y - card_h // 2
        draw.rounded_rectangle([x0, y0, x0 + card_w, y0 + card_h], radius=16, fill="#131620", outline="#252A3D", width=1)
        
        draw.text((center_x, center_y - 35), "GOD REMORT DESKTOP", fill="#00E5FF", anchor="mm")
        draw.text((center_x, center_y), reason, fill="#E2E8F0", anchor="mm")
        draw.text((center_x, center_y + 35), "Screen will stream automatically once desktop is active.", fill="#64748B", anchor="mm")
        
        buf = io.BytesIO()
        img.save(buf, format="JPEG", quality=50)
        return buf.getvalue()

    def _draw_cursor_on_frame(self, frame: np.ndarray, target_w: int, target_h: int):
        """Renders a high-visibility, crisp cursor pointer onto the frame."""
        try:
            ensure_input_desktop()
            pt = POINT()
            got_pos = bool(user32.GetCursorPos(ctypes.byref(pt)))
            if got_pos and (pt.x != 0 or pt.y != 0):
                raw_x = pt.x - self._monitor.get("left", 0)
                raw_y = pt.y - self._monitor.get("top", 0)
                self._current_mouse_x = raw_x
                self._current_mouse_y = raw_y
            else:
                raw_x = getattr(self, "_current_mouse_x", self.width // 2)
                raw_y = getattr(self, "_current_mouse_y", self.height // 2)

            cx = int(raw_x * self.scale)
            cy = int(raw_y * self.scale)

            if 0 <= cx < target_w and 0 <= cy < target_h:
                # Use prominent scale so cursor is clearly visible on mobile screens
                c_scale = max(1.2, 1.8 * self.scale)

                # 1. Outer high-contrast pointer polygon (arrow)
                pts = np.array([
                    [cx, cy],
                    [cx, min(target_h - 1, cy + int(24 * c_scale))],
                    [min(target_w - 1, cx + int(7 * c_scale)), min(target_h - 1, cy + int(18 * c_scale))],
                    [min(target_w - 1, cx + int(12 * c_scale)), min(target_h - 1, cy + int(28 * c_scale))],
                    [min(target_w - 1, cx + int(16 * c_scale)), min(target_h - 1, cy + int(26 * c_scale))],
                    [min(target_w - 1, cx + int(11 * c_scale)), min(target_h - 1, cy + int(16 * c_scale))],
                    [min(target_w - 1, cx + int(18 * c_scale)), min(target_h - 1, cy + int(16 * c_scale))],
                ], dtype=np.int32)

                # Thick black outer contour (guarantees visibility on white documents / web pages)
                cv2.polylines(frame, [pts], isClosed=True, color=(0, 0, 0), thickness=max(2, int(4 * c_scale)), lineType=cv2.LINE_AA)
                # Crisp bright white fill (guarantees visibility on dark backgrounds / terminal / IDE)
                cv2.fillPoly(frame, [pts], color=(255, 255, 255), lineType=cv2.LINE_AA)

                # 2. Glowing Cyan pinpoint reticle at the exact apex (cx, cy)
                cv2.circle(frame, (cx, cy), max(3, int(4 * c_scale)), (255, 230, 0), -1)  # BGR Cyan
                cv2.circle(frame, (cx, cy), max(4, int(5 * c_scale)), (0, 0, 0), 1)
        except Exception:
            pass

    def capture_frame(self) -> bytes:
        """Captures primary monitor and encodes it via OpenCV SIMD into ultra-fast JPEG bytes."""
        try:
            ensure_input_desktop()
            sct_img = self._sct.grab(self._monitor)
            
            # Fast numpy buffer conversion
            raw_array = np.frombuffer(sct_img.raw, dtype=np.uint8).reshape((self._monitor["height"], self._monitor["width"], 4))
            
            target_w = int(self.width * self.scale)
            target_h = int(self.height * self.scale)
            
            # Ultra-fast SIMD resize (INTER_NEAREST executes in <0.8ms vs 6ms)
            resized = cv2.resize(raw_array, (target_w, target_h), interpolation=cv2.INTER_NEAREST)
            
            # Extract BGR frame and burn high-contrast hardware cursor onto image
            bgr_frame = resized[:, :, :3]
            self._draw_cursor_on_frame(bgr_frame, target_w, target_h)

            # Fast OpenCV hardware JPEG encode
            encode_params = [
                cv2.IMWRITE_JPEG_QUALITY, self.quality,
                cv2.IMWRITE_JPEG_OPTIMIZE, 0
            ]
            success, enc_buf = cv2.imencode(".jpg", bgr_frame, encode_params)
            if success:
                return enc_buf.tobytes()
            return self._generate_standby_frame("Encoding failed")
        except Exception as e:
            ensure_input_desktop()
            return self._generate_standby_frame(f"Standby: {type(e).__name__}")

    # ----------------- Zero-Latency Native Win32 Input Injection -----------------
    def handle_mouse_move(self, x_ratio: float, y_ratio: float):
        """Instantaneous Win32 SetCursorPos (0.00ms execution)."""
        ensure_input_desktop()
        x = int(max(0.0, min(1.0, x_ratio)) * (self.width - 1))
        y = int(max(0.0, min(1.0, y_ratio)) * (self.height - 1))
        user32.SetCursorPos(x, y)
        self._current_mouse_x = x
        self._current_mouse_y = y

    def handle_mouse_move_relative(self, dx: float, dy: float):
        """Relative cursor motion with subpixel precision for trackpad & D-pad nudging."""
        ensure_input_desktop()
        self._accum_dx += dx
        self._accum_dy += dy
        step_x = int(self._accum_dx)
        step_y = int(self._accum_dy)
        if step_x != 0 or step_y != 0:
            self._accum_dx -= step_x
            self._accum_dy -= step_y
            pt = POINT()
            got_pos = bool(user32.GetCursorPos(ctypes.byref(pt)))
            base_x = pt.x if got_pos and (pt.x != 0 or pt.y != 0) else getattr(self, "_current_mouse_x", self.width // 2)
            base_y = pt.y if got_pos and (pt.x != 0 or pt.y != 0) else getattr(self, "_current_mouse_y", self.height // 2)
            new_x = max(0, min(self.width - 1, base_x + step_x))
            new_y = max(0, min(self.height - 1, base_y + step_y))
            user32.SetCursorPos(new_x, new_y)
            self._current_mouse_x = new_x
            self._current_mouse_y = new_y

    def handle_mouse_click(self, x_ratio: Optional[float] = None, y_ratio: Optional[float] = None, button: str = "left", double: bool = False):
        if x_ratio is not None and y_ratio is not None:
            self.handle_mouse_move(x_ratio, y_ratio)
        
        btn = button.lower()
        if btn == "right":
            down = MOUSEEVENTF_RIGHTDOWN
            up = MOUSEEVENTF_RIGHTUP
        elif btn == "middle":
            down = MOUSEEVENTF_MIDDLEDOWN
            up = MOUSEEVENTF_MIDDLEUP
        else:
            down = MOUSEEVENTF_LEFTDOWN
            up = MOUSEEVENTF_LEFTUP

        user32.mouse_event(down, 0, 0, 0, 0)
        user32.mouse_event(up, 0, 0, 0, 0)
        if double:
            time.sleep(0.05)
            user32.mouse_event(down, 0, 0, 0, 0)
            user32.mouse_event(up, 0, 0, 0, 0)

    def handle_mouse_down(self, button: str = "left"):
        btn = button.lower()
        down = MOUSEEVENTF_RIGHTDOWN if btn == "right" else MOUSEEVENTF_LEFTDOWN
        user32.mouse_event(down, 0, 0, 0, 0)

    def handle_mouse_up(self, button: str = "left"):
        btn = button.lower()
        up = MOUSEEVENTF_RIGHTUP if btn == "right" else MOUSEEVENTF_LEFTUP
        user32.mouse_event(up, 0, 0, 0, 0)

    def handle_mouse_scroll(self, dx: float, dy: float):
        """Native Win32 mouse wheel scroll."""
        clicks = int(dy)
        if clicks != 0:
            user32.mouse_event(MOUSEEVENTF_WHEEL, 0, 0, clicks * 120, 0)

    def handle_key_press(self, key: str):
        """Native Win32 keybd_event keypress."""
        vk = VK_MAP.get(key.lower())
        if vk:
            user32.keybd_event(vk, 0, 0, 0)
            user32.keybd_event(vk, 0, 2, 0) # KEYEVENTF_KEYUP
        elif len(key) == 1:
            # Character input
            self.handle_type_text(key)

    def handle_type_text(self, text: str):
        """Types string using Win32 SendInput or keybd_event."""
        for char in text:
            # Map ASCII character to virtual key
            vk = user32.VkKeyScanW(ord(char))
            if vk != -1:
                shift = (vk >> 8) & 1
                code = vk & 0xFF
                if shift:
                    user32.keybd_event(0x10, 0, 0, 0) # Shift down
                user32.keybd_event(code, 0, 0, 0)
                user32.keybd_event(code, 0, 2, 0)
                if shift:
                    user32.keybd_event(0x10, 0, 2, 0) # Shift up

    def handle_hotkey(self, keys: List[str]):
        """Executes combinations like Ctrl+C, Win+D, Alt+Tab via native Win32."""
        vks = [VK_MAP.get(k.lower()) for k in keys if VK_MAP.get(k.lower())]
        for vk in vks:
            user32.keybd_event(vk, 0, 0, 0)
        time.sleep(0.01)
        for vk in reversed(vks):
            user32.keybd_event(vk, 0, 2, 0)

screen_streamer = ScreenStreamer()
