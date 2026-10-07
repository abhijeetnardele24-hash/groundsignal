import { openDB } from "idb";
import type { CalibrationRow, FieldReport, MotionSample, SurfaceLabel } from "../types";

const MAX_STORED_SESSIONS = 10;
const MAX_RAW_SAMPLES_PER_SESSION = 18_000;

interface StoredSession {
  report: FieldReport;
  rawSamples: MotionSample[];
}

const database = openDB("groundsignal", 1, {
  upgrade(db) {
    db.createObjectStore("calibration");
    db.createObjectStore("sessions");
  },
});

export async function saveCalibration(label: SurfaceLabel, rows: CalibrationRow[]) {
  return (await database).put("calibration", rows, label);
}

export async function loadCalibration(): Promise<CalibrationRow[]> {
  const values = await (await database).getAll("calibration") as CalibrationRow[][];
  return values.flat();
}

export async function saveSession(report: FieldReport, rawSamples: MotionSample[]) {
  const db = await database;
  await db.put("sessions", { report, rawSamples: rawSamples.slice(-MAX_RAW_SAMPLES_PER_SESSION) }, report.sessionId);
  const keys = await db.getAllKeys("sessions");
  if (keys.length <= MAX_STORED_SESSIONS) return;
  const sessions = await db.getAll("sessions") as StoredSession[];
  const oldest = sessions
    .sort((a, b) => Date.parse(a.report.createdAt) - Date.parse(b.report.createdAt))
    .slice(0, sessions.length - MAX_STORED_SESSIONS);
  await Promise.all(oldest.map((session) => db.delete("sessions", session.report.sessionId)));
}

export async function updateSessionReport(report: FieldReport) {
  const db = await database;
  const existing = await db.get("sessions", report.sessionId) as StoredSession | undefined;
  await db.put("sessions", { report, rawSamples: existing?.rawSamples ?? [] }, report.sessionId);
}

export async function loadReports(): Promise<FieldReport[]> {
  const sessions = await (await database).getAll("sessions") as StoredSession[];
  return sessions.map((session) => ({
    ...session.report,
    mobilityMode: session.report.mobilityMode ?? "walking",
    phonePlacement: session.report.phonePlacement ?? "other",
    calibration: session.report.calibration ?? [],
  })).sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
}

export async function deleteSession(sessionId: string) {
  return (await database).delete("sessions", sessionId);
}

export async function storageEstimate(): Promise<{ usage: number; quota: number } | null> {
  if (!navigator.storage?.estimate) return null;
  const estimate = await navigator.storage.estimate();
  return { usage: estimate.usage ?? 0, quota: estimate.quota ?? 0 };
}

export async function clearAllData() {
  const db = await database;
  const tx = db.transaction(["calibration", "sessions"], "readwrite");
  await Promise.all([tx.objectStore("calibration").clear(), tx.objectStore("sessions").clear(), tx.done]);
}
