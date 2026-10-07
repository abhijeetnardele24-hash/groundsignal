from __future__ import annotations

import logging
import os
from dataclasses import dataclass
from typing import Protocol

import numpy as np

from .schemas import AnalyzeRequest, SurfaceLabel, WindowPrediction

logger = logging.getLogger(__name__)

ABSTAIN_THRESHOLD = 0.58


class PredictionProvider(Protocol):
    name: str

    def predict(self, payload: AnalyzeRequest) -> list[WindowPrediction]: ...


def _to_predictions(
    payload: AnalyzeRequest,
    classes: list[str],
    probabilities: np.ndarray,
) -> list[WindowPrediction]:
    results: list[WindowPrediction] = []
    for row, row_probabilities in zip(payload.audit, probabilities, strict=True):
        best_index = int(np.argmax(row_probabilities))
        confidence = float(row_probabilities[best_index])
        best_label = SurfaceLabel(classes[best_index])
        results.append(
            WindowPrediction(
                window_id=row.window_id,
                label=best_label,
                confidence=confidence,
                probabilities={
                    SurfaceLabel(label): float(probability)
                    for label, probability in zip(classes, row_probabilities, strict=True)
                },
                abstained=confidence < ABSTAIN_THRESHOLD,
            )
        )
    return results


@dataclass(slots=True)
class BaselineProvider:
    """Transparent nearest-centroid baseline for development and comparison."""

    name: str = "nearest-centroid-baseline"

    def predict(self, payload: AnalyzeRequest) -> list[WindowPrediction]:
        x_train = np.asarray([row.model_features() for row in payload.calibration])
        y_train = np.asarray([row.label.value for row in payload.calibration])
        x_test = np.asarray([row.model_features() for row in payload.audit])
        feature_mean = x_train.mean(axis=0)
        feature_scale = x_train.std(axis=0)
        feature_scale[feature_scale < 1e-9] = 1.0
        normalized_train = (x_train - feature_mean) / feature_scale
        normalized_test = (x_test - feature_mean) / feature_scale

        classes = sorted(set(y_train.tolist()))
        centroids = np.asarray(
            [normalized_train[y_train == label].mean(axis=0) for label in classes]
        )
        distances = np.linalg.norm(
            normalized_test[:, np.newaxis, :] - centroids[np.newaxis, :, :], axis=2
        )
        logits = -distances
        logits -= logits.max(axis=1, keepdims=True)
        exp_logits = np.exp(logits)
        probabilities = exp_logits / exp_logits.sum(axis=1, keepdims=True)
        return _to_predictions(payload, classes, probabilities)


@dataclass(slots=True)
class TabPFNProvider:
    """Official hosted TabPFN client adapter.

    Only derived features and calibration labels are transmitted to Prior Labs.
    Raw sensor measurements and coordinates never enter this provider.
    """

    name: str = "tabpfn"

    def predict(self, payload: AnalyzeRequest) -> list[WindowPrediction]:
        token = os.getenv("TABPFN_TOKEN")
        if not token:
            raise RuntimeError("TabPFN provider is not configured")

        try:
            import tabpfn_client
            from tabpfn_client import TabPFNClassifier
        except ImportError as exc:
            raise RuntimeError("TabPFN client dependency is unavailable") from exc

        tabpfn_client.set_access_token(token)
        classifier = TabPFNClassifier()
        x_train = np.asarray([row.model_features() for row in payload.calibration])
        y_train = np.asarray([row.label.value for row in payload.calibration])
        x_test = np.asarray([row.model_features() for row in payload.audit])
        classifier.fit(x_train, y_train)
        probabilities = np.asarray(classifier.predict_proba(x_test))
        classes = [str(label) for label in classifier.classes_.tolist()]
        return _to_predictions(payload, classes, probabilities)


def build_provider(name: str) -> PredictionProvider:
    if name == "tabpfn":
        return TabPFNProvider()
    if name == "baseline":
        return BaselineProvider()
    raise ValueError("MODEL_PROVIDER must be either 'baseline' or 'tabpfn'")
