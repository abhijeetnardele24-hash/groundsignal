import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  Download,
  Footprints,
  Gauge,
  Info,
  LockKeyhole,
  History,
  HardDrive,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Trash2,
  WifiOff,
  X,
} from "lucide-react";
import { analyzeSession } from "./lib/api";
import { extractFeatures, simulateMotion } from "./lib/features";
import { recordMotion, requestMotionPermission } from "./lib/sensor";
import { clearAllData, deleteSession, loadCalibration, loadReports, saveCalibration, saveSession, storageEstimate, updateSessionReport } from "./lib/storage";
import type {
  CalibrationRow,
  FieldReport,
  MobilityMode,
  MotionSample,
  PhonePlacement,
  SurfaceLabel,
} from "./types";

type Screen = "dashboard" | "calibrate" | "record" | "report";
type CaptureKind = "calibration" | "audit";

const labels: Array<{ value: SurfaceLabel; title: string; note: string }> = [
  { value: "smooth", title: "Smooth", note: "Known even surface" },
  { value: "rough", title: "Rough", note: "Textured or cracked" },
  { value: "unstable", title: "Unstable", note: "Loose or shifting" },
  { value: "transition", title: "Transition", note: "Curb, seam, or edge" },
];

const labelCopy: Record<SurfaceLabel, string> = {
  smooth: "Consistent signal",
  rough: "Variable surface",
  unstable: "Strong variance",
  transition: "Surface transition",
};

const labelClass: Record<SurfaceLabel, string> = {
  smooth: "segment--smooth",
  rough: "segment--rough",
  unstable: "segment--unstable",
  transition: "segment--transition",
};

function formatDuration(seconds: number) {
  const minutes = Math.floor(seconds / 60).toString().padStart(2, "0");
  const remainder = Math.floor(seconds % 60).toString().padStart(2, "0");
  return `${minutes}:${remainder}`;
}

function download(name: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  URL.revokeObjectURL(url);
}

function SignalMark() {
  return (
    <div className="signal-mark" aria-label="GroundSignal">
      <span /><span /><span />
    </div>
  );
}

function StatusPill({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "good" | "warn" }) {
  return <span className={`pill pill--${tone}`}>{children}</span>;
}

