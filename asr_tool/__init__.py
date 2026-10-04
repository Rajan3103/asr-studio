"""
Automatic Speech Recognition (ASR) Tool
A modular speech recognition system supporting Whisper, SpeechRecognition, multi-format export, CLI, REST API, and Streamlit UI.
"""

__version__ = "1.0.0"
__author__ = "Karthig Rajan S"
__github__ = "https://github.com/Rajan3103/asr-tool-implementation"

from asr_tool.config import ASRConfig, ModelSize, ComputeType
from asr_tool.audio_processor import AudioProcessor
from asr_tool.engine import FasterWhisperEngine, SpeechRecognitionEngine, UnifiedASREngine
from asr_tool.exporters import TranscriptExporter

__all__ = [
    "ASRConfig",
    "ModelSize",
    "ComputeType",
    "AudioProcessor",
    "FasterWhisperEngine",
    "SpeechRecognitionEngine",
    "UnifiedASREngine",
    "TranscriptExporter",
]
