# GroundSignal competition handoff

> **Snapshot:** October 7, 2026 (Asia/Calcutta)
> **Repository:** https://github.com/abhijeetnardele24-hash/groundsignal
> **Branch:** `main`
> **Verified implementation commit:** `5efa46c4020040a640e009b9f745e36adcaecf89`
> **Challenge:** Hacktoberfest Open-Source AI Challenge: Week 1 — Touch Grass
> **Deadline:** **October 12, 2026 at 12:29 PM IST** (October 11 at 11:59 PM PDT)
> **Target categories:** Overall, Best Use of Render, Best Use of TabPFN

This is the source of truth for the next agent. Read this file, `README.md`,
`docs/product-brief.md`, `docs/architecture.md`, and
`docs/submission-checklist.md` before changing the project.

## 1. Objective

Finish and submit GroundSignal as a competition-grade, reproducible project.
GroundSignal turns a real outdoor walk into a private, inspectable,
uncertainty-aware surface report. The phone is used as a pocket motion sensor;
the useful experience happens outside, not on the screen.

The winning thesis is:

> The sidewalk told on itself. GroundSignal turns the motion a person physically
> experiences into transparent evidence while keeping raw motion and location
> off the server.

The strongest entry should demonstrate all of the following:

1. A polished product that is simple enough to explain in under three minutes.
2. A real outdoor field test, including honest failure cases and corrections.
3. TabPFN as the primary hosted classifier, with a measured baseline comparison.
4. Render as meaningful production infrastructure, not merely a logo in the post.
5. A clear DEV article. The official rubric weights writing quality most heavily.

## 2. Challenge facts that must not be lost

- Active challenge ID: `79`.
- Canonical challenge page:
  https://dev.to/challenges/hacktoberfest-week1-2026-10-05
- Prompt: build something with open-source AI at its core that gets people off
  the screen and into the world.
- Bonus: take it outside, use it, and explain what happened.
- Judging order: writing quality is weighted most heavily, followed by prompt
  relevance, creativity, technical execution, and optional partner technology.
- Required challenge tag: `#hf26challenge`.
- Only one entry is allowed for this Week 1 challenge.
- The project must be new work created during the challenge window.
- The repository and demo must be accessible to judges before publishing.
- The user is registered for the Week 1 event.
- The user reports that the **$50 Render credit is already claimed**. Treat the
  credit or promo code as sensitive. Never put it in a file, commit, log, issue,
  article, or chat message.
- No relevant event Agent Skills or unclaimed offers were returned by DevRelay
  during the latest check. Do not invent one.

## 3. What is already complete

### Product and UX

- React 19 + TypeScript + Vite installable PWA.
- Mobile-first visual system and a low-distraction Pocket Mode.
- Real `DeviceMotionEvent` capture with explicit permission handling.
- Personal calibration by mobility mode, phone placement, and known surface.
- Four labels: `smooth`, `rough`, `unstable`, and `transition`.
- Overlapping motion windows and interpretable feature extraction.
- Capture-readiness and evidence-quality gates.
- Transparent synthetic judge demo, explicitly marked as synthetic everywhere.
- Prediction probabilities, confidence, and abstention below the threshold.
- Human confirm/correct/discard flow.
- Explicit promotion of reviewed signals into later local calibration.
- IndexedDB session ledger with bounded retention.
- CSV and JSON exports.
- Offline deterministic nearest-centroid fallback when the hosted API is absent.
- No account, identity, precise location, camera, or microphone collection.

### Model and API

- FastAPI service with `/health`, `/v1/model-card`, and `/v1/analyze`.
- Primary competition path through the official `tabpfn-client`.
- Deterministic nearest-centroid baseline for resilience and comparison.
- Strict Pydantic schemas that reject unknown and non-finite fields.
- Bounded request size, inference timeout, and process-level concurrency.
- CORS allowlist and defensive response headers.
- Per-client rate limiting with live `RateLimit-*` budget headers.
- Accurate `Retry-After` on `429` responses.
- Periodic pruning of inactive rate-limit client buckets.
- Report evaluator for macro F1, balanced accuracy, expected calibration error,
  abstention rate, latency, and confusion matrix.

### Repository and delivery foundation

- MIT license.
- `README.md`, architecture, product, field-test, demo, research, contribution,
  conduct, and security documentation.
