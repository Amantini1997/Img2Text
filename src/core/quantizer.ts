export function toGrayscale(r: number, g: number, b: number): number {
  return Math.round(0.299 * r + 0.587 * g + 0.114 * b);
}

export function quantize(value: number, levels: number): number {
  if (levels <= 1) return 0;
  const clamped = Math.min(255, Math.max(0, value));
  const index = Math.floor((clamped * levels) / 255);
  return Math.min(index, levels - 1);
}
