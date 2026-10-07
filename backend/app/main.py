from __future__ import annotations

import asyncio
import logging

import anyio
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .model import ABSTAIN_THRESHOLD, build_provider
from .schemas import AnalyzeRequest, AnalyzeResponse
from .security import BodyLimitMiddleware, RateLimitMiddleware, SecurityHeadersMiddleware

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s %(message)s",
)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="GroundSignal Analysis API",
    version="0.1.0",
    docs_url="/docs" if settings.environment != "production" else None,
    redoc_url=None,
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=list(settings.allowed_origins),
    allow_credentials=False,
    allow_methods=["POST", "GET"],
    allow_headers=["Content-Type"],
)
app.add_middleware(BodyLimitMiddleware, max_bytes=settings.max_body_bytes)
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(
    RateLimitMiddleware,
    requests=settings.rate_limit_requests,
    window_seconds=settings.rate_limit_window_seconds,
)

provider = build_provider(settings.model_provider)
analysis_slots = asyncio.Semaphore(settings.max_concurrent_analyses)


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok", "provider": provider.name}


@app.get("/v1/model-card")
async def model_card() -> dict[str, object]:
    return {
        "provider": provider.name,
        "task": "Personal-calibration surface-signal classification",
        "labels": ["smooth", "rough", "unstable", "transition"],
        "abstain_threshold": ABSTAIN_THRESHOLD,
        "input_boundary": "Derived motion-window features and user-provided calibration labels only",
        "excluded_inputs": ["raw motion samples", "precise location", "identity"],
        "limitations": [
            "Predictions are specific to the user's calibration, device, placement, and conditions.",
            "Output is not a safety guarantee or universal accessibility assessment.",
            "Low-confidence predictions are marked for human review.",
        ],
    }


@app.post("/v1/analyze", response_model=AnalyzeResponse)
async def analyze(payload: AnalyzeRequest) -> AnalyzeResponse:
    try:
        async with analysis_slots:
            with anyio.fail_after(settings.analysis_timeout_seconds):
                predictions = await anyio.to_thread.run_sync(provider.predict, payload)
    except TimeoutError:
        logger.warning("analysis_timeout session=%s provider=%s", payload.session_id, provider.name)
        raise HTTPException(status_code=504, detail="Analysis timed out") from None
    except RuntimeError:
        logger.exception("Configured model provider failed")
        raise HTTPException(status_code=503, detail="Analysis service is temporarily unavailable") from None
    except Exception:
        logger.exception("Unexpected analysis failure")
        raise HTTPException(status_code=500, detail="Analysis failed") from None

    logger.info(
        "analysis_complete session=%s provider=%s calibration_rows=%d audit_rows=%d",
        payload.session_id,
        provider.name,
        len(payload.calibration),
        len(payload.audit),
    )
    return AnalyzeResponse(
        session_id=payload.session_id,
        provider=provider.name,
        predictions=predictions,
    )
