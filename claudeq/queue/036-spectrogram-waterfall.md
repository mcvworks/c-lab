---
task_id: "036"
title: "Spectrogram waterfall visualization"
status: queued
priority: 0
requires_approval: false
---

## Objective
Add a scrolling spectrogram (waterfall) visualization that shows frequency content over time as a color-mapped heatmap.

## Requirements
- New visualization component: time on Y axis (scrolling down), frequency on X axis, color = intensity
- Uses FFT data from the audio source (Web Audio AnalyserNode)
- Color palette: dark background with warm/cool gradient (e.g., black → blue → cyan → yellow → white)
- Scrolls continuously while audio is playing
- Configurable FFT size for resolution trade-off
- Should clearly show:
  - Fundamental frequency as a bright line
  - Harmonics lighting up as you blend overtones
  - Noise as a broad colorful band
- Can be added as a third visualization option in Explore (alongside Waveform and Spectrum)
- Render via canvas/Skia for performance
- Optional: tap on the spectrogram to see the frequency at that point

## Acceptance Criteria
- [ ] Scrolling spectrogram renders in real time while playing
- [ ] Fundamental and harmonics are clearly visible as distinct bands
- [ ] Noise modes show broadband energy distribution
- [ ] Color mapping is visually appealing and readable
- [ ] Performance stays smooth (target 30+ fps)
- [ ] Integrates naturally with the Explore screen layout
