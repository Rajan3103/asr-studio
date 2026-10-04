"""
Unit tests for AudioProcessor module.
"""

import os
import pytest
import numpy as np
from asr_tool.audio_processor import AudioProcessor


def test_create_synthetic_speech_wav(tmp_path):
    wav_path = str(tmp_path / "test_synth.wav")
    result_path = AudioProcessor.create_synthetic_speech_wav(wav_path, duration_sec=2.0, sample_rate=16000)
    
    assert os.path.exists(result_path)
    assert os.path.getsize(result_path) > 0


def test_load_audio(tmp_path):
    wav_path = str(tmp_path / "test_load.wav")
    AudioProcessor.create_synthetic_speech_wav(wav_path, duration_sec=1.5, sample_rate=16000)

    audio_array, sr = AudioProcessor.load_audio(wav_path, target_sr=16000)
    
    assert isinstance(audio_array, np.ndarray)
    assert sr == 16000
    assert len(audio_array) == int(1.5 * 16000)
    assert audio_array.dtype == np.float32


def test_get_audio_info():
    sample_rate = 16000
    t = np.linspace(0, 1.0, sample_rate, endpoint=False)
    signal_arr = 0.5 * np.sin(2 * np.pi * 440 * t).astype(np.float32)

    info = AudioProcessor.get_audio_info(signal_arr, sample_rate)

    assert info["duration_seconds"] == 1.0
    assert info["sample_rate"] == 16000
    assert info["num_samples"] == 16000
    assert info["peak_amplitude"] == pytest.approx(0.5, abs=1e-2)
    assert info["is_silent"] is False


def test_save_wav(tmp_path):
    out_path = str(tmp_path / "saved_audio.wav")
    sample_rate = 16000
    audio_data = np.zeros(16000, dtype=np.float32)

    saved_path = AudioProcessor.save_wav(audio_data, out_path, sample_rate=sample_rate)

    assert os.path.exists(saved_path)
    audio_loaded, sr = AudioProcessor.load_audio(saved_path)
    assert sr == 16000
    assert len(audio_loaded) == 16000
