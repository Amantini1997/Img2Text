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
    expect(quantize(0, 5)).toBe(0);
    expect(quantize(51, 5)).toBe(1);
    expect(quantize(102, 5)).toBe(2);
    expect(quantize(153, 5)).toBe(3);
    expect(quantize(204, 5)).toBe(4);
  });
});
