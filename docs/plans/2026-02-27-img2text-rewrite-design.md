# Img2Text Rewrite — Design Document

**Date**: 2026-02-27
**Status**: Approved

## Goals

Rewrite Img2Text to be:
1. **Fast** — non-blocking image processing, minimal DOM operations
2. **Readable** — TypeScript, modular architecture, pure functions
3. **Maintainable** — pluggable palette system, separated concerns, unit tests
4. **Beautiful** — polished editor UI with side-by-side layout, drag-drop, live preview

## Tech Stack

- **Language**: TypeScript (strict mode)
- **Build**: Vite (dev server + production bundler)
- **Runtime dependencies**: Zero (vanilla DOM, no framework)
- **Dev dependencies**: vite, typescript, vitest (for tests)
- **Deployment**: GitHub Pages (deploy `dist/`)

## Architecture

### Module Structure

```
src/
  index.ts                — Entry: wire up UI, register events
  core/
    image-processor.ts    — Canvas pixel extraction, resize logic
    quantizer.ts          — Grayscale/RGB quantization (pure functions)
    edge-detect.ts        — Sobel filter edge detection
    dither.ts             — Floyd-Steinberg dithering
    converter.ts          — Orchestrates: image -> pixel matrix -> character grid
  workers/
    process.worker.ts     — Web Worker: receives ImageData, returns character grid
  palettes/
    types.ts              — Palette interface definition
    ascii.ts              — Classic ASCII characters
    ascii-detailed.ts     — Extended ASCII characters
    bw-emoji.ts           — Black/white emoji palette (migrated)
    rgb-emoji.ts          — RGB emoji palette (migrated)
    skin-tones.ts         — Skin tone emoji palette (migrated)
    index.ts              — Palette registry
  renderers/
    text-renderer.ts      — Character grid -> plain text string
    dom-renderer.ts       — Character grid -> styled DOM (single innerHTML)
    canvas-renderer.ts    — Character grid -> canvas (for PNG export)
  ui/
    drag-drop.ts          — Drag-and-drop file handling
    controls.ts           — Settings panel (width, palette, font size, toggles)
    preview.ts            — Original image preview
    export.ts             — Copy, download .txt, save PNG
    layout.ts             — Side-by-side responsive layout, dark mode toggle
    loading.ts            — Loading/processing state indicator
  styles/
    main.css              — Global styles, CSS custom properties, dark/light themes
    controls.css          — Settings panel styles
    output.css            — ASCII output area styles
tests/
  quantizer.test.ts       — Unit tests for quantization
  converter.test.ts       — Unit tests for image-to-text pipeline
  edge-detect.test.ts     — Unit tests for edge detection
  dither.test.ts          — Unit tests for dithering
```

### Data Flow

```
File input / drag-drop
  -> URL.createObjectURL()
  -> Show original image preview (immediate feedback)
  -> Post to Web Worker:
      -> Resize (aspect-corrected, halve rows for char height:width ~2:1)
      -> [Optional] Sobel edge detection
      -> [Optional] Floyd-Steinberg dithering
      -> Quantize pixels -> character grid (2D string array)
  -> Post result back to main thread
  -> DOM renderer: single innerHTML write
  -> Enable export buttons
```

Settings changes trigger re-processing (debounced at 150ms).

## Core Algorithm Improvements

### Aspect Ratio Correction
Characters are ~2x taller than wide. Current code doesn't account for this,
producing vertically stretched output. Fix: sample every other row, or resize
canvas height to half.

### Luminance-Weighted Grayscale
Replace naive `(R+G+B)/3` with perceptual formula:
`0.299*R + 0.587*G + 0.114*B`

### Edge Detection (Sobel Filter)
Convolve with horizontal and vertical 3x3 Sobel kernels, compute gradient
magnitude. Output is a grayscale edge map — areas with sharp transitions
get bright values, flat areas stay dark. Then quantize as normal.

### Dithering (Floyd-Steinberg)
After quantizing a pixel, compute the error (difference between original
value and quantized value). Distribute that error to neighboring pixels:
- Right: 7/16
- Below-left: 3/16
- Below: 5/16
- Below-right: 1/16

This produces better gradients with limited palette sizes.

## Palette System

```typescript
interface Palette {
  name: string;
  id: string;
  type: 'grayscale' | 'rgb';
  characters: string[];       // dark -> light for grayscale
  rgbMap?: Map<string, string>; // "R-G-B" key -> character for rgb type
  description?: string;
}
```

Built-in palettes:
- ASCII Standard: ` .:-=+*#%@` (10 levels)
- ASCII Detailed: ` .',:;!|\\/)({[?#@` (extended)
- BW Emoji (migrated from existing)
- RGB Emoji (migrated from existing)
- Skin Tones (migrated from existing)

Adding a palette = new file in `src/palettes/` + register in index.

## UI Layout

```
+------------------------------------------------------------------+
|  Img2Text                                          [dark/light]  |
+------------+-----------------------------------------------------+
|            |                                                     |
|  Settings  |              Output Area                            |
|            |                                                     |
|  +------+  |   +---------------------------------------------+  |
|  |Orig. |  |   |                                             |  |
|  |image |  |   |         ASCII / Emoji output                |  |
|  |prevw |  |   |         (monospace, scrollable)             |  |
|  |[chng]|  |   |                                             |  |
|  +------+  |   +---------------------------------------------+  |
|            |                                                     |
|  Width: 80 |                                                     |
|  --*------ |                                                     |
|            |                                                     |
|  Palette:  |                                                     |
|  [ASCII v] |                                                     |
|            |                                                     |
|  [ ] Dither|                                                     |
|  [ ] Edges |                                                     |
|            |                                                     |
|  [Copy]    |                                                     |
|  [Download]|                                                     |
|  [Save PNG]|                                                     |
+------------+-----------------------------------------------------+
```

- Responsive: stacks vertically on <768px
- Dark mode default (ASCII looks better), with toggle
- Drag-drop anywhere on page
- Live updates on any setting change (debounced)
- Loading indicator during processing

## Export Options

1. **Copy to clipboard**: `navigator.clipboard.writeText()` (modern API)
2. **Download .txt**: `Blob` + `URL.createObjectURL()` + `<a>` click
3. **Save as PNG**: Render text onto `<canvas>`, export via `toDataURL()`

## Testing Strategy

Unit tests with Vitest for pure functions in `core/`:
- `quantizer.test.ts`: grayscale conversion, range mapping, RGB quantization
- `edge-detect.test.ts`: Sobel kernel application, gradient magnitude
- `dither.test.ts`: error diffusion correctness
- `converter.test.ts`: end-to-end pipeline (mock ImageData -> character grid)

No E2E tests initially — manual verification of UI via the dev server.
