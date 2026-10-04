"""
Exporters module for converting speech recognition results into plain text, SRT, VTT, JSON, and CSV formats.
"""

import json
import csv
import io
from typing import Dict, Any


class TranscriptExporter:
    """Format transcription results into TXT, SRT, WebVTT, JSON, and CSV."""

    @staticmethod
    def _format_timestamp_srt(seconds: float) -> str:
        """Format seconds to SRT timecode format (HH:MM:SS,mmm)."""
        millis = int(round((seconds % 1) * 1000))
        total_seconds = int(seconds)
        secs = total_seconds % 60
        mins = (total_seconds // 60) % 60
        hrs = total_seconds // 3600
        return f"{hrs:02d}:{mins:02d}:{secs:02d},{millis:03d}"

    @staticmethod
    def _format_timestamp_vtt(seconds: float) -> str:
        """Format seconds to WebVTT timecode format (HH:MM:SS.mmm)."""
        millis = int(round((seconds % 1) * 1000))
        total_seconds = int(seconds)
        secs = total_seconds % 60
        mins = (total_seconds // 60) % 60
        hrs = total_seconds // 3600
        return f"{hrs:02d}:{mins:02d}:{secs:02d}.{millis:03d}"

    @classmethod
    def to_txt(cls, result: Dict[str, Any]) -> str:
        """Export transcription as clean plain text."""
        return result.get("text", "").strip()

    @classmethod
    def to_srt(cls, result: Dict[str, Any]) -> str:
        """Export transcription as SubRip (.srt) subtitle format."""
        segments = result.get("segments", [])
        if not segments and result.get("text"):
            # Single segment fallback
            segments = [{
                "id": 0,
                "start": 0.0,
                "end": result.get("duration_seconds", 5.0),
                "text": result.get("text")
            }]

        srt_lines = []
        for idx, seg in enumerate(segments, 1):
            start_tc = cls._format_timestamp_srt(seg.get("start", 0.0))
            end_tc = cls._format_timestamp_srt(seg.get("end", 0.0))
            text = seg.get("text", "").strip()
            
            srt_lines.append(f"{idx}\n{start_tc} --> {end_tc}\n{text}\n")
            
        return "\n".join(srt_lines).strip()

    @classmethod
    def to_vtt(cls, result: Dict[str, Any]) -> str:
        """Export transcription as WebVTT (.vtt) subtitle format."""
        segments = result.get("segments", [])
        if not segments and result.get("text"):
            segments = [{
                "id": 0,
                "start": 0.0,
                "end": result.get("duration_seconds", 5.0),
                "text": result.get("text")
            }]

        vtt_lines = ["WEBVTT\n"]
        for seg in segments:
            start_tc = cls._format_timestamp_vtt(seg.get("start", 0.0))
            end_tc = cls._format_timestamp_vtt(seg.get("end", 0.0))
            text = seg.get("text", "").strip()
            
            vtt_lines.append(f"{start_tc} --> {end_tc}\n{text}\n")

        return "\n".join(vtt_lines).strip()

    @classmethod
    def to_json(cls, result: Dict[str, Any], indent: int = 2) -> str:
        """Export transcription as structured JSON string."""
        return json.dumps(result, indent=indent, ensure_ascii=False)

    @classmethod
    def to_csv(cls, result: Dict[str, Any]) -> str:
        """Export transcription as CSV string."""
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(["Segment_ID", "Start_Seconds", "End_Seconds", "Text", "Confidence"])
        
        segments = result.get("segments", [])
        for idx, seg in enumerate(segments):
            writer.writerow([
                seg.get("id", idx),
                seg.get("start", 0.0),
                seg.get("end", 0.0),
                seg.get("text", ""),
                seg.get("confidence", 1.0)
            ])
            
        return output.getvalue()

    @classmethod
    def export_to_file(cls, result: Dict[str, Any], output_path: str, format_type: str = "txt") -> str:
        """Format and write transcript to output filepath."""
        format_type = format_type.lower()
        if format_type == "srt":
            content = cls.to_srt(result)
        elif format_type == "vtt":
            content = cls.to_vtt(result)
        elif format_type == "json":
            content = cls.to_json(result)
        elif format_type == "csv":
            content = cls.to_csv(result)
        else:
            content = cls.to_txt(result)

        with open(output_path, "w", encoding="utf-8") as f:
            f.write(content)

        return output_path
