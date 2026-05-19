import { useEffect, useState } from "react";
import { usePageTitleOnMount } from "../../hooks/usePageTitle";

const T = {
  ink: '#0E0E0D', navy: '#13315C', paper: '#EEF1F6', muted: '#8a847b',
  ink10: '#0E0E0D1A', ink20: '#0E0E0D33',
};

function SunIcon() {
  return <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>;
}
function MoonIcon() {
  return <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>;
}
function MonitorIcon() {
  return <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>;
}

const THEMES = [
  { id: "light",  label: "Chiaro",  Icon: SunIcon,     desc: "Sempre tema chiaro" },
  { id: "dark",   label: "Scuro",   Icon: MoonIcon,    desc: "Sempre tema scuro" },
  { id: "system", label: "Sistema", Icon: MonitorIcon, desc: "Segue le impostazioni del dispositivo" },
];

// ── Applica il tema su <html> ─────────────────────────────────────
export function applyTheme(t) {
  const html = document.documentElement;
  html.classList.remove("dark", "light");

  if (t === "dark") {
    html.classList.add("dark");
  } else if (t === "light") {
    html.classList.add("light");
  } else {
    // system
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    if (prefersDark) html.classList.add("dark");
    else html.classList.add("light");
  }
}

// ── Inizializza tema al caricamento (chiamata da main.jsx) ────────
export function initTheme() {
  const saved = localStorage.getItem("asm-theme") || "system";
  applyTheme(saved);
}

export default function AspettoPage() {
  usePageTitleOnMount("Aspetto");
  const [theme, setTheme] = useState(() => localStorage.getItem("asm-theme") || "system");

  // Ascolta cambiamenti di sistema quando in modalità "system"
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => {
      if (localStorage.getItem("asm-theme") === "system") applyTheme("system");
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const handleChange = (t) => {
    setTheme(t);
    localStorage.setItem("asm-theme", t);
    applyTheme(t);
  };

  return (
    <div style={{ maxWidth: 560 }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 18, fontWeight: 600, color: T.ink, letterSpacing: '-0.02em', marginBottom: 4 }}>Aspetto</div>
        <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: T.muted, letterSpacing: '0.05em' }}>
          Personalizza l'aspetto dell'applicazione
        </div>
      </div>

      <div style={{ background: '#fff', border: `0.5px solid ${T.ink10}`, padding: '20px 22px' }}>
        <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, letterSpacing: '0.25em', textTransform: 'uppercase', color: T.muted, marginBottom: 16 }}>Tema</div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
          {THEMES.map(({ id, label, Icon, desc }) => {
            const active = theme === id;
            return (
              <button key={id} onClick={() => handleChange(id)} style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
                padding: '20px 12px', border: `0.5px solid ${active ? T.navy : T.ink20}`,
                background: active ? '#EEF3FA' : '#fff', cursor: 'pointer', transition: 'all 0.1s',
              }}>
                <span style={{ color: active ? T.navy : T.muted }}><Icon /></span>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, letterSpacing: '0.05em', color: active ? T.navy : T.muted, textTransform: 'uppercase' }}>
                    {label}
                  </div>
                  <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: T.muted, marginTop: 4, lineHeight: 1.4 }}>
                    {desc}
                  </div>
                </div>
                {active && (
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: T.navy }} />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Preview del tema corrente */}
      <div style={{ marginTop: 14, background: '#fff', border: `0.5px solid ${T.ink10}`, padding: '14px 18px' }}>
        <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: T.muted, marginBottom: 10 }}>
          Anteprima tema corrente
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {[
            { label: 'Sfondo', color: 'var(--asm-bg)' },
            { label: 'Card', color: 'var(--asm-surface)' },
            { label: 'Testo', color: 'var(--asm-ink)' },
            { label: 'Navy', color: 'var(--asm-navy)' },
            { label: 'Brass', color: 'var(--asm-brass)' },
          ].map(({ label, color }) => (
            <div key={label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 32, height: 32, background: color, border: `0.5px solid ${T.ink10}` }} />
              <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 8, color: T.muted }}>{label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
