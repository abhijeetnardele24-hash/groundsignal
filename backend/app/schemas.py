from __future__ import annotations

from enum import StrEnum
from math import isfinite

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


class SurfaceLabel(StrEnum):
    SMOOTH = "smooth"
    ROUGH = "rough"
    UNSTABLE = "unstable"
    TRANSITION = "transition"


class MobilityMode(StrEnum):
    WALKING = "walking"
    MANUAL_WHEELCHAIR = "manual_wheelchair"
    POWER_WHEELCHAIR = "power_wheelchair"
    MOBILITY_SCOOTER = "mobility_scooter"
    STROLLER = "stroller"
    OTHER = "other"


class PhonePlacement(StrEnum):
    FRONT_POCKET = "front_pocket"
    JACKET_POCKET = "jacket_pocket"
    BAG = "bag"
    CHAIR_FRAME = "chair_frame"
    STROLLER_FRAME = "stroller_frame"
    HAND = "hand"
    OTHER = "other"


class FeatureVector(BaseModel):
    """Derived motion features only. Raw sensor and location data are excluded."""

    model_config = ConfigDict(extra="forbid", frozen=True)

    window_id: str = Field(min_length=1, max_length=80, pattern=r"^[A-Za-z0-9_.:-]+$")
    start_ms: int = Field(ge=0, le=86_400_000)
    duration_ms: int = Field(ge=500, le=10_000)
    accel_rms: float = Field(ge=0, le=200)
    accel_std: float = Field(ge=0, le=200)
    accel_peak_to_peak: float = Field(ge=0, le=400)
    jerk_rms: float = Field(ge=0, le=10_000)
    gyro_rms: float = Field(ge=0, le=100)
    dominant_frequency: float = Field(ge=0, le=100)
    spectral_entropy: float = Field(ge=0, le=1)
    vertical_energy_ratio: float = Field(ge=0, le=1)
    horizontal_energy: float = Field(ge=0, le=40_000)
    speed_mean: float = Field(ge=0, le=25)
    speed_std: float = Field(ge=0, le=25)
    sample_coverage: float = Field(ge=0, le=1)

    @field_validator("*")
    @classmethod
    def reject_non_finite_numbers(cls, value: object) -> object:
        if isinstance(value, float) and not isfinite(value):
            raise ValueError("numeric values must be finite")
        return value

    def model_features(self) -> list[float]:
        return [
            self.duration_ms,
            self.accel_rms,
            self.accel_std,
            self.accel_peak_to_peak,
            self.jerk_rms,
            self.gyro_rms,
            self.dominant_frequency,
            self.spectral_entropy,
            self.vertical_energy_ratio,
            self.horizontal_energy,
            self.speed_mean,
            self.speed_std,
            self.sample_coverage,
        ]


class CalibrationRow(FeatureVector):
    label: SurfaceLabel


class AnalyzeRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    session_id: str = Field(min_length=8, max_length=80, pattern=r"^[A-Za-z0-9_-]+$")
    mobility_mode: MobilityMode
    phone_placement: PhonePlacement
    calibration: list[CalibrationRow] = Field(min_length=8, max_length=2_000)
    audit: list[FeatureVector] = Field(min_length=1, max_length=5_000)

    @model_validator(mode="after")
    def require_multiple_calibration_classes(self) -> "AnalyzeRequest":
        if len({row.label for row in self.calibration}) < 2:
            raise ValueError("calibration must include at least two surface labels")
        return self


class WindowPrediction(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)

    window_id: str
    label: SurfaceLabel
    confidence: float = Field(ge=0, le=1)
    probabilities: dict[SurfaceLabel, float]
    abstained: bool


class AnalyzeResponse(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)

    session_id: str
    provider: str
    predictions: list[WindowPrediction]
    privacy: str = "Only derived motion features were processed; raw sensor and location data were not sent."
    disclaimer: str = (
        "Field observations are not a safety guarantee or a universal accessibility assessment."
    )