- GitHub Actions for frontend tests/build/audit and backend tests.
- Render Blueprint at `render.yaml` for the static PWA and FastAPI API.
- Current CI run passed:
  https://github.com/abhijeetnardele24-hash/groundsignal/actions/runs/37616820414
- Latest pushed commit:
  `5efa46c fix: harden inference rate limit contract`.

### Verification already completed

- Frontend: **9 tests passed**.
- Frontend: production PWA build passed.
- Frontend: production npm audit reported **0 vulnerabilities**.
- Backend: **12 tests passed** in an isolated virtual environment.
- Backend: `pip check` reported no broken requirements.
- Local API-backed browser demo passed.
- Local fully offline browser fallback passed.
- Synthetic-data disclosure was visible.
- JSON download passed.
- Prediction review, calibration promotion, and ledger persistence passed.
- Exported reviewed report ran through the baseline evaluator successfully.
- Browser console contained no errors during the smoke flow.

### Security cleanup already performed

A GitHub token had been embedded in a global Git URL rewrite on the development
machine. The rewrite was removed and the repository remote is now the clean URL:

```text
https://github.com/abhijeetnardele24-hash/groundsignal.git
```

The token itself may still be valid in the GitHub credential store. The user
must revoke/rotate it and sign in again after critical pushes are complete. Do
not print, copy, or commit the token.

## 4. Current blockers and remaining work

The code-side MVP is complete. The entry is **not competition-complete** until
the deployment, physical evidence, metrics, media, and DEV article are done.

### P0 — must finish before submission

#### A. Make the repository public

Current GitHub visibility is **PRIVATE**. Judges cannot inspect it yet.

- Change `abhijeetnardele24-hash/groundsignal` to public only when secrets have
  been rechecked.
- Run a final secret scan first.
- Confirm `.env`, tokens, exported private reports, raw sensor captures, and
  screenshots containing personal information are not tracked.
- Add the final public repository URL to the DEV article.

Acceptance criteria:

- An incognito browser can open the repository without authentication.
- A clean clone can complete the documented setup and demo path.

#### B. Deploy the Render Blueprint

Use the existing root-level `render.yaml`. It defines:

- `groundsignal`: global-CDN static frontend.
- `groundsignal-api`: Python/FastAPI web service.
- `/health` as the API health check.
- TabPFN as the production model provider.

Recommended deployment order:

1. In Render, create a new Blueprint from the GitHub repository.
2. Choose the API region deliberately. For a live demo operated from India,
   **Singapore** is the practical low-latency default. Render service regions
   cannot be changed in place later; changing region requires a new service.
3. Use the claimed credit for an **always-on paid API instance** during judging.
   Avoid a sleeping/free API for the submission because cold-start delay can
   make the first judge interaction look broken.
4. Keep the frontend as a Render static site; it is served through Render's
   global CDN.
5. Enter secrets only in the Render dashboard. Never write values into YAML.

Required frontend environment value:

```text
VITE_API_URL=https://<groundsignal-api-host>.onrender.com
```

Required API environment values:

```text
TABPFN_TOKEN=<secret value in Render only>
ALLOWED_ORIGINS=https://<groundsignal-frontend-host>.onrender.com
```

These are already set safely in the Blueprint and normally do not need changes:

```text
ENVIRONMENT=production
MODEL_PROVIDER=tabpfn
MAX_CONCURRENT_ANALYSES=2
PYTHON_VERSION=3.11.9
```

Important Blueprint behavior:

- `sync: false` prompts for a value only during initial Blueprint creation.
- Later Blueprint syncs ignore newly added `sync: false` values; add or update
  those secrets manually in the existing Render service.
- Render does not interpolate variables inside `render.yaml`.
- The frontend URL must be exact in `ALLOWED_ORIGINS`; do not include a trailing
  slash and do not use `*`.
- The API URL is compiled into the Vite bundle, so changing `VITE_API_URL`
  requires a frontend rebuild/deploy.

Recommended small Blueprint improvement before deployment:

```yaml
autoDeployTrigger: checksPass
```

Add it to both services so Render deploys only after GitHub checks pass. Verify
that the connected Git provider exposes check status to Render before relying
on it.

Do not add a database, user accounts, queues, or background workers for this
submission. They add cost and failure modes without improving the rubric.