export default function App() {
  const [screen, setScreen] = useState<Screen>("dashboard");
  const [mobilityMode, setMobilityMode] = useState<MobilityMode>("walking");
  const [phonePlacement, setPhonePlacement] = useState<PhonePlacement>("front_pocket");
  const [calibration, setCalibration] = useState<CalibrationRow[]>([]);
  const [activeLabel, setActiveLabel] = useState<SurfaceLabel>("smooth");
  const [sampleCount, setSampleCount] = useState(0);
  const [captureKind, setCaptureKind] = useState<CaptureKind>("audit");
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [report, setReport] = useState<FieldReport | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [recentReports, setRecentReports] = useState<FieldReport[]>([]);
  const [storageUsage, setStorageUsage] = useState<number | null>(null);
  const [online, setOnline] = useState(navigator.onLine);
  const stopRef = useRef<null | (() => void)>(null);
  const timerRef = useRef<number | null>(null);
  const samplesRef = useRef<MotionSample[]>([]);

  useEffect(() => {
    Promise.all([loadCalibration(), loadReports(), storageEstimate()])
      .then(([savedCalibration, savedReports, estimate]) => {
        setCalibration(savedCalibration);
        setRecentReports(savedReports);
        setStorageUsage(estimate?.usage ?? null);
      })
      .catch(() => setNotice("Local field data could not be read. Private browsing or storage restrictions may be active."));
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      stopRef.current?.();
      if (timerRef.current) window.clearInterval(timerRef.current);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const calibratedLabels = useMemo(() => new Set(calibration.map((row) => row.label)), [calibration]);
  const isCalibrated = calibration.length >= 8 && calibratedLabels.size >= 2;

  async function beginCapture(kind: CaptureKind) {
    setNotice(null);
    if (!window.isSecureContext && location.hostname !== "localhost") {
      setNotice("Motion sensors require HTTPS. Open the deployed app securely on your phone.");
      return;
    }
    try {
      const granted = await requestMotionPermission();
      if (!granted) {
        setNotice("Motion access was not granted. You can still run the transparent demo walk.");
        return;
      }
      setCaptureKind(kind);
      samplesRef.current = [];
      setSampleCount(0);
      setElapsed(0);
      setRecording(true);
      setScreen("record");
      stopRef.current = recordMotion((sample) => {
        samplesRef.current.push(sample);
        if (samplesRef.current.length % 10 === 0) setSampleCount(samplesRef.current.length);
      });
      timerRef.current = window.setInterval(() => setElapsed((current) => current + 1), 1000);
    } catch {
      setNotice("This browser could not start motion capture. Try Safari on iPhone or Chrome on Android.");
    }
  }

  async function finishCapture() {
    stopRef.current?.();
    stopRef.current = null;
    if (timerRef.current) window.clearInterval(timerRef.current);
    timerRef.current = null;
    setRecording(false);
    const capturedSamples = samplesRef.current;
    setSampleCount(capturedSamples.length);

    if (captureKind === "calibration") {
      const rows = extractFeatures(capturedSamples, `cal-${activeLabel}`).map((row) => ({ ...row, label: activeLabel }));
      if (rows.length < 2) {
        setNotice("Not enough sensor readings were captured. Keep the phone still in its placement and try for 8 seconds.");
      } else {
        const next = [...calibration.filter((row) => row.label !== activeLabel), ...rows];
        setCalibration(next);
        await saveCalibration(activeLabel, rows);
        setNotice(`${labelCopy[activeLabel]} baseline saved on this device.`);
      }
      setScreen("calibrate");
      return;
    }

    const audit = extractFeatures(capturedSamples, `walk-${Date.now()}`);
    if (!audit.length) {
      setNotice("The walk was too short to analyze. Record at least 6 seconds, or use Demo Walk on desktop.");
      setScreen("dashboard");
      return;
    }
    await runAnalysis(audit, capturedSamples, "sensor", calibration);
  }

  async function runDemo() {
    setBusy(true);
    setNotice(null);
    const demoCalibration = labels.flatMap(({ value }) =>
      extractFeatures(simulateMotion(value, 10), `demo-cal-${value}`).map((row) => ({ ...row, label: value })),
    );
    const audit = (["smooth", "smooth", "rough", "transition", "unstable", "smooth"] as SurfaceLabel[]).flatMap((label, index) =>
      extractFeatures(simulateMotion(label, 6), `demo-${index}-${label}`),
    );
    await runAnalysis(audit, [], "simulation", demoCalibration);
  }

  async function runAnalysis(audit: ReturnType<typeof extractFeatures>, raw: MotionSample[], source: "sensor" | "simulation", calibrationRows: CalibrationRow[]) {
    setBusy(true);
    const sessionId = `session_${crypto.randomUUID().replaceAll("-", "")}`;
    try {
      const nextReport = await analyzeSession({
        sessionId,
        source,
        mobilityMode,
        phonePlacement,
        calibration: calibrationRows,
        audit,
      });
      setReport(nextReport);
      await saveSession(nextReport, raw);
      setRecentReports((current) => [nextReport, ...current.filter((item) => item.sessionId !== nextReport.sessionId)].slice(0, 10));
      setScreen("report");
    } finally {
      setBusy(false);
    }
  }

  async function resetData() {
    await clearAllData();
    setCalibration([]);
    setReport(null);
    setRecentReports([]);
    setNotice("All locally stored calibration and sessions were deleted.");
    setScreen("dashboard");
  }

  async function reviewPrediction(windowId: string, status: "confirmed" | "corrected" | "dismissed", finalLabel?: SurfaceLabel) {
    if (!report) return;
    const next = {
      ...report,
      predictions: report.predictions.map((prediction) => prediction.window_id === windowId ? {
        ...prediction,
        review: { status, finalLabel, reviewedAt: new Date().toISOString() },
      } : prediction),
    };
    setReport(next);
    setRecentReports((current) => current.map((item) => item.sessionId === next.sessionId ? next : item));
    await updateSessionReport(next);
  }

  async function removeSession(sessionId: string) {
    await deleteSession(sessionId);
    setRecentReports((current) => current.filter((item) => item.sessionId !== sessionId));
    setReport(null);
    setNotice("That local session was deleted.");
    setScreen("dashboard");
  }

  async function promoteReviewedSignals(): Promise<number> {
    if (!report) return 0;
    const featureById = new Map(report.features.map((feature) => [feature.window_id, feature]));
    const reviewedRows: CalibrationRow[] = report.predictions.flatMap((prediction, index) => {
      const feature = featureById.get(prediction.window_id);
      const finalLabel = prediction.review?.finalLabel;
      if (!feature || !finalLabel || prediction.review?.status === "dismissed") return [];
      return [{ ...feature, window_id: `review-${report.sessionId.slice(-24)}-${index}`, label: finalLabel }];
    });
    if (!reviewedRows.length) return 0;
    const deduplicated = new Map([...calibration, ...reviewedRows].map((row) => [row.window_id, row]));
    const nextByLabel = labels.map(({ value }) => [...deduplicated.values()].filter((row) => row.label === value).slice(-500));
    await Promise.all(nextByLabel.map(async (rows) => {
      if (rows.length) await saveCalibration(rows[0].label, rows);
    }));
    setCalibration(nextByLabel.flat());
    return reviewedRows.length;
  }

  function exportReport(format: "json" | "csv") {
    if (!report) return;
    if (format === "json") {
      download(`groundsignal-${report.sessionId}.json`, JSON.stringify(report, null, 2), "application/json");
      return;
    }
    const header = "window_id,start_ms,duration_ms,predicted_label,final_label,review_status,confidence,abstained,accel_rms,jerk_rms,gyro_rms";
    const rows = report.features.map((feature, index) => {
      const prediction = report.predictions[index];
      return [feature.window_id, feature.start_ms, feature.duration_ms, prediction?.label, prediction?.review?.finalLabel ?? prediction?.label, prediction?.review?.status ?? "unreviewed", prediction?.confidence.toFixed(4), prediction?.abstained, feature.accel_rms.toFixed(4), feature.jerk_rms.toFixed(4), feature.gyro_rms.toFixed(4)].join(",");
    });
    download(`groundsignal-${report.sessionId}.csv`, [header, ...rows].join("\n"), "text/csv");
  }

  return (
    <main className={`app-shell app-shell--${screen}`}>
      <div className="grain" aria-hidden="true" />
      {screen === "dashboard" && (
        <section className="screen dashboard">
          <header className="topbar">
            <SignalMark />
            <StatusPill tone={online ? "good" : "warn"}>{online ? <span className="live-dot" /> : <WifiOff size={12} />}{online ? "Network available" : "Offline ready"}</StatusPill>
          </header>

          <div className="hero-copy">
            <p className="eyebrow">Pocket field instrument / 01</p>
            <h1>The sidewalk<br />told on itself.</h1>
            <p className="lede">Turn the motion you physically feel into an inspectable, uncertainty-aware surface report.</p>
          </div>

          <div className="status-card">
            <div className="card-heading">
              <span>Instrument status</span>
              <StatusPill tone={isCalibrated ? "good" : "warn"}>{isCalibrated ? "Ready" : "Needs baseline"}</StatusPill>
            </div>
            <div className="status-row"><span className="status-icon"><Gauge size={17} /></span><div><strong>{calibratedLabels.size}/4 surfaces calibrated</strong><small>Two surface types are enough to begin</small></div></div>
            <div className="status-row"><span className="status-icon"><LockKeyhole size={17} /></span><div><strong>Raw motion stays local</strong><small>Only derived features reach the model</small></div></div>
            <div className="status-row"><span className="status-icon"><ShieldCheck size={17} /></span><div><strong>Uncertainty stays visible</strong><small>Low confidence becomes “review,” not truth</small></div></div>
          </div>

          <div className="field-ledger">
            <div className="card-heading"><span>Field ledger</span><span>{recentReports.length} local</span></div>
            {recentReports.length ? recentReports.slice(0, 3).map((item) => {
              const confidence = item.predictions.reduce((sum, prediction) => sum + prediction.confidence, 0) / Math.max(item.predictions.length, 1);
              return (
                <button className="ledger-row" key={item.sessionId} onClick={() => { setReport(item); setScreen("report"); }}>
                  <span className="ledger-icon"><History size={17} /></span>
                  <span><strong>{item.source === "simulation" ? "Transparent demo" : "Field audit"}</strong><small>{new Date(item.createdAt).toLocaleString()} · {item.predictions.length} windows</small></span>
                  <span className="ledger-score">{Math.round(confidence * 100)}%</span>
                </button>
              );
            }) : <div className="empty-ledger"><HardDrive size={19} /><span>Your completed audits will stay here on this device.</span></div>}
            {storageUsage !== null && <p className="storage-note">Local storage used: {(storageUsage / 1024 / 1024).toFixed(1)} MB</p>}
          </div>

          {notice && <div className="notice" role="status"><Info size={18} /><span>{notice}</span></div>}

          <div className="dashboard-actions">
            <button className="button button--primary" onClick={() => isCalibrated ? beginCapture("audit") : setScreen("calibrate")}>
              {isCalibrated ? "Start a field audit" : "Calibrate instrument"}<ArrowRight size={19} />
            </button>
            {isCalibrated && <button className="text-button" onClick={() => setScreen("calibrate")}><Gauge size={16} />Review calibration</button>}
            <button className="button button--secondary" onClick={runDemo} disabled={busy}>
              <Sparkles size={18} />{busy ? "Analyzing…" : "Run transparent demo walk"}
            </button>
            <p className="microcopy">Demo data is synthetic and labeled in every export.</p>
          </div>
        </section>
      )}

      {screen === "calibrate" && (
        <section className="screen calibrate">
          <header className="topbar">
            <button className="icon-button" onClick={() => setScreen("dashboard")} aria-label="Back"><ArrowLeft size={19} /></button>
            <span className="eyebrow">Calibration / 02</span>
            <span className="step-count">{calibratedLabels.size}/4</span>
          </header>

          <div className="section-intro">
            <h2>Teach it your signal.</h2>
            <p>Gait, wheels, device, and placement all change motion. Capture surfaces you already know.</p>
          </div>

          <div className="field-grid">
            <label className="field">
              <span>Mobility mode</span>
              <select value={mobilityMode} onChange={(event) => setMobilityMode(event.target.value as MobilityMode)}>
                <option value="walking">Walking</option>
                <option value="manual_wheelchair">Manual wheelchair</option>
                <option value="power_wheelchair">Power wheelchair</option>
                <option value="mobility_scooter">Mobility scooter</option>
                <option value="stroller">Stroller</option>
                <option value="other">Other</option>
              </select><ChevronDown size={16} />
            </label>
            <label className="field">
              <span>Phone placement</span>
              <select value={phonePlacement} onChange={(event) => setPhonePlacement(event.target.value as PhonePlacement)}>
                <option value="front_pocket">Front pocket</option>
                <option value="jacket_pocket">Jacket pocket</option>
                <option value="bag">Bag</option>
                <option value="chair_frame">Chair frame</option>
                <option value="stroller_frame">Stroller frame</option>
                <option value="hand">Hand</option>
                <option value="other">Other</option>
              </select><ChevronDown size={16} />
            </label>
          </div>

          <div className="surface-list" role="list">
            {labels.map((label, index) => {
              const done = calibratedLabels.has(label.value);
              const selected = activeLabel === label.value;
              return (
                <button key={label.value} className={`surface-row ${selected ? "surface-row--selected" : ""}`} onClick={() => setActiveLabel(label.value)}>
                  <span className={`surface-index ${done ? "surface-index--done" : ""}`}>{done ? <Check size={16} /> : String(index + 1).padStart(2, "0")}</span>
                  <span><strong>{label.title}</strong><small>{label.note}</small></span>
                  <span className="surface-state">{done ? "Saved" : selected ? "Selected" : "Add"}</span>
                </button>
              );
            })}
          </div>

          {notice && <div className="notice" role="status"><Info size={18} /><span>{notice}</span></div>}
          <div className="sticky-actions">
            <button className="button button--primary" onClick={() => beginCapture("calibration")}>
              Capture {activeLabel} sample<ArrowRight size={19} />
            </button>
            <button className="text-button" disabled={!isCalibrated} onClick={() => beginCapture("audit")}>
              Begin real field audit
            </button>
          </div>
        </section>
      )}

      {screen === "record" && (
        <section className="screen record">
          <header className="record-header">
            <div><span className="eyebrow eyebrow--light">Status</span><strong><span className="record-dot" /> Active recording</strong></div>
            <StatusPill>Local save only</StatusPill>
          </header>
          <div className="record-center">
            <div className="signal-orbit" aria-label={`${formatDuration(elapsed)} elapsed`}>
              <span className="orbit orbit--one" /><span className="orbit orbit--two" />
              <div className="timer"><strong>{formatDuration(elapsed)}</strong><span>Elapsed</span></div>
            </div>
            <div className="sample-count">{sampleCount.toLocaleString()} readings</div>
            <p>{captureKind === "calibration" ? `Move naturally across a known ${activeLabel} surface.` : "Pocket or mount the phone securely, then move naturally along the path."}</p>
          </div>
          <div className="stop-zone">
            <button className="stop-button" onClick={finishCapture} disabled={!recording || elapsed < (captureKind === "calibration" ? 7 : 5)} aria-label="Finish recording"><span /></button>
            <span>{elapsed < (captureKind === "calibration" ? 7 : 5) ? "Keep moving…" : "Tap to conclude"}</span>
          </div>
        </section>
      )}

      {screen === "report" && report && (
        <ReportScreen report={report} onClose={() => setScreen("dashboard")} onExport={exportReport} onReview={reviewPrediction} onPromote={promoteReviewedSignals} onDeleteSession={removeSession} onReset={resetData} />
      )}
    </main>
  );
}

function ReportScreen({ report, onClose, onExport, onReview, onPromote, onDeleteSession, onReset }: { report: FieldReport; onClose: () => void; onExport: (format: "json" | "csv") => void; onReview: (windowId: string, status: "confirmed" | "corrected" | "dismissed", finalLabel?: SurfaceLabel) => void; onPromote: () => Promise<number>; onDeleteSession: (sessionId: string) => void; onReset: () => void }) {
  const [showDelete, setShowDelete] = useState<"session" | "all" | null>(null);
  const [promoted, setPromoted] = useState(0);
  const uncertain = report.predictions.filter((prediction) => prediction.abstained && !prediction.review);
  const average = report.predictions.reduce((sum, prediction) => sum + prediction.confidence, 0) / Math.max(report.predictions.length, 1);
  const reviewed = report.predictions.filter((prediction) => prediction.review && prediction.review.status !== "dismissed").length;
  const dominant = Object.entries(report.predictions.reduce<Record<string, number>>((counts, prediction) => ({ ...counts, [prediction.label]: (counts[prediction.label] ?? 0) + 1 }), {})).sort((a, b) => b[1] - a[1])[0]?.[0] as SurfaceLabel | undefined;
  return (
    <section className="screen report">
      <header className="topbar report-topbar">
        <div><span className="eyebrow">Field report / 03</span><h2>Signal resolved.</h2></div>
        <button className="icon-button" onClick={onClose} aria-label="Close report"><X size={19} /></button>
      </header>

      {report.source === "simulation" && <div className="demo-banner"><Sparkles size={17} /><strong>Transparent demo</strong><span>Synthetic motion—not field evidence</span></div>}

      <div className="report-summary">
        <div><span>Model</span><strong>{report.provider.replaceAll("-", " ")}</strong></div>
        <div><span>Confidence</span><strong>{Math.round(average * 100)}%</strong></div>
        <div><span>Review</span><strong>{uncertain.length}</strong></div>
      </div>

      {report.analysisNote && <div className="notice" role="status"><Info size={18} /><span>{report.analysisNote}</span></div>}

      <div className="report-copy">
        <h3>{dominant ? `${labelCopy[dominant]} dominated this route.` : "The route needs more evidence."}</h3>
        <p>{report.predictions.length} overlapping motion windows were compared with the personal calibration set. Predictions remain observations, not accessibility claims.</p>
        <div className="context-chips"><span>{report.mobilityMode.replaceAll("_", " ")}</span><span>{report.phonePlacement.replaceAll("_", " ")}</span><span>{report.source} source</span></div>
      </div>

      <div className="route-block">
        <div className="card-heading"><span>Route signature</span><span>{report.predictions.length} windows</span></div>
        <div className="route-strip" aria-label="Predicted route segments">
          {report.predictions.map((prediction) => <span key={prediction.window_id} className={`${labelClass[prediction.label]} ${prediction.abstained ? "segment--abstained" : ""}`} title={`${prediction.label}, ${Math.round(prediction.confidence * 100)}% confidence`} />)}
        </div>
        <div className="legend">
          {labels.map((label) => <span key={label.value}><i className={labelClass[label.value]} />{label.title}</span>)}
          <span><i className="segment--abstained" />Review</span>
        </div>
      </div>

      {uncertain.length > 0 ? (
        <div className="review-stack">
          <div className="review-card">
            <div className="review-icon"><AlertCircle size={20} /></div>
            <div><span className="eyebrow">Human review</span><h3>{uncertain.length} signal{uncertain.length === 1 ? "" : "s"} need context.</h3><p>The model abstained instead of forcing a confident label. Your correction remains visibly recorded.</p></div>
          </div>
          {uncertain.slice(0, 4).map((prediction) => (
            <div className="review-item" key={prediction.window_id}>
              <div><strong>{prediction.window_id}</strong><span>{Math.round(prediction.confidence * 100)}% confidence · predicted {prediction.label}</span></div>
              <div className="review-actions" aria-label={`Review ${prediction.window_id}`}>
                <button onClick={() => onReview(prediction.window_id, "confirmed", prediction.label)}><Check size={14} />Confirm</button>
                {labels.filter((label) => label.value !== prediction.label).map((label) => <button key={label.value} onClick={() => onReview(prediction.window_id, "corrected", label.value)}>{label.title}</button>)}
                <button onClick={() => onReview(prediction.window_id, "dismissed")}><X size={14} />Discard</button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="review-card review-card--clear"><div className="review-icon"><Check size={20} /></div><div><span className="eyebrow">Model state</span><h3>No low-confidence windows.</h3><p>This still does not make the route universally safe or accessible.</p></div></div>
      )}

      <details className="review-browser">
        <summary><span><ShieldCheck size={18} />Label evaluation windows</span><span>{reviewed}/{report.predictions.length} reviewed <ChevronDown size={16} /></span></summary>
        <p>Confirm or correct windows you personally observed. These labels power the honest baseline-versus-TabPFN evaluation.</p>
        <div className="review-browser-list">
          {report.predictions.slice(0, 20).map((prediction) => (
            <div className="review-item" key={`all-${prediction.window_id}`}>
              <div><strong>{prediction.window_id}</strong><span>{prediction.review ? `${prediction.review.status}${prediction.review.finalLabel ? ` · ${prediction.review.finalLabel}` : ""}` : `${Math.round(prediction.confidence * 100)}% · ${prediction.label}`}</span></div>
              <div className="review-actions">
                <button onClick={() => onReview(prediction.window_id, "confirmed", prediction.label)}><Check size={14} />Confirm</button>
                {labels.filter((label) => label.value !== prediction.label).map((label) => <button key={label.value} onClick={() => onReview(prediction.window_id, "corrected", label.value)}>{label.title}</button>)}
                <button onClick={() => onReview(prediction.window_id, "dismissed")}><X size={14} />Discard</button>
              </div>
            </div>
          ))}
        </div>
        {report.predictions.length > 20 && <small>Showing the first 20 windows to keep field review manageable.</small>}
      </details>

      <details className="method-card">
        <summary><span><Footprints size={18} />What left this device?</span><ChevronDown size={18} /></summary>
        <p>{report.privacy}</p>
        <p>{report.disclaimer}</p>
      </details>

      {reviewed > 0 && (
        <button className="learning-card" onClick={async () => setPromoted(await onPromote())} disabled={promoted > 0}>
          <span><Sparkles size={18} /></span>
          <span><strong>{promoted ? `${promoted} reviewed signals added` : "Improve personal calibration"}</strong><small>{promoted ? "They will inform the next audit on this device." : `Add ${reviewed} human-reviewed signal${reviewed === 1 ? "" : "s"} to future local calibration.`}</small></span>
          <ArrowRight size={18} />
        </button>
      )}

      <div className="report-actions">
        <button className="button button--primary" onClick={() => onExport("csv")}><Download size={18} />Export evidence CSV</button>
        <button className="button button--secondary" onClick={() => onExport("json")}><Download size={18} />Export full report JSON</button>
        <div className="data-actions">
          <button className="danger-button" onClick={() => setShowDelete("session")}><Trash2 size={16} />Delete this session</button>
          <button className="danger-button" onClick={() => setShowDelete("all")}><RotateCcw size={16} />Reset instrument</button>
        </div>
      </div>
      {showDelete && (
        <div className="confirm-card" role="alertdialog" aria-modal="true" aria-labelledby="delete-title">
          <div><span className="eyebrow">Local deletion</span><h3 id="delete-title">{showDelete === "all" ? "Delete calibration and every session?" : "Delete this session?"}</h3><p>This cannot be undone unless you already exported the evidence.</p></div>
          <div><button className="button button--secondary" onClick={() => setShowDelete(null)}>Keep data</button><button className="button button--danger" onClick={() => showDelete === "all" ? onReset() : onDeleteSession(report.sessionId)}>Delete locally</button></div>
        </div>
      )}
      <p className="report-footnote">GroundSignal reports surface signals. It does not certify route safety, compliance, or accessibility.</p>
    </section>
  );
}
