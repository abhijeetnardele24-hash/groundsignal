from __future__ import annotations

import asyncio
import math
import time
from collections import defaultdict, deque

from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.responses import JSONResponse, Response


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["Referrer-Policy"] = "no-referrer"
        response.headers["Permissions-Policy"] = "geolocation=(), camera=(), microphone=()"
        response.headers["Cache-Control"] = "no-store"
        return response


class BodyLimitMiddleware(BaseHTTPMiddleware):
    def __init__(self, app: object, max_bytes: int) -> None:
        super().__init__(app)
        self.max_bytes = max_bytes

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        content_length = request.headers.get("content-length")
        if content_length:
            try:
                if int(content_length) > self.max_bytes:
                    return JSONResponse({"detail": "Request body is too large"}, status_code=413)
            except ValueError:
                return JSONResponse({"detail": "Invalid Content-Length header"}, status_code=400)
        return await call_next(request)


class RateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(self, app: object, requests: int, window_seconds: int) -> None:
        super().__init__(app)
        if requests < 1 or window_seconds < 1:
            raise ValueError("Rate-limit requests and window must be positive")
        self.requests = requests
        self.window_seconds = window_seconds
        self.events: dict[str, deque[float]] = defaultdict(deque)
        self.lock = asyncio.Lock()
        self.next_cleanup = time.monotonic() + window_seconds

    def _headers(self, remaining: int, reset_seconds: int) -> dict[str, str]:
        return {
            "RateLimit-Limit": str(self.requests),
            "RateLimit-Remaining": str(max(0, remaining)),
            "RateLimit-Reset": str(max(1, reset_seconds)),
            "RateLimit-Policy": f"{self.requests};w={self.window_seconds}",
        }

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        if request.url.path in {"/health", "/docs", "/openapi.json"}:
            return await call_next(request)

        client_key = request.client.host if request.client else "unknown"
        now = time.monotonic()
        async with self.lock:
            if now >= self.next_cleanup:
                stale_clients = [
                    key for key, timestamps in self.events.items()
                    if not timestamps or timestamps[-1] <= now - self.window_seconds
                ]
                for key in stale_clients:
                    del self.events[key]
                self.next_cleanup = now + self.window_seconds

            events = self.events[client_key]
            cutoff = now - self.window_seconds
            while events and events[0] < cutoff:
                events.popleft()
            if len(events) >= self.requests:
                retry_after = max(1, math.ceil(events[0] + self.window_seconds - now))
                return JSONResponse(
                    {"detail": "Too many requests; try again shortly"},
                    status_code=429,
                    headers={
                        **self._headers(remaining=0, reset_seconds=retry_after),
                        "Retry-After": str(retry_after),
                    },
                )
            events.append(now)
            remaining = self.requests - len(events)
            reset_seconds = max(1, math.ceil(events[0] + self.window_seconds - now))

        response = await call_next(request)
        response.headers.update(self._headers(remaining, reset_seconds))
        return response
