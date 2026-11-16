import time
import secrets
import hashlib
import io
import base64
import qrcode
import jwt
from typing import Optional, Dict, Any, List
from fastapi import HTTPException, Security, Depends, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from agent.core.config import settings
from agent.core.database import is_device_valid, register_device, update_device_last_seen, log_audit, get_custom_pin, set_custom_pin

security_scheme = HTTPBearer(auto_error=False)

# Ephemeral pairing state
_pairing_state: Dict[str, Any] = {
    "pin": None,
    "expires_at": 0,
    "pairing_token": None
}

# Brute-force protection: IP-based failure tracker & lockout
_failed_attempts: Dict[str, List[float]] = {}
_lockouts: Dict[str, float] = {}

def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()

async def generate_pairing_session() -> Dict[str, Any]:
    """Generates pairing session with persistent or ephemeral PIN and QR code."""
    custom_pin = await get_custom_pin()
    if custom_pin:
        pin = custom_pin
        expires_at = time.time() + (365 * 86400) # 1 year for persistent PIN
    else:
        # Cryptographically secure random 6-digit PIN (100000 - 999999)
        pin = f"{secrets.randbelow(900000) + 100000}"
        expires_at = time.time() + 300  # 5 minutes
    
    pairing_token = secrets.token_urlsafe(24)
    _pairing_state["pin"] = pin
    _pairing_state["expires_at"] = expires_at
    _pairing_state["pairing_token"] = pairing_token
    
    # Construct pairing payload
    interfaces = settings.get_network_interfaces()
    primary_ip = interfaces[0]["ip"] if interfaces else "127.0.0.1"
    pairing_data = {
        "pin": pin,
        "token": pairing_token,
        "host": primary_ip,
        "port": settings.PORT,
        "hostname": settings.HOST
    }
    
    # Generate QR Code image as base64 data URL
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=8,
        border=2,
    )
    qr.add_data(f"omnicontrol://pair?pin={pin}&host={primary_ip}&port={settings.PORT}")
    qr.make(fit=True)
    img = qr.make_image(fill_color="#00E5FF", back_color="#0A0A0C")
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    qr_b64 = base64.b64encode(buf.getvalue()).decode()
    qr_data_url = f"data:image/png;base64,{qr_b64}"

    return {
        "pin": pin,
        "pairing_token": pairing_token,
        "expires_in_seconds": 300,
        "qr_code": qr_data_url,
        "network_interfaces": interfaces
    }

def get_current_pairing_pin() -> Optional[str]:
    if _pairing_state["pin"] and time.time() < _pairing_state["expires_at"]:
        return _pairing_state["pin"]
    return None

async def verify_pairing_request(pin: str, device_name: str, requested_device_id: Optional[str] = None, ip: str = "") -> Dict[str, Any]:
    """Validates the PIN against custom permanent PIN or ephemeral PIN and issues token with brute-force lockout."""
    now = time.time()
    clean_ip = ip or "unknown"

    # 1. Check if IP is currently locked out
    if clean_ip in _lockouts:
        lockout_expiry = _lockouts[clean_ip]
        if now < lockout_expiry:
            remaining = int(lockout_expiry - now)
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Too many failed pairing attempts. Security lockout active for {remaining} seconds."
            )
        else:
            del _lockouts[clean_ip]
            _failed_attempts.pop(clean_ip, None)

    custom_pin = await get_custom_pin()

    pin_valid = False
    clean_pin = pin.strip()

    if custom_pin and secrets.compare_digest(clean_pin, custom_pin):
        pin_valid = True
    elif _pairing_state["pin"] and now <= _pairing_state["expires_at"] and secrets.compare_digest(clean_pin, _pairing_state["pin"]):
        pin_valid = True

    if not pin_valid:
        # Record failed attempt
        attempts = _failed_attempts.get(clean_ip, [])
        # Keep attempts within last 10 minutes (600s)
        attempts = [t for t in attempts if now - t < 600]
        attempts.append(now)
        _failed_attempts[clean_ip] = attempts

        if len(attempts) >= 5:
            # Lock out for 15 minutes (900s)
            _lockouts[clean_ip] = now + 900
            await log_audit("pairing_lockout", details=f"IP '{clean_ip}' locked out for 15 minutes after 5 failed PIN attempts", ip_address=clean_ip)
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many failed pairing attempts. Your IP has been temporarily locked out for 15 minutes."
            )

        await log_audit("pairing_failed", details=f"Invalid PIN attempt for device '{device_name}' ({len(attempts)}/5 attempts)", ip_address=clean_ip)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid pairing PIN. ({5 - len(attempts)} attempts remaining before temporary lockout)"
        )

    # Success: clear failed attempts
    _failed_attempts.pop(clean_ip, None)
    _lockouts.pop(clean_ip, None)

    device_id = requested_device_id or f"dev_{secrets.token_hex(8)}"
    scopes = [
        "view",
        "desktop:control",
        "apps:manage",
        "files:read",
        "files:write",
        "terminal:exec",
        "system:admin",
        "power:admin"
    ]
        
    # 30-day token expiration
    payload = {
        "sub": device_id,
        "name": device_name,
        "role": "admin",
        "scopes": scopes,
        "iat": int(now),
        "exp": int(now + (30 * 86400))
    }
    token = jwt.encode(payload, settings.SECRET_KEY, algorithm="HS256")
    
    # Save device in database
    await register_device(
        device_id=device_id,
        name=device_name,
        token_hash=hash_token(token),
        scopes=",".join(scopes),
        role="admin"
    )
    await log_audit("device_paired", device_id=device_id, details=f"Device '{device_name}' paired successfully", ip_address=ip)
    
    # Reset pairing PIN so it cannot be reused
    _pairing_state["pin"] = None
    _pairing_state["expires_at"] = 0
    
    return {
        "device_id": device_id,
        "name": device_name,
        "token": token,
        "role": "admin",
        "scopes": scopes,
        "expires_at": payload["exp"]
    }

async def get_current_device(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Security(security_scheme)
) -> Dict[str, Any]:
    """Dependency for authenticating API requests via Bearer token."""
    token = None
    if credentials:
        token = credentials.credentials
    elif "authorization" in request.headers:
        auth_header = request.headers["authorization"]
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
    elif "token" in request.query_params:
        token = request.query_params["token"]

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token required. Please pair your device."
        )

    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
        device_id = payload.get("sub")
        if not device_id:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token claims")

        valid = await is_device_valid(device_id)
        if not valid:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Device has been revoked")

        await update_device_last_seen(device_id)
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token expired. Please re-pair.")
    except jwt.PyJWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid authentication token")

def require_scope(required_scope: str):
    """Enforces specific scope on endpoint."""
    async def scope_checker(device: Dict[str, Any] = Depends(get_current_device)):
        scopes = device.get("scopes", [])
        if required_scope not in scopes and "admin" not in scopes:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Missing required permission: '{required_scope}'"
            )
        return device
    return scope_checker
