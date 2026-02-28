import { describe, it, expect } from 'vitest';
import { sobelEdgeDetect } from '../src/core/edge-detect';

describe('sobelEdgeDetect', () => {
  it('returns zero for uniform image', () => {
    const width = 3;
    const height = 3;
    const data = new Uint8ClampedArray(width * height * 4);
    for (let i = 0; i < data.length; i += 4) {
      data[i] = 128;
      data[i + 1] = 128;
      data[i + 2] = 128;
      data[i + 3] = 255;
    }
    const result = sobelEdgeDetect(data, width, height);
    for (let i = 0; i < result.length; i += 4) {
      expect(result[i]).toBe(0);
    }
  });

  it('detects vertical edge', () => {
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
