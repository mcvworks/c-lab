---
task_id: "041"
title: "Binaural journey with gradual state transitions"
status: queued
priority: 0
requires_approval: false
---

## Objective
Add a "Journey" mode to the Composer that creates a timed session where binaural beat frequency gradually transitions between brain wave states (e.g., beta → alpha → theta → delta).

## Requirements
- Simple journey builder — not a full DAW timeline, just:
  - Pick a start state (e.g., Beta: 14–30 Hz beat)
  - Pick an end state (e.g., Theta: 4–8 Hz beat)
  - Set total duration (10–60 minutes)
- The beat frequency smoothly interpolates from start to end over the session
- Predefined journey templates:
  - "Focus → Relax" (Beta → Alpha, 20 min)
  - "Wind Down" (Alpha → Theta, 30 min)
  - "Deep Rest" (Alpha → Delta, 45 min)
  - "Wake Up" (reverse: Theta → Beta, 15 min)
- Visual timeline bar showing current position and state zones
- Ambient layers can play alongside the binaural journey
- Session auto-stops at the end with a gentle fade-out
- Progress indicator showing elapsed time and current beat frequency
- Can be saved as a preset
- Neutral, educational tone — no medical claims about brain states

## Acceptance Criteria
- [ ] Can configure start state, end state, and duration
- [ ] Beat frequency smoothly transitions over the session
- [ ] At least 3 predefined journey templates
- [ ] Visual timeline shows progress and current state
- [ ] Session auto-stops with fade-out at completion
- [ ] Ambient layers work alongside the journey
- [ ] No medical claims in UI copy
