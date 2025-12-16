# Pulse — Multi-Mode Typography (Vite + React + Canvas + opentype.js)

Interactive typography experiment with multiple deformation modes. Deformations happen point-by-point across glyph paths for readable, expressive motion.

## Tech
- Vite + React + TypeScript
- Canvas 2D rendering
- opentype.js for font loading and glyph path access
- 100% client-side

## Quick start
1. Install dependencies:
   ```bash
   npm install
   ```
2. Start dev server:
   ```bash
   npm run dev
   ```
3. Open the app (browser should open automatically). If default font fails to load, upload a `.ttf`/`.otf`/`.woff(.2)` via the font picker.

## Modes and Controls
- Mode dropdown (top bar): Simple ScaleX | Rubber Wave | Envelope Pulse
- Shared (top bar): Font upload + status, text input, font size, play/pause, reset current mode, center toggle, debug overlay, trail, color/background.

### Simple ScaleX
- Each letter scales horizontally based on a traveling sine across letters.
- Controls: Amplitude, Speed, Intensity, Wavelength (rad/letter), Min/Max ScaleX clamps.

### Rubber Wave
- Organic wave passes through glyph outlines (horizontal-only).
- Controls: Amplitude (px), Speed (rad/s), Intensity, Letter Phase, Intra-glyph Phase, Pinning, Sharpness, Clamp max dx (px).

### Envelope Pulse
- A pulse “bump” travels left↔right across the word; letters stretch when the pulse passes.
- Controls: Amplitude (px), Speed (px/s), Intensity, Sigma (px), Sharpness, Clamp max dx (px).

## Model
For each glyph path point `(px, py)` (in glyph-local coords):
- Normalize local x: `u = (px - minX) / (maxX - minX)` (with width epsilon).
- Phase: `phase = (i * letterPhase) + (u * intraGlyphPhase) - (t * speed * dir)`.
- Base wave: `w = sin(phase)` then optional sharpness: `sign(w) * |w|^sharpness`.
- Falloff: `falloff = lerp(1, smoothstep(0,1,u), pin)`.
- Displacement: `dx = clamp(w * amplitude * intensity * falloff, -maxDx, maxDx)`.
- Apply: `px' = px + dx`, `py' = py`.

Spacing is stable: layout uses original advances and kerning; only outlines deform.

## Files
- `src/lib/font.ts` — Font loading, text layout (glyphs, commands, bboxes)
- `src/lib/render.ts` — `renderGlyphs(ctx, layout, transformFn, opts)`
- `src/lib/deformSimple.ts` — Simple ScaleX transform
- `src/lib/deformRubber.ts` — Rubber Wave transform
- `src/lib/deformEnvelope.ts` — Envelope Pulse transform
- `src/components/CanvasPreview.tsx` — Canvas + rAF loop, mode routing
- `src/components/ControlsPanel.tsx` — Per-mode controls + shared controls
- `src/App.tsx` — Mode switching, shared state, font upload, layout
### Disperse Style (new)
- `src/modes/disperse/types.ts` — config and particle types
- `src/modes/disperse/buildMask.ts` — offscreen glyph masks + edge detection (cached)
- `src/modes/disperse/particleize.ts` — grid sampling + edge-biased weighted selection
- `src/modes/disperse/targets.ts` — deterministic target generation with salt
- `src/modes/disperse/animate.ts` — traveling envelope and swirl
- `src/modes/disperse/render.ts` — particle rendering and overlays
- `src/modes/disperse/ControlsDisperse.tsx` — UI controls

## Notes
- Default font loaded from Google; if blocked, upload a font file.
- Performance: draws directly to canvas with per-point displacement; no arrays allocated per frame for commands. BBoxes and commands are cached per glyph and recomputed only when font/text/size change.

## License
MIT (fonts you load remain under their own licenses).


