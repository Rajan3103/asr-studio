"""
Unit tests for REST API endpoints.
"""

import pytest
from fastapi.testclient import TestClient
from asr_tool.api import app
from asr_tool.audio_processor import AudioProcessor


client = TestClient(app)


def test_root_endpoint():
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["service"] == "ASR Tool Microservice"
    assert data["status"] == "online"


def test_health_endpoint():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"


def test_models_endpoint():
    response = client.get("/models")
    assert response.status_code == 200
    data = response.json()
    assert "tiny" in data["available_models"]
    assert "en" in data["supported_languages"]


def test_transcribe_endpoint(tmp_path):
    wav_path = str(tmp_path / "api_test.wav")
    AudioProcessor.create_synthetic_speech_wav(wav_path, duration_sec=1.5)

    with open(wav_path, "rb") as f:
        response = client.post(
            "/transcribe?model=tiny",
            files={"file": ("api_test.wav", f, "audio/wav")}
        )

    assert response.status_code == 200
    data = response.json()
    assert "text" in data
    assert "duration_seconds" in data
    assert data["filename"] == "api_test.wav"


def test_transcribe_export_endpoint(tmp_path):
    wav_path = str(tmp_path / "api_export_test.wav")
    AudioProcessor.create_synthetic_speech_wav(wav_path, duration_sec=1.5)

    with open(wav_path, "rb") as f:
        response = client.post(
            "/transcribe/export?format=srt&model=tiny",
            files={"file": ("api_export_test.wav", f, "audio/wav")}
        )

    assert response.status_code == 200
    assert "attachment; filename=\"api_export_test.srt\"" in response.headers["content-disposition"]
    assert response.text != ""
