from __future__ import annotations

from app.model import BaselineProvider
from app.schemas import AnalyzeRequest

from .test_schemas import feature


def test_baseline_returns_bounded_probabilities() -> None:
    calibration = []
    for index in range(4):
        calibration.append({**feature(f"smooth-{index}", 0.5 + index * 0.02), "label": "smooth"})
        calibration.append({**feature(f"rough-{index}", 8.0 + index * 0.1), "label": "rough"})
    payload = AnalyzeRequest.model_validate(
        {
            "session_id": "session_123",
            "mobility_mode": "walking",
            "phone_placement": "front_pocket",
            "calibration": calibration,
            "audit": [feature("audit-1", 0.6), feature("audit-2", 8.2)],
        }
    )

    predictions = BaselineProvider().predict(payload)

    assert [prediction.label.value for prediction in predictions] == ["smooth", "rough"]
    assert all(0 <= prediction.confidence <= 1 for prediction in predictions)
    assert all(abs(sum(prediction.probabilities.values()) - 1) < 1e-9 for prediction in predictions)
