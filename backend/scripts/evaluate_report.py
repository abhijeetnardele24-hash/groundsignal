from __future__ import annotations

import argparse
import json
import os
import re
import sys
from dataclasses import asdict
from pathlib import Path
from time import perf_counter

from app.evaluation import score_predictions
from app.model import BaselineProvider, TabPFNProvider
from app.schemas import AnalyzeRequest, CalibrationRow, FeatureVector, SurfaceLabel


def load_report(path: Path) -> tuple[list[CalibrationRow], list[FeatureVector], list[SurfaceLabel]]:
    data = json.loads(path.read_text(encoding="utf-8"))
    calibration = [CalibrationRow.model_validate(row) for row in data.get("calibration", [])]
    features_by_id = {
        row.window_id: row
        for row in (FeatureVector.model_validate(item) for item in data.get("features", []))
    }
    audit: list[FeatureVector] = []
    truth: list[SurfaceLabel] = []
    for prediction in data.get("predictions", []):
        review = prediction.get("review")
        if not review or review.get("status") == "dismissed" or not review.get("finalLabel"):
            continue
        feature = features_by_id.get(prediction.get("window_id"))
        if feature:
            audit.append(feature)
            truth.append(SurfaceLabel(review["finalLabel"]))
    if len(calibration) < 8 or len({row.label for row in calibration}) < 2:
        raise ValueError(f"{path}: report needs at least 8 calibration rows across 2 labels")
    if not audit:
        raise ValueError(f"{path}: review at least one audit window before evaluation")
    return calibration, audit, truth


def evaluate(path: Path, provider_name: str) -> dict[str, object]:
    calibration, audit, truth = load_report(path)
    provider = TabPFNProvider() if provider_name == "tabpfn" else BaselineProvider()
    payload = AnalyzeRequest(
        session_id=re.sub(r"[^A-Za-z0-9_-]", "_", f"evaluation_{path.stem}")[:80],
        mobility_mode="walking",
        phone_placement="other",
        calibration=calibration,
        audit=audit,
    )
    started = perf_counter()
    predictions = provider.predict(payload)
    latency_ms = (perf_counter() - started) * 1000
    return {
        "report": str(path),
        "provider": provider.name,
        "latency_ms": round(latency_ms, 3),
        **asdict(score_predictions(truth, predictions)),
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="Evaluate GroundSignal exports using human-reviewed audit windows.")
    parser.add_argument("reports", nargs="+", type=Path, help="Exported GroundSignal JSON report(s)")
    parser.add_argument("--provider", choices=["baseline", "tabpfn", "both"], default="both")
    args = parser.parse_args()
    providers = ["baseline", "tabpfn"] if args.provider == "both" else [args.provider]
    if "tabpfn" in providers and not os.getenv("TABPFN_TOKEN"):
        print("TABPFN_TOKEN is required for TabPFN evaluation", file=sys.stderr)
        return 2
    try:
        results = [evaluate(path, provider) for path in args.reports for provider in providers]
    except (OSError, ValueError, RuntimeError, json.JSONDecodeError) as exc:
        print(str(exc), file=sys.stderr)
        return 1
    print(json.dumps({"results": results}, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
