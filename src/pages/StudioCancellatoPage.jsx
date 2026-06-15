import { useNavigate } from "react-router-dom";
import { useTheme } from "../contexts/ThemeContext";
import { useStudio } from "../hooks/useStudio";
import { supabase } from "../lib/supabase";
import AsmSeal from "../components/AsmSeal";
import EsportaDatiPage from "./settings/EsportaDatiPage";

function giorniRimanenti(deleteAfter) {
  if (!deleteAfter) return null;
  const ms = new Date(deleteAfter).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}

export default function StudioCancellatoPage() {
  const { T, isDark } = useTheme();
  const { studio, studioDeleteAfter } = useStudio();
  const navigate = useNavigate();
  const mono = { fontFamily: "'IBM Plex Mono', monospace" };

  const giorni = giorniRimanenti(studioDeleteAfter);

  const handleLogout = async () => {
    localStorage.removeItem("asm-active-studio");
    await supabase.auth.signOut();
    navigate("/login");
  };

  return (
    <div style={{ minHeight: "100vh", background: T.bg, padding: "32px 20px" }}>
      <div style={{ maxWidth: 600, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28 }}>
          <AsmSeal size="sm" theme={isDark ? "dark" : "light"} showBorder />
          <button onClick={handleLogout}
            style={{ background: "transparent", border: `0.5px solid ${T.borderMd}`, borderRadius: T.radiusSm, color: T.ink, ...mono, fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", padding: "7px 16px", cursor: "pointer" }}>
            Esci
          </button>
        </div>

        {/* Banner studio cancellato */}
        <div style={{ background: T.redLight, border: `1px solid ${T.red}55`, borderRadius: T.radius, padding: "22px 24px", marginBottom: 24 }}>
          <div style={{ fontSize: 17, fontWeight: 700, color: T.red, marginBottom: 8 }}>
            Studio cancellato
          </div>
          <div style={{ fontSize: 13, color: T.ink, lineHeight: 1.7, marginBottom: giorni != null ? 14 : 0 }}>
            Lo studio <strong>{studio?.name || ""}</strong> è stato cancellato. L'accesso alle funzionalità è stato
            disattivato, ma puoi ancora <strong>scaricare i tuoi dati</strong> finché restano disponibili.
          </div>
          {giorni != null && (
            <div style={{ ...mono, fontSize: 11, color: T.red, background: `${T.red}14`, border: `0.5px solid ${T.red}33`, borderRadius: T.radiusSm, padding: "10px 14px" }}>
              ⏳ I dati verranno eliminati definitivamente tra <strong>{giorni} {giorni === 1 ? "giorno" : "giorni"}</strong>.
              Scaricali ora: dopo questa scadenza non saranno più recuperabili.
            </div>
          )}
        </div>

        {/* Pannello di esportazione (riuso della pagina esistente) */}
        <EsportaDatiPage />

      </div>
    </div>
  );
}
