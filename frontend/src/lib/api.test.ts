import { afterEach, describe, expect, it, vi } from "vitest";
import { analyzeSession } from "./api";
import { extractFeatures, simulateMotion } from "./features";
import type { CalibrationRow, SurfaceLabel } from "../types";

afterEach(() => vi.restoreAllMocks());

describe("analysis fallback", () => {
  it("uses personal calibration and clearly labels the offline provider", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("offline")));
    const calibration = (["smooth", "rough"] as SurfaceLabel[]).flatMap((label) =>
      extractFeatures(simulateMotion(label, 10), `cal-${label}`).map((row) => ({ ...row, label } as CalibrationRow)),
    );
    const audit = extractFeatures(simulateMotion("rough", 8), "audit");
    const report = await analyzeSession({
      sessionId: "session_offline_test",
      source: "simulation",
      mobilityMode: "walking",
      phonePlacement: "front_pocket",
      calibration,
      audit,
    });

    expect(report.provider).toBe("offline-transparent-baseline");
    expect(report.analysisNote).toContain("hosted model was unavailable");
    expect(report.predictions).toHaveLength(audit.length);
    expect(report.predictions.every((prediction) => Number.isFinite(prediction.confidence))).toBe(true);
  });
});
