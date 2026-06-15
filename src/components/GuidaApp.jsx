import { useEffect, useState } from "react";
import { useTheme } from "../contexts/ThemeContext";
import { useIsMobile } from "../hooks/useIsMobile";

// ── Slide della guida ─────────────────────────────────────────────
// Contenuti basati sulle funzioni reali dell'app. Il tag "plan" indica
// le funzioni disponibili dai piani Studio/Pro (puramente informativo).
const SLIDES = [
  {
    emoji: "👋",
    titolo: "Benvenuto in SP Manager",
    testo: "Il gestionale pensato per studi di architettura e professionisti tecnici. In pochi passi gestisci progetti, offerte, commesse, pagamenti e team — tutto in un posto solo.",
    punti: [
      "Usa le frecce ← → o i pulsanti per sfogliare la guida",
      "Puoi riaprire questa guida quando vuoi da qui, nella pagina Info",
    ],
  },
  {
    emoji: "🔄",
    titolo: "Il flusso di lavoro",
    testo: "Il cuore di SP Manager è il percorso che porta un lavoro dall'idea all'incasso:",
    punti: [
      "Offerta — prepari il preventivo per il cliente",
      "Commessa — quando l'offerta è accettata diventa una commessa attiva",
      "Proforma / Fattura — emetti i documenti e monitori i pagamenti",
    ],
  },
  {
    emoji: "📁",
    titolo: "Progetti & Scrivania",
    testo: "Organizza il lavoro per progetto e tieni sotto controllo le tue attività.",
    punti: [
      "Progetti — crea il contenitore di ogni lavoro con dati cliente e stato",
      "Scrivania — il tuo centro personale con le task assegnate a te",
      "Assegna task ai membri del team e segui l'avanzamento",
    ],
  },
  {
    emoji: "⏱",
    titolo: "Timesheet",
    testo: "Registra le ore lavorate su ciascun progetto. È la base per capire redditività e carico di lavoro.",
    punti: [
      "Inserisci le ore giorno per giorno, con note opzionali",
      "Le ore confluiscono automaticamente nei report e nelle analisi",
    ],
  },
  {
    emoji: "💼",
    titolo: "Commesse & pagamenti",
    testo: "Ogni commessa ti mostra a colpo d'occhio la situazione economica.",
    punti: [
      "Monitora importo totale, incassato e residuo",
      "Suddividi l'importo in rate e segna i pagamenti ricevuti",
      "Aggiungi costi extra e costi interni per il margine reale",
    ],
  },
  {
    emoji: "🧾",
    titolo: "Proforma & Fatture",
    plan: "Studio",
    testo: "Genera proforma e fatture collegate alle commesse, senza perdere il filo dei pagamenti.",
    punti: [
      "Proforma → pagamento → fattura: il flusso si adatta al tipo di cliente",
      "Scadenze e stato pagamento sempre aggiornati",
    ],
  },
  {
    emoji: "👥",
    titolo: "Team & permessi",
    plan: "Studio",
    testo: "Invita i collaboratori e assegna a ciascuno il ruolo giusto.",
    punti: [
      "Condividi il codice invito dello studio (lo trovi in Profilo Studio)",
      "Ruoli da Titolare a Collaboratore, con permessi su misura",
    ],
  },
  {
    emoji: "📅",
    titolo: "Calendario & Gantt",
    testo: "Pianifica scadenze e lavorazioni nel tempo.",
    punti: [
      "Calendario — eventi, scadenze e appuntamenti dello studio",
      "Gantt — pianifica le fasi dei progetti su una timeline visiva (Studio)",
    ],
  },
  {
    emoji: "📊",
    titolo: "Analisi & Report",
    plan: "Pro",
    testo: "Trasforma i dati in decisioni con viste aggregate su economia e produttività.",
    punti: [
      "Analisi — KPI, andamento incassi, margini, offerte",
      "Report — ore per progetto e per membro, esportabili",
    ],
  },
  {
    emoji: "🚀",
    titolo: "Sfruttala al massimo",
    testo: "Qualche consiglio per partire con il piede giusto:",
    punti: [
      "Completa il Profilo Studio: dati, tipo di fatturazione e codice invito",
      "Esporta i tuoi dati quando vuoi da Impostazioni → Esporta dati",
      "Hai bisogno di aiuto? Scrivici a info@asmstudio.it",
    ],
  },
];

