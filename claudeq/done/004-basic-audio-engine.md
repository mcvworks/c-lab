---
priority: 0
requires_approval: false
status: running
task_id: '004'
title: Basic Audio Engine for Tone Generation
---


## Objective
Add the first simple audio generation/playback layer for tones used by Explore.

## Requirements
- Implement basic tone playback
- Support:
  - sine
  - square
  - saw
  - triangle
- Wire Explore controls to audio playback state
- Handle start/stop cleanly
- Avoid abrupt clicks/pops where reasonably possible
- Keep architecture extensible for later composer work
- Commit all changes with a clear message referencing the task number
- Push to the remote repository

## Acceptance Criteria
- [ ] Functional tone generator producing audio
- [ ] Explore screen controls affect live playback
- [ ] All 4 waveform types produce distinct sounds
- [ ] Clean start/stop without audio artifacts
- [ ] Changes committed with clear message referencing task number
- [ ] Changes pushed to remote
