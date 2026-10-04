"""
Unit tests for CLI interface.
"""

import os
import pytest
from asr_tool.cli import build_parser, handle_generate, handle_info


def test_cli_parser_build():
    parser = build_parser()
    args = parser.parse_args(["transcribe", "sample.wav", "--model", "tiny", "--format", "srt"])
    
    assert args.command == "transcribe"
    assert args.input == "sample.wav"
    assert args.model == "tiny"
    assert args.format == "srt"


def test_cli_generate_sample(tmp_path):
    out_file = str(tmp_path / "cli_sample.wav")
    parser = build_parser()
    args = parser.parse_args(["generate-sample", out_file, "-d", "2.0"])
    
    handle_generate(args)
    assert os.path.exists(out_file)
    assert os.path.getsize(out_file) > 0


def test_cli_info(tmp_path, capsys):
    out_file = str(tmp_path / "cli_info.wav")
    parser = build_parser()
    gen_args = parser.parse_args(["generate-sample", out_file, "-d", "1.0"])
    handle_generate(gen_args)

    info_args = parser.parse_args(["info", out_file])
    handle_info(info_args)

    captured = capsys.readouterr()
    assert "Audio File Technical Info" in captured.out
    assert "duration_seconds" in captured.out
