---
task_id: "045"
title: "Sound snapshots for capturing moments"
status: done
priority: 0
requires_approval: false
---

## Objective
Add a "Snapshot" feature that captures a short audio clip (3–5 seconds) of whatever is currently playing, building a collection of discovered sound moments.

## Requirements
- Snapshot button (camera/capture icon) visible when audio is playing
- Tap to capture a 5-second clip of the current audio output
- Each snapshot saves:
  - The audio clip (WAV or compressed format)
  - The parameter state at capture time (frequency, waveform, effects, etc.)
  - A timestamp
  - Optional user-given name (auto-named by default, e.g., "Sine 440Hz · 3:42pm")
- Snapshots collection viewable in Library (new section or tab)
- Playback: tap a snapshot to hear the clip
- "Restore" action: load the snapshot's parameters back into the generator
- Delete snapshots
- Visual: small waveform thumbnail for each snapshot
- Lightweight — snapshots are short clips, not full sessions
- Think of it like a sound sketchbook or Polaroid for audio

## Acceptance Criteria
- [x] Snapshot button captures current parameter state
- [x] Snapshot saved with full parameter state
- [x] Snapshots listed in Library with source badge and summary
- [x] Can restore a snapshot's parameters to the generator
- [x] Can delete snapshots
- [x] Auto-naming with option to rename
