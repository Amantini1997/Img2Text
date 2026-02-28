export function gridToDataURL(
  grid: string[][],
  fontSize: number = 12,
  fontFamily: string = 'monospace',
  bgColor: string = '#1a1a2e',
  fgColor: string = '#e0e0e0',
): string {
  if (grid.length === 0) return '';
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;
  ctx.font = `${fontSize}px ${fontFamily}`;
  const charWidth = ctx.measureText('M').width;
  const lineHeight = fontSize * 1.2;
  const cols = grid[0].length;
  const rows = grid.length;
  canvas.width = Math.ceil(charWidth * cols) + 20;
  canvas.height = Math.ceil(lineHeight * rows) + 20;
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.font = `${fontSize}px ${fontFamily}`;
  ctx.fillStyle = fgColor;
  ctx.textBaseline = 'top';
  for (let y = 0; y < rows; y++) {
    ctx.fillText(grid[y].join(''), 10, 10 + y * lineHeight);
  }
  return canvas.toDataURL('image/png');
}
