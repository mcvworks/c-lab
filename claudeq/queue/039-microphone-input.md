---
task_id: "039"
title: "Microphone input for live visualization"
status: queued
priority: 0
requires_approval: false
---

## Objective
Add a microphone input mode that captures live audio from the device mic and feeds it into the existing visualizations (waveform, spectrum, cymatics, spectrogram).

## Requirements
- New source mode: "Mic" alongside Tone and Noise
- Request microphone permission with a clear explanation of why
- Capture audio via Web Audio `getUserMedia` + `MediaStreamSource`
- Route mic input through the same AnalyserNode used for visualizations
- All existing visualizations should work with mic input:
  - Waveform shows the live audio waveform
  - Spectrum shows frequency content of voice/instrument
  - Cymatics reacts to the dominant frequency of the input
  - Spectrogram (if built) shows the mic signal over time
- No audio output by default (avoid feedback loops) — mic is visualization-only
- Optional: pitch detection to show the detected note name
- Latency should be low enough to feel real-time
- Privacy-conscious: clear indicator when mic is active, easy to turn off
- Works on web and native (platform-appropriate mic APIs)

## Acceptance Criteria
- [ ] Mic mode captures live audio and feeds visualizations
- [ ] Waveform and spectrum display mic input in real time
- [ ] Cymatics responds to mic audio
- [ ] Microphone permission requested with explanation
- [ ] Clear visual indicator when mic is active
- [ ] No audio feedback loops (mic doesn't route to speakers)
- [ ] Whistle/hum and see the frequency on visualizations
