# GroundSignal product brief

## One sentence

GroundSignal lets a person pocket their phone, walk a path, and turn the motion they physically felt into a transparent, confidence-scored surface report.

## Competition thesis

Most “Touch Grass” apps tell users where to walk or ask for a photograph. GroundSignal makes the walk itself the dataset. The physical world—not the screen—is the primary interface.

## Primary user journey

### 1. Calibrate

The user selects a mobility profile and phone placement, then records short labeled samples on surfaces they know: smooth, rough, unstable, and transition/obstacle. Personal calibration matters because gait, wheels, phone hardware, and placement change the signal.

### 2. Audit

The user starts a session and pockets or mounts the phone. Pocket Mode uses a near-black screen, a single status pulse, optional haptics, and no map. Motion is recorded locally. The MVP deliberately does not request location.

### 3. Analyze

The session is divided into short overlapping windows. GroundSignal extracts interpretable tabular features such as acceleration RMS, jerk, peak-to-peak amplitude, axis energy, gyroscope energy, dominant frequency, and speed consistency. TabPFN predicts the learned surface class and probability distribution for each window.

### 4. Review

The app displays a route strip and anomaly timeline. The user can confirm, correct, or discard uncertain segments. Corrections can become calibration examples only after the user explicitly chooses to add the reviewed signals.

### 5. Export

The user downloads a human-readable field report plus CSV and JSON. Raw sensor data remains local and is not included in these exports.

## Model strategy

- Primary model: TabPFN classification through the official client during the hosted demo.
- Local research path: the open TabPFN implementation for machines with sufficient resources.
- Baseline: deterministic threshold classifier and a conventional tree model for an honest comparison.
- Evaluation: grouped cross-validation by recording session to avoid leakage between adjacent windows.
- Metrics: macro F1, balanced accuracy, confusion matrix, calibration error, inference latency, and abstention rate.
- Safety behavior: abstain when confidence is below threshold; never transform a prediction into a universal accessibility claim.

## Judging narrative

- **Writing quality:** “The sidewalk told on itself” is the central story, supported by a real field experiment and honest failures.
- **Theme:** the app cannot produce useful evidence unless the user goes outside and walks.
- **Creativity:** a phone becomes a pocket seismograph instead of a camera or chatbot.
- **Technical execution:** sensor capture, windowing, interpretable features, small-data classification, uncertainty, offline storage, exports, tests, and deployment.
- **Partner technology:** TabPFN is the core classifier and Render hosts the public experience and analysis API.

## Non-goals and safety

- No claim that a route is safe, ADA-compliant, or accessible for everyone.
- No automated public upload of precise routes.
- No background location collection outside an active session.
- No hidden model confidence or unexplained composite score.
- No synthetic field-test claims in the submission.

## Required evidence before submission

- At least one real outdoor calibration and audit session.
- Screenshots or video of Pocket Mode and the resulting report.
- A small labeled dataset committed without precise personal location.
- Baseline-versus-TabPFN evaluation.
- Model failure examples and user corrections.
- Public repository, deployed demo, architecture diagram, and reproducible setup.
