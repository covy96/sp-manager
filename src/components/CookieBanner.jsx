import { useState } from "react";

export default function CookieBanner() {
  const [visible, setVisible] = useState(() => {
    try {
      return localStorage.getItem("asm_cookie_consent") === null;
    } catch {
      return false;
    }
  });

  if (!visible) return null;

  const accept = (value) => {
    try { localStorage.setItem("asm_cookie_consent", value); } catch {}
    setVisible(false);
  };

  return (
    <div style={{
      position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 9999,
      background: "#1c1c1e", borderTop: "1px solid #48484a",
      padding: "14px 20px",
      display: "flex", alignItems: "center", justifyContent: "space-between",
      flexWrap: "wrap", gap: 12,
    }}>
      <p style={{ color: "rgba(255,255,255,0.75)", fontSize: 13, margin: 0, flex: "1 1 300px", lineHeight: 1.5 }}>
        ASM utilizza cookie tecnici essenziali per il funzionamento del servizio.
        Utilizziamo anche cookie analitici per migliorare l'esperienza.{" "}
        <a
          href="/privacy"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: "#0a84ff", textDecoration: "underline" }}
        >
          Privacy Policy
        </a>
        .
      </p>
      <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
        <button
          onClick={() => accept("essential")}
          style={{
            background: "none", border: "1px solid rgba(255,255,255,0.25)", cursor: "pointer",
            color: "rgba(255,255,255,0.6)", padding: "7px 16px",
            fontFamily: "'IBM Plex Mono', monospace", fontSize: 11,
            letterSpacing: "0.06em", textTransform: "uppercase", whiteSpace: "nowrap",
          }}
        >
          Solo essenziali
        </button>
        <button
          onClick={() => accept("all")}
          style={{
            background: "#0a84ff", border: "none", cursor: "pointer",
            color: "#fff", padding: "7px 18px",
            fontFamily: "'IBM Plex Mono', monospace", fontSize: 11,
            letterSpacing: "0.06em", textTransform: "uppercase", whiteSpace: "nowrap",
          }}
        >
          Accetta tutti
        </button>
      </div>
    </div>
  );
}
