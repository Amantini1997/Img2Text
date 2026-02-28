import type { Palette, RgbPalette } from '../palettes/types';
import type { PixelData } from './image-processor';
import { toGrayscale, quantize } from './quantizer';
import { sobelEdgeDetect } from './edge-detect';
import { floydSteinbergDither } from './dither';

export interface ConvertOptions {
  edgeDetect: boolean;
  dither: boolean;
}

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
