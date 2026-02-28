const THEME_KEY = 'img2text-theme';

export function setupThemeToggle(): void {
  const toggle = document.getElementById('theme-toggle') as HTMLButtonElement;
  const html = document.documentElement;

  // Restore saved theme
  const saved = localStorage.getItem(THEME_KEY);
  if (saved === 'light' || saved === 'dark') {
    html.setAttribute('data-theme', saved);
  }

  toggle.addEventListener('click', () => {
    const current = html.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    html.setAttribute('data-theme', next);
    localStorage.setItem(THEME_KEY, next);
  });
}
