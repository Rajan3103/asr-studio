"""
ASR Engine Module.
Provides implementations for Faster-Whisper, SpeechRecognition fallback, and a UnifiedASREngine interface.
"""

import os
import time
import numpy as np
from typing import Dict, Any, List, Optional
from abc import ABC, abstractmethod

from asr_tool.config import ASRConfig, ModelSize
from asr_tool.audio_processor import AudioProcessor


class BaseASREngine(ABC):
    """Abstract Base Class for ASR Engines."""

    @abstractmethod
    def transcribe(self, audio_path: str, config: Optional[ASRConfig] = None) -> Dict[str, Any]:
        """Transcribe audio file path and return structured result dictionary."""
        pass


class FasterWhisperEngine(BaseASREngine):
    """Whisper engine using faster-whisper (CTranslate2 optimized)."""

    def __init__(self, model_size: str = "base", device: str = "cpu", compute_type: str = "int8"):
        self.model_size = model_size
        self.device = device
        self.compute_type = compute_type
        self.model = None

    def _load_model(self):
        if self.model is None:
            from faster_whisper import WhisperModel
            self.model = WhisperModel(
                self.model_size,
                device=self.device,
                compute_type=self.compute_type
            )

    def transcribe(self, audio_path: str, config: Optional[ASRConfig] = None) -> Dict[str, Any]:
        """Perform transcription using faster-whisper."""
        cfg = config or ASRConfig(model_size=ModelSize(self.model_size))
        self._load_model()

        start_time = time.time()
        
        segments_raw, info = self.model.transcribe(
            audio_path,
            beam_size=cfg.beam_size,
            task=cfg.task.value if hasattr(cfg.task, "value") else str(cfg.task),
            language=cfg.language if cfg.language and cfg.language != "auto" else None,
            vad_filter=cfg.vad_filter,
            word_timestamps=cfg.word_timestamps,
            temperature=cfg.temperature,
            initial_prompt=cfg.initial_prompt,
        )

        segments = []
        full_text_parts = []
        
        for idx, segment in enumerate(segments_raw):
            full_text_parts.append(segment.text.strip())
            
            words_list = []
            if cfg.word_timestamps and getattr(segment, "words", None):
                for w in segment.words:
                    words_list.append({
                        "word": w.word,
                        "start": round(w.start, 3),
                        "end": round(w.end, 3),
                        "probability": round(w.probability, 3)
                    })

            # Handle segment probability/confidence float calculation safely
            avg_logprob = getattr(segment, "avg_logprob", 0.0)
            confidence = round(float(np.exp(avg_logprob)), 3) if avg_logprob <= 0 else 0.90

            segments.append({
                "id": idx,
                "start": round(segment.start, 3),
                "end": round(segment.end, 3),
                "text": segment.text.strip(),
                "confidence": confidence,
                "words": words_list
            })

        processing_time = round(time.time() - start_time, 3)
        full_text = " ".join(full_text_parts)

        return {
            "text": full_text,
            "language": getattr(info, "language", "en"),
            "language_probability": round(getattr(info, "language_probability", 1.0), 3),
            "duration_seconds": round(getattr(info, "duration", 0.0), 3),
            "processing_time_seconds": processing_time,
            "segments": segments,
            "engine": "faster-whisper",
            "model_size": self.model_size
        }


class SpeechRecognitionEngine(BaseASREngine):
    """Fallback engine using Python SpeechRecognition library."""

    def __init__(self):
        import speech_recognition as sr
        self.recognizer = sr.Recognizer()

    def transcribe(self, audio_path: str, config: Optional[ASRConfig] = None) -> Dict[str, Any]:
        """Perform recognition using SpeechRecognition library."""
        import speech_recognition as sr
        
        start_time = time.time()
        with sr.AudioFile(audio_path) as source:
            audio = self.recognizer.record(source)

        duration = round(float(len(audio.frame_data) / (audio.sample_rate * audio.sample_width)), 3)

        try:
            # Recognize using Google Speech API
            text = self.recognizer.recognize_google(audio)
            success = True
        except sr.UnknownValueError:
            text = "[Unrecognized speech/Audio silent]"
            success = False
        except Exception as e:
            text = f"[Speech Recognition Error: {str(e)}]"
            success = False

        processing_time = round(time.time() - start_time, 3)

        return {
            "text": text,
            "language": config.language if (config and config.language) else "en",
            "language_probability": 0.85 if success else 0.0,
            "duration_seconds": duration,
            "processing_time_seconds": processing_time,
            "segments": [
                {
                    "id": 0,
                    "start": 0.0,
                    "end": duration,
                    "text": text,
                    "confidence": 0.85 if success else 0.0,
                    "words": []
                }
            ],
            "engine": "speech-recognition-fallback",
            "model_size": "web-api"
        }


class UnifiedASREngine:
    """Unified engine manager with caching and fallback support."""

    def __init__(self, default_config: Optional[ASRConfig] = None):
        self.config = default_config or ASRConfig()
        self._whisper_engines: Dict[str, FasterWhisperEngine] = {}
        self._sr_engine: Optional[SpeechRecognitionEngine] = None

    def get_whisper_engine(self, model_size: str) -> FasterWhisperEngine:
        if model_size not in self._whisper_engines:
            self._whisper_engines[model_size] = FasterWhisperEngine(
                model_size=model_size,
                device=self.config.device,
                compute_type=self.config.compute_type.value if isinstance(self.config.compute_type, ASRConfig) else "int8"
            )
        return self._whisper_engines[model_size]

    def transcribe(self, audio_path: str, config: Optional[ASRConfig] = None) -> Dict[str, Any]:
        """
        Transcribe audio file.
        Attempts Faster-Whisper first; falls back to SpeechRecognition if needed.
        """
        cfg = config or self.config
        model_size = cfg.model_size.value if hasattr(cfg.model_size, "value") else str(cfg.model_size)

        try:
            engine = self.get_whisper_engine(model_size)
            return engine.transcribe(audio_path, cfg)
        except Exception as primary_error:
            # Fallback to SpeechRecognition engine
            try:
                if self._sr_engine is None:
                    self._sr_engine = SpeechRecognitionEngine()
                res = self._sr_engine.transcribe(audio_path, cfg)
                res["fallback_triggered"] = True
                res["fallback_reason"] = str(primary_error)
                return res
            except Exception as secondary_error:
                raise RuntimeError(
                    f"ASR transcription failed on both primary ({primary_error}) and fallback ({secondary_error}) engines."
                )
