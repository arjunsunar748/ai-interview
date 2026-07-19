from pydantic_settings import BaseSettings
from pydantic import AnyHttpUrl, validator
from typing import List, Optional
import os


class Settings(BaseSettings):
    # App
    APP_NAME: str = "AI Interview Platform"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True
    API_PREFIX: str = "/api/v1"

    # Database
    DATABASE_URL: str

    # JWT
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # CORS
    ALLOWED_ORIGINS: str = "http://localhost:5173,http://localhost:3000"

    @property
    def cors_origins(self) -> List[str]:
        return [o.strip() for o in self.ALLOWED_ORIGINS.split(",")]

    # File Storage
    UPLOAD_DIR: str = "uploads"
    MAX_FILE_SIZE_MB: int = 10

    @property
    def max_file_size_bytes(self) -> int:
        return self.MAX_FILE_SIZE_MB * 1024 * 1024

    # Ollama
    OLLAMA_BASE_URL: str = "http://localhost:11434"
    OLLAMA_MODEL: str = "llama3"

    # Whisper
    WHISPER_MODEL: str = "base"

    # Admin seed
    ADMIN_EMAIL: str = "admin@interview.com"
    ADMIN_PASSWORD: str = "Admin@123456"

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
