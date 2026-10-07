export type SurfaceLabel = "smooth" | "rough" | "unstable" | "transition";
export type MobilityMode = "walking" | "manual_wheelchair" | "power_wheelchair" | "mobility_scooter" | "stroller" | "other";
export type PhonePlacement = "front_pocket" | "jacket_pocket" | "bag" | "chair_frame" | "stroller_frame" | "hand" | "other";

export interface MotionSample {
  t: number;
  ax: number;
  ay: number;
  az: number;
  gx: number;
  gy: number;
  gz: number;
}

export interface FeatureVector {
  window_id: string;
  start_ms: number;
  duration_ms: number;
  accel_rms: number;
  accel_std: number;
  accel_peak_to_peak: number;
  jerk_rms: number;
  gyro_rms: number;
  dominant_frequency: number;
  spectral_entropy: number;
  vertical_energy_ratio: number;
  horizontal_energy: number;
  speed_mean: number;
  speed_std: number;
  sample_coverage: number;
}

export interface CalibrationRow extends FeatureVector { label: SurfaceLabel }

export interface EvidenceQuality {
  level: "good" | "watch" | "poor";
  label: string;
  averageCoverage: number;
  lowCoverageWindows: number;
  shortWindows: number;
  totalWindows: number;
  warnings: string[];
}

export interface Prediction {
  window_id: string;
  label: SurfaceLabel;
  confidence: number;
  probabilities: Record<SurfaceLabel, number>;
  abstained: boolean;
  review?: {
    status: "confirmed" | "corrected" | "dismissed";
    finalLabel?: SurfaceLabel;
    reviewedAt: string;
  };
}

export interface FieldReport {
  sessionId: string;
  createdAt: string;
  source: "sensor" | "simulation";
  provider: string;
  mobilityMode: MobilityMode;
  phonePlacement: PhonePlacement;
  calibration: CalibrationRow[];
  predictions: Prediction[];
  features: FeatureVector[];
  evidenceQuality?: EvidenceQuality;
  privacy: string;
  disclaimer: string;
  analysisNote?: string;
}
