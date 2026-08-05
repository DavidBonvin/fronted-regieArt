import React from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { router } from './router';
import './shared/api/client';
import './styles/global.scss';
import { initTheme } from './shared/theme/themeStore';
import { initI18n } from './shared/i18n';

document.documentElement.setAttribute('data-theme', 'dark');
initTheme();
initI18n();

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);
