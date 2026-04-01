---
task_id: "027"
title: "Composer: carrier waveform and stereo width"
status: queued
priority: 0
requires_approval: false
---

## Objective
Add carrier waveform selection and stereo width control to the Composer binaural beat section.

## Requirements
- **Carrier waveform**: SegmentedControl for sine/triangle/soft-square. Change the OscillatorNode type for both L/R oscillators in BinauralGenerator. Sine is classic; triangle and square have different tonal character.
- **Stereo width** slider (0–100%): controls the gain balance between center-mixed and hard-panned L/R signals. At 0% both ears hear both tones (no binaural effect); at 100% full separation (current behavior). Implement via crossfading between the merger output and a mono-summed path.
- Smooth-ramp all changes
- Save carrier waveform and stereo width in ComposerSettings

## Acceptance Criteria
- [ ] Carrier waveform selector appears in binaural section
- [ ] Triangle and square carriers sound audibly different
- [ ] Stereo width slider changes perceived spatial separation
- [ ] 0% width = mono, 100% = full binaural separation
- [ ] Settings save/load in presets and export
