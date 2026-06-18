from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    SUPABASE_URL: str = "http://placeholder-supabase-url.co"
    SUPABASE_KEY: str = "placeholder_key"
    API_PORT: int = 8000

    # JWT Auth
    JWT_SECRET: str = "placeholder_jwt_secret_key_change_in_production_123456"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 480  # 8 hours


@lru_cache()
def get_settings() -> Settings:
    return Settings()
