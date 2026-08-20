import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { applyTheme } from './core/theme/themes';
import { loadSettings } from './core/storage/settings';

// Apply the saved theme before React mounts so the first paint uses the
// user's chosen palette. Champion Elite is the default when no preference
// is saved.
try {
  applyTheme(loadSettings().theme);
} catch {
  // ignore — CSS fallbacks reproduce Champion Elite
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
