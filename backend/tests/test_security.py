from __future__ import annotations

from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.security import RateLimitMiddleware


def rate_limited_client(requests: int = 2, window_seconds: int = 60) -> TestClient:
    app = FastAPI()
    app.add_middleware(
        RateLimitMiddleware,
        requests=requests,
        window_seconds=window_seconds,
    )

    @app.get("/limited")
    async def limited() -> dict[str, str]:
        return {"status": "ok"}

    return TestClient(app)


def test_rate_limit_budget_headers_count_down() -> None:
    client = rate_limited_client()

    first = client.get("/limited")
    second = client.get("/limited")

    assert first.status_code == 200
    assert first.headers["ratelimit-limit"] == "2"
    assert first.headers["ratelimit-remaining"] == "1"
    assert first.headers["ratelimit-policy"] == "2;w=60"
    assert int(first.headers["ratelimit-reset"]) > 0
    assert second.headers["ratelimit-remaining"] == "0"


def test_rate_limit_rejection_includes_retry_contract() -> None:
    client = rate_limited_client(requests=1)

    assert client.get("/limited").status_code == 200
    rejected = client.get("/limited")

    assert rejected.status_code == 429
    assert rejected.json() == {"detail": "Too many requests; try again shortly"}
    assert int(rejected.headers["retry-after"]) > 0
    assert rejected.headers["ratelimit-remaining"] == "0"
    assert rejected.headers["ratelimit-reset"] == rejected.headers["retry-after"]