export default function GuidaApp({ open, onClose }) {
  const { T } = useTheme();
  const isMobile = useIsMobile();
  const [i, setI] = useState(0);
  const mono = { fontFamily: "'IBM Plex Mono', monospace" };

  const isFirst = i === 0;
  const isLast = i === SLIDES.length - 1;
  const next = () => setI((v) => Math.min(SLIDES.length - 1, v + 1));
  const prev = () => setI((v) => Math.max(0, v - 1));

  // Reset alla prima slide ogni volta che si apre
  useEffect(() => { if (open) setI(0); }, [open]);

  // Navigazione da tastiera
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "ArrowRight") next();
      else if (e.key === "ArrowLeft") prev();
      else if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const s = SLIDES[i];

  return (
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, zIndex: 80, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(14,14,13,0.6)", padding: 16 }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ width: "100%", maxWidth: 560, background: T.glassBg, backdropFilter: T.blur, WebkitBackdropFilter: T.blur, border: `1px solid ${T.glassBorder}`, borderRadius: T.radius, boxShadow: T.shadowLg, padding: isMobile ? "22px 20px" : "28px 32px", display: "flex", flexDirection: "column" }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
          <span style={{ ...mono, fontSize: 9, letterSpacing: "0.2em", textTransform: "uppercase", color: T.muted }}>
            Guida · {String(i + 1).padStart(2, "0")} / {String(SLIDES.length).padStart(2, "0")}
          </span>
          <button onClick={onClose} aria-label="Chiudi" style={{ background: "none", border: "none", cursor: "pointer", color: T.muted, fontSize: 22, lineHeight: 1 }}>×</button>
        </div>

        {/* Contenuto slide */}
        <div style={{ minHeight: isMobile ? 280 : 260 }}>
          <div style={{ fontSize: 44, marginBottom: 14 }}>{s.emoji}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10, flexWrap: "wrap" }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: T.ink, margin: 0, letterSpacing: "-0.02em" }}>{s.titolo}</h2>
            {s.plan && (
              <span style={{ ...mono, fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase", color: s.plan === "Pro" ? "#d97706" : T.navy, background: s.plan === "Pro" ? "rgba(217,119,6,0.12)" : `${T.navy}18`, border: `0.5px solid ${s.plan === "Pro" ? "rgba(217,119,6,0.3)" : `${T.navy}33`}`, padding: "2px 8px", borderRadius: 3 }}>
                Piano {s.plan}
              </span>
            )}
          </div>
          <p style={{ fontSize: 14, color: T.muted, lineHeight: 1.7, margin: "0 0 16px" }}>{s.testo}</p>
          {s.punti && (
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 10 }}>
              {s.punti.map((p, idx) => (
                <li key={idx} style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 13, color: T.ink, lineHeight: 1.6 }}>
                  <span style={{ color: T.navy, fontWeight: 700, flexShrink: 0 }}>→</span>
                  <span>{p}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Dots */}
        <div style={{ display: "flex", justifyContent: "center", gap: 6, margin: "22px 0 18px" }}>
          {SLIDES.map((_, idx) => (
            <button key={idx} onClick={() => setI(idx)} aria-label={`Slide ${idx + 1}`}
              style={{ width: idx === i ? 20 : 7, height: 7, borderRadius: 4, border: "none", padding: 0, cursor: "pointer", background: idx === i ? T.navy : T.borderMd, transition: "all 0.2s" }} />
          ))}
        </div>

        {/* Footer navigazione */}
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, paddingTop: 16, borderTop: `0.5px solid ${T.border}` }}>
          <button onClick={prev} disabled={isFirst}
            style={{ border: `0.5px solid ${T.borderMd}`, borderRadius: T.radiusSm, background: "transparent", color: T.ink, ...mono, fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", padding: "9px 18px", cursor: isFirst ? "not-allowed" : "pointer", opacity: isFirst ? 0.4 : 1 }}>
            ← Indietro
          </button>
          {isLast ? (
            <button onClick={onClose}
              style={{ border: "none", borderRadius: T.radiusSm, background: T.navy, color: "#EEF1F6", ...mono, fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", padding: "9px 22px", cursor: "pointer" }}>
              Inizia ✓
            </button>
          ) : (
            <button onClick={next}
              style={{ border: "none", borderRadius: T.radiusSm, background: T.navy, color: "#EEF1F6", ...mono, fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", padding: "9px 22px", cursor: "pointer" }}>
              Avanti →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