Acceptance criteria:

- Both Render deploys are green.
- `GET https://<api>/health` returns `200`, `status: ok`, and provider `tabpfn`.
- `GET https://<api>/v1/model-card` returns the expected boundary and model card.
- A real `POST /v1/analyze` succeeds. A green health check alone is insufficient
  because it does not prove that the TabPFN token and hosted inference work.
- The frontend uses the deployed API and displays `tabpfn` in the report.
- Browser CORS has no errors.
- HTTPS sensor permission works on a physical phone.
- Install PWA, reload, switch to airplane mode, and confirm the shell and local
  fallback still work.
- Check Render logs for secrets, stack traces, request bodies, and raw motion.
  None should appear.
- Measure first-request and warm-request latency; record p50/p95 if possible.
- Confirm the per-client rate limiter behaves correctly behind Render's proxy.
  Multiple judges must not accidentally share one rate-limit bucket.
- Keep API responses `no-store`; do not edge-cache user-derived feature data.

#### C. Perform a real phone field test

This is the most important missing product evidence.

1. Use the deployed HTTPS PWA on Android Chrome and/or iPhone Safari.
2. Keep the phone placement unchanged for calibration and audit.
3. Calibrate at least two genuinely different known surfaces.
4. Record a real outdoor route containing at least one transition or rough patch.
5. Review every evaluation window that will be used as ground truth.
6. Export JSON and CSV.
7. Remove location clues, names, and other sensitive context before publishing.
8. Capture one honest failure or uncertain prediction and explain the correction.

Do not claim a synthetic demo is a field test. Do not claim universal safety,
ADA compliance, or general accessibility.

Acceptance criteria:

- A reproducible field report exists.
- The report includes strong or honestly discussed evidence quality.
- At least one correction or abstention is shown and explained.
- No precise route or private raw motion is published.

#### D. Run baseline-versus-TabPFN evaluation

After human review, run:

```powershell
cd backend
$env:TABPFN_TOKEN = "<session-only secret>"
python -m scripts.evaluate_report path\to\reviewed-report.json --provider both
Remove-Item Env:TABPFN_TOKEN
```

Report at minimum:

- Number of reviewed evaluation windows.
- Macro F1.
- Balanced accuracy.
- Expected calibration error.
- Abstention rate.
- Latency.
- Confusion matrix.

Use calibration and audit windows from separate parts of the session. Do not
score calibration rows as if they were unseen test data. With a tiny dataset,
describe the numbers as field evidence, not as a general benchmark.

#### E. Capture submission media

Required media set:

- Hero screenshot of the dashboard.
- Calibration screenshot.
- Pocket Mode screenshot on a real phone.
- Final report and route signature screenshot.
- Human correction/abstention screenshot.
- Render dashboard screenshot showing the two healthy services. Hide secrets,
  billing, account identifiers, deploy hooks, and promo codes.
- 60–90 second demo video.

Suggested video sequence:

1. 0–10 s: the problem and privacy promise.
2. 10–25 s: calibrate on known surfaces.
3. 25–40 s: pocket the phone and walk outside.
4. 40–60 s: show TabPFN probabilities and abstention.
5. 60–75 s: correct a segment and export evidence.
6. 75–90 s: show Render deployment and close with the limitation.

#### F. Write and publish the DEV submission

The article is not secondary; it is the most heavily weighted artifact.

Recommended structure:

1. Hook: “The sidewalk told on itself.”
2. The real-world problem and target user.
3. Why the screen is intentionally the shortest part of the experience.
4. What was built, with a short GIF/video near the top.
5. Architecture diagram and privacy boundary.
6. Why open/replaceable AI matters.
7. Why TabPFN fits personal few-shot tabular calibration.
8. How Render makes the public PWA and bounded API reproducible.
9. Real field-test method and results.
10. Failure cases, abstention, and human corrections.
11. Baseline-versus-TabPFN table.
12. What was deliberately not built.
13. Repository, live demo, video, and reproducibility links.
14. Honest AI-assistance disclosure.

Required submission actions:

- Use the official Week 1 submission template.
- Include `#hf26challenge` plus up to three relevant tags.
- Select Best Use of Render and Best Use of TabPFN only if both are genuinely
  demonstrated in the live project and article.
