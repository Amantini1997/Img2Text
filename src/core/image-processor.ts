// src/core/image-processor.ts

export interface PixelData {
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
