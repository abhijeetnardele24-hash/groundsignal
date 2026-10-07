from __future__ import annotations

import os
from dataclasses import dataclass


def _csv_env(name: str, default: str) -> tuple[str, ...]:
    return tuple(item.strip() for item in os.getenv(name, default).split(",") if item.strip())


@dataclass(frozen=True, slots=True)
class Settings:
    environment: str = os.getenv("ENVIRONMENT", "development")
    model_provider: str = os.getenv("MODEL_PROVIDER", "baseline").lower()
    allowed_origins: tuple[str, ...] = _csv_env(
        "ALLOWED_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173"
    )
    max_body_bytes: int = int(os.getenv("MAX_BODY_BYTES", "1500000"))
    rate_limit_requests: int = int(os.getenv("RATE_LIMIT_REQUESTS", "20"))
    rate_limit_window_seconds: int = int(os.getenv("RATE_LIMIT_WINDOW_SECONDS", "60"))
    analysis_timeout_seconds: int = int(os.getenv("ANALYSIS_TIMEOUT_SECONDS", "45"))
    max_concurrent_analyses: int = int(os.getenv("MAX_CONCURRENT_ANALYSES", "2"))


settings = Settings()