- Explain how Render is used: static CDN frontend, managed Python API, TLS,
  health checks, secret configuration, CI-gated deploys, and logs/metrics.
- Explain why TabPFN is core: it learns from the user's small personal tabular
  calibration set and returns probabilities used by the abstention flow.
- Publish before **October 12, 2026 at 12:29 PM IST**. Do not wait for the final
  minute; target at least six hours early.

### P1 — high-value competition polish

- Run a clean-clone rehearsal at the exact submitted commit.
- Test deployment from an incognito desktop browser and a physical phone.
- Add deployment URLs and field results to `README.md`.
- Update `docs/submission-checklist.md` as evidence is produced.
- Record Render build time, API first-request latency, and warm latency.
- Confirm the paid Render instance remains active through judging.
- Add a compact results table to the README only after real measurements exist.
- Test a denied sensor-permission path and unsupported-device path.
- Test airplane-mode reload after the service worker has been installed once.
- Confirm CSV values open correctly in spreadsheet software.
- Check mobile layout at narrow width and with larger text settings.
- Run Lighthouse for performance, PWA, accessibility, and best practices.
- Add alt text/captions for every article image and video.
- Save or link the agent session if it strengthens the build-process narrative.

### P2 — optional only if P0 is complete

- Add a minimal public sample report containing only derived, anonymized data.
- Add a tiny reproducible benchmark fixture for the article.
- Add a status badge or live-demo badge after deployment is stable.
- Consider preview environments only if they do not consume the remaining time.

Do not spend remaining challenge time on accounts, social features, route maps,
leaderboards, a generic chatbot, or a large design rewrite.

## 5. Render performance and reliability strategy

The project should use Render visibly and responsibly:

| Concern | Decision |
| --- | --- |
| Static delivery | Render static site/global CDN |
| API hosting | Render Python web service |
| TLS | Render-managed HTTPS |
| Readiness | HTTP `/health` check |
| Deploy safety | Prefer `autoDeployTrigger: checksPass` |
| Secrets | Render dashboard, `sync: false`, never Git |
| Region | Singapore for India-operated demo unless measured evidence favors another region |
| Cold starts | Use claimed credit for an always-on paid instance during judging |
| Concurrency | Keep the bounded application semaphore; benchmark before increasing |
| Workers | Start with one Uvicorn process; extra workers duplicate in-memory limits and model clients |
| Caching | CDN for static files; `no-store` for inference responses |
| Observability | Render logs/metrics plus client-measured latency; no private request payload logging |
| Rollback | Preserve last known-good deploy and verify health before routing traffic |

Do not optimize from guesses. Record a warm-up request, then measure several
real inference requests. If latency or memory is poor, inspect Render metrics and
TabPFN client behavior before changing worker counts or instance size.

## 6. Exact verification commands

Run these from a clean checkout before the final push.

Frontend:

```powershell
cd frontend
npm ci
npm test
npm run build
npm audit --omit=dev --registry=https://registry.npmjs.org/
```

Backend:

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -e ".[test]"
python -m pytest -q
python -m pip check
```

Local services:

```powershell
# Terminal 1
cd backend
.\.venv\Scripts\Activate.ps1
uvicorn app.main:app --reload

