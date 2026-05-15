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
  { id: "light", label: "Chiaro", Icon: SunIcon },
  { id: "dark", label: "Scuro", Icon: MoonIcon },
  { id: "system", label: "Sistema", Icon: MonitorIcon },
];

export default function AspettoPage() {
  usePageTitleOnMount("Aspetto");
  const [theme, setTheme] = useState("dark");

  useEffect(() => {
    const saved = localStorage.getItem("theme") || "dark";
    setTheme(saved); applyTheme(saved);
  }, []);

  const applyTheme = t => {
    const root = document.documentElement;
    if (t === "dark") { root.classList.add("dark"); root.classList.remove("light"); }
    else if (t === "light") { root.classList.add("light"); root.classList.remove("dark"); }
    else {
      const dark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      root.classList.toggle("dark", dark); root.classList.toggle("light", !dark);
    }
  };

  const handleChange = t => { setTheme(t); localStorage.setItem("theme", t); applyTheme(t); };

  return (
    <div style={{ maxWidth: 560 }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 18, fontWeight: 600, color: T.ink, letterSpacing: '-0.02em', marginBottom: 4 }}>Aspetto</div>
        <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: T.muted, letterSpacing: '0.05em' }}>Personalizza l'aspetto dell'applicazione</div>
      </div>

      <div style={{ background: '#fff', border: `0.5px solid ${T.ink10}`, padding: '20px 22px' }}>
        <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, letterSpacing: '0.25em', textTransform: 'uppercase', color: T.muted, marginBottom: 16 }}>Tema</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
          {THEMES.map(({ id, label, Icon }) => {
            const active = theme === id;
            return (
              <button key={id} onClick={() => handleChange(id)} style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
                padding: '20px 12px', border: `0.5px solid ${active ? T.navy : T.ink20}`,
                background: active ? '#EEF3FA' : '#fff', cursor: 'pointer', transition: 'all 0.1s',
              }}>
                <span style={{ color: active ? T.navy : T.muted }}><Icon /></span>
                <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, letterSpacing: '0.05em', color: active ? T.navy : T.muted, textTransform: 'uppercase' }}>{label}</span>
              </button>
            );
          })}
        </div>
        <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: T.muted, marginTop: 16, lineHeight: 1.6 }}>
          Il tema scuro è attualmente l'unico tema completamente supportato. Il tema chiaro è in sviluppo.
        </div>
      </div>
    </div>
  );
}
