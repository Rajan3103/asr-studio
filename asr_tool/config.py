"""
Configuration module for the ASR Tool.
Defines model parameters, audio parameters, and system defaults.
"""

from dataclasses import dataclass, field
from enum import Enum
from typing import Optional, List


class ModelSize(str, Enum):
    TINY = "tiny"
    BASE = "base"
    SMALL = "small"
    MEDIUM = "medium"
    LARGE_V3 = "large-v3"


class ComputeType(str, Enum):
    FLOAT32 = "float32"
    FLOAT16 = "float16"
    INT8 = "int8"
    INT8_FLOAT16 = "int8_float16"


class TaskType(str, Enum):
    TRANSCRIBE = "transcribe"
    TRANSLATE = "translate"


class OutputFormat(str, Enum):
    TXT = "txt"
    SRT = "srt"
    VTT = "vtt"
    JSON = "json"
    CSV = "csv"


SUPPORTED_LANGUAGES = {
    "auto": "Auto Detect",
    "en": "English",
    "es": "Spanish",
    "fr": "French",
    "de": "German",
    "it": "Italian",
    "pt": "Portuguese",
    "nl": "Dutch",
    "ru": "Russian",
    "zh": "Chinese",
    "ja": "Japanese",
    "ko": "Korean",
    "ar": "Arabic",
    "hi": "Hindi",
    "bn": "Bengali",
    "tr": "Turkish",
}


@dataclass
class ASRConfig:
    """Configuration settings for speech recognition execution."""
    model_size: ModelSize = ModelSize.BASE
    device: str = "cpu"  # "cpu" or "cuda"
    compute_type: ComputeType = ComputeType.INT8
    task: TaskType = TaskType.TRANSCRIBE
    language: Optional[str] = None  # None for auto-detect
    beam_size: int = 5
    vad_filter: bool = True
    word_timestamps: bool = True
    sample_rate: int = 16000
    temperature: float = 0.0
    initial_prompt: Optional[str] = None

    def to_dict(self) -> dict:
        return {
            "model_size": self.model_size.value if isinstance(self.model_size, Enum) else self.model_size,
            "device": self.device,
            "compute_type": self.compute_type.value if isinstance(self.compute_type, Enum) else self.compute_type,
            "task": self.task.value if isinstance(self.task, Enum) else self.task,
            "language": self.language,
            "beam_size": self.beam_size,
            "vad_filter": self.vad_filter,
            "word_timestamps": self.word_timestamps,
            "sample_rate": self.sample_rate,
            "temperature": self.temperature,
        }
