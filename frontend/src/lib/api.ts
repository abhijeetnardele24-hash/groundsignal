import type { CalibrationRow, FeatureVector, FieldReport, MobilityMode, PhonePlacement, Prediction, SurfaceLabel } from "../types";

const API_URL = (import.meta.env.VITE_API_URL || "http://localhost:8000").replace(/\/$/, "");

const featureValues = (row: FeatureVector) => [row.duration_ms, row.accel_rms, row.accel_std, row.accel_peak_to_peak, row.jerk_rms, row.gyro_rms, row.dominant_frequency, row.spectral_entropy, row.vertical_energy_ratio, row.horizontal_energy, row.speed_mean, row.speed_std, row.sample_coverage];

function localPrediction(calibration: CalibrationRow[], features: FeatureVector[]): Prediction[] {
  const training = calibration.map(featureValues);
  const means = training[0].map((_, index) => training.reduce((sum, row) => sum + row[index], 0) / training.length);
  const scales = means.map((mean, index) => Math.sqrt(training.reduce((sum, row) => sum + (row[index] - mean) ** 2, 0) / training.length) || 1);
  const normalize = (row: number[]) => row.map((value, index) => (value - means[index]) / scales[index]);
  const classes = [...new Set(calibration.map((row) => row.label))];
  const centroids = classes.map((label) => {
    const rows = calibration.filter((row) => row.label === label).map((row) => normalize(featureValues(row)));
    return rows[0].map((_, index) => rows.reduce((sum, row) => sum + row[index], 0) / rows.length);
  });
  return features.map((feature) => {
    const vector = normalize(featureValues(feature));
    const logits = centroids.map((centroid) => -Math.sqrt(centroid.reduce((sum, value, index) => sum + (vector[index] - value) ** 2, 0)));
    const maxLogit = Math.max(...logits);
    const exponentials = logits.map((value) => Math.exp(value - maxLogit));
    const total = exponentials.reduce((sum, value) => sum + value, 0);
    const classProbabilities = exponentials.map((value) => value / total);
    const bestIndex = classProbabilities.indexOf(Math.max(...classProbabilities));
    const label = classes[bestIndex];
    const confidence = classProbabilities[bestIndex];
    const probabilities: Record<SurfaceLabel, number> = { smooth: 0, rough: 0, unstable: 0, transition: 0 };
    classes.forEach((classLabel, index) => { probabilities[classLabel] = classProbabilities[index]; });
    return { window_id: feature.window_id, label, confidence, abstained: confidence < 0.58, probabilities };
  });
}

export async function analyzeSession(args: {
  sessionId: string;
  source: "sensor" | "simulation";
  mobilityMode: MobilityMode;
  phonePlacement: PhonePlacement;
  calibration: CalibrationRow[];
  audit: FeatureVector[];
}): Promise<FieldReport> {
  try {
    const response = await fetch(`${API_URL}/v1/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        session_id: args.sessionId,
        mobility_mode: args.mobilityMode,
        phone_placement: args.phonePlacement,
        calibration: args.calibration,
        audit: args.audit,
      }),
    });
    if (!response.ok) throw new Error(`Analysis returned ${response.status}`);
    const body = await response.json();
    return {
      sessionId: args.sessionId,
      createdAt: new Date().toISOString(),
      source: args.source,
      provider: body.provider,
      mobilityMode: args.mobilityMode,
      phonePlacement: args.phonePlacement,
      calibration: args.calibration,
      predictions: body.predictions,
      features: args.audit,
      privacy: body.privacy,
      disclaimer: body.disclaimer,
    };
  } catch {
    return {
      sessionId: args.sessionId,
      createdAt: new Date().toISOString(),
      source: args.source,
      provider: "offline-transparent-baseline",
      mobilityMode: args.mobilityMode,
      phonePlacement: args.phonePlacement,
      calibration: args.calibration,
      predictions: localPrediction(args.calibration, args.audit),
      features: args.audit,
      privacy: "Analysis stayed on this device because the hosted model was unavailable.",
      disclaimer: "Field observations are not a safety guarantee or a universal accessibility assessment.",
      analysisNote: "The hosted model was unavailable, so this report uses the deterministic on-device fallback.",
    };
  }
}
