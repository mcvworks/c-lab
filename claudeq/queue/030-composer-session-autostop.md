---
task_id: "030"
title: "Composer: session timer with auto-stop"
status: queued
priority: 0
requires_approval: false
---

## Objective
Wire the existing duration setting to actually auto-stop the session, with a visible countdown timer and fade-out at the end.

## Requirements
- When a session starts, begin a countdown timer based on the duration setting
- Display elapsed time and remaining time in a visible timer readout on the Composer screen
- When remaining time equals the fade-out duration, begin fading out (ramp master gains to 0)
- When timer reaches 0, stop all playback (binaural + ambient)
- The timer should update at ~1 second intervals (display mm:ss)
- Allow the user to cancel/stop early as they can now
- If duration or fade settings change while playing, adjust the remaining time accordingly

## Acceptance Criteria
- [ ] Timer readout shows elapsed / remaining time during playback
- [ ] Session auto-stops when duration expires
- [ ] Fade-out begins at the correct time before session end
- [ ] Manual stop still works at any time
- [ ] Timer resets when session stops
