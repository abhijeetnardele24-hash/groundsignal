import type { FeatureVector, MotionSample, SurfaceLabel } from "../types";

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));
const mean = (values: number[]) => values.reduce((sum, value) => sum + value, 0) / Math.max(values.length, 1);
const rms = (values: number[]) => Math.sqrt(mean(values.map((value) => value * value)));
const std = (values: number[]) => {
  const average = mean(values);
  return Math.sqrt(mean(values.map((value) => (value - average) ** 2)));
};

function spectrum(values: number[], sampleRate: number): { frequency: number; entropy: number } {
  if (values.length < 4 || sampleRate <= 0) return { frequency: 0, entropy: 0 };
  const centered = values.map((value) => value - mean(values));
  const powers: number[] = [];
  for (let k = 1; k <= Math.min(Math.floor(values.length / 2), 32); k += 1) {
    let real = 0;
    let imaginary = 0;
    centered.forEach((value, index) => {
      const angle = (2 * Math.PI * k * index) / centered.length;
      real += value * Math.cos(angle);
      imaginary -= value * Math.sin(angle);
    });
    powers.push(real * real + imaginary * imaginary);
  }
  const total = powers.reduce((sum, value) => sum + value, 0);
  if (total <= 1e-12) return { frequency: 0, entropy: 0 };
  const probabilities = powers.map((value) => value / total);
  const entropy = -probabilities.reduce((sum, value) => sum + (value > 0 ? value * Math.log(value) : 0), 0) / Math.log(probabilities.length);
  const peak = powers.indexOf(Math.max(...powers)) + 1;
  return { frequency: (peak * sampleRate) / centered.length, entropy };
}

export function extractFeatures(samples: MotionSample[], prefix: string, windowMs = 3000, stepMs = 1500): FeatureVector[] {
  if (samples.length < 8) return [];
  const start = samples[0].t;
  const end = samples.at(-1)?.t ?? start;
  const vectors: FeatureVector[] = [];
  let index = 0;
  for (let windowStart = start; windowStart + 1000 <= end; windowStart += stepMs) {
    const window = samples.filter((sample) => sample.t >= windowStart && sample.t < windowStart + windowMs);
    if (window.length < 8) continue;
    const duration = Math.max(500, Math.min(10000, (window.at(-1)?.t ?? windowStart) - windowStart));
    const magnitude = window.map(({ ax, ay, az }) => Math.sqrt(ax * ax + ay * ay + az * az));
    const gyro = window.map(({ gx, gy, gz }) => Math.sqrt(gx * gx + gy * gy + gz * gz));
    const jerk = magnitude.slice(1).map((value, i) => {
      const dt = Math.max((window[i + 1].t - window[i].t) / 1000, 0.001);
      return (value - magnitude[i]) / dt;
    });
    const dtSeconds = duration / 1000;
    const sampleRate = window.length / Math.max(dtSeconds, 0.001);
    const { frequency, entropy } = spectrum(magnitude, sampleRate);
    const totalEnergy = mean(window.map(({ ax, ay, az }) => ax * ax + ay * ay + az * az));
    const verticalEnergy = mean(window.map(({ az }) => az * az));
    vectors.push({
      window_id: `${prefix}-${index}`,
      start_ms: Math.max(0, Math.round(windowStart - start)),
      duration_ms: Math.round(duration),
      accel_rms: clamp(rms(magnitude), 0, 200),
      accel_std: clamp(std(magnitude), 0, 200),
      accel_peak_to_peak: clamp(Math.max(...magnitude) - Math.min(...magnitude), 0, 400),
      jerk_rms: clamp(rms(jerk), 0, 10000),
      gyro_rms: clamp(rms(gyro), 0, 100),
      dominant_frequency: clamp(frequency, 0, 100),
      spectral_entropy: clamp(entropy, 0, 1),
      vertical_energy_ratio: clamp(totalEnergy ? verticalEnergy / totalEnergy : 0, 0, 1),
      horizontal_energy: clamp(mean(window.map(({ ax, ay }) => ax * ax + ay * ay)), 0, 40000),
      speed_mean: 0,
      speed_std: 0,
      sample_coverage: clamp(window.length / Math.max(sampleRate * (windowMs / 1000), 1), 0, 1),
    });
    index += 1;
  }
  return vectors;
}

export function simulateMotion(label: SurfaceLabel, seconds = 14, hz = 30): MotionSample[] {
  const amplitudes: Record<SurfaceLabel, number> = { smooth: 0.35, rough: 1.5, unstable: 2.8, transition: 4.5 };
  const frequency: Record<SurfaceLabel, number> = { smooth: 1.7, rough: 4.5, unstable: 2.7, transition: 1.2 };
  const result: MotionSample[] = [];
  const amplitude = amplitudes[label];
  for (let index = 0; index < seconds * hz; index += 1) {
    const t = (index / hz) * 1000;
    const burst = label === "transition" && index % (hz * 4) < 4 ? 5 : 0;
    const wave = Math.sin((2 * Math.PI * frequency[label] * index) / hz);
    const noise = (Math.sin(index * 12.9898) * 43758.5453) % 1;
    result.push({
      t,
      ax: amplitude * wave + noise * 0.2 + burst,
      ay: amplitude * 0.7 * Math.cos((2 * Math.PI * frequency[label] * index) / hz),
      az: 9.81 + amplitude * 0.9 * wave,
      gx: amplitude * 0.25 * wave,
      gy: amplitude * 0.18 * Math.cos(index / 4),
      gz: amplitude * 0.12 * wave,
    });
  }
  return result;
}
