import os
import tempfile
import subprocess
import logging
from typing import Optional

logger = logging.getLogger(__name__)

def transcribe_audio(audio_bytes: bytes, mime_type: str = "audio/ogg") -> Optional[str]:
    """
    Transcribes audio bytes to text with privacy preservation:
    1. If GEMINI_API_KEY is available, attempts Gemini multimodal audio transcription.
    2. Fallback: Converts audio to 16kHz WAV with FFmpeg and uses SpeechRecognition (Google Free Speech API).
    3. Ephemeral audio is immediately purged.
    """
    if not audio_bytes or len(audio_bytes) < 100:
        return None

    # Option 1: Gemini Audio Transcription (if configured)
    api_key = os.environ.get("GEMINI_API_KEY", "").strip()
    if api_key and not api_key.startswith("your_") and api_key != "dummy":
        try:
            import google.generativeai as genai
            genai.configure(api_key=api_key, transport="rest")
            model_name = os.environ.get("GEMINI_MODEL", "gemini-flash-lite-latest").strip()
            model = genai.GenerativeModel(model_name)
            
            norm_mime = "audio/ogg" if "ogg" in mime_type.lower() else ("audio/webm" if "webm" in mime_type.lower() else "audio/wav")
            response = model.generate_content([
                {"mime_type": norm_mime, "data": audio_bytes},
                "Listen to this Indian grocery shopkeeper's voice order. Transcribe it into Roman Hinglish or Hindi. Output ONLY the transcribed words, nothing else."
            ], request_options={"timeout": 5.0})
            if response and response.text:
                transcript = response.text.strip().replace('"', '').replace("'", "")
                logger.info(f"Gemini Audio Transcribed: {transcript}")
                return transcript
        except Exception as e:
            logger.warning(f"Gemini audio transcription failed: {e}. Falling back to local STT.")

    # Option 2: Zero-Cost Local SpeechRecognition Engine
    suffix = ".ogg" if "ogg" in mime_type.lower() else (".webm" if "webm" in mime_type.lower() else ".wav")
    tmp_in = None
    tmp_wav = None
    try:
        with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as f_in:
            f_in.write(audio_bytes)
            tmp_in = f_in.name

        tmp_wav = tmp_in + ".converted.wav"
        
        # Convert to 16kHz mono WAV via FFmpeg
        subprocess.run(
            ["ffmpeg", "-y", "-i", tmp_in, "-ar", "16000", "-ac", "1", "-f", "wav", tmp_wav],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            check=True
        )

        import speech_recognition as sr
        r = sr.Recognizer()
        with sr.AudioFile(tmp_wav) as source:
            audio_data = r.record(source)

        # Recognize using Hindi first, then Indian English
        try:
            recognized = r.recognize_google(audio_data, language="hi-IN")
            logger.info(f"Speech recognized (hi-IN): {recognized}")
            return recognized
        except Exception:
            try:
                recognized = r.recognize_google(audio_data, language="en-IN")
                logger.info(f"Speech recognized (en-IN): {recognized}")
                return recognized
            except Exception as e:
                logger.info(f"SpeechRecognition failed: {e}")
                return None
    except Exception as ex:
        logger.error(f"Error in audio transcription pipeline: {ex}")
        return None
    finally:
        # Immediate cleanup for ephemeral audio privacy
        if tmp_in and os.path.exists(tmp_in):
            try:
                os.remove(tmp_in)
            except Exception:
                pass
        if tmp_wav and os.path.exists(tmp_wav):
            try:
                os.remove(tmp_wav)
            except Exception:
                pass

