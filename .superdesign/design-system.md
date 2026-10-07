# GroundSignal design system

## Product context

GroundSignal is a mobile-first, local-first outdoor path auditing tool. A user calibrates their phone, pockets or mounts it during a walk, and reviews a confidence-scored surface report afterward. The interface must communicate scientific credibility, privacy, calm, and safety without feeling clinical or bureaucratic.

Key screens: field dashboard, calibration flow, Pocket Mode recording, analysis progress, session report, segment correction, privacy/export sheet, and an explanatory public landing section.

## Visual direction

Use an earthy, high-end field-journal aesthetic with the discipline of a measurement instrument. Avoid generic wellness gradients, gamified streaks, glass-heavy dashboards, fake maps, and decorative AI imagery. Organic texture may soften the product, but data remains crisp and readable.

### Palette

- Forest ink: `#082C24` — primary text and major surfaces.
- Canopy: `#145A43` — brand and active controls.
- Lichen: `#B8C99A` — secondary surfaces and positive evidence.
- Field paper: `#F4F1E6` — main background.
- Mist: `#E5E9DD` — quiet panels and dividers.
- Safety coral: `#F26B4A` — anomalies, recording state, and warnings only.
- Sun marker: `#E7B84B` — uncertain classifications and calibration prompts.
- Night field: `#06110E` — Pocket Mode.
- White: `#FFFFFF` — high-contrast text on dark controls.

All text/background combinations must meet WCAG AA. Never encode status by color alone.

### Typography

- Display: `Anton`, tightly set, used sparingly for the brand statement and major numeric summaries.
- Interface and body: `Inter`, weights 400, 500, 600, and 700.
- Data labels use Inter uppercase with 0.12em tracking; do not uppercase paragraphs.
- Minimum mobile body size: 16px. Primary controls: 17–18px semibold.

### Shape and texture

- Large field sections use 32–48px radii; cards use 20–28px; controls use 14–18px.
- Add a subtle fixed grain/noise texture at no more than 3% opacity.
- Use thin forest-tinted borders and restrained shadows (`0 18px 50px rgba(8,44,36,.12)`).
- Data charts and route strips use solid strokes and patterns, not neon glows.

## Layout

- Mobile-first at 390px, fluid through tablet and desktop.
- Main content width: 1180px desktop. Phone flows remain visually narrow even on desktop.
- Use generous vertical rhythm and clear section boundaries.
- Sticky bottom action area on mobile with safe-area padding.
- All primary actions must be reachable with one thumb.

## Core components

- **Signal mark:** three unequal vertical waveform strokes inside a rounded square. It must be simple enough to reproduce in CSS/SVG later; no emoji.
- **Primary button:** canopy background, white text, 56px minimum height, large radius, strong focus ring.
- **Field card:** paper or mist background, thin border, editorial title, compact metadata.
- **Confidence chip:** label + numeric confidence + pattern/icon; never color-only.
- **Sensor waveform:** calm live line with a coral event marker and reduced-motion fallback.
- **Route strip:** linear journey visualization using patterned condition bands; do not imply precise turn-by-turn navigation.
- **Pocket Mode:** night-field full viewport, tiny privacy label, central breathing signal ring, elapsed time, large Stop control. No map or feed.

## Motion

- Standard easing: `cubic-bezier(0.16, 1, 0.3, 1)`.
- Page/card reveal: translateY 20px to 0 and opacity 0 to 1 over 500–700ms.
- Recording pulse: 2.4s cycle with opacity and scale only; disable with `prefers-reduced-motion`.
- Buttons compress to 0.98 on press and lift 2px on hover-capable devices.
- Never animate charts in a way that obscures the underlying values.

## Accessibility and safety language

- Say “surface signal,” “field observation,” “likely condition,” and “confidence.”
- Never say “safe route,” “wheelchair accessible,” “guaranteed,” or “verified” based solely on model output.
- Always provide explicit recording, sensor, and location states.
- Provide keyboard support, visible focus, reduced motion, high contrast, and a non-map list view.

## Page-specific direction

### Dashboard

Open with the sentence “The sidewalk told on itself.” Pair it with one primary action: Start a field audit. Show readiness as three concise checks: calibration, sensors, and local storage. Recent sessions appear as tactile field cards, not analytics tiles.

### Calibration

Use a step-by-step outdoor protocol with one instruction per screen. Clearly show mobility mode and phone placement. The user records multiple 20-second labeled samples and sees signal quality, not a distracting live map.

### Pocket Mode

Near-black full screen. The phone is meant to be pocketed. Show recording state, elapsed time, sample health, and a large hold-to-stop control. Accidental taps must not stop recording.

### Report

Lead with an editorial summary, then the route strip, confidence legend, uncertain segments, and interpretable feature explanations. Include correction and export actions. Keep raw-data/privacy information prominent.
