import os
import io
import asyncio
import tempfile
import subprocess
import logging
from typing import Optional

logger = logging.getLogger(__name__)

DEFAULT_VOICE = "hi-IN-MadhurNeural"

async def synthesize_voice_note(speech_text: str, voice: str = DEFAULT_VOICE) -> Optional[bytes]:
    """
    Synthesizes natural Devanagari Hindi speech using edge-tts (free neural tier),
    and transcodes to OGG/Opus using FFmpeg for Telegram and WhatsApp voice notes.
    """
    if not speech_text or not speech_text.strip():
        return None

    try:
        import edge_tts
        
        # 1. Synthesize MP3 using edge-tts
        comm = edge_tts.Communicate(speech_text, voice=voice)
        mp3_buffer = io.BytesIO()
        async for chunk in comm.stream():
            if chunk["type"] == "audio":
                mp3_buffer.write(chunk["data"])
        
        mp3_bytes = mp3_buffer.getvalue()
        if not mp3_bytes:
            return None

        # 2. Transcode to OGG/Opus via FFmpeg
        with tempfile.NamedTemporaryFile(suffix=".mp3", delete=False) as in_file, \
             tempfile.NamedTemporaryFile(suffix=".ogg", delete=False) as out_file:
            in_path = in_file.name
            out_path = out_file.name
            in_file.write(mp3_bytes)
            in_file.flush()

        try:
            cmd = [
                "ffmpeg", "-y", "-i", in_path,
                "-c:a", "libopus",
                "-b:a", "32k",
                "-vbr", "on",
                out_path
            ]
            res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=10)
            if res.returncode == 0 and os.path.exists(out_path):
                with open(out_path, "rb") as f:
                    ogg_bytes = f.read()
                return ogg_bytes
            else:
                logger.warning(f"FFmpeg conversion failed: {res.stderr.decode('utf-8', errors='ignore')}. Returning MP3.")
                return mp3_bytes
        except FileNotFoundError:
            logger.warning("FFmpeg not found on PATH. Returning raw MP3 audio.")
            return mp3_bytes
        finally:
            # Clean up temp files immediately
            if os.path.exists(in_path):
                try: os.remove(in_path)
                except Exception: pass
            if os.path.exists(out_path):
                try: os.remove(out_path)
                except Exception: pass

    except Exception as e:
        logger.warning(f"Voice synthesis failed ({e}). Returning None.")
        return None

def synthesize_speech_sync(speech_text: str, voice: str = DEFAULT_VOICE) -> Optional[bytes]:
    """Synchronous wrapper for synthesize_voice_note."""
    try:
        return asyncio.run(synthesize_voice_note(speech_text, voice))
    except Exception as e:
        logger.warning(f"Sync speech synthesis failed ({e}).")
        return None

