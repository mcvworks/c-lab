---
task_id: "044"
title: "True OLED dark theme"
status: done
priority: 0
requires_approval: false
---

## Objective
Add a true-black OLED theme option so visualizations glow against a pure black background, maximizing contrast and saving battery on OLED screens.

## Requirements
- New theme variant: "OLED" alongside the existing dark theme
- Background: pure #000000 black
- Surface/card colors: very dark grays (#0A0A0A, #111111) instead of current charcoal
- Keep accent colors and glows — they should pop even more against true black
- Visualization backgrounds: pure black so waveforms and cymatics glow
- Sand plate particles on black should look stunning
- Theme toggle in Settings: Dark / OLED
- All existing components respect the theme (Screen, Card, buttons, sliders, text)
- Smooth transition when switching themes (or instant is fine)
- Reduce any background blur/overlay opacity to maintain the pure black feel
- Test that text and controls remain readable against pure black

## Acceptance Criteria
- [ ] OLED theme option in Settings
- [ ] Pure black backgrounds throughout the app
- [ ] Visualizations glow against true black
- [ ] All UI components readable and functional
- [ ] Cards and surfaces use very dark grays, not charcoal
- [ ] Sand plate / cymatics look stunning on black
