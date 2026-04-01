---
task_id: "031"
title: "Composer: dual-frequency waveform visualization"
status: queued
priority: 0
requires_approval: false
---

## Objective
Add a waveform visualization to the Composer binaural section that shows both the left and right ear frequencies overlaid on the same graph, making the beat difference visually obvious.

## Requirements
- Add a new visualization card in the Composer screen, positioned below the ear frequency readout (under the L/R Hz numbers)
- Render both sine waves (left freq and right freq) on the same canvas/SVG
- Left wave in one color (e.g., accent/blue), right wave in another (e.g., highlight/warm)
- The visual beat (amplitude envelope of the sum) should be apparent — the waves drift in and out of phase
- Include a subtle combined/sum wave or interference envelope line to show the perceived pulsing
- Animate when playing, show static preview when stopped
- Keep it compact — similar height to the Explore waveform view
- Use the existing WaveformView as reference but this needs a custom dual-wave renderer

## Acceptance Criteria
- [ ] Dual waveform card appears in Composer below the ear readout
- [ ] Left frequency wave renders in one color, right in another
- [ ] Beat interference pattern is visually obvious
- [ ] Animates during playback, static preview when stopped
- [ ] Responsive sizing (phone + tablet)
- [ ] Legend or labels identify L/R waves
