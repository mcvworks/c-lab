---
task_id: "028"
title: "Composer: isochronal tone mode"
status: queued
priority: 0
requires_approval: false
---

## Objective
Add an isochronal (pulsed) tone mode as an alternative to binaural beats in the Composer. Isochronal tones pulse on/off at the beat frequency and work without headphones.

## Requirements
- Add a mode toggle: **Binaural** vs **Isochronal** in the Composer UI
- In isochronal mode: play a single mono tone that pulses on/off (or loud/soft) at the beat frequency using gain modulation
- Use a GainNode modulated by a low-frequency square-wave OscillatorNode at the beat difference frequency
- The pulse shape should have slight attack/release ramps to avoid harsh clicks
- Show a hint: "Isochronal tones work with speakers — no headphones required"
- Hide stereo-specific controls (stereo width, L/R ear readout) in isochronal mode
- Save mode choice in ComposerSettings

## Acceptance Criteria
- [ ] Binaural/Isochronal toggle appears in Composer
- [ ] Isochronal mode produces audible rhythmic pulsing at the beat frequency
- [ ] Pulses are smooth (no harsh on/off clicks)
- [ ] UI adapts to hide irrelevant stereo controls in isochronal mode
- [ ] Mode saves/loads with presets
