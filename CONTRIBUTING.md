# Contributing to GroundSignal

GroundSignal welcomes focused improvements to sensor processing, evaluation,
privacy, accessibility, documentation, and field research.

## Development setup

Run the frontend and backend using the commands in `README.md`. Before opening a
pull request, run:

```powershell
cd frontend
npm test
npm run build

cd ..\backend
.\.venv\Scripts\python.exe -m pytest -q
```

## Evidence standards

- Label synthetic data as synthetic.
- Never commit precise personal routes or raw telemetry from another person.
- Explain the device, placement, mobility mode, weather, and surface conditions
  for field results.
- Keep calibration and audit sessions separate during evaluation.
- Report failures and abstentions; do not remove inconvenient examples.
- Do not describe predictions as safety, compliance, or universal accessibility
  determinations.

By participating, you agree to follow the project Code of Conduct.
