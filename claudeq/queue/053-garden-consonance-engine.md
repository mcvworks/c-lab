---
task_id: "053"
title: Garden consonance engine
status: queued
priority: 0
requires_approval: false
---

## Objective
Create a hook that analyzes harmonic relationships between planted garden seeds.

## Requirements
- New `useConsonance` hook analyzing frequency ratios between all seeds
- Detect intervals: unison, octave, perfect 5th, 4th, major/minor 3rd, etc.
- Calculate overall garden harmony score (0–100) from ratio simplicity
- Return per-seed consonance data (how well each relates to others)
- Score updates when seeds are added/removed

## Acceptance Criteria
- [ ] Hook returns harmony score 0–100
- [ ] Per-seed consonance data available
- [ ] Detects standard musical intervals
- [ ] Score updates reactively on seed changes
