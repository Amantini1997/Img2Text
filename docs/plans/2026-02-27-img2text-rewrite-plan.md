# Img2Text Rewrite Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Rewrite the Img2Text image-to-ASCII converter as a modular TypeScript app with Web Worker processing, pluggable palettes, edge detection, dithering, and a polished side-by-side editor UI.

**Architecture:** Vite + TypeScript, zero runtime dependencies. Pure functions in `src/core/` handle pixel processing (quantization, edge detection, dithering). A Web Worker runs the heavy processing off the main thread. `src/palettes/` holds data-only palette definitions behind a `Palette` interface. `src/ui/` manages DOM — drag-drop, controls, preview, export. `src/renderers/` converts character grids to DOM or plain text.

**Tech Stack:** TypeScript (strict), Vite (build/dev), Vitest (unit tests), vanilla DOM (no framework), Web Workers, Canvas API.

---

### Task 1: Project Scaffold

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vite.config.ts`
- Create: `index.html` (minimal shell)
- Create: `src/index.ts` (empty entry)
- Delete: old `index.html`, `index.css`, `oldIndex.html`, `rgbPicker.html`, `wordLength.html`

**Step 1: Initialize project**

```bash
cd /tmp/Img2Text
# Keep git history — don't reinit
npm init -y
npm install --save-dev vite typescript vitest
```

**Step 2: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "declaration": true,
    "outDir": "dist",
    "sourceMap": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable", "WebWorker"]
  },
  "include": ["src"]
}
```

**Step 3: Create vite.config.ts**

```typescript
import { defineConfig } from 'vite';

export default defineConfig({
  base: '/Img2Text/',
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});
```

**Step 4: Create index.html (shell)**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Img2Text</title>
</head>
<body>
  <div id="app"></div>
  <script type="module" src="/src/index.ts"></script>
</body>
</html>
```

**Step 5: Create src/index.ts**

```typescript
console.log('Img2Text loaded');
```

**Step 6: Move old files to `legacy/` for reference**

```bash
mkdir -p legacy
git mv index.html legacy/old-index.html
git mv index.css legacy/old-index.css
git mv oldIndex.html legacy/oldIndex.html
git mv rgbPicker.html legacy/rgbPicker.html
git mv wordLength.html legacy/wordLength.html
```

**Step 7: Add scripts to package.json**

Add to package.json scripts:
```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

**Step 8: Verify dev server starts**

Run: `npm run dev`
Expected: Vite dev server starts, browser shows "Img2Text loaded" in console.

**Step 9: Commit**

```bash
git add -A
git commit -m "chore: scaffold Vite + TypeScript project, move legacy files"
```

---

### Task 2: Core — Quantizer (TDD)

**Files:**
- Create: `src/core/quantizer.ts`
- Create: `tests/quantizer.test.ts`

**Step 1: Write failing tests**

```typescript
// tests/quantizer.test.ts
import { describe, it, expect } from 'vitest';
import { toGrayscale, quantize } from '../src/core/quantizer';

describe('toGrayscale', () => {
  it('returns 0 for black pixel', () => {
    expect(toGrayscale(0, 0, 0)).toBe(0);
  });

  it('returns 255 for white pixel', () => {
    expect(toGrayscale(255, 255, 255)).toBe(255);
  });

  it('uses luminance weighting, not simple average', () => {
    // Pure green should be brighter than pure red or blue
    const red = toGrayscale(255, 0, 0);
    const green = toGrayscale(0, 255, 0);
    const blue = toGrayscale(0, 0, 255);
    expect(green).toBeGreaterThan(red);
    expect(red).toBeGreaterThan(blue);
  });
});

describe('quantize', () => {
  it('maps 0 to first bucket', () => {
    expect(quantize(0, 4)).toBe(0);
  });

  it('maps 255 to last bucket', () => {
    expect(quantize(255, 4)).toBe(3);
  });

  it('maps midpoint correctly for 2 levels', () => {
    expect(quantize(100, 2)).toBe(0);
    expect(quantize(200, 2)).toBe(1);
  });

  it('handles single level', () => {
    expect(quantize(128, 1)).toBe(0);
  });

  it('distributes evenly across levels', () => {
    // With 5 levels, each spans 51 values (255/5)
    expect(quantize(0, 5)).toBe(0);
    expect(quantize(51, 5)).toBe(1);
    expect(quantize(102, 5)).toBe(2);
    expect(quantize(153, 5)).toBe(3);
    expect(quantize(204, 5)).toBe(4);
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/quantizer.test.ts`
Expected: FAIL — module not found.

**Step 3: Implement quantizer**

```typescript
// src/core/quantizer.ts

/**
 * Convert RGB to perceptual grayscale using ITU-R BT.601 luminance weights.
 * Returns a value in [0, 255].
 */
export function toGrayscale(r: number, g: number, b: number): number {
  return Math.round(0.299 * r + 0.587 * g + 0.114 * b);
}

/**
 * Quantize a value in [0, 255] into one of `levels` buckets.
 * Returns an index in [0, levels - 1].
 */
export function quantize(value: number, levels: number): number {
  if (levels <= 1) return 0;
  const clamped = Math.min(255, Math.max(0, value));
  const index = Math.floor(clamped / (256 / levels));
  return Math.min(index, levels - 1);
}
```

**Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/quantizer.test.ts`
Expected: All PASS.

**Step 5: Commit**

```bash
git add src/core/quantizer.ts tests/quantizer.test.ts
git commit -m "feat: add quantizer with luminance-weighted grayscale"
```

---

### Task 3: Core — Palette System

**Files:**
- Create: `src/palettes/types.ts`
- Create: `src/palettes/ascii.ts`
- Create: `src/palettes/ascii-detailed.ts`
- Create: `src/palettes/bw-emoji.ts`
- Create: `src/palettes/rgb-emoji.ts`
- Create: `src/palettes/skin-tones.ts`
- Create: `src/palettes/index.ts`

**Step 1: Define the Palette interface**

```typescript
// src/palettes/types.ts
export interface GrayscalePalette {
  id: string;
  name: string;
  type: 'grayscale';
  /** Characters ordered dark to light. */
  characters: string[];
}

