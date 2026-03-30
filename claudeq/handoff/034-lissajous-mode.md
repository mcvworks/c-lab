# Handoff
- Task: 034 — Lissajous figure visualization
- Status: done
- Summary: Added a Lissajous curve visualization to the Explore screen with dual frequency controls, phase offset, trail persistence, ratio presets, and optional sync to the active tone generator.
- Files Changed:
  - `src/components/LissajousView.tsx` — new SVG-based Lissajous figure renderer with requestAnimationFrame animation, trailing history buffer, crosshair guides, and leading dot
  - `src/components/index.ts` — exported LissajousView
  - `app/(tabs)/explore.tsx` — added LISSAJOUS section with ON/OFF toggle, ratio presets (1:1, 2:1, 3:2, 4:3, 5:4, 3:1), Sync A to Tone toggle, Freq A/B sliders, phase slider, trail length slider
- Commands Run: `npx tsc --noEmit` — clean build
- Testing:
  1. Open Explore tab, scroll to LISSAJOUS section
  2. Toggle ON — figure should start drawing immediately
  3. Tap ratio presets (1:1, 2:1, 3:2, etc.) — clean, recognizable patterns
  4. Adjust Freq A and Freq B sliders — figure morphs in real time
  5. Slowly detune one frequency by 1-2 Hz — classic rotating/morphing effect
  6. Adjust Phase slider — figure rotates/distorts
  7. Adjust Trail slider — shorter = sharper line, longer = fuller figure
  8. In tone mode, toggle "Sync A to Tone" ON — Freq A tracks the tone generator frequency
  9. Change the main tone frequency — Lissajous Freq A follows
  10. Color shifts based on ratio simplicity (green for simple, blue for moderate, violet for complex)
- Blockers: none
- Next Recommended Task: 035 (Chladni interval presets)
- Notes:
  - The Lissajous is purely visual — it doesn't generate audio, it visualizes frequency relationships
  - The figure runs its own animation loop independent of audio playback (isPlaying=lissajousEnabled)
  - Trail buffer is cleared when frequencies change by >5 Hz to start fresh
  - Ratio presets scale Freq B relative to Freq A to maintain the relationship
