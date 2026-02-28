export function renderGridToDOM(grid: string[][], container: HTMLElement): void {
  const html = grid
    .map(row => `<div class="output-row">${escapeHtml(row.join(''))}</div>`)
    .join('');
  container.innerHTML = html;
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
