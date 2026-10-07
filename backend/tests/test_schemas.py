from __future__ import annotations

import pytest
from pydantic import ValidationError

from app.schemas import AnalyzeRequest, CalibrationRow, FeatureVector


def feature(window_id: str, value: float = 1.0) -> dict[str, object]:
    return {
        "window_id": window_id,
        "start_ms": 0,
        "duration_ms": 2_000,
        "accel_rms": value,
        "accel_std": value,
        "accel_peak_to_peak": value,
        "jerk_rms": value,
        "gyro_rms": value,
        "dominant_frequency": value,
        "spectral_entropy": 0.5,
        "vertical_energy_ratio": 0.5,
        "horizontal_energy": value,
        "speed_mean": value,
        "speed_std": value,
        "sample_coverage": 1.0,
    }


def test_rejects_non_finite_features() -> None:
    payload = feature("window-1")
    payload["accel_rms"] = float("nan")
    with pytest.raises(ValidationError):
        FeatureVector.model_validate(payload)


def test_requires_two_calibration_classes() -> None:
    calibration = [{**feature(f"c-{index}"), "label": "smooth"} for index in range(8)]
    with pytest.raises(ValidationError):
        AnalyzeRequest.model_validate(
            {
                "session_id": "session_123",
                "mobility_mode": "walking",
                "phone_placement": "front_pocket",
                "calibration": calibration,
                "audit": [feature("a-1")],
            }
        )


def test_model_feature_order_is_stable() -> None:
    row = CalibrationRow.model_validate({**feature("c-1", 2.0), "label": "rough"})
    assert len(row.model_features()) == 13
    assert row.model_features()[0] == 2_000
    assert row.model_features()[-1] == 1.0
