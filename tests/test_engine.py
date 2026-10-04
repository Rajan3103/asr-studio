"""
Unit tests for ASR engines.
"""

import os
import pytest
from asr_tool.config import ASRConfig, ModelSize
from asr_tool.audio_processor import AudioProcessor
from asr_tool.engine import UnifiedASREngine, SpeechRecognitionEngine


@pytest.fixture
def sample_wav(tmp_path):
    wav_path = str(tmp_path / "sample.wav")
    AudioProcessor.create_synthetic_speech_wav(wav_path, duration_sec=2.0)
    return wav_path


def test_speech_recognition_engine_fallback(sample_wav):
    engine = SpeechRecognitionEngine()
    config = ASRConfig(language="en")
    res = engine.transcribe(sample_wav, config=config)

    assert "text" in res
    assert "language" in res
    assert "duration_seconds" in res
    assert res["duration_seconds"] > 0
    assert "engine" in res
    assert res["engine"] == "speech-recognition-fallback"


def test_unified_asr_engine_transcribe(sample_wav):
    unified = UnifiedASREngine()
    config = ASRConfig(model_size=ModelSize.TINY, vad_filter=False)
    
    res = unified.transcribe(sample_wav, config=config)

    assert isinstance(res, dict)
    assert "text" in res
    assert "segments" in res
    assert "language" in res
