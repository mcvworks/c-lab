---
task_id: "023"
title: "Explore: attack/release envelope"
status: queued
priority: 0
requires_approval: false
---

## Objective
Add attack and release envelope controls to the Explore tab so tones/noise fade in on play and fade out on stop instead of instant on/off.

## Requirements
- Add **Attack** slider (0–2 seconds) and **Release** slider (0–2 seconds) to the Explore UI
- On play: ramp master gain from 0 to target over attack duration
- On stop: ramp master gain to 0 over release duration, then actually stop the source
- Use `linearRampToValueAtTime` on web for smooth envelope
- Save attack/release values in ExploreSettings
- Default to small values (attack 0.05s, release 0.1s) so it feels immediate but click-free

## Acceptance Criteria
- [ ] Attack slider controls fade-in time on play
- [ ] Release slider controls fade-out time on stop
- [ ] Long release visibly/audibly fades out
- [ ] Values save/load with presets
- [ ] Defaults feel snappy but smooth
