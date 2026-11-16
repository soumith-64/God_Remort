import aiosqlite
import datetime
from pathlib import Path
from typing import List, Optional, Dict, Any
from agent.core.config import settings

DB_PATH = settings.DATA_DIR / "omnicontrol.db"

async def init_db():
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute("""
            CREATE TABLE IF NOT EXISTS paired_devices (
                device_id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                token_hash TEXT NOT NULL,
                role TEXT NOT NULL DEFAULT 'admin',
                scopes TEXT NOT NULL,
                created_at TEXT NOT NULL,
                last_seen_at TEXT NOT NULL,
                revoked INTEGER NOT NULL DEFAULT 0
            )
        """)
        await db.execute("""
            CREATE TABLE IF NOT EXISTS audit_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp TEXT NOT NULL,
                device_id TEXT,
                action TEXT NOT NULL,
                details TEXT,
                ip_address TEXT
            )
        """)
        await db.execute("""
            CREATE TABLE IF NOT EXISTS custom_apps (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                path TEXT NOT NULL,
                args TEXT,
                icon TEXT
            )
        """)
        await db.execute("""
            CREATE TABLE IF NOT EXISTS system_settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL
            )
        """)
        await db.commit()

async def log_audit(action: str, device_id: Optional[str] = None, details: str = "", ip_address: str = ""):
    now = datetime.datetime.now(datetime.timezone.utc).isoformat()
    try:
        async with aiosqlite.connect(DB_PATH) as db:
            await db.execute(
                "INSERT INTO audit_logs (timestamp, device_id, action, details, ip_address) VALUES (?, ?, ?, ?, ?)",
                (now, device_id, action, details, ip_address)
            )
            await db.commit()
    except Exception:
        pass

async def get_audit_logs(limit: int = 50) -> List[Dict[str, Any]]:
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute(
            "SELECT id, timestamp, device_id, action, details, ip_address FROM audit_logs ORDER BY id DESC LIMIT ?",
            (limit,)
        ) as cursor:
            rows = await cursor.fetchall()
            return [dict(r) for r in rows]

async def register_device(device_id: str, name: str, token_hash: str, scopes: str, role: str = "admin") -> bool:
    now = datetime.datetime.now(datetime.timezone.utc).isoformat()
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            """INSERT INTO paired_devices (device_id, name, token_hash, role, scopes, created_at, last_seen_at, revoked)
               VALUES (?, ?, ?, ?, ?, ?, ?, 0)
               ON CONFLICT(device_id) DO UPDATE SET
               name=excluded.name,
               token_hash=excluded.token_hash,
               scopes=excluded.scopes,
               last_seen_at=excluded.last_seen_at,
               revoked=0""",
            (device_id, name, token_hash, role, scopes, now, now)
        )
        await db.commit()
    return True

async def get_paired_devices() -> List[Dict[str, Any]]:
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute(
            "SELECT device_id, name, role, scopes, created_at, last_seen_at, revoked FROM paired_devices ORDER BY created_at DESC"
        ) as cursor:
            rows = await cursor.fetchall()
            return [dict(r) for r in rows]

async def update_device_last_seen(device_id: str):
    now = datetime.datetime.now(datetime.timezone.utc).isoformat()
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            "UPDATE paired_devices SET last_seen_at = ? WHERE device_id = ?",
            (now, device_id)
        )
        await db.commit()

async def revoke_device(device_id: str) -> bool:
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            "UPDATE paired_devices SET revoked = 1 WHERE device_id = ?",
            (device_id,)
        )
        await db.commit()
    await log_audit("device_revoked", device_id=device_id, details=f"Device {device_id} revoked")
    return True

async def is_device_valid(device_id: str) -> bool:
    async with aiosqlite.connect(DB_PATH) as db:
        async with db.execute(
            "SELECT revoked FROM paired_devices WHERE device_id = ?",
            (device_id,)
        ) as cursor:
            row = await cursor.fetchone()
            if row is None:
                return False
            return row[0] == 0

async def get_custom_pin() -> Optional[str]:
    import os
    env_pin = os.getenv("GOD_REMORT_PIN") or os.getenv("OMNICONTROL_PIN")
    if env_pin and env_pin.strip():
        return env_pin.strip()
    try:
        async with aiosqlite.connect(DB_PATH) as db:
            async with db.execute("SELECT value FROM system_settings WHERE key = 'custom_pin'") as cursor:
                row = await cursor.fetchone()
                if row and str(row[0]).strip():
                    return str(row[0]).strip()
    except Exception:
        pass
    return None

async def set_custom_pin(pin: str) -> bool:
    clean_pin = pin.strip()
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            "INSERT INTO system_settings (key, value) VALUES ('custom_pin', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
            (clean_pin,)
        )
        await db.commit()
    await log_audit("pin_updated", details="Custom persistent PIN configured")
    return True
