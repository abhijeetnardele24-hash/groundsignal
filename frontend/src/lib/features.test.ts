import { describe, expect, it } from "vitest";
import { extractFeatures, simulateMotion } from "./features";

describe("motion feature extraction", () => {
  it("creates bounded, finite vectors from a realistic sample", () => {
    const vectors = extractFeatures(simulateMotion("rough", 10), "test");
    expect(vectors.length).toBeGreaterThanOrEqual(4);
    for (const vector of vectors) {
      expect(vector.window_id).toMatch(/^test-/);
      expect(vector.duration_ms).toBeGreaterThanOrEqual(500);
      expect(vector.spectral_entropy).toBeGreaterThanOrEqual(0);
      expect(vector.spectral_entropy).toBeLessThanOrEqual(1);
      expect(Object.values(vector).filter((value) => typeof value === "number").every(Number.isFinite)).toBe(true);
    }
  });

  it("keeps a transition signal more energetic than a smooth signal", () => {
    const smooth = extractFeatures(simulateMotion("smooth", 10), "smooth");
    const transition = extractFeatures(simulateMotion("transition", 10), "transition");
    const averageJerk = (vectors: typeof smooth) => vectors.reduce((sum, row) => sum + row.jerk_rms, 0) / vectors.length;
    expect(averageJerk(transition)).toBeGreaterThan(averageJerk(smooth));
  });
});
