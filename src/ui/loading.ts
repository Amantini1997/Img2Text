let overlay: HTMLElement | null = null;

export function showLoading(): void {
  const outputArea = document.getElementById('output-area') as HTMLElement;
  if (overlay) return;
  overlay = document.createElement('div');
  overlay.className = 'loading-overlay';
  overlay.innerHTML = '<div class="loading-spinner"></div>';
  outputArea.appendChild(overlay);
}

export function hideLoading(): void {
  if (overlay) {
    overlay.remove();
    overlay = null;
  }
}
