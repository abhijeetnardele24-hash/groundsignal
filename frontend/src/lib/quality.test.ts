import { describe, expect, it } from "vitest";
import { extractFeatures, simulateMotion } from "./features";
import { assessCalibrationQuality, assessEvidenceQuality, assessLiveSignal } from "./quality";
import type { CalibrationRow, MotionSample, SurfaceLabel } from "../types";

const calibrationFor = (labels: SurfaceLabel[]) => labels.flatMap((label) =>
  extractFeatures(simulateMotion(label, 10), `cal-${label}`).map((row) => ({ ...row, label } as CalibrationRow)),
);

describe("calibration quality", () => {
  it("requires enough usable windows across two classes", () => {
    expect(assessCalibrationQuality(calibrationFor(["smooth"])).ready).toBe(false);
    expect(assessCalibrationQuality(calibrationFor(["smooth", "rough"])).ready).toBe(true);
  });

  it("excludes low-coverage windows from readiness", () => {
    const weak = calibrationFor(["smooth", "rough"]).map((row) => ({ ...row, sample_coverage: 0.4 }));
    const quality = assessCalibrationQuality(weak);
    expect(quality.ready).toBe(false);
    expect(quality.warnings.join(" ")).toContain("excluded");
  });
});

describe("audit evidence quality", () => {
  it("recognizes a complete simulated capture", () => {
    const quality = assessEvidenceQuality(extractFeatures(simulateMotion("rough", 10), "audit"));
    expect(quality.level).toBe("good");
    expect(quality.totalWindows).toBeGreaterThanOrEqual(4);
  });

  it("surfaces weak coverage instead of silently accepting it", () => {
    const rows = extractFeatures(simulateMotion("rough", 10), "audit").map((row) => ({ ...row, sample_coverage: 0.3 }));
    const quality = assessEvidenceQuality(rows);
    expect(quality.level).toBe("poor");
    expect(quality.lowCoverageWindows).toBe(rows.length);
  });
});

describe("live signal health", () => {
  it("recognizes a stable sensor stream", () => {
    expect(assessLiveSignal(simulateMotion("smooth", 5)).level).toBe("stable");
  });

  it("warns when readings arrive too slowly", () => {
    const sparse: MotionSample[] = Array.from({ length: 10 }, (_, index) => ({
      t: index * 500, ax: 0, ay: 0, az: 9.81, gx: 0, gy: 0, gz: 0,
    }));
    expect(assessLiveSignal(sparse).level).toBe("weak");
  });
});
