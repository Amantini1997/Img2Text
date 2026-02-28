import { describe, it, expect } from 'vitest';
import { pixelsToCharGrid } from '../src/core/converter';
import type { GrayscalePalette } from '../src/palettes/types';

const testPalette: GrayscalePalette = {
  id: 'test', name: 'Test', type: 'grayscale',
  characters: ['#', '.', ' '],
};

function makePixelData(pixels: number[][], width: number) {
  const height = pixels.length;
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const v = pixels[y][x];
      data[idx] = v; data[idx+1] = v; data[idx+2] = v; data[idx+3] = 255;
    }
  }
  return { data, width, height };
}

describe('pixelsToCharGrid', () => {
  it('maps black pixels to darkest character', () => {
    const pd = makePixelData([[0, 0], [0, 0]], 2);
    const grid = pixelsToCharGrid(pd, testPalette, { edgeDetect: false, dither: false });
    expect(grid[0][0]).toBe('#');
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
