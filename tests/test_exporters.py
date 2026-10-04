"""
Unit tests for TranscriptExporter module.
"""

import os
import json
import pytest
from asr_tool.exporters import TranscriptExporter


@pytest.fixture
def mock_asr_result():
    return {
        "text": "Hello world. Welcome to Automatic Speech Recognition.",
        "language": "en",
        "language_probability": 0.99,
        "duration_seconds": 5.2,
        "segments": [
            {
                "id": 0,
                "start": 0.0,
                "end": 2.1,
                "text": "Hello world.",
                "confidence": 0.98,
                "words": []
            },
            {
                "id": 1,
                "start": 2.2,
                "end": 5.2,
                "text": "Welcome to Automatic Speech Recognition.",
                "confidence": 0.95,
                "words": []
            }
        ]
    }


def test_to_txt(mock_asr_result):
    txt = TranscriptExporter.to_txt(mock_asr_result)
    assert txt == "Hello world. Welcome to Automatic Speech Recognition."


def test_to_srt(mock_asr_result):
    srt = TranscriptExporter.to_srt(mock_asr_result)
    assert "1" in srt
    assert "00:00:00,000 --> 00:00:02,100" in srt
    assert "Hello world." in srt
    assert "2" in srt
    assert "00:00:02,200 --> 00:00:05,200" in srt
    assert "Welcome to Automatic Speech Recognition." in srt


def test_to_vtt(mock_asr_result):
    vtt = TranscriptExporter.to_vtt(mock_asr_result)
    assert vtt.startswith("WEBVTT")
    assert "00:00:00.000 --> 00:00:02.100" in vtt
    assert "Hello world." in vtt


def test_to_json(mock_asr_result):
    json_str = TranscriptExporter.to_json(mock_asr_result)
    data = json.loads(json_str)
    assert data["text"] == mock_asr_result["text"]
    assert len(data["segments"]) == 2


def test_to_csv(mock_asr_result):
    csv_str = TranscriptExporter.to_csv(mock_asr_result)
    lines = csv_str.strip().splitlines()
    assert len(lines) == 3  # Header + 2 rows
    assert "Segment_ID,Start_Seconds,End_Seconds,Text,Confidence" in lines[0]


def test_export_to_file(tmp_path, mock_asr_result):
    srt_file = str(tmp_path / "test.srt")
    out = TranscriptExporter.export_to_file(mock_asr_result, srt_file, format_type="srt")
    assert os.path.exists(out)
    with open(out, "r", encoding="utf-8") as f:
        content = f.read()
    assert "00:00:00,000 --> 00:00:02,100" in content
