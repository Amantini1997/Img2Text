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

export function processImage(
  bitmap: ImageBitmap,
  targetWidth: number,
  paletteId: string,
  options: ConvertOptions,
): Promise<string[][]> {
  return new Promise((resolve, reject) => {
    const w = getWorker();
    w.onmessage = (e: MessageEvent<WorkerResponse>) => { resolve(e.data.grid); };
    w.onerror = (e) => { reject(new Error(e.message)); };
    w.postMessage({ bitmap, targetWidth, paletteId, options });
  });
}