export interface RgbPalette {
  id: string;
  name: string;
  type: 'rgb';
  /** Quantization levels per channel (e.g., 3 = 27 combinations). */
  levels: number;
  /** Map from "R-G-B" quantized key to character. */
  rgbMap: Record<string, string>;
  /** Fallback character if key not found. */
  fallback: string;
}

export type Palette = GrayscalePalette | RgbPalette;
```

**Step 2: Create ASCII palette (new)**

```typescript
// src/palettes/ascii.ts
import type { GrayscalePalette } from './types';

export const asciiPalette: GrayscalePalette = {
  id: 'ascii',
  name: 'ASCII',
  type: 'grayscale',
  characters: ['@', '#', '%', '*', '+', '=', '-', ':', '.', ' '],
};
```

**Step 3: Create detailed ASCII palette (new)**

```typescript
// src/palettes/ascii-detailed.ts
import type { GrayscalePalette } from './types';

export const asciiDetailedPalette: GrayscalePalette = {
  id: 'ascii-detailed',
  name: 'ASCII Detailed',
  type: 'grayscale',
  characters: ['$', '@', 'B', '%', '8', '&', 'W', 'M', '#', '*', 'o', 'a', 'h', 'k', 'b', 'd', 'p', 'q', 'w', 'm', 'Z', 'O', '0', 'Q', 'L', 'C', 'J', 'U', 'Y', 'X', 'z', 'c', 'v', 'u', 'n', 'x', 'r', 'j', 'f', 't', '/', '\\', '|', '(', ')', '1', '{', '}', '[', ']', '?', '-', '_', '+', '~', '<', '>', 'i', '!', 'l', 'I', ';', ':', ',', '"', '^', '`', '\'', '.', ' '],
};
```

**Step 4: Migrate BW emoji palette from existing code**

```typescript
// src/palettes/bw-emoji.ts
import type { GrayscalePalette } from './types';

export const bwEmojiPalette: GrayscalePalette = {
  id: 'bw-emoji',
  name: 'BW Emoji',
  type: 'grayscale',
  characters: ['\u26AB', '\u{1F3B1}', '\u26BD', '\u{1F3D0}', '\u26AA'],
};
```

**Step 5: Migrate RGB emoji palette from existing code**

Translate the switch statement in `index.html:198-241` into a lookup map:

```typescript
// src/palettes/rgb-emoji.ts
import type { RgbPalette } from './types';

export const rgbEmojiPalette: RgbPalette = {
  id: 'rgb-emoji',
  name: 'RGB Emoji',
  type: 'rgb',
  levels: 3,
  rgbMap: {
    '0-0-0': '\u26AB',   // black
    '2-2-2': '\u26AA',   // white
    '1-1-1': '\u26BD',   // grey — soccer ball
    '1-0-0': '\u2648',   // aries
    '2-0-0': '\u2648',
    '2-1-0': '\u264A',   // gemini
    '2-2-0': '\u264B',   // cancer
    '2-2-1': '\u264C',   // leo
    '0-2-0': '\u264D',   // virgo
    '1-2-0': '\u264D',
    '1-2-1': '\u264D',
    '0-1-0': '\u264E',   // libra
    '1-1-0': '\u264E',
    '0-1-1': '\u264F',   // scorpio
    '0-2-1': '\u264F',
    '0-0-1': '\u2650',   // sagittarius
    '0-0-2': '\u2650',
    '0-1-2': '\u2650',
    '0-2-2': '\u2650',
    '1-2-2': '\u2650',
    '1-0-2': '\u2651',   // capricorn
    '1-1-2': '\u2651',
    '1-0-1': '\u2652',   // aquarius
    '2-0-2': '\u2652',
    '2-0-1': '\u2653',   // pisces
    '2-1-1': '\u2653',
    '2-1-2': '\u2653',
  },
  fallback: '\u26AA',
};
```

**Step 6: Migrate skin tones palette**

```typescript
// src/palettes/skin-tones.ts
import type { GrayscalePalette } from './types';

export const skinTonesPalette: GrayscalePalette = {
  id: 'skin-tones',
  name: 'Skin Tones',
  type: 'grayscale',
  characters: ['\u{1F3FF}', '\u{1F3FE}', '\u{1F3FD}', '\u{1F3FC}', '\u{1F3FB}'],
};
```

**Step 7: Create palette registry**

```typescript
// src/palettes/index.ts
import type { Palette } from './types';
import { asciiPalette } from './ascii';
import { asciiDetailedPalette } from './ascii-detailed';
import { bwEmojiPalette } from './bw-emoji';
import { rgbEmojiPalette } from './rgb-emoji';
import { skinTonesPalette } from './skin-tones';

export type { Palette, GrayscalePalette, RgbPalette } from './types';

export const palettes: Palette[] = [
  asciiPalette,
  asciiDetailedPalette,
  bwEmojiPalette,
  rgbEmojiPalette,
  skinTonesPalette,
];

export function getPaletteById(id: string): Palette | undefined {
  return palettes.find(p => p.id === id);
}
```

**Step 8: Commit**

```bash
git add src/palettes/
git commit -m "feat: add pluggable palette system with 5 built-in palettes"
```

---

### Task 4: Core — Image Processor

**Files:**
- Create: `src/core/image-processor.ts`

**Step 1: Implement image processor**

This module handles canvas pixel extraction and resizing. It works with `OffscreenCanvas` when available (Web Worker), and falls back to regular `Canvas` on main thread.

```typescript
// src/core/image-processor.ts

export interface PixelData {
  /** RGBA values as flat Uint8ClampedArray. */
  data: Uint8ClampedArray;
  width: number;
  height: number;
}

/**
 * Extract pixel data from an ImageBitmap at the target width.
 * Height is adjusted for character aspect ratio (chars are ~2x taller than wide).
 */
