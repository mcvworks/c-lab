---
task_id: "040"
title: "Generative drift mode for ambient wandering"
status: done
priority: 0
requires_approval: false
---

## Objective
Add a "Drift" mode where audio parameters slowly wander on their own within user-defined bounds, creating an evolving ambient soundscape for passive listening.

## Requirements
- Toggle to enable drift mode (could be in Explore or Composer)
- User sets bounds for each parameter:
  - Frequency range (e.g., 200–400 Hz)
  - Amplitude range (e.g., 0.3–0.6)
  - Pan range
  - Waveform cycling (optional — slowly morph between waveforms)
- Parameters wander using smooth random walks (Perlin noise or similar)
- Drift speed control: how fast parameters change (slow/medium/fast or a single rate slider)
- Visualizations update in real time as parameters drift
- "Breathing" amplitude pattern option: smooth sine-wave amplitude modulation
- Should feel organic and meditative, not random or jarring
- All changes should be smooth (use existing ramp infrastructure)
- Optional: drift multiple tone seeds if combined with drone garden

## Acceptance Criteria
- [x] Drift mode can be toggled on/off
- [x] Parameters wander smoothly within defined bounds
- [x] Drift speed is adjustable
- [x] Audio changes are smooth and click-free
- [x] Visualizations reflect the drifting parameters
- [x] Feels organic and suitable for background ambient listening
