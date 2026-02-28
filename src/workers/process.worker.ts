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
