import { createContext, useContext, useEffect, useState } from "react";

// ── PALETTE LIGHT ────────────────────────────────────────────────
const LIGHT = {
  bg:           '#EEF1F6',
  surface:      '#ffffff',
  surface2:     '#f5f7fa',
  surface3:     '#EEF1F6',
  ink:          '#0E0E0D',
  ink60:        'rgba(14,14,13,0.6)',
  ink40:        'rgba(14,14,13,0.4)',
  muted:        '#8a847b',
  navy:         '#13315C',
  navyLight:    '#EEF3FA',
  brass:        '#D9C98A',
  border:       'rgba(14,14,13,0.12)',
  borderMd:     'rgba(14,14,13,0.2)',
  borderHeavy:  'rgba(14,14,13,0.35)',
  red:          '#b91c1c',
  redLight:     '#fef2f2',
  green:        '#1a6b3c',
  greenLight:   '#f0fdf4',
  yellow:       '#854d0e',
  yellowLight:  '#fefce8',
  inputBg:      '#ffffff',
  inputBorder:  'rgba(14,14,13,0.2)',
  inputText:    '#0E0E0D',
  // Sidebar sempre scura
  sidebarBg:    '#0E0E0D',
  sidebarText:  'rgba(238,241,246,0.8)',
  sidebarActive:'rgba(255,255,255,0.10)',
  sidebarBorder:'rgba(255,255,255,0.08)',
  sidebarNum:   'rgba(217,201,138,0.7)',
  headerBg:     '#EEF1F6',
  headerBorder: 'rgba(14,14,13,0.1)',
};

// ── PALETTE DARK ─────────────────────────────────────────────────
const DARK = {
  bg:           '#111110',
  surface:      '#1c1c1a',
  surface2:     '#242422',
  surface3:     '#1c1c1a',
  ink:          '#EEF1F6',
  ink60:        'rgba(238,241,246,0.6)',
  ink40:        'rgba(238,241,246,0.4)',
  muted:        '#8a847b',
  navy:         '#5b9bd5',
  navyLight:    'rgba(91,155,213,0.12)',
  brass:        '#D9C98A',
  border:       'rgba(238,241,246,0.1)',
  borderMd:     'rgba(238,241,246,0.18)',
  borderHeavy:  'rgba(238,241,246,0.3)',
  red:          '#f87171',
  redLight:     'rgba(248,113,113,0.1)',
  green:        '#4ade80',
  greenLight:   'rgba(74,222,128,0.1)',
  yellow:       '#fbbf24',
  yellowLight:  'rgba(251,191,36,0.1)',
  inputBg:      '#242422',
  inputBorder:  'rgba(238,241,246,0.15)',
  inputText:    '#EEF1F6',
  // Sidebar ancora più scura in dark
  sidebarBg:    '#0a0a09',
  sidebarText:  'rgba(238,241,246,0.8)',
  sidebarActive:'rgba(255,255,255,0.10)',
  sidebarBorder:'rgba(255,255,255,0.06)',
  sidebarNum:   'rgba(217,201,138,0.7)',
  headerBg:     '#1c1c1a',
  headerBorder: 'rgba(238,241,246,0.08)',
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