export function extractPixels(
  bitmap: ImageBitmap,
  targetWidth: number,
): PixelData {
  const aspectRatio = bitmap.height / bitmap.width;
  // Halve vertical resolution to compensate for character height:width ~2:1
  const targetHeight = Math.floor(targetWidth * aspectRatio * 0.5);

  const canvas = new OffscreenCanvas(targetWidth, targetHeight);
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(bitmap, 0, 0, targetWidth, targetHeight);
  const imageData = ctx.getImageData(0, 0, targetWidth, targetHeight);

  return {
    data: imageData.data,
    width: targetWidth,
    height: targetHeight,
  };
}
```

**Step 2: Commit**

```bash
git add src/core/image-processor.ts
git commit -m "feat: add image processor with aspect ratio correction"
```

---

### Task 5: Core — Edge Detection (TDD)

**Files:**
- Create: `src/core/edge-detect.ts`
- Create: `tests/edge-detect.test.ts`

**Step 1: Write failing tests**

```typescript
// tests/edge-detect.test.ts
import { describe, it, expect } from 'vitest';
import { sobelEdgeDetect } from '../src/core/edge-detect';

describe('sobelEdgeDetect', () => {
  it('returns zero for uniform image', () => {
    // 3x3 image, all pixels = 128 gray
    const width = 3;
    const height = 3;
    const data = new Uint8ClampedArray(width * height * 4);
    for (let i = 0; i < data.length; i += 4) {
      data[i] = 128;     // R
      data[i + 1] = 128; // G
      data[i + 2] = 128; // B
      data[i + 3] = 255; // A
    }
    const result = sobelEdgeDetect(data, width, height);
    // All edge magnitudes should be 0 for uniform input
    for (let i = 0; i < result.length; i += 4) {
      expect(result[i]).toBe(0);
    }
  });

  it('detects vertical edge', () => {
    // 3x3: left column black, right columns white
    const width = 3;
    const height = 3;
    const data = new Uint8ClampedArray(width * height * 4);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        const val = x === 0 ? 0 : 255;
        data[idx] = val;
        data[idx + 1] = val;
        data[idx + 2] = val;
        data[idx + 3] = 255;
      }
    }
    const result = sobelEdgeDetect(data, width, height);
    // Center pixel should have non-zero edge magnitude
    const centerIdx = (1 * width + 1) * 4;
    expect(result[centerIdx]).toBeGreaterThan(0);
  });

  it('returns same length as input', () => {
    const width = 5;
    const height = 5;
    const data = new Uint8ClampedArray(width * height * 4);
    const result = sobelEdgeDetect(data, width, height);
    expect(result.length).toBe(data.length);
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/edge-detect.test.ts`
Expected: FAIL — module not found.

**Step 3: Implement Sobel edge detection**

```typescript
// src/core/edge-detect.ts
import { toGrayscale } from './quantizer';

const SOBEL_X = [
  [-1, 0, 1],
  [-2, 0, 2],
  [-1, 0, 1],
];

const SOBEL_Y = [
  [-1, -2, -1],
  [ 0,  0,  0],
  [ 1,  2,  1],
];

/**
 * Apply Sobel edge detection to RGBA pixel data.
 * Returns new RGBA data where R=G=B=edge magnitude, A=255.
 */
export function sobelEdgeDetect(
  data: Uint8ClampedArray,
  width: number,
  height: number,
): Uint8ClampedArray {
  const result = new Uint8ClampedArray(data.length);

  // Pre-compute grayscale values
  const gray = new Float32Array(width * height);
  for (let i = 0; i < gray.length; i++) {
    const idx = i * 4;
    gray[i] = toGrayscale(data[idx], data[idx + 1], data[idx + 2]);
  }

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let gx = 0;
      let gy = 0;

      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          const px = Math.min(width - 1, Math.max(0, x + kx));
          const py = Math.min(height - 1, Math.max(0, y + ky));
          const val = gray[py * width + px];
          gx += val * SOBEL_X[ky + 1][kx + 1];
          gy += val * SOBEL_Y[ky + 1][kx + 1];
        }
      }

      const magnitude = Math.min(255, Math.sqrt(gx * gx + gy * gy));
      const idx = (y * width + x) * 4;
      result[idx] = magnitude;
      result[idx + 1] = magnitude;
      result[idx + 2] = magnitude;
      result[idx + 3] = 255;
    }
  }

  return result;
}
```

**Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/edge-detect.test.ts`
Expected: All PASS.

**Step 5: Commit**

```bash
git add src/core/edge-detect.ts tests/edge-detect.test.ts
git commit -m "feat: add Sobel edge detection"
```

---

### Task 6: Core — Dithering (TDD)

**Files:**
- Create: `src/core/dither.ts`
- Create: `tests/dither.test.ts`

**Step 1: Write failing tests**

```typescript
// tests/dither.test.ts
import { describe, it, expect } from 'vitest';
import { floydSteinbergDither } from '../src/core/dither';

describe('floydSteinbergDither', () => {
  it('does not modify a uniform image', () => {
    // All pixels at level boundary — no error to distribute
    const width = 3;
    const height = 3;
    const data = new Uint8ClampedArray(width * height * 4);
    for (let i = 0; i < data.length; i += 4) {
      data[i] = 0;
      data[i + 1] = 0;
      data[i + 2] = 0;
      data[i + 3] = 255;
    }
    const result = floydSteinbergDither(data, width, height, 4);
    // All black stays black
    for (let i = 0; i < result.length; i += 4) {
      expect(result[i]).toBe(0);
    }
  });

  it('returns same dimensions as input', () => {
    const width = 5;
    const height = 5;
    const data = new Uint8ClampedArray(width * height * 4);
    const result = floydSteinbergDither(data, width, height, 4);
    expect(result.length).toBe(data.length);
  });

  it('output values are quantized to level boundaries', () => {
    const width = 4;
    const height = 4;
    const data = new Uint8ClampedArray(width * height * 4);
    // Fill with mid-gray
    for (let i = 0; i < data.length; i += 4) {
      data[i] = 128;
      data[i + 1] = 128;
      data[i + 2] = 128;
      data[i + 3] = 255;
    }
    const levels = 2; // Only 0 or 255
    const result = floydSteinbergDither(data, width, height, levels);
    // Every R channel should be either 0 or 255
    for (let i = 0; i < result.length; i += 4) {
      expect([0, 255]).toContain(result[i]);
    }
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/dither.test.ts`
Expected: FAIL.

