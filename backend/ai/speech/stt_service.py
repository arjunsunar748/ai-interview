import os
import tempfile
from pathlib import Path
from loguru import logger
from app.core.config import settings


class STTService:
    """Speech-to-Text using Faster-Whisper (fully offline)."""

    def __init__(self):
        self._model = None
        self.model_size = settings.WHISPER_MODEL  # base / small / medium

    def _load_model(self):
        """Lazy-load the Whisper model on first use."""
        if self._model is None:
            try:
                from faster_whisper import WhisperModel
                logger.info(f"Loading Whisper model: {self.model_size}")
                self._model = WhisperModel(
                    self.model_size,
                    device="cpu",
                    compute_type="int8",
                )
                logger.info("Whisper model loaded successfully")
            except ImportError:
                raise RuntimeError("faster-whisper is not installed. Run: pip install faster-whisper")
        return self._model

    def transcribe_file(self, audio_path: str) -> dict:
        """
        Transcribe an audio file to text.
        Returns: { text, language, duration, word_count }
        """
        if not os.path.exists(audio_path):
            raise FileNotFoundError(f"Audio file not found: {audio_path}")

        model = self._load_model()

        try:
            segments, info = model.transcribe(
                audio_path,
                beam_size=5,
                language=None,  # auto-detect
                vad_filter=True,  # remove silence
            )

            full_text = " ".join(seg.text.strip() for seg in segments)
            word_count = len(full_text.split()) if full_text else 0

            return {
                "text": full_text.strip(),
                "language": info.language,
                "duration": round(info.duration, 2),
                "word_count": word_count,
            }
        except Exception as e:
            logger.error(f"Transcription failed: {e}")
            raise

    def transcribe_bytes(self, audio_bytes: bytes, suffix: str = ".webm") -> dict:
        """Transcribe audio from bytes (uploaded from browser)."""
        with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
            tmp.write(audio_bytes)
            tmp_path = tmp.name

        try:
            result = self.transcribe_file(tmp_path)
            return result
        finally:
            os.unlink(tmp_path)


# Singleton
stt_service = STTService()
