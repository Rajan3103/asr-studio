"""
Command-Line Interface for the ASR Tool.
"""

import sys
import os
import argparse
from typing import List

from asr_tool import __version__
from asr_tool.config import ASRConfig, ModelSize, TaskType, OutputFormat
from asr_tool.audio_processor import AudioProcessor
from asr_tool.engine import UnifiedASREngine
from asr_tool.exporters import TranscriptExporter


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="asr-tool",
        description="Automatic Speech Recognition (ASR) CLI Tool",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter,
    )
    
    parser.add_argument("-v", "--version", action="version", version=f"%(prog)s {__version__}")
    
    subparsers = parser.add_subparsers(dest="command", help="Sub-commands")

    # Transcribe subcommand
    transcribe_parser = subparsers.add_parser("transcribe", help="Transcribe audio file or directory")
    transcribe_parser.add_argument("input", type=str, help="Path to audio file or directory containing audio files")
    transcribe_parser.add_argument("-m", "--model", type=str, default="base", choices=["tiny", "base", "small", "medium", "large-v3"], help="Whisper model size")
    transcribe_parser.add_argument("-f", "--format", type=str, default="txt", choices=["txt", "srt", "vtt", "json", "csv", "all"], help="Export format")
    transcribe_parser.add_argument("-l", "--language", type=str, default=None, help="Language code (e.g. 'en', 'es', or 'auto')")
    transcribe_parser.add_argument("-t", "--task", type=str, default="transcribe", choices=["transcribe", "translate"], help="Task mode")
    transcribe_parser.add_argument("-o", "--output-dir", type=str, default="output", help="Directory to save transcription files")
    transcribe_parser.add_argument("--device", type=str, default="cpu", choices=["cpu", "cuda"], help="Computation device")
    transcribe_parser.add_argument("--beam-size", type=int, default=5, help="Beam search size")

    # Audio Info subcommand
    info_parser = subparsers.add_parser("info", help="Display technical audio information")
    info_parser.add_argument("audio_file", type=str, help="Path to audio file")

    # Generate Synthetic Audio subcommand
    gen_parser = subparsers.add_parser("generate-sample", help="Generate synthetic test audio WAV file")
    gen_parser.add_argument("output_path", type=str, nargs="?", default="sample_speech.wav", help="Output WAV path")
    gen_parser.add_argument("-d", "--duration", type=float, default=3.0, help="Duration in seconds")

    return parser


def handle_transcribe(args: argparse.Namespace):
    input_path = args.input
    if not os.path.exists(input_path):
        print(f"Error: Input path '{input_path}' does not exist.")
        sys.exit(1)

    audio_files = []
    if os.path.isdir(input_path):
        valid_exts = {".wav", ".mp3", ".flac", ".ogg", ".m4a", ".aac"}
        for root, _, files in os.walk(input_path):
            for f in files:
                if os.path.splitext(f)[1].lower() in valid_exts:
                    audio_files.append(os.path.join(root, f))
        print(f"Found {len(audio_files)} audio file(s) in directory '{input_path}'.")
    else:
        audio_files = [input_path]

    if not audio_files:
        print("No valid audio files found to process.")
        sys.exit(0)

    config = ASRConfig(
        model_size=ModelSize(args.model),
        device=args.device,
        task=TaskType(args.task),
        language=args.language if args.language != "auto" else None,
        beam_size=args.beam_size
    )

    print(f"\n[ASR Tool] Initializing Whisper model '{args.model}' on {args.device}...")
    engine = UnifiedASREngine(default_config=config)

    os.makedirs(args.output_dir, exist_ok=True)

    formats = ["txt", "srt", "vtt", "json", "csv"] if args.format == "all" else [args.format]

    for audio_file in audio_files:
        print(f"\nProcessing: {os.path.basename(audio_file)}...")
        try:
            result = engine.transcribe(audio_file, config=config)
            print(f"  Detected Language : {result.get('language', 'unknown')} (prob: {result.get('language_probability', 1.0)})")
            print(f"  Audio Duration    : {result.get('duration_seconds', 0)}s")
            print(f"  Processing Time   : {result.get('processing_time_seconds', 0)}s")
            print(f"  Transcript        : \"{result.get('text', '')[:100]}...\"")

            base_name = os.path.splitext(os.path.basename(audio_file))[0]
            for fmt in formats:
                out_path = os.path.join(args.output_dir, f"{base_name}.{fmt}")
                TranscriptExporter.export_to_file(result, out_path, format_type=fmt)
                print(f"  -> Exported ({fmt.upper()}): {out_path}")

        except Exception as e:
            print(f"  Error processing '{audio_file}': {e}")


def handle_info(args: argparse.Namespace):
    file_path = args.audio_file
    if not os.path.exists(file_path):
        print(f"Error: File '{file_path}' not found.")
        sys.exit(1)

    try:
        audio_data, sr = AudioProcessor.load_audio(file_path)
        info = AudioProcessor.get_audio_info(audio_data, sr)
        print("\n--- Audio File Technical Info ---")
        for key, val in info.items():
            print(f"  {key:<20}: {val}")
    except Exception as e:
        print(f"Error inspecting audio file: {e}")


def handle_generate(args: argparse.Namespace):
    out = args.output_path
    dur = args.duration
    path = AudioProcessor.create_synthetic_speech_wav(out, duration_sec=dur)
    print(f"Successfully generated synthetic sample WAV file ({dur}s): {os.path.abspath(path)}")


def main():
    parser = build_parser()
    args = parser.parse_args()

    if not args.command:
        parser.print_help()
        sys.exit(0)

    if args.command == "transcribe":
        handle_transcribe(args)
    elif args.command == "info":
        handle_info(args)
    elif args.command == "generate-sample":
        handle_generate(args)


if __name__ == "__main__":
    main()
