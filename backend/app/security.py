from __future__ import annotations

import asyncio
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
        self.requests = requests
        self.window_seconds = window_seconds
        self.events: dict[str, deque[float]] = defaultdict(deque)
        self.lock = asyncio.Lock()

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        if request.url.path in {"/health", "/docs", "/openapi.json"}:
            return await call_next(request)

        client_key = request.client.host if request.client else "unknown"
        now = time.monotonic()
        async with self.lock:
            events = self.events[client_key]
            cutoff = now - self.window_seconds
            while events and events[0] < cutoff:
                events.popleft()
            if len(events) >= self.requests:
                return JSONResponse(
                    {"detail": "Too many requests; try again shortly"},
                    status_code=429,
                    headers={"Retry-After": str(self.window_seconds)},
                )
            events.append(now)

        return await call_next(request)
