from __future__ import annotations

from collections import defaultdict
from dataclasses import dataclass
from typing import Sequence

from .schemas import SurfaceLabel, WindowPrediction


@dataclass(frozen=True, slots=True)
class EvaluationMetrics:
    samples: int
    macro_f1: float
    balanced_accuracy: float
    expected_calibration_error: float
    abstention_rate: float
    confusion_matrix: dict[str, dict[str, int]]


def score_predictions(
    truth: Sequence[SurfaceLabel], predictions: Sequence[WindowPrediction], bins: int = 10
) -> EvaluationMetrics:
    if not truth or len(truth) != len(predictions):
        raise ValueError("truth and predictions must have the same non-zero length")

    labels = sorted({label.value for label in truth} | {item.label.value for item in predictions})
    confusion: dict[str, dict[str, int]] = {
        actual: {predicted: 0 for predicted in labels} for actual in labels
    }
    for actual, prediction in zip(truth, predictions, strict=True):
        confusion[actual.value][prediction.label.value] += 1

    recalls: list[float] = []
    f1_scores: list[float] = []
    for label in labels:
        true_positive = confusion[label][label]
        false_negative = sum(confusion[label].values()) - true_positive
        false_positive = sum(row[label] for actual, row in confusion.items() if actual != label)
        recall = true_positive / (true_positive + false_negative) if true_positive + false_negative else 0
        precision = true_positive / (true_positive + false_positive) if true_positive + false_positive else 0
        recalls.append(recall)
        f1_scores.append(2 * precision * recall / (precision + recall) if precision + recall else 0)

    bucket_confidences: dict[int, list[float]] = defaultdict(list)
    bucket_correctness: dict[int, list[float]] = defaultdict(list)
    for actual, prediction in zip(truth, predictions, strict=True):
        bucket = min(int(prediction.confidence * bins), bins - 1)
        bucket_confidences[bucket].append(prediction.confidence)
        bucket_correctness[bucket].append(float(prediction.label == actual))
    calibration_error = sum(
        (len(bucket_confidences[bucket]) / len(predictions))
        * abs(
            sum(bucket_confidences[bucket]) / len(bucket_confidences[bucket])
            - sum(bucket_correctness[bucket]) / len(bucket_correctness[bucket])
        )
        for bucket in bucket_confidences
    )

    return EvaluationMetrics(
        samples=len(truth),
        macro_f1=sum(f1_scores) / len(f1_scores),
        balanced_accuracy=sum(recalls) / len(recalls),
        expected_calibration_error=calibration_error,
        abstention_rate=sum(item.abstained for item in predictions) / len(predictions),
        confusion_matrix=confusion,
    )