**Step 3: Implement Floyd-Steinberg dithering**

```typescript
// src/core/dither.ts
import { toGrayscale } from './quantizer';

/**
 * Apply Floyd-Steinberg dithering to RGBA pixel data.
 * Operates on grayscale (luminance) values.
 * Returns new RGBA data with dithered grayscale values.
 */
export function floydSteinbergDither(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  levels: number,
): Uint8ClampedArray {
  // Work on a float copy of grayscale values
  const gray = new Float32Array(width * height);
  for (let i = 0; i < gray.length; i++) {
    const idx = i * 4;
    gray[i] = toGrayscale(data[idx], data[idx + 1], data[idx + 2]);
  }

  const step = 255 / (levels - 1 || 1);
  const result = new Uint8ClampedArray(data.length);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      const oldVal = gray[i];
      const newVal = Math.round(oldVal / step) * step;
      const clamped = Math.min(255, Math.max(0, newVal));
      gray[i] = clamped;
      const error = oldVal - clamped;

      // Distribute error to neighbors
      if (x + 1 < width)                     gray[i + 1]         += error * 7 / 16;
      if (y + 1 < height && x - 1 >= 0)      gray[i + width - 1] += error * 3 / 16;
      if (y + 1 < height)                     gray[i + width]     += error * 5 / 16;
      if (y + 1 < height && x + 1 < width)   gray[i + width + 1] += error * 1 / 16;

      const idx = i * 4;
      result[idx] = clamped;
      result[idx + 1] = clamped;
      result[idx + 2] = clamped;
      result[idx + 3] = 255;
    }
  }

  return result;
}
```

**Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/dither.test.ts`
Expected: All PASS.

**Step 5: Commit**

```bash
git add src/core/dither.ts tests/dither.test.ts
git commit -m "feat: add Floyd-Steinberg dithering"
```

---

### Task 7: Core — Converter (TDD)

**Files:**
- Create: `src/core/converter.ts`
- Create: `tests/converter.test.ts`

This is the orchestrator: takes pixel data + palette + options → returns a 2D character grid.

**Step 1: Write failing tests**

```typescript
// tests/converter.test.ts
import { describe, it, expect } from 'vitest';
import { pixelsToCharGrid } from '../src/core/converter';
import type { GrayscalePalette } from '../src/palettes/types';

const testPalette: GrayscalePalette = {
  id: 'test',
  name: 'Test',
  type: 'grayscale',
  characters: ['#', '.', ' '],
};

function makePixelData(pixels: number[][], width: number) {
  const height = pixels.length;
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const v = pixels[y][x];
      data[idx] = v;
      data[idx + 1] = v;
      data[idx + 2] = v;
      data[idx + 3] = 255;
    }
  }
  return { data, width, height };
}

