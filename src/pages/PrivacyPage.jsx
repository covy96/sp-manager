import { useNavigate } from "react-router-dom";

export default function PrivacyPage() {
  const navigate = useNavigate();

  return (
    <main style={{ minHeight: "100vh", background: "#1c1c1e", padding: "40px 20px" }}>
      <div style={{ maxWidth: 800, margin: "0 auto" }}>

        <button
          onClick={() => navigate(-1)}
          style={{
            background: "none", border: "1px solid rgba(255,255,255,0.15)", cursor: "pointer",
            color: "rgba(255,255,255,0.6)", padding: "7px 16px", marginBottom: 32,
            fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, letterSpacing: "0.05em",
            display: "inline-flex", alignItems: "center", gap: 6,
          }}
        >
          ← Torna indietro
        </button>

        <h1 style={{ fontSize: 28, fontWeight: 700, color: "#fff", marginBottom: 8 }}>
          Privacy Policy
        </h1>
        <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: "rgba(255,255,255,0.4)", marginBottom: 40 }}>
          Ultimo aggiornamento: Gennaio 2025
        </p>

        <div style={{ color: "rgba(255,255,255,0.75)", lineHeight: 1.8, fontSize: 14 }}>
          {/* Il testo verrà incollato qui */}
          <p style={{ color: "rgba(255,255,255,0.35)", fontStyle: "italic" }}>
            Il testo della Privacy Policy verrà inserito qui.
          </p>
        </div>

      </div>
    </main>
  );
}
