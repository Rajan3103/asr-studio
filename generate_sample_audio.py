"""
Utility script to generate sample WAV audio file for quick project testing.
Usage: python generate_sample_audio.py [output_path]
"""

import sys
from asr_tool.audio_processor import AudioProcessor


def main():
    output_path = sys.argv[1] if len(sys.argv) > 1 else "sample_audio.wav"
    duration = float(sys.argv[2]) if len(sys.argv) > 2 else 3.0
    
    print(f"Generating synthetic speech audio wave ({duration}s)...")
    path = AudioProcessor.create_synthetic_speech_wav(output_path, duration_sec=duration)
    print(f"Sample WAV file created successfully: {path}")


if __name__ == "__main__":
    main()