describe('pixelsToCharGrid', () => {
  it('maps black pixels to darkest character', () => {
    const pd = makePixelData([[0, 0], [0, 0]], 2);
    const grid = pixelsToCharGrid(pd, testPalette, { edgeDetect: false, dither: false });
    expect(grid[0][0]).toBe('#');
    expect(grid[1][1]).toBe('#');
  });

  it('maps white pixels to lightest character', () => {
    const pd = makePixelData([[255, 255]], 2);
    const grid = pixelsToCharGrid(pd, testPalette, { edgeDetect: false, dither: false });
    expect(grid[0][0]).toBe(' ');
  });

  it('returns correct grid dimensions', () => {
    const pd = makePixelData([[0, 128, 255], [64, 192, 32]], 3);
    const grid = pixelsToCharGrid(pd, testPalette, { edgeDetect: false, dither: false });
    expect(grid.length).toBe(2);
    expect(grid[0].length).toBe(3);
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/converter.test.ts`
Expected: FAIL.

**Step 3: Implement converter**

```typescript
// src/core/converter.ts
import type { Palette, GrayscalePalette, RgbPalette } from '../palettes/types';
import type { PixelData } from './image-processor';
import { toGrayscale, quantize } from './quantizer';
import { sobelEdgeDetect } from './edge-detect';
import { floydSteinbergDither } from './dither';

export interface ConvertOptions {
  edgeDetect: boolean;
  dither: boolean;
}

/**
 * Convert pixel data to a 2D character grid using the given palette.
 */
export function pixelsToCharGrid(
  pixelData: PixelData,
  palette: Palette,
  options: ConvertOptions,
): string[][] {
  let { data, width, height } = pixelData;

  if (options.edgeDetect) {
    data = sobelEdgeDetect(data, width, height);
  }

  const levels = palette.type === 'grayscale'
    ? palette.characters.length
    : (palette as RgbPalette).levels;

  if (options.dither) {
    data = floydSteinbergDither(data, width, height, levels);
  }

  const grid: string[][] = [];

  for (let y = 0; y < height; y++) {
    const row: string[] = [];
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];

      if (palette.type === 'grayscale') {
        const gray = toGrayscale(r, g, b);
        const level = quantize(gray, palette.characters.length);
        row.push(palette.characters[level]);
      } else {
        const rq = quantize(r, palette.levels);
        const gq = quantize(g, palette.levels);
        const bq = quantize(b, palette.levels);
        const key = `${rq}-${gq}-${bq}`;
        row.push(palette.rgbMap[key] ?? palette.fallback);
      }
    }
    grid.push(row);
  }

  return grid;
}
```

**Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/converter.test.ts`
Expected: All PASS.

**Step 5: Commit**

```bash
git add src/core/converter.ts tests/converter.test.ts
git commit -m "feat: add converter orchestrating quantization, edge detect, dithering"
```

---

### Task 8: Web Worker

**Files:**
- Create: `src/workers/process.worker.ts`
- Create: `src/workers/api.ts` (main-thread wrapper)

**Step 1: Create the worker**

```typescript
// src/workers/process.worker.ts
import { extractPixels } from '../core/image-processor';
import { pixelsToCharGrid, type ConvertOptions } from '../core/converter';
import { getPaletteById } from '../palettes';

export interface WorkerRequest {
  bitmap: ImageBitmap;
  targetWidth: number;
  paletteId: string;
  options: ConvertOptions;
}

export interface WorkerResponse {
  grid: string[][];
}

self.onmessage = (e: MessageEvent<WorkerRequest>) => {
  const { bitmap, targetWidth, paletteId, options } = e.data;

  const palette = getPaletteById(paletteId);
  if (!palette) {
    throw new Error(`Unknown palette: ${paletteId}`);
  }

  const pixels = extractPixels(bitmap, targetWidth);
  const grid = pixelsToCharGrid(pixels, palette, options);

  (self as unknown as Worker).postMessage({ grid } satisfies WorkerResponse);
};
```

**Step 2: Create the main-thread API wrapper**

```typescript
// src/workers/api.ts
import type { ConvertOptions } from '../core/converter';
import type { WorkerResponse } from './process.worker';

let worker: Worker | null = null;

function getWorker(): Worker {
  if (!worker) {
    worker = new Worker(
      new URL('./process.worker.ts', import.meta.url),
      { type: 'module' },
    );
  }
  return worker;
}

/**
 * Process an image file into a character grid using a Web Worker.
 * Returns a promise that resolves with the 2D character grid.
 */
export function processImage(
  bitmap: ImageBitmap,
  targetWidth: number,
  paletteId: string,
  options: ConvertOptions,
): Promise<string[][]> {
  return new Promise((resolve, reject) => {
    const w = getWorker();

    w.onmessage = (e: MessageEvent<WorkerResponse>) => {
      resolve(e.data.grid);
    };

    w.onerror = (e) => {
      reject(new Error(e.message));
    };

    w.postMessage({ bitmap, targetWidth, paletteId, options });
  });
}
```

**Step 3: Commit**

```bash
git add src/workers/
git commit -m "feat: add Web Worker for off-thread image processing"
```

---

### Task 9: Renderers

**Files:**
- Create: `src/renderers/text-renderer.ts`
- Create: `src/renderers/dom-renderer.ts`
- Create: `src/renderers/canvas-renderer.ts`

**Step 1: Implement text renderer**

```typescript
// src/renderers/text-renderer.ts

/** Convert a 2D character grid to a plain text string. */
export function gridToText(grid: string[][]): string {
  return grid.map(row => row.join('')).join('\n');
}
```

**Step 2: Implement DOM renderer**

```typescript
// src/renderers/dom-renderer.ts

/**
 * Render a character grid into a container element.
 * Uses a single innerHTML write for performance.
 */
export function renderGridToDOM(
  grid: string[][],
  container: HTMLElement,
): void {
  const html = grid
    .map(row => `<div class="output-row">${escapeHtml(row.join(''))}</div>`)
    .join('');
  container.innerHTML = html;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
```

**Step 3: Implement canvas renderer (for PNG export)**

```typescript
// src/renderers/canvas-renderer.ts

/**
 * Render a character grid onto a canvas and return it as a data URL (PNG).
 * Used for the "Save as PNG" export feature.
 */
export function gridToDataURL(
  grid: string[][],
  fontSize: number = 12,
  fontFamily: string = 'monospace',
  bgColor: string = '#1a1a2e',
  fgColor: string = '#e0e0e0',
): string {
  if (grid.length === 0) return '';

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;

  ctx.font = `${fontSize}px ${fontFamily}`;
  const charWidth = ctx.measureText('M').width;
  const lineHeight = fontSize * 1.2;

  const cols = grid[0].length;
  const rows = grid.length;

  canvas.width = Math.ceil(charWidth * cols) + 20; // 10px padding each side
  canvas.height = Math.ceil(lineHeight * rows) + 20;

  // Background
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Text
  ctx.font = `${fontSize}px ${fontFamily}`;
  ctx.fillStyle = fgColor;
  ctx.textBaseline = 'top';

  for (let y = 0; y < rows; y++) {
    const line = grid[y].join('');
    ctx.fillText(line, 10, 10 + y * lineHeight);
  }

  return canvas.toDataURL('image/png');
}
```

**Step 4: Commit**

```bash
git add src/renderers/
git commit -m "feat: add text, DOM, and canvas renderers"
```

---

### Task 10: UI — HTML Structure and Global Styles

**Files:**
- Modify: `index.html`
- Create: `src/styles/main.css`
- Create: `src/styles/controls.css`
- Create: `src/styles/output.css`

**Step 1: Write the full HTML shell**

Update `index.html`:

```html
<!DOCTYPE html>
<html lang="en" data-theme="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Img2Text — Image to ASCII Art Converter</title>
  <meta name="description" content="Convert images to ASCII art, emoji art, and more. Free, fast, runs entirely in your browser.">
</head>
<body>
  <div id="app">
    <header class="header">
      <h1 class="header__title">Img2Text</h1>
      <button id="theme-toggle" class="header__theme-toggle" aria-label="Toggle dark/light mode">
        <span class="theme-icon">&#9790;</span>
      </button>
    </header>

    <main class="editor">
      <aside class="sidebar" id="sidebar">
        <!-- Drop zone / image preview -->
        <div class="sidebar__preview" id="preview-area">
          <div class="drop-zone" id="drop-zone">
            <p class="drop-zone__text">Drop image here<br>or click to select</p>
            <input type="file" id="file-input" accept="image/*" hidden>
          </div>
          <div class="preview-container" id="preview-container" hidden>
            <img id="preview-image" alt="Original image preview">
            <button id="change-image" class="preview-container__change">Change</button>
          </div>
        </div>

        <!-- Controls -->
        <div class="sidebar__controls">
          <label class="control">
            <span class="control__label">Width</span>
            <input type="range" id="width-slider" min="20" max="200" value="80" class="control__range">
            <span class="control__value" id="width-value">80</span>
          </label>

          <label class="control">
            <span class="control__label">Palette</span>
            <select id="palette-select" class="control__select"></select>
          </label>

          <div class="control">
            <label class="control__checkbox">
              <input type="checkbox" id="dither-toggle">
              <span>Dithering</span>
            </label>
          </div>

          <div class="control">
            <label class="control__checkbox">
              <input type="checkbox" id="edge-toggle">
              <span>Edge Detection</span>
            </label>
          </div>
        </div>

        <!-- Export actions -->
        <div class="sidebar__actions">
          <button id="btn-copy" class="btn btn--primary" disabled>Copy to Clipboard</button>
          <button id="btn-download" class="btn btn--secondary" disabled>Download .txt</button>
          <button id="btn-png" class="btn btn--secondary" disabled>Save as PNG</button>
        </div>
      </aside>

      <section class="output" id="output-area">
        <div class="output__content" id="output-content">
          <p class="output__placeholder">Your ASCII art will appear here</p>
        </div>
      </section>
    </main>

    <!-- Toast notification -->
    <div class="toast" id="toast" hidden>
      <span id="toast-message"></span>
    </div>
  </div>
  <script type="module" src="/src/index.ts"></script>
</body>
</html>
```

**Step 2: Create main.css with CSS custom properties and theme system**

```css
/* src/styles/main.css */
:root {
  --color-bg: #1a1a2e;
  --color-surface: #16213e;
  --color-surface-hover: #1a2744;
  --color-border: #2a3a5c;
  --color-text: #e0e0e0;
  --color-text-muted: #8892a4;
  --color-accent: #4cc9a0;
  --color-accent-hover: #3db890;
  --font-mono: 'SF Mono', 'Fira Code', 'Cascadia Code', 'Consolas', monospace;
  --font-sans: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  --radius: 8px;
  --sidebar-width: 280px;
}

[data-theme="light"] {
  --color-bg: #f5f5f5;
  --color-surface: #ffffff;
  --color-surface-hover: #f0f0f0;
  --color-border: #ddd;
  --color-text: #1a1a1a;
  --color-text-muted: #666;
  --color-accent: #2a9d8f;
  --color-accent-hover: #238a7e;
}

*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html, body {
  height: 100%;
  font-family: var(--font-sans);
  background: var(--color-bg);
  color: var(--color-text);
}

#app {
  display: flex;
  flex-direction: column;
  height: 100vh;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 24px;
  border-bottom: 1px solid var(--color-border);
  background: var(--color-surface);
}

.header__title {
  font-size: 1.25rem;
  font-weight: 700;
  letter-spacing: -0.02em;
}

.header__theme-toggle {
  background: none;
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  color: var(--color-text);
  padding: 6px 10px;
  cursor: pointer;
  font-size: 1rem;
}

.header__theme-toggle:hover {
  background: var(--color-surface-hover);
}

.editor {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.btn {
  display: block;
  width: 100%;
  padding: 10px 16px;
  border: none;
  border-radius: var(--radius);
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s;
}

.btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.btn--primary {
  background: var(--color-accent);
  color: #fff;
}

.btn--primary:hover:not(:disabled) {
  background: var(--color-accent-hover);
}

.btn--secondary {
  background: var(--color-surface-hover);
  color: var(--color-text);
  border: 1px solid var(--color-border);
}

.btn--secondary:hover:not(:disabled) {
  background: var(--color-border);
}

.toast {
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  background: var(--color-accent);
  color: #fff;
  padding: 10px 24px;
  border-radius: var(--radius);
  font-size: 0.875rem;
  font-weight: 600;
  opacity: 0;
  transition: opacity 0.3s;
  pointer-events: none;
}

.toast.visible {
  opacity: 1;
}

@media (max-width: 768px) {
  .editor {
    flex-direction: column;
  }
}
```

**Step 3: Create controls.css**

```css
/* src/styles/controls.css */
.sidebar {
  width: var(--sidebar-width);
  min-width: var(--sidebar-width);
  border-right: 1px solid var(--color-border);
  background: var(--color-surface);
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  padding: 16px;
  gap: 16px;
}

.drop-zone {
  border: 2px dashed var(--color-border);
  border-radius: var(--radius);
  padding: 32px 16px;
  text-align: center;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
}

.drop-zone:hover,
.drop-zone.drag-over {
  border-color: var(--color-accent);
  background: rgba(76, 201, 160, 0.05);
}

.drop-zone__text {
  color: var(--color-text-muted);
  font-size: 0.875rem;
  line-height: 1.5;
}

.preview-container {
  position: relative;
  border-radius: var(--radius);
  overflow: hidden;
}

.preview-container img {
  width: 100%;
  height: auto;
  display: block;
  border-radius: var(--radius);
}

.preview-container__change {
  position: absolute;
  top: 8px;
  right: 8px;
  background: rgba(0, 0, 0, 0.6);
  color: #fff;
  border: none;
  border-radius: 4px;
  padding: 4px 10px;
  font-size: 0.75rem;
  cursor: pointer;
}

.sidebar__controls {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.control {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.control__label {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.control__range {
  width: 100%;
  accent-color: var(--color-accent);
}

.control__value {
  font-size: 0.75rem;
  color: var(--color-text-muted);
  font-family: var(--font-mono);
}

.control__select {
  width: 100%;
  padding: 8px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  background: var(--color-bg);
  color: var(--color-text);
  font-size: 0.875rem;
}

.control__checkbox {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.875rem;
  cursor: pointer;
}

.control__checkbox input {
  accent-color: var(--color-accent);
}

.sidebar__actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: auto;
}

@media (max-width: 768px) {
  .sidebar {
    width: 100%;
    min-width: 100%;
    border-right: none;
    border-bottom: 1px solid var(--color-border);
    max-height: 50vh;
  }
}
```

**Step 4: Create output.css**

```css
/* src/styles/output.css */
.output {
  flex: 1;
  overflow: auto;
  padding: 16px;
  display: flex;
  justify-content: center;
  align-items: flex-start;
}

.output__content {
  font-family: var(--font-mono);
  font-size: 10px;
  line-height: 1;
  white-space: pre;
  user-select: all;
}

.output__placeholder {
  color: var(--color-text-muted);
  font-family: var(--font-sans);
  font-size: 1rem;
  padding-top: 40vh;
}

.output-row {
  white-space: pre;
}

.output__content.loading {
  opacity: 0.4;
}
```

**Step 5: Commit**

```bash
git add index.html src/styles/
git commit -m "feat: add HTML structure and CSS with dark/light theme system"
```

---

### Task 11: UI — JavaScript Wiring

**Files:**
- Modify: `src/index.ts`
- Create: `src/ui/drag-drop.ts`
- Create: `src/ui/controls.ts`
- Create: `src/ui/preview.ts`
- Create: `src/ui/export.ts`
- Create: `src/ui/layout.ts`
- Create: `src/ui/loading.ts`

**Step 1: Create drag-drop handler**

```typescript
// src/ui/drag-drop.ts

export function setupDragDrop(
  dropZone: HTMLElement,
  fileInput: HTMLInputElement,
  onFile: (file: File) => void,
): void {
  // Click to select
  dropZone.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', () => {
    const file = fileInput.files?.[0];
    if (file) onFile(file);
  });

  // Drag and drop — listen on the whole document
  document.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('drag-over');
  });

  document.addEventListener('dragleave', (e) => {
    if (e.relatedTarget === null) {
      dropZone.classList.remove('drag-over');
    }
  });

  document.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
    const file = e.dataTransfer?.files[0];
    if (file && file.type.startsWith('image/')) {
      onFile(file);
    }
  });
}
```

**Step 2: Create preview handler**

```typescript
// src/ui/preview.ts

export function showPreview(
  file: File,
  previewImg: HTMLImageElement,
  dropZone: HTMLElement,
  previewContainer: HTMLElement,
): void {
  const url = URL.createObjectURL(file);
  previewImg.src = url;
  previewImg.onload = () => URL.revokeObjectURL(url);
  dropZone.hidden = true;
  previewContainer.hidden = false;
}

export function setupChangeImage(
  changeBtn: HTMLElement,
  fileInput: HTMLInputElement,
  dropZone: HTMLElement,
  previewContainer: HTMLElement,
): void {
  changeBtn.addEventListener('click', () => {
    previewContainer.hidden = true;
    dropZone.hidden = false;
    fileInput.value = '';
    fileInput.click();
  });
}
```

**Step 3: Create controls handler**

```typescript
// src/ui/controls.ts
import { palettes } from '../palettes';

export interface Settings {
  width: number;
  paletteId: string;
  dither: boolean;
  edgeDetect: boolean;
}

export function setupControls(
  onChange: (settings: Settings) => void,
): Settings {
  const widthSlider = document.getElementById('width-slider') as HTMLInputElement;
  const widthValue = document.getElementById('width-value') as HTMLElement;
  const paletteSelect = document.getElementById('palette-select') as HTMLSelectElement;
  const ditherToggle = document.getElementById('dither-toggle') as HTMLInputElement;
  const edgeToggle = document.getElementById('edge-toggle') as HTMLInputElement;

  // Populate palette dropdown
  palettes.forEach(p => {
    const option = document.createElement('option');
    option.value = p.id;
    option.textContent = p.name;
    paletteSelect.appendChild(option);
  });

  // Default to first palette
  paletteSelect.value = palettes[0].id;

  function getSettings(): Settings {
    return {
      width: parseInt(widthSlider.value, 10),
      paletteId: paletteSelect.value,
      dither: ditherToggle.checked,
      edgeDetect: edgeToggle.checked,
    };
  }

  // Debounced change handler
  let debounceTimer: ReturnType<typeof setTimeout>;
  function handleChange() {
    widthValue.textContent = widthSlider.value;
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => onChange(getSettings()), 150);
  }

  widthSlider.addEventListener('input', handleChange);
  paletteSelect.addEventListener('change', handleChange);
  ditherToggle.addEventListener('change', handleChange);
  edgeToggle.addEventListener('change', handleChange);

  return getSettings();
}
```

**Step 4: Create export handler**

```typescript
// src/ui/export.ts
import { gridToText } from '../renderers/text-renderer';
import { gridToDataURL } from '../renderers/canvas-renderer';

export function setupExport(getGrid: () => string[][] | null): void {
  const btnCopy = document.getElementById('btn-copy') as HTMLButtonElement;
  const btnDownload = document.getElementById('btn-download') as HTMLButtonElement;
  const btnPng = document.getElementById('btn-png') as HTMLButtonElement;

  btnCopy.addEventListener('click', async () => {
    const grid = getGrid();
    if (!grid) return;
    await navigator.clipboard.writeText(gridToText(grid));
    showToast('Copied to clipboard');
  });

  btnDownload.addEventListener('click', () => {
    const grid = getGrid();
    if (!grid) return;
    const text = gridToText(grid);
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'img2text.txt';
    a.click();
    URL.revokeObjectURL(url);
    showToast('Downloaded');
  });

  btnPng.addEventListener('click', () => {
    const grid = getGrid();
    if (!grid) return;
    const dataUrl = gridToDataURL(grid);
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = 'img2text.png';
    a.click();
    showToast('PNG saved');
  });
}

export function enableExportButtons(): void {
  (document.getElementById('btn-copy') as HTMLButtonElement).disabled = false;
  (document.getElementById('btn-download') as HTMLButtonElement).disabled = false;
  (document.getElementById('btn-png') as HTMLButtonElement).disabled = false;
}

function showToast(message: string): void {
  const toast = document.getElementById('toast') as HTMLElement;
  const toastMsg = document.getElementById('toast-message') as HTMLElement;
  toastMsg.textContent = message;
  toast.hidden = false;
  toast.classList.add('visible');
  setTimeout(() => {
    toast.classList.remove('visible');
    setTimeout(() => { toast.hidden = true; }, 300);
  }, 2000);
}
```

**Step 5: Create layout handler (theme toggle)**

```typescript
// src/ui/layout.ts

export function setupThemeToggle(): void {
  const toggle = document.getElementById('theme-toggle') as HTMLButtonElement;
  const icon = toggle.querySelector('.theme-icon') as HTMLElement;

  // Check saved preference
  const saved = localStorage.getItem('img2text-theme');
  if (saved) {
    document.documentElement.dataset.theme = saved;
  }

  function updateIcon() {
    const isDark = document.documentElement.dataset.theme !== 'light';
    icon.textContent = isDark ? '\u263E' : '\u2600';
  }

  updateIcon();

  toggle.addEventListener('click', () => {
    const isDark = document.documentElement.dataset.theme !== 'light';
    const newTheme = isDark ? 'light' : 'dark';
    document.documentElement.dataset.theme = newTheme;
    localStorage.setItem('img2text-theme', newTheme);
    updateIcon();
  });
}
```

**Step 6: Create loading indicator**

```typescript
// src/ui/loading.ts

const output = () => document.getElementById('output-content') as HTMLElement;

export function showLoading(): void {
  output().classList.add('loading');
}

export function hideLoading(): void {
  output().classList.remove('loading');
}
```

**Step 7: Wire everything together in index.ts**

```typescript
// src/index.ts
import './styles/main.css';
import './styles/controls.css';
import './styles/output.css';

import { setupDragDrop } from './ui/drag-drop';
import { showPreview, setupChangeImage } from './ui/preview';
import { setupControls, type Settings } from './ui/controls';
import { setupExport, enableExportButtons } from './ui/export';
import { setupThemeToggle } from './ui/layout';
import { showLoading, hideLoading } from './ui/loading';
import { processImage } from './workers/api';
import { renderGridToDOM } from './renderers/dom-renderer';

let currentGrid: string[][] | null = null;
let currentBitmap: ImageBitmap | null = null;
let currentSettings: Settings;

async function handleFile(file: File) {
  const dropZone = document.getElementById('drop-zone') as HTMLElement;
  const previewContainer = document.getElementById('preview-container') as HTMLElement;
  const previewImg = document.getElementById('preview-image') as HTMLImageElement;

  showPreview(file, previewImg, dropZone, previewContainer);

  currentBitmap = await createImageBitmap(file);
  await render();
}

async function render() {
  if (!currentBitmap) return;

  showLoading();

  try {
    currentGrid = await processImage(
      currentBitmap,
      currentSettings.width,
      currentSettings.paletteId,
      {
        edgeDetect: currentSettings.edgeDetect,
        dither: currentSettings.dither,
      },
    );

    const outputContent = document.getElementById('output-content') as HTMLElement;
    renderGridToDOM(currentGrid, outputContent);
    enableExportButtons();
  } finally {
    hideLoading();
  }
}

function handleSettingsChange(settings: Settings) {
  currentSettings = settings;
  render();
}

// Boot
document.addEventListener('DOMContentLoaded', () => {
  setupThemeToggle();

  const dropZone = document.getElementById('drop-zone') as HTMLElement;
  const fileInput = document.getElementById('file-input') as HTMLInputElement;
  const changeBtn = document.getElementById('change-image') as HTMLElement;
  const previewContainer = document.getElementById('preview-container') as HTMLElement;

  setupDragDrop(dropZone, fileInput, handleFile);
  setupChangeImage(changeBtn, fileInput, dropZone, previewContainer);

  currentSettings = setupControls(handleSettingsChange);

  setupExport(() => currentGrid);
});
```

**Step 8: Verify dev server works**

Run: `npm run dev`
Expected: App loads, shows sidebar with controls, output placeholder. Drop zone is clickable. Theme toggle works.

**Step 9: Commit**

```bash
git add src/ index.html
git commit -m "feat: wire up complete UI with drag-drop, controls, export, and theme toggle"
```

---

### Task 12: Integration Testing and Polish

**Step 1: Run all unit tests**

Run: `npm test`
Expected: All tests pass.

**Step 2: Manual smoke test**

Run: `npm run dev`
Test the following:
- Drag and drop an image → preview shows, ASCII output renders
- Change width slider → output re-renders
- Switch palettes → output changes character set
- Toggle dithering → output becomes smoother
- Toggle edge detection → output shows edges only
- Copy to clipboard → toast shows, paste works
- Download .txt → file downloads
- Save PNG → PNG downloads
- Dark/light toggle → theme switches
- Resize window to mobile width → layout stacks vertically

**Step 3: Production build test**

Run: `npm run build && npm run preview`
Expected: Production build succeeds, preview server works identically to dev.

**Step 4: Commit**

```bash
git add -A
git commit -m "chore: integration testing complete, production build verified"
```

---

### Task 13: Cleanup and Deploy

**Step 1: Remove legacy directory**

```bash
rm -rf legacy/
```

**Step 2: Update .gitignore**

```
node_modules/
dist/
```

**Step 3: Update README.md**

Write a concise README covering:
- What the project does (1 sentence)
- Live demo link
- Features list
- How to run locally (`npm install && npm run dev`)
- How to build (`npm run build`)
- How to add a new palette (create file, register in index)

**Step 4: Final commit**

```bash
git add -A
git commit -m "chore: cleanup legacy files, update README, ready for deploy"
```

**Step 5: Deploy to GitHub Pages**

The Vite config already has `base: '/Img2Text/'`. Deploy by pushing the `dist/` folder to the `gh-pages` branch, or set up GitHub Actions to build and deploy automatically.
