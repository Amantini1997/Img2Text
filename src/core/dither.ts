import { toGrayscale } from './quantizer';

export function floydSteinbergDither(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  levels: number,
): Uint8ClampedArray {
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
