import os
import tempfile
import threading
from loguru import logger


class TTSService:
    """Text-to-Speech using pyttsx3 (fully offline)."""

    def __init__(self):
        self._engine = None
        self._lock = threading.Lock()

    def _get_engine(self):
        if self._engine is None:
            try:
                import pyttsx3
                self._engine = pyttsx3.init()
                # Configure voice properties
                self._engine.setProperty("rate", 160)    # Speed (words/min)
                self._engine.setProperty("volume", 0.9)  # Volume 0-1
                logger.info("TTS engine initialized")
            except ImportError:
                raise RuntimeError("pyttsx3 not installed. Run: pip install pyttsx3")
        return self._engine

    def speak(self, text: str) -> None:
        """Speak text aloud (blocking)."""
        with self._lock:
            engine = self._get_engine()
            engine.say(text)
            engine.runAndWait()

    def save_to_file(self, text: str, output_path: str) -> str:
        """Save speech to an audio file and return the path."""
        with self._lock:
            engine = self._get_engine()
            engine.save_to_file(text, output_path)
            engine.runAndWait()
        return output_path

    def speak_async(self, text: str) -> None:
        """Speak text in a background thread (non-blocking)."""
        thread = threading.Thread(target=self.speak, args=(text,), daemon=True)
        thread.start()

    def get_voices(self) -> list:
        """Return list of available voices."""
        engine = self._get_engine()
        return [
            {"id": v.id, "name": v.name, "languages": v.languages}
            for v in engine.getProperty("voices")
        ]

    def set_voice(self, voice_id: str) -> None:
        engine = self._get_engine()
        engine.setProperty("voice", voice_id)


# Singleton
tts_service = TTSService()
