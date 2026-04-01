---
task_id: "024"
title: "Cymatics: waveform selector"
status: queued
priority: 0
requires_approval: false
---

## Objective
Allow the Cymatics tab to use different waveform types (sine, square, saw, triangle) instead of being hardcoded to sine. Different waveforms produce different harmonic content and more complex nodal patterns.

## Requirements
- Add a waveform SegmentedControl to the Cymatics screen (sine/square/saw/tri)
- When playing, set `setWaveform()` on the shared audio store before calling `play()`
- Update the SandPlateView simulation: the Chladni pattern math currently only uses the base frequency — for non-sine waveforms, blend in harmonic mode pairs (e.g., square adds odd harmonics) to approximate richer nodal patterns
- Save waveform choice in cymatics presets
- Update quick presets to include waveform

## Acceptance Criteria
- [ ] Waveform selector appears on Cymatics screen
- [ ] Selecting square/saw/triangle changes the audible tone
- [ ] Sand plate patterns visually differ for different waveforms
- [ ] Waveform saves with cymatics presets
