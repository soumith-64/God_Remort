import pytest
import os
from fastapi.testclient import TestClient
from agent.main import app
from agent.monitoring.system_monitor import monitor
from agent.security.auth import generate_pairing_session, verify_pairing_request
from agent.desktop.screen_streamer import screen_streamer
from agent.applications.app_manager import app_manager
from agent.files.file_manager import file_manager

@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c

def test_health_check(client):
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "online"
    assert "interfaces" in data
    assert len(data["interfaces"]) > 0

def test_pairing_flow(client):
    # 1. Initiate pairing
    init_res = client.post("/api/v1/auth/pair/initiate")
    assert init_res.status_code == 200
    pairing_data = init_res.json()
    assert "pin" in pairing_data
    assert len(pairing_data["pin"]) == 6
    assert "qr_code" in pairing_data
    assert pairing_data["qr_code"].startswith("data:image/png;base64,")

    # 2. Verify with invalid PIN
    bad_res = client.post("/api/v1/auth/pair/verify", json={"pin": "000000", "device_name": "TestPhone"})
    assert bad_res.status_code == 401

    # 3. Verify with valid PIN
    good_res = client.post("/api/v1/auth/pair/verify", json={"pin": pairing_data["pin"], "device_name": "iPhone 16 Pro"})
    assert good_res.status_code == 200
    auth_data = good_res.json()
    assert "token" in auth_data
    assert "device_id" in auth_data
    assert "desktop:control" in auth_data["scopes"]

    # 4. Use token to get protected system status
    headers = {"Authorization": f"Bearer {auth_data['token']}"}
    status_res = client.get("/api/v1/system/status", headers=headers)
    assert status_res.status_code == 200
    metrics = status_res.json()
    assert "cpu" in metrics
    assert "memory" in metrics
    assert "disk" in metrics
    assert "battery" in metrics
    assert metrics["cpu"]["overall_percent"] >= 0

def test_screen_streamer_capture():
    info = screen_streamer.get_screen_info()
    assert info["width"] > 0
    assert info["height"] > 0
    frame_bytes = screen_streamer.capture_frame()
    assert len(frame_bytes) > 500
    # Check JPEG SOI marker
    assert frame_bytes[:2] == b'\xff\xd8'

def test_app_manager_shortcuts():
    shortcuts = app_manager.get_developer_shortcuts()
    assert len(shortcuts) > 0
    vscode = next((s for s in shortcuts if s["id"] == "vscode"), None)
    assert vscode is not None
    assert vscode["available"] is True

def test_file_manager_safety():
    bookmarks = file_manager.get_bookmarks()
    assert len(bookmarks) > 0
    # Verifies root drive deletion protection
    with pytest.raises(PermissionError):
        file_manager.delete_item("C:\\")
