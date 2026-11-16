import pytest
from fastapi.testclient import TestClient
from agent.main import app
from agent.voice.voice_handler import voice_handler
from agent.desktop.screen_streamer import screen_streamer

@pytest.mark.anyio
async def test_voice_handler_volume():
    res = await voice_handler.execute_voice_command("volume 45")
    assert res["status"] == "success"
    assert "45" in res["message"]

@pytest.mark.anyio
async def test_voice_handler_mute():
    res = await voice_handler.execute_voice_command("mute")
    assert res["status"] == "success"
    assert res["action"] == "mute"

@pytest.mark.anyio
async def test_voice_handler_unrecognized():
    res = await voice_handler.execute_voice_command("abracadabra magic spell")
    assert res["status"] == "unrecognized"

def test_screen_streamer_relative_move():
    # Calling relative move should not throw any exceptions
    screen_streamer.handle_mouse_move_relative(5, -5)

def test_voice_api_endpoint():
    with TestClient(app) as client:
        # Initiate pairing to get active dynamic PIN
        init_res = client.post("/api/v1/auth/pair/initiate")
        assert init_res.status_code == 200
        pin = init_res.json()["pin"]

        # Pair first
        pair_res = client.post("/api/v1/auth/pair/verify", json={
            "pin": pin,
            "device_name": "TestVoiceDevice"
        })
        assert pair_res.status_code == 200
        token = pair_res.json()["token"]

        # Call voice endpoint
        voice_res = client.post("/api/v1/voice/command", json={
            "command": "volume up"
        }, headers={"Authorization": f"Bearer {token}"})
        assert voice_res.status_code == 200
        assert voice_res.json()["status"] == "success"
