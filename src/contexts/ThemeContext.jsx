import { createContext, useContext, useEffect, useState } from "react";

// ── PALETTE LIGHT — macOS Liquid Glass ───────────────────────────
const LIGHT = {
  // Sfondi
  bg:           '#e8eaf0',
  surface:      'rgba(255,255,255,0.72)',
  surface2:     'rgba(255,255,255,0.55)',
  surface3:     'rgba(255,255,255,0.40)',
  // Testo
  ink:          '#1a1a1e',
  ink60:        'rgba(26,26,30,0.6)',
  ink40:        'rgba(26,26,30,0.4)',
  muted:        '#7a7a8a',
  // Accenti
  navy:         '#13315C',
  navyLight:    'rgba(19,49,92,0.10)',
  brass:        '#D9C98A',
  // Bordi (vetro)
  border:       'rgba(255,255,255,0.6)',
  borderMd:     'rgba(0,0,0,0.10)',
  borderHeavy:  'rgba(0,0,0,0.18)',
  // Stati
  red:          '#b91c1c',
  redLight:     '#fef2f2',
  green:        '#1a6b3c',
  greenLight:   '#f0fdf4',
  yellow:       '#ff9500',
  yellowLight:  'rgba(255,149,0,0.10)',
  // Input
  inputBg:      'rgba(255,255,255,0.8)',
  inputBorder:  'rgba(0,0,0,0.12)',
  inputText:    '#1a1a1e',
  // Sidebar
  sidebarBg:    'rgba(30,30,36,0.88)',
  sidebarText:  'rgba(255,255,255,0.75)',
  sidebarActive:'rgba(255,255,255,0.12)',
  sidebarBorder:'rgba(255,255,255,0.07)',
  sidebarNum:   'rgba(217,201,138,0.65)',
  // Header
  headerBg:     'rgba(232,234,240,0.75)',
  headerBorder: 'rgba(255,255,255,0.55)',
  // Glass extras
  glassBg:      'rgba(248,249,252,0.92)',
  glassBorder:  'rgba(255,255,255,0.85)',
  glassSheen:   'rgba(255,255,255,0.25)',
  shadow:       '0 4px 24px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.05)',
  shadowMd:     '0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)',
  shadowLg:     '0 20px 60px rgba(0,0,0,0.16), 0 4px 16px rgba(0,0,0,0.08)',
  radius:       '14px',
  radiusSm:     '10px',
  radiusLg:     '20px',
  blur:         'blur(20px)',
  blurSm:       'blur(12px)',
};

// ── PALETTE DARK — macOS Liquid Glass Dark ────────────────────────
const DARK = {
  bg:           '#0f0f14',
  surface:      'rgba(40,40,50,0.75)',
  surface2:     'rgba(50,50,62,0.65)',
  surface3:     'rgba(35,35,45,0.55)',
  ink:          '#f0f0f5',
  ink60:        'rgba(240,240,245,0.6)',
  ink40:        'rgba(240,240,245,0.4)',
  muted:        '#8888a0',
  navy:         '#4a9eff',
  navyLight:    'rgba(74,158,255,0.15)',
  brass:        '#D9C98A',
  border:       'rgba(255,255,255,0.08)',
  borderMd:     'rgba(255,255,255,0.14)',
  borderHeavy:  'rgba(255,255,255,0.24)',
  red:          '#f87171',
  redLight:     'rgba(248,113,113,0.12)',
  green:        '#4ade80',
  greenLight:   'rgba(74,222,128,0.12)',
  yellow:       '#ffd60a',
  yellowLight:  'rgba(255,214,10,0.12)',
  inputBg:      'rgba(60,60,75,0.70)',
  inputBorder:  'rgba(255,255,255,0.12)',
  inputText:    '#f0f0f5',
  sidebarBg:    'rgba(16,16,22,0.92)',
  sidebarText:  'rgba(255,255,255,0.72)',
  sidebarActive:'rgba(255,255,255,0.10)',
  sidebarBorder:'rgba(255,255,255,0.06)',
  sidebarNum:   'rgba(217,201,138,0.60)',
  headerBg:     'rgba(20,20,28,0.80)',
  headerBorder: 'rgba(255,255,255,0.08)',
  glassBg:      'rgba(28,28,38,0.94)',
  glassBorder:  'rgba(255,255,255,0.12)',
  glassSheen:   'rgba(255,255,255,0.06)',
  shadow:       '0 4px 24px rgba(0,0,0,0.35), 0 1px 4px rgba(0,0,0,0.20)',
  shadowMd:     '0 8px 32px rgba(0,0,0,0.45), 0 2px 8px rgba(0,0,0,0.25)',
  shadowLg:     '0 20px 60px rgba(0,0,0,0.55), 0 4px 16px rgba(0,0,0,0.30)',
  radius:       '14px',
  radiusSm:     '10px',
  radiusLg:     '20px',
  blur:         'blur(20px)',
  blurSm:       'blur(12px)',
};

// ── CONTEXT ───────────────────────────────────────────────────────
const ThemeContext = createContext({
  theme: 'light',
  T: LIGHT,
  isDark: false,
  setTheme: () => {},
});

// ── APPLY THEME ───────────────────────────────────────────────────
function applyTheme(theme) {
  const html = document.documentElement;
  html.classList.remove('dark', 'light');

  if (theme === 'dark') {
    html.classList.add('dark');
  } else if (theme === 'light') {
    html.classList.add('light');
  } else {
    // system
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    html.classList.add(prefersDark ? 'dark' : 'light');
  }
}

export function initTheme() {
  const saved = localStorage.getItem('asm-theme') || 'light';
  applyTheme(saved);
}

// ── PROVIDER ──────────────────────────────────────────────────────
export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(
    () => localStorage.getItem('asm-theme') || 'light'
  );

  // Risolvi se "system"
  const resolvedDark = theme === 'dark' ||
    (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  const T = resolvedDark ? DARK : LIGHT;

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  // Ascolta cambiamenti sistema
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => { if (theme === 'system') applyTheme('system'); };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [theme]);

  const setTheme = (t) => {
    setThemeState(t);
    localStorage.setItem('asm-theme', t);
    applyTheme(t);
  };

  return (
    <ThemeContext.Provider value={{ theme, T, isDark: resolvedDark, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

// ── HOOK ─────────────────────────────────────────────────────────
export function useTheme() {
  return useContext(ThemeContext);
}

export { LIGHT, DARK };
