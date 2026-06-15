import { useNavigate } from "react-router-dom";
import { useTheme } from "../contexts/ThemeContext";
import { usePageTitleOnMount } from "../hooks/usePageTitle";
import { usePlan } from "../hooks/usePlan";
import AsmSeal from "../components/AsmSeal";

const APP_VERSION = "1.0.0";

const LINKS = [
  { label: "Privacy Policy",           path: "/privacy" },
  { label: "Termini e condizioni",     path: "/termini" },
  { label: "Cookie Policy",            path: "/cookie-policy" },
  { label: "Data Processing Agreement (DPA)", path: "/dpa" },
];

export default function InfoPage() {
  usePageTitleOnMount("Info");
  const navigate  = useNavigate();
  const { T, isDark } = useTheme();
  const { plan }  = usePlan();

  const mono = { fontFamily: "'IBM Plex Mono', monospace" };
  const label = { ...mono, fontSize: 9, letterSpacing: "0.2em", textTransform: "uppercase", color: T.muted };
  const card  = {
    background: T.surface,
    border: `1px solid ${T.border}`,
    borderRadius: T.radius,
    backdropFilter: T.blurSm,
    WebkitBackdropFilter: T.blurSm,
    boxShadow: T.shadow,
    padding: "20px 24px",
  };
  const divider = { height: "0.5px", background: T.border, margin: "16px 0" };
  const row = {
    display: "flex",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: 16,
    padding: "8px 0",
    borderBottom: `0.5px solid ${T.border}`,
  };
  const rowLast = { ...row, borderBottom: "none" };

  return (
    <div style={{ maxWidth: 600, margin: "0 auto" }}>

      {/* Seal */}
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 40, marginTop: 8 }}>
        <AsmSeal size="md" theme={isDark ? "dark" : "light"} showBorder showBottom />
      </div>

      {/* Guida all'uso */}
      <button
        onClick={() => window.dispatchEvent(new CustomEvent("asm-open-guide"))}
        style={{
          ...card, marginBottom: 14, width: "100%", textAlign: "left", cursor: "pointer",
          display: "flex", alignItems: "center", gap: 16,
          border: `1px solid ${T.navy}44`,
        }}
      >
        <div style={{ fontSize: 30, flexShrink: 0 }}>📘</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: T.ink, marginBottom: 3 }}>Guida all'uso</div>
          <div style={{ ...mono, fontSize: 10, color: T.muted, lineHeight: 1.5 }}>
            Slide esplicative su come usare l'app e sfruttarla al massimo
          </div>
        </div>
        <span style={{ ...mono, fontSize: 12, color: T.navy, fontWeight: 600, flexShrink: 0 }}>Apri →</span>
      </button>

      {/* Prodotto */}
      <div style={{ ...card, marginBottom: 14 }}>
        <div style={{ ...label, marginBottom: 14 }}>Prodotto</div>
        <div style={row}>
          <span style={{ ...mono, fontSize: 11, color: T.muted }}>Nome</span>
          <span style={{ fontSize: 13, fontWeight: 600, color: T.ink }}>SP Manager</span>
        </div>
        <div style={row}>
          <span style={{ ...mono, fontSize: 11, color: T.muted }}>Versione</span>
          <span style={{ ...mono, fontSize: 11, color: T.ink }}>{APP_VERSION}</span>
        </div>
        <div style={row}>
          <span style={{ ...mono, fontSize: 11, color: T.muted }}>Piano attivo</span>
          <span style={{
            ...mono, fontSize: 10,
            color: plan?.id === 'pro' ? '#d97706' : plan?.id === 'studio' ? T.navy : T.muted,
            background: plan?.id === 'pro' ? 'rgba(217,119,6,0.1)' : plan?.id === 'studio' ? `${T.navy}18` : T.surface2,
            padding: "2px 8px", borderRadius: 2, textTransform: "uppercase", letterSpacing: "0.08em",
          }}>
            {plan?.name || plan?.id || "Free"}
          </span>
        </div>
        <div style={rowLast}>
          <span style={{ ...mono, fontSize: 11, color: T.muted }}>Sviluppato da</span>
          <span style={{ fontSize: 13, color: T.ink }}>ASM</span>
        </div>
      </div>

      {/* Azienda */}
      <div style={{ ...card, marginBottom: 14 }}>
        <div style={{ ...label, marginBottom: 14 }}>Azienda</div>
        <div style={row}>
          <span style={{ ...mono, fontSize: 11, color: T.muted }}>Ragione sociale</span>
          <span style={{ fontSize: 13, fontWeight: 600, color: T.ink }}>Giacomo Coviello, arch. libero professionista</span>
        </div>
        <div style={rowLast}>
          <span style={{ ...mono, fontSize: 11, color: T.muted }}>Sede</span>
          <span style={{ fontSize: 13, color: T.ink }}>Milano (MI), Italia</span>
        </div>
      </div>

      {/* Assistenza */}
      <div style={{ ...card, marginBottom: 14 }}>
        <div style={{ ...label, marginBottom: 14 }}>Assistenza</div>
        <div style={row}>
          <span style={{ ...mono, fontSize: 11, color: T.muted }}>Email supporto</span>
          <a href="mailto:info@asmstudio.it" style={{ fontSize: 13, color: T.navy, textDecoration: "none", fontWeight: 500 }}>
            info@asmstudio.it
          </a>
        </div>
        <div style={rowLast}>
          <span style={{ ...mono, fontSize: 11, color: T.muted }}>Orari</span>
          <span style={{ fontSize: 13, color: T.ink }}>Lun–Ven, 9:00–18:00</span>
        </div>
      </div>

      {/* Legale */}
      <div style={{ ...card, marginBottom: 32 }}>
        <div style={{ ...label, marginBottom: 14 }}>Legale</div>
        {LINKS.map((l, i) => (
          <div key={l.path} style={i < LINKS.length - 1 ? row : rowLast}>
            <span style={{ ...mono, fontSize: 11, color: T.muted }}>{l.label}</span>
            <button
              onClick={() => navigate(l.path)}
              style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, color: T.navy, padding: 0, fontFamily: "'Space Grotesk', sans-serif", fontWeight: 500 }}
            >
              Leggi →
            </button>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div style={{ textAlign: "center", paddingBottom: 40 }}>
        <div style={{ ...mono, fontSize: 9, color: T.muted, letterSpacing: "0.15em" }}>
          © {new Date().getFullYear()} Giacomo Coviello, architetto libero professionista · Tutti i diritti riservati
        </div>
      </div>
    </div>
  );
}
