import os
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field

class Settings(BaseSettings):
    # App Settings
    PROJECT_NAME: str = "DocMind AI"
    DEBUG: bool = True
    PORT: int = 8000
    HOST: str = "0.0.0.0"

    # JWT Settings
    JWT_SECRET: str = "super_secret_jwt_signing_key_change_me_in_production"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    # DB Settings
    MONGO_URI: str = ""
    DATABASE_URL: str = ""

    def get_database_url(self) -> str:
        url = self.DATABASE_URL or self.MONGO_URI or "postgresql://localhost:5432/docmind_db"
        url = url.strip('"\'')
        if url.startswith("postgresql://"):
            url = url.replace("postgresql://", "postgresql+asyncpg://", 1)
        return url

    # AI API Keys
    GROQ_API_KEY: str = ""

    # Dirs
    UPLOAD_DIR: str = "./uploads"
    VECTORS_DIR: str = "./vectors"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()

# Ensure directories exist
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
os.makedirs(settings.VECTORS_DIR, exist_ok=True)
