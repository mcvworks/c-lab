---
task_id: "022"
title: "Explore: harmonics mix (overtone sliders)"
status: done
priority: 0
requires_approval: false
---

## Objective
Add a harmonics section to Explore that lets users blend in the 2nd, 3rd, and 4th overtones of the current tone, turning a pure sine into a richer timbre.

## Requirements
- Add 3 additional oscillators (2x, 3x, 4x the base frequency) in ToneGenerator, each with its own gain
- Expose three **Harmonic** sliders in the Explore UI (0–100% each), visible only in tone mode
- Each harmonic oscillator tracks the base frequency * its multiplier, and tracks detune
- Smooth-ramp harmonic gains on change
- Save harmonic levels in ExploreSettings preset type
- Keep harmonics section collapsible or in its own card to avoid clutter

## Acceptance Criteria
- [x] Three harmonic sliders appear in tone mode
- [x] Moving a harmonic slider audibly adds that overtone
- [x] Harmonics track frequency and detune changes in real time
- [x] Harmonic values persist in saved presets
- [x] No audio artifacts when adjusting
