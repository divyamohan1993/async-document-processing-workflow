from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # App
    APP_NAME: str = "Document Processing System"
    DEBUG: bool = False
    API_V1_PREFIX: str = "/api/v1"

    # Security
    SECRET_KEY: str = "change-me-in-production-use-a-long-random-string"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@db:5432/docprocess"
    DATABASE_SYNC_URL: str = "postgresql+psycopg2://postgres:postgres@db:5432/docprocess"

    # Redis
    REDIS_URL: str = "redis://redis:6379/0"

    # Celery
    CELERY_BROKER_URL: str = "redis://redis:6379/0"
    CELERY_RESULT_BACKEND: str = "redis://redis:6379/1"

    # File Storage
    UPLOAD_DIR: str = "/app/uploads"
    MAX_FILE_SIZE: int = 52428800  # 50MB

    # CORS
    CORS_ORIGINS: list[str] = ["http://localhost:3000", "http://frontend:3000"]

    model_config = SettingsConfigDict(env_file=".env", case_sensitive=True, extra="ignore")


settings = Settings()
