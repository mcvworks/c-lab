---
task_id: "042"
title: "Tone blending with multi-voice mixing"
status: queued
priority: 0
requires_approval: false
---

## Objective
Add a tone blending mode where 2–3 independent tones can be mixed together, with individual and composite waveform visualization to make additive synthesis tangible.

## Requirements
- 2–3 independent tone voices, each with:
  - Frequency control
  - Waveform selector
  - Volume/amplitude control
  - Mute/solo toggle
- Visualization panel showing:
  - Each individual voice's waveform (small, stacked)
  - The composite/summed waveform (larger, below)
- Audio plays the mixed sum of all active voices
- Changing any voice updates the composite visualization in real time
- Preset combinations showing interesting timbres:
  - "Organ" (fundamental + 2nd + 3rd harmonic)
  - "Bell" (inharmonic ratios)
  - "Chord" (root + major third + fifth)
  - "Dissonance" (two close frequencies beating)
- Teaches additive synthesis intuitively: complex sounds are just sums of simple ones
- Could be a sub-mode of Explore or its own section

## Acceptance Criteria
- [ ] 2–3 tone voices with independent frequency, waveform, and volume
- [ ] Individual waveforms displayed alongside composite
- [ ] Composite waveform updates in real time
- [ ] Mute/solo per voice
- [ ] Preset combinations available
- [ ] Makes additive synthesis intuitive and visual
