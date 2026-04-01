# Handoff
- Task: 039 — Microphone input for live visualization
- Status: done
- Summary: Added a "Mic" source mode to the Explore tab that captures live audio from the device microphone via Web Audio getUserMedia and routes it through an AnalyserNode for real-time visualization. All three visualization components (Waveform, Spectrum, Spectrogram) now accept an optional `analyserNode` prop and render real audio data when provided, falling back to synthetic generation otherwise. Includes autocorrelation-based pitch detection showing detected frequency and musical note name with cents offset.
- Files Changed:
  - `src/audio/MicrophoneEngine.ts` — new engine: getUserMedia capture, AnalyserNode routing (no speaker output), pitch detection via autocorrelation, freqToNote helper
  - `src/audio/types.ts` — extended SourceMode to include `'mic'`
  - `src/audio/index.ts` — export MicrophoneEngine and freqToNote
  - `src/components/WaveformView.tsx` — added optional `analyserNode` prop, reads getByteTimeDomainData for real waveform rendering
  - `src/components/SpectrumView.tsx` — added optional `analyserNode` prop, reads getByteFrequencyData for real spectrum bars
  - `src/components/SpectrogramView.tsx` — added optional `analyserNode` prop, generates real spectrogram rows from analyser data
  - `src/state/useAudioStore.ts` — play/stop handle mic mode (no ToneGenerator interaction)
  - `app/(tabs)/explore.tsx` — integrated mic mode: source mode selector, mic engine lifecycle, analyserNode passing to visualizations, pitch/note display, red dot active indicator, mic-specific controls section, hides irrelevant controls (stereo/envelope/space) in mic mode
- Commands Run: `npx tsc --noEmit` — clean compile
- Testing:
  1. Run `npx expo start --web`
  2. Go to Explore tab
  3. In SOURCE section, select "Mic"
  4. Press "Start Mic" — browser will prompt for microphone permission
  5. Grant permission — red dot "Microphone active" indicator appears
  6. Whistle or hum — waveform shows live audio shape, spectrum bars react, spectrogram scrolls with real frequency data
  7. Detected frequency and note name should update in real time (e.g., "440 Hz" / "A4 +0¢")
  8. Press Stop — mic stops, visualizations go quiet
  9. Switch back to Tone/Noise — original synthetic visualizations work as before
- Blockers: None
- Next Recommended Task: 040 (generative drift) or other queued tasks
- Notes: Web-only (uses Web Audio getUserMedia). Echo cancellation and noise suppression are disabled for accurate visualization. The mic signal is visualization-only — no audio routes to speakers, preventing feedback loops. Stereo/Envelope/Space controls are hidden in mic mode since they don't apply.
