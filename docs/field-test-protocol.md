# Field-test protocol

This protocol creates honest evidence for the Hacktoberfest submission without
publishing a participant's precise route.

## Before the walk

1. Use the same phone, case, placement, and mobility mode for calibration and audit.
2. Open the deployed HTTPS app on the phone.
3. Capture at least two known surface types; four is preferred.
4. Confirm the app reports at least two calibrated classes.
5. Choose a familiar, lawful route and follow ordinary personal safety practices.

## During the walk

1. Start the audit only while stationary.
2. Pocket or mount the phone in the calibrated position.
3. Travel normally; do not manufacture dangerous movements for the test.
4. Record at least one minute containing a real surface change.
5. Stop from a safe stationary position.

## Evidence to retain

- Screenshot of Pocket Mode with elapsed time.
- Screenshot of the route signature and uncertainty card.
- CSV and JSON exports with `source: sensor`.
- Notes describing surface, weather, phone, placement, and mobility mode.
- Corrections for any visibly wrong or low-confidence segment.

Do not publish raw sensor streams, home locations, or a route trace. The current
build does not collect coordinates. Clearly distinguish the desktop synthetic
demo from real field-test evidence in the submission.
