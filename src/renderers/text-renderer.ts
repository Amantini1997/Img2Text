export function gridToText(grid: string[][]): string {
  return grid.map(row => row.join('')).join('\n');
}
