import type { CalibrationRow, EvidenceQuality, MotionSample, SurfaceLabel } from "../types";

const SURFACE_LABELS: SurfaceLabel[] = ["smooth", "rough", "unstable", "transition"];
const MIN_WINDOWS_PER_CLASS = 4;
const MIN_USABLE_COVERAGE = 0.65;

const mean = (values: number[]) => values.reduce((sum, value) => sum + value, 0) / Math.max(values.length, 1);

export interface CalibrationQuality {
  ready: boolean;
  level: "good" | "watch" | "poor";
  labelCounts: Record<SurfaceLabel, number>;
  qualifiedClasses: number;
  averageCoverage: number;
  usableWindows: number;
  warnings: string[];
}

export interface LiveSignalHealth {
  level: "collecting" | "stable" | "watch" | "weak";
  label: string;
  detail: string;
  sampleRateHz: number;
}

export function assessCalibrationQuality(rows: CalibrationRow[]): CalibrationQuality {
  const usable = rows.filter((row) => row.sample_coverage >= MIN_USABLE_COVERAGE && row.duration_ms >= 1_500);
  const labelCounts = Object.fromEntries(
    SURFACE_LABELS.map((label) => [label, usable.filter((row) => row.label === label).length]),
  ) as Record<SurfaceLabel, number>;
  const qualifiedClasses = SURFACE_LABELS.filter((label) => labelCounts[label] >= MIN_WINDOWS_PER_CLASS).length;
  const averageCoverage = mean(rows.map((row) => row.sample_coverage));
  const warnings: string[] = [];

  if (qualifiedClasses < 2) warnings.push(`Capture at least ${MIN_WINDOWS_PER_CLASS} usable windows on two known surfaces.`);
  if (rows.length > 0 && averageCoverage < 0.8) warnings.push("Sensor coverage is uneven; secure the phone and recapture weak surfaces.");
  if (rows.length !== usable.length) warnings.push(`${rows.length - usable.length} low-coverage window${rows.length - usable.length === 1 ? " was" : "s were"} excluded from readiness.`);

  const ready = usable.length >= 8 && qualifiedClasses >= 2;
  const level = ready && averageCoverage >= 0.85 ? "good" : ready ? "watch" : "poor";
  return { ready, level, labelCounts, qualifiedClasses, averageCoverage, usableWindows: usable.length, warnings };
}

export function assessEvidenceQuality(rows: CalibrationRow[] | Omit<CalibrationRow, "label">[]): EvidenceQuality {
  const averageCoverage = mean(rows.map((row) => row.sample_coverage));
  const lowCoverageWindows = rows.filter((row) => row.sample_coverage < 0.7).length;
  const shortWindows = rows.filter((row) => row.duration_ms < 2_000).length;
  const warnings: string[] = [];
  if (lowCoverageWindows) warnings.push(`${lowCoverageWindows} window${lowCoverageWindows === 1 ? " has" : "s have"} weak sensor coverage.`);
  if (shortWindows) warnings.push(`${shortWindows} window${shortWindows === 1 ? " is" : "s are"} shorter than two seconds.`);
  if (!rows.length) warnings.push("No model-ready motion windows were captured.");

  const weakRatio = rows.length ? (lowCoverageWindows + shortWindows) / (rows.length * 2) : 1;
  const level = !rows.length || averageCoverage < 0.65 || weakRatio > 0.4
    ? "poor"
    : averageCoverage < 0.85 || warnings.length
      ? "watch"
      : "good";
  const label = level === "good" ? "Strong evidence" : level === "watch" ? "Review evidence" : "Weak evidence";

  return { level, label, averageCoverage, lowCoverageWindows, shortWindows, totalWindows: rows.length, warnings };
}

export function assessLiveSignal(samples: MotionSample[]): LiveSignalHealth {
  if (samples.length < 8) {
    return { level: "collecting", label: "Collecting signal", detail: "Waiting for a stable sample stream.", sampleRateHz: 0 };
  }

  const recent = samples.slice(-120);
  const spanMs = (recent.at(-1)?.t ?? 0) - recent[0].t;
  if (spanMs < 1_000) {
    return { level: "collecting", label: "Collecting signal", detail: "Keep the phone in its selected placement.", sampleRateHz: 0 };
  }

  const intervals = recent.slice(1).map((sample, index) => sample.t - recent[index].t).filter((interval) => interval > 0);
  const sampleRateHz = intervals.length / (spanMs / 1_000);
  const gapRatio = intervals.filter((interval) => interval > 250).length / Math.max(intervals.length, 1);

  if (sampleRateHz >= 15 && gapRatio <= 0.05) {
    return { level: "stable", label: "Signal stable", detail: `${Math.round(sampleRateHz)} readings/second`, sampleRateHz };
  }
  if (sampleRateHz >= 8 && gapRatio <= 0.2) {
    return { level: "watch", label: "Signal uneven", detail: "Keep the phone secure and continue moving naturally.", sampleRateHz };
  }
  return { level: "weak", label: "Signal weak", detail: "Check the phone placement before relying on this audit.", sampleRateHz };
}
