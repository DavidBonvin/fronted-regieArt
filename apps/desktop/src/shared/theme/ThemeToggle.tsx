import React, { useCallback, useState } from 'react';
import { getCurrentMode, toggleTheme } from './themeStore';

export function ThemeToggle() {
  const [mode, setMode] = useState(getCurrentMode);

  const handleToggle = useCallback(() => {
    const next = toggleTheme();
    setMode(next);
  }, []);

  return (
    <button
      type="button"
      aria-label={mode === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
      onClick={handleToggle}
      className="theme-toggle"
    >
      {mode === 'dark' ? '☀️' : '🌙'}
    </button>
  );
}