# Terminal 2
cd frontend
npm ci
Copy-Item .env.example .env
npm run dev
```

Post-deploy smoke checks:

```powershell
Invoke-RestMethod https://<api-host>/health
Invoke-RestMethod https://<api-host>/v1/model-card
```

The final API proof must also send one valid analyze payload through the UI or a
script. Health and model-card requests do not verify hosted inference.

## 7. Known risks

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Repository remains private | Invalid/unverifiable entry | Secret scan, then make public |
| TabPFN token missing or rejected | Live demo silently uses baseline | Smoke real analyze call and verify provider label |
| CORS origin typo | Frontend appears broken | Use exact HTTPS frontend origin, no trailing slash |
| Sleeping or under-sized API | Judge sees timeout | Use paid always-on instance and benchmark |
| Render proxy collapses client identity | Judges share rate limit | Test from separate clients/networks; inspect headers/logs |
| Sensor/browser differences | Real capture fails | Test Android/iPhone over deployed HTTPS |
| Weak calibration coverage | Misleading predictions | Follow readiness gate and recapture weak surfaces |
| Tiny evaluation set | Inflated metrics | Publish sample count, uncertainty, and limitations |
| Private route clues in evidence | Privacy harm | Publish derived/anonymized evidence only |
| Token remains valid after plaintext exposure | Account compromise | Revoke/rotate GitHub token and reauthenticate |
| Article rushed at deadline | Loses highest-weight criterion | Draft early and publish at least six hours before close |

## 8. Definition of done

Do not mark the project complete until every item below is true:

- [ ] Repository is public and secret-scanned.
- [ ] Render frontend and API are deployed and healthy.
- [ ] Claimed Render credit is applied without exposing its code.
- [ ] API is always-on for the judging period.
- [ ] Hosted report explicitly shows `tabpfn`.
- [ ] Real phone sensor capture works over HTTPS.
- [ ] Offline reload and fallback work after installation.
- [ ] Real outdoor field evidence is collected and reviewed.
- [ ] Baseline-versus-TabPFN results are recorded honestly.
- [ ] Screenshots and demo video are complete and privacy-reviewed.
- [ ] README contains public repo, live demo, evidence, and limitations.
- [ ] DEV article follows the official template and tells a coherent story.
- [ ] Best Use of Render and Best Use of TabPFN are genuinely demonstrated.
- [ ] Submission uses `#hf26challenge` and is published before the deadline.
- [ ] Final GitHub Actions run is green at the submitted commit.
- [ ] Incognito clean-start rehearsal passes.
- [ ] Exposed GitHub token is revoked/rotated.

## 9. Recommended next-agent execution order

1. Re-read the files named at the top of this handoff.
2. Secret-scan the repository and inspect `git status`.
3. Add and test `autoDeployTrigger: checksPass` if Render/GitHub integration
   supports it.
4. Deploy the Blueprint and configure only dashboard-managed secrets.
5. Perform API, CORS, provider-label, proxy-rate-limit, and offline smoke tests.
6. Perform the real phone field test.
7. Review the report and run both evaluators.
8. Capture screenshots and video.
9. Update README and the submission checklist with only verified claims.
10. Make the repository public.
11. Draft the DEV article, audit it against the official rubric, and get user
    approval before publishing.
12. Publish early, then verify every public link in incognito mode.

## 10. Copy-paste prompt for the next agent

```text
Continue the GroundSignal Hacktoberfest Week 1 project from PROJECT_HANDOFF.md.
Read PROJECT_HANDOFF.md, README.md, docs/product-brief.md,
docs/architecture.md, docs/field-test-protocol.md, docs/demo-script.md, and
docs/submission-checklist.md before acting. The code-side MVP is complete and
main is green at commit 5efa46c. Prioritize a competition-grade Render
deployment, real phone field evidence, baseline-versus-TabPFN metrics, demo
media, and the DEV submission. Preserve the privacy boundary, uncertainty,
offline fallback, and safety language. Do not add scope that is not tied to the
rubric. Never write tokens, Render credit codes, or private evidence into the
repository. Verify every claim locally and on the deployed HTTPS app, update
this handoff as facts change, commit focused changes, push main, and confirm CI.
```

## 11. References

Official/current references:

- Challenge page:
  https://dev.to/challenges/hacktoberfest-week1-2026-10-05
- Render Blueprint specification:
  https://render.com/docs/blueprint-spec
- Render FastAPI deployment:
  https://render.com/docs/deploy-fastapi
- Render environment variables and secrets:
  https://render.com/docs/configure-environment-variables
- Render health checks:
  https://render.com/docs/health-checks
- Render regions:
  https://render.com/docs/regions
- Render uptime practices:
  https://render.com/docs/uptime-best-practices

Community checks used for this handoff:

- FastAPI/Render production guidance:
  https://dev.to/ayush_kumar_085a0f2c54e3f/mastering-fastapi-deployment-on-render-from-docker-to-cicd-scaling-cost-effective-tips-497i
- Clean-checkout hackathon rehearsal:
  https://dev.to/stavleak-hackathons/the-commit-is-correct-why-does-the-hackathon-demo-fail-on-a-clean-checkout-5273

Both community articles had no comments at the time checked, so there was no
comment-thread counter-evidence to incorporate. Treat official Render docs as
authoritative where any community post differs.
