---
task_id: "043"
title: "Haptic feedback synced to audio"
status: queued
priority: 0
requires_approval: false
---

## Objective
Add subtle haptic feedback that syncs with low-frequency audio content, making bass tones and rhythmic elements feel physical on supported devices.

## Requirements
- Use device haptic APIs (Expo Haptics or React Native Haptic Feedback)
- Trigger haptic pulses synced to:
  - Low-frequency tones (below ~200 Hz) — subtle continuous vibration
  - Beat frequency in binaural mode — pulse on each beat cycle
  - Amplitude envelope peaks
- Haptic intensity proportional to the bass energy / amplitude
- Must be toggleable (on/off in Settings)
- Should feel subtle and enhancing, not distracting
- Rate-limit haptic triggers to avoid battery drain and motor wear
- Only activate on devices that support haptics (phone/tablet, not web)
- Different haptic patterns for different contexts:
  - Steady low rumble for sustained bass tones
  - Rhythmic taps for binaural beats
  - Gentle pulse for cymatics frequency changes

## Acceptance Criteria
- [ ] Haptic feedback triggers synced to low frequencies
- [ ] Intensity scales with amplitude/bass energy
- [ ] Binaural beat frequency produces rhythmic haptic pulses
- [ ] Toggle in Settings to enable/disable
- [ ] Gracefully disabled on unsupported devices (web)
- [ ] Feels subtle and physical, not annoying
