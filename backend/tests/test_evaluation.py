from __future__ import annotations

import json
from pathlib import Path

from app.evaluation import score_predictions
from app.schemas import SurfaceLabel, WindowPrediction
from scripts.evaluate_report import evaluate

from .test_schemas import feature


def prediction(window_id: str, label: SurfaceLabel, confidence: float) -> WindowPrediction:
    other = (1 - confidence) / 3
    return WindowPrediction(
        window_id=window_id,
        label=label,
        confidence=confidence,
        probabilities={item: confidence if item == label else other for item in SurfaceLabel},
        abstained=confidence < 0.58,
    )


def test_metrics_reward_correct_predictions_and_report_confusion() -> None:
    truth = [SurfaceLabel.SMOOTH, SurfaceLabel.SMOOTH, SurfaceLabel.ROUGH, SurfaceLabel.ROUGH]
    predictions = [
        prediction("1", SurfaceLabel.SMOOTH, 0.9),
        prediction("2", SurfaceLabel.SMOOTH, 0.8),
        prediction("3", SurfaceLabel.ROUGH, 0.7),
        prediction("4", SurfaceLabel.SMOOTH, 0.55),
    ]
    metrics = score_predictions(truth, predictions)
    assert metrics.samples == 4
    assert 0 < metrics.macro_f1 < 1
    assert metrics.balanced_accuracy == 0.75
    assert metrics.abstention_rate == 0.25
    assert metrics.confusion_matrix["rough"]["smooth"] == 1


def test_exported_reviewed_report_can_be_evaluated(tmp_path: Path) -> None:
    calibration = []
    for index in range(4):
        calibration.append({**feature(f"smooth-{index}", 0.5 + index * 0.02), "label": "smooth"})
        calibration.append({**feature(f"rough-{index}", 8.0 + index * 0.1), "label": "rough"})
    audit = [feature("audit-smooth", 0.6), feature("audit-rough", 8.2)]
    report_path = tmp_path / "reviewed-report.json"
    report_path.write_text(
        json.dumps(
            {
                "calibration": calibration,
                "features": audit,
                "predictions": [
                    {"window_id": "audit-smooth", "review": {"status": "confirmed", "finalLabel": "smooth"}},
                    {"window_id": "audit-rough", "review": {"status": "corrected", "finalLabel": "rough"}},
                ],
            }
        ),
        encoding="utf-8",
    )

    result = evaluate(report_path, "baseline")
    assert result["samples"] == 2
    assert result["provider"] == "nearest-centroid-baseline"
