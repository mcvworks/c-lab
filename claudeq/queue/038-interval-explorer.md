---
task_id: "038"
title: "Interval explorer with beat frequency visualization"
status: queued
priority: 0
requires_approval: false
---

## Objective
Add an Interval Explorer mode that plays two tones simultaneously, visualizes the beating between them, and teaches how intervals and beat frequencies work.

## Requirements
- Two independent tone generators with separate frequency controls
- Display both waveforms individually and their combined/interference waveform
- Show the beat frequency (|f1 - f2|) numerically and visually as a pulsing envelope
- When frequencies are close (e.g., 440 Hz and 442 Hz), the beating should be clearly audible and visible
- Interval name detection: display the musical interval when frequencies form a known ratio (unison, minor 3rd, perfect 5th, etc.)
- Preset interval buttons: unison, octave, fifth, fourth, major/minor third, tritone
- "Near-unison" preset to demonstrate audible beating
- Visual: overlay showing the amplitude envelope of the combined signal
- Could live as a sub-mode in Explore or as its own section
- Educational hints explaining what beat frequency is and why piano tuners listen for "wobble"

## Acceptance Criteria
- [ ] Two tones play simultaneously with independent frequency controls
- [ ] Beat frequency is calculated and displayed
- [ ] Beating is audible and visually shown as amplitude pulsing
- [ ] Interval name shown when frequencies form a recognized ratio
- [ ] Preset buttons for common intervals
- [ ] Educational content explains the phenomenon
