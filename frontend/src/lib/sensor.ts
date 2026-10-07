import type { MotionSample } from "../types";

type PermissionedDeviceMotionEvent = typeof DeviceMotionEvent & {
  requestPermission?: () => Promise<"granted" | "denied">;
};

export async function requestMotionPermission(): Promise<boolean> {
  const motion = DeviceMotionEvent as PermissionedDeviceMotionEvent;
  if (typeof motion.requestPermission === "function") {
    return (await motion.requestPermission()) === "granted";
  }
  return "DeviceMotionEvent" in window;
}

export function recordMotion(onSample: (sample: MotionSample) => void): () => void {
  const startedAt = performance.now();
  const handler = (event: DeviceMotionEvent) => {
    const acceleration = event.accelerationIncludingGravity ?? event.acceleration;
    const rotation = event.rotationRate;
    onSample({
      t: performance.now() - startedAt,
      ax: acceleration?.x ?? 0,
      ay: acceleration?.y ?? 0,
      az: acceleration?.z ?? 0,
      gx: rotation?.alpha ?? 0,
      gy: rotation?.beta ?? 0,
      gz: rotation?.gamma ?? 0,
    });
  };
  window.addEventListener("devicemotion", handler, { passive: true });
  return () => window.removeEventListener("devicemotion", handler);
}
