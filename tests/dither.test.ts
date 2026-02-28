import { describe, it, expect } from 'vitest';
import { floydSteinbergDither } from '../src/core/dither';

describe('floydSteinbergDither', () => {
  it('does not modify a uniform black image', () => {
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
    for (let i = 0; i < data.length; i += 4) {
      data[i] = 128;
      data[i + 1] = 128;
      data[i + 2] = 128;
      data[i + 3] = 255;
    }
    const levels = 2;
    const result = floydSteinbergDither(data, width, height, levels);
    for (let i = 0; i < result.length; i += 4) {
      expect([0, 255]).toContain(result[i]);
    }
  });
});
