import { gridToText } from '../renderers/text-renderer';
import { gridToDataURL } from '../renderers/canvas-renderer';

let toastTimer: ReturnType<typeof setTimeout> | null = null;

export function showToast(message: string): void {
  const toast = document.getElementById('toast') as HTMLElement;
  const toastMessage = document.getElementById('toast-message') as HTMLElement;
  toastMessage.textContent = message;
  toast.hidden = false;
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.hidden = true;
  }, 2000);
}

export function enableExportButtons(): void {
  const btnCopy = document.getElementById('btn-copy') as HTMLButtonElement;
  const btnDownload = document.getElementById('btn-download') as HTMLButtonElement;
  const btnPng = document.getElementById('btn-png') as HTMLButtonElement;
  btnCopy.disabled = false;
  btnDownload.disabled = false;
  btnPng.disabled = false;
}

export function setupExport(getGrid: () => string[][] | null): void {
  const btnCopy = document.getElementById('btn-copy') as HTMLButtonElement;
  const btnDownload = document.getElementById('btn-download') as HTMLButtonElement;
  const btnPng = document.getElementById('btn-png') as HTMLButtonElement;

  btnCopy.addEventListener('click', async () => {
    const grid = getGrid();
    if (!grid) return;
    const text = gridToText(grid);
    try {
      await navigator.clipboard.writeText(text);
      showToast('Copied to clipboard');
    } catch {
      showToast('Failed to copy');
    }
  });

  btnDownload.addEventListener('click', () => {
    const grid = getGrid();
    if (!grid) return;
    const text = gridToText(grid);
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'img2text-output.txt';
    a.click();
    URL.revokeObjectURL(url);
    showToast('Downloaded .txt file');
  });

  btnPng.addEventListener('click', () => {
    const grid = getGrid();
    if (!grid) return;
    const dataUrl = gridToDataURL(grid);
    if (!dataUrl) return;
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = 'img2text-output.png';
    a.click();
    showToast('Downloaded .png file');
  });
}
