"""
Audio processing module for loading, resampling, analyzing, and chunking audio signals.
"""

import os
import wave
import numpy as np
import soundfile as sf
from scipy import signal
from typing import Tuple, Dict, Any, List, Optional


class AudioProcessor:
    """Provides utilities for audio file loading, signal normalization, and synthesis."""

    TARGET_SAMPLE_RATE = 16000  # 16kHz standard for ASR models

    @classmethod
    def load_audio(cls, file_path_or_bytes: Any, target_sr: int = TARGET_SAMPLE_RATE) -> Tuple[np.ndarray, int]:
        """
        Load audio file or raw bytes into a normalized float32 numpy array.
        
        Args:
            file_path_or_bytes: Path to audio file or binary file object/bytes.
            target_sr: Target sample rate in Hz.
            
        Returns:
            Tuple of (audio_array: np.ndarray in float32 [-1, 1], sample_rate: int)
        """
        try:
            audio_data, sr = sf.read(file_path_or_bytes, dtype="float32")
        except Exception as e:
            raise ValueError(f"Failed to read audio file: {e}")

        # Convert stereo/multi-channel to mono by averaging channels
        if len(audio_data.shape) > 1 and audio_data.shape[1] > 1:
            audio_data = np.mean(audio_data, axis=1)

        # Resample to target sample rate if needed
        if sr != target_sr:
            num_samples = int(len(audio_data) * target_sr / sr)
            audio_data = signal.resample(audio_data, num_samples).astype(np.float32)
            sr = target_sr

        # Normalize amplitude to range [-1.0, 1.0] if non-silent
        max_val = np.max(np.abs(audio_data))
        if max_val > 0:
            audio_data = audio_data / max_val

        return audio_data.astype(np.float32), sr

    @classmethod
    def get_audio_info(cls, audio_array: np.ndarray, sample_rate: int) -> Dict[str, Any]:
        """Extract audio metrics (duration, RMS energy, peak amplitude, channels)."""
        duration_sec = len(audio_array) / float(sample_rate)
        rms = float(np.sqrt(np.mean(audio_array ** 2))) if len(audio_array) > 0 else 0.0
        peak = float(np.max(np.abs(audio_array))) if len(audio_array) > 0 else 0.0
        
        return {
            "num_samples": len(audio_array),
            "sample_rate": sample_rate,
            "duration_seconds": round(duration_sec, 3),
            "rms_energy": round(rms, 5),
            "peak_amplitude": round(peak, 5),
            "is_silent": rms < 1e-4,
        }

    @classmethod
    def create_synthetic_speech_wav(
        cls, output_path: str, duration_sec: float = 3.0, sample_rate: int = TARGET_SAMPLE_RATE, frequency: float = 440.0
    ) -> str:
        """
        Generate a synthetic WAV file containing tone modulations simulating voice pulses.
        Useful for automated testing and demonstrations without external audio files.
        """
        os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
        t = np.linspace(0, duration_sec, int(sample_rate * duration_sec), endpoint=False)
        
        # Carrier wave modulated by low frequency envelope to simulate speech syllables
        carrier = np.sin(2 * np.pi * frequency * t)
        modulator = 0.5 * (1.0 + np.sin(2 * np.pi * 3.0 * t))  # 3 Hz syllable rate
        noise = np.random.normal(0, 0.02, t.shape)
        
        synthetic_signal = (carrier * modulator + noise).astype(np.float32)
        # Normalize
        synthetic_signal = synthetic_signal / np.max(np.abs(synthetic_signal))
        
        # Convert float32 to 16-bit PCM for WAV format compatibility
        pcm_data = (synthetic_signal * 32767).astype(np.int16)

        with wave.open(output_path, "wb") as wav_file:
            wav_file.setnchannels(1)  # Mono
            wav_file.setsampwidth(2)  # 16-bit = 2 bytes
            wav_file.setframerate(sample_rate)
            wav_file.writeframes(pcm_data.tobytes())

        return output_path

    @classmethod
    def save_wav(cls, audio_array: np.ndarray, output_path: str, sample_rate: int = TARGET_SAMPLE_RATE) -> str:
        """Save float32 numpy audio array to 16-bit PCM WAV file."""
        os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
        # Scale to 16-bit PCM
        scaled = np.clip(audio_array, -1.0, 1.0)
        pcm_data = (scaled * 32767).astype(np.int16)
        
        sf.write(output_path, pcm_data, sample_rate, subtype="PCM_16")
        return output_path
