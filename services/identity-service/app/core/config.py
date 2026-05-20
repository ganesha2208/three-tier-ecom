from functools import lru_cache
from typing import List

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )

    PROJECT_NAME: str = "ShopForge Identity Service"
    API_V1_PREFIX: str = "/api/v1"
    ENV: str = "dev"  # "prod" => API docs disabled

    DATABASE_URL: str = Field(
        default="postgresql+psycopg2://ecom:ecom_pw@localhost:5432/ecom"
    )
    # identity-service owns only this schema; it never touches another service's.
    DB_SCHEMA: str = "identity"

    SECRET_KEY: str  # required: no default -> fail fast at startup if unset
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    BACKEND_CORS_ORIGINS: List[str] = Field(
        default_factory=lambda: ["http://localhost:5173", "http://localhost:3000"]
    )

    @field_validator("BACKEND_CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors(cls, v):
        if isinstance(v, str):
            return [o.strip() for o in v.split(",") if o.strip()]
        return v


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
