import type { ThemeMode } from '@regieart/ui';

const STORAGE_KEY = 'regieart_theme_mode';
const ATTRIBUTE = 'data-theme';

function applyTheme(mode: ThemeMode): void {
  document.documentElement.setAttribute(ATTRIBUTE, mode);
}

function getStoredMode(): ThemeMode {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === 'light' || stored === 'dark') return stored;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function initTheme(): void {
  applyTheme(getStoredMode());
}

export function toggleTheme(): ThemeMode {
  const current = document.documentElement.getAttribute(ATTRIBUTE) as ThemeMode ?? 'dark';
  const next: ThemeMode = current === 'dark' ? 'light' : 'dark';
  applyTheme(next);
  localStorage.setItem(STORAGE_KEY, next);
  return next;
}

export function getCurrentMode(): ThemeMode {
  return (document.documentElement.getAttribute(ATTRIBUTE) as ThemeMode) ?? 'dark';
}
