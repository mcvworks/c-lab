---
task_id: "035"
title: "Chladni plate presets by musical interval"
status: queued
priority: 0
requires_approval: false
---

## Objective
Extend the Cymatics screen to support interval-based presets that show interference patterns for two simultaneous frequencies, making consonance and dissonance visually obvious.

## Requirements
- Add an "Intervals" mode or preset section to Cymatics
- Allow selecting a root note and an interval (unison, minor 2nd, major 3rd, perfect 5th, octave, tritone, etc.)
- Generate a composite vibration pattern from both frequencies simultaneously
- The sand plate should show the combined nodal pattern — consonant intervals produce orderly patterns, dissonant ones look chaotic
- Preset buttons for common intervals with labels explaining the ratio
- Optional: animate between intervals so you can watch the pattern morph
- Include a brief educational hint about why some intervals look "cleaner"
- Root note should be adjustable (slider or note picker)

## Acceptance Criteria
- [ ] Can select root note + interval to drive the cymatics plate
- [ ] Dual-frequency interference produces visually distinct patterns per interval
- [ ] Consonant intervals (octave, fifth) look orderly; dissonant intervals look complex
- [ ] At least 6 interval presets available
- [ ] Educational hint explains the relationship
- [ ] Smooth transition when changing intervals
