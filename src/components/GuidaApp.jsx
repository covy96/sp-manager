import { useEffect, useState } from "react";
import { useTheme } from "../contexts/ThemeContext";
import { useIsMobile } from "../hooks/useIsMobile";

// ══════════════════════════════════════════════════════════════════
//  Illustrazioni SVG (mockup schematici, theme-aware, nessun asset)
// ══════════════════════════════════════════════════════════════════
function Art({ type, c }) {
  const common = { width: "100%", height: "100%", viewBox: "0 0 360 150", preserveAspectRatio: "xMidYMid meet", role: "img" };
  const rc = 6; // border radius generico

  const card = (x, y, w, h, fill = c.soft, stroke = c.frame) =>
    <rect x={x} y={y} width={w} height={h} rx={rc} fill={fill} stroke={stroke} strokeWidth="1.2" />;
  const line = (x, y, w, col = c.lite, h = 6) =>
    <rect x={x} y={y} width={w} height={h} rx={h / 2} fill={col} />;
  const arrow = (x1, x2, y) => (
    <g stroke={c.navy} strokeWidth="1.6" fill="none">
      <line x1={x1} y1={y} x2={x2 - 5} y2={y} />
      <path d={`M ${x2 - 9} ${y - 4} L ${x2 - 2} ${y} L ${x2 - 9} ${y + 4}`} />
    </g>
  );

  switch (type) {
    case "welcome":
      return (
        <svg {...common}>
          {card(20, 18, 320, 114, c.soft)}
          {card(20, 18, 78, 114, c.softer)}
          {[34, 50, 66, 82, 98].map((y, k) => <rect key={k} x={32} y={y} width={54} height={7} rx={3.5} fill={k === 1 ? c.navy : c.lite} />)}
          {line(116, 36, 120, c.mute, 9)}
          {card(116, 58, 96, 56, c.softer)}
          {card(224, 58, 96, 56, c.softer)}
          <circle cx={140} cy={80} r={10} fill={c.navy} opacity="0.85" />
          {line(124, 98, 80)}{line(232, 74, 72)}{line(232, 88, 56)}{line(232, 100, 64)}
        </svg>
      );
    case "flow":
      return (
        <svg {...common}>
          {card(14, 46, 92, 58)}{line(26, 60, 60, c.mute, 8)}{line(26, 76, 50)}{line(26, 88, 40)}
          {arrow(110, 130, 75)}
          {card(134, 46, 92, 58)}{line(146, 60, 60, c.navy, 8)}{line(146, 76, 50)}{line(146, 88, 40)}
          {arrow(230, 250, 75)}
          {card(254, 46, 92, 58)}{line(266, 60, 60, c.green, 8)}{line(266, 76, 50)}{line(266, 88, 40)}
          <text x={60} y={120} fill={c.mute} fontSize="9" textAnchor="middle" fontFamily="monospace">OFFERTA</text>
          <text x={180} y={120} fill={c.mute} fontSize="9" textAnchor="middle" fontFamily="monospace">COMMESSA</text>
          <text x={300} y={120} fill={c.mute} fontSize="9" textAnchor="middle" fontFamily="monospace">FATTURA</text>
        </svg>
      );
    case "contacts":
      return (
        <svg {...common}>
          {card(40, 16, 280, 118)}
          {[30, 66, 102].map((y, k) => (
            <g key={k}>
              <circle cx={66} cy={y + 16} r={12} fill={k === 0 ? c.navy : c.softer} stroke={c.frame} />
              {line(90, y + 8, 120, c.mute, 8)}{line(90, y + 22, 80)}
              <rect x={250} y={y + 8} width={50} height={16} rx={8} fill={c.softer} stroke={c.frame} />
            </g>
          ))}
        </svg>
      );
    case "services":
      return (
        <svg {...common}>
          {card(40, 16, 280, 118)}
          {line(58, 32, 130, c.navy, 9)}
          {[58, 80, 102].map((y, k) => (
            <g key={k}>
              <rect x={58} y={y} width={14} height={14} rx={4} fill={c.green} opacity={k === 2 ? 0.4 : 1} />
              <path d={`M ${61} ${y + 7} l 3 3 l 6 -7`} stroke="#fff" strokeWidth="1.6" fill="none" />
              {line(82, y + 4, 180 - k * 30)}
            </g>
          ))}
        </svg>
      );
    case "lineitems":
      return (
        <svg {...common}>
          {card(30, 18, 300, 114)}
          {line(44, 32, 90, c.mute, 8)}
          <text x={300} y={40} fill={c.mute} fontSize="9" textAnchor="end" fontFamily="monospace">€</text>
          {[56, 80, 104].map((y, k) => (
            <g key={k}>
              {line(44, y, 150)}
              <rect x={250} y={y - 3} width={64} height={13} rx={6} fill={c.navy} opacity="0.85" />
            </g>
          ))}
        </svg>
      );
    case "offer":
      return (
        <svg {...common}>
          {card(108, 12, 144, 126, c.softer)}
          {line(124, 28, 60, c.navy, 8)}
          {[46, 60, 74, 88].map((y, k) => line(124, y, 112 - (k % 2) * 30))}
          {card(124, 102, 112, 24, c.navy)}
          <text x={180} y={118} fill="#fff" fontSize="11" textAnchor="middle" fontFamily="monospace">TOTALE €</text>
        </svg>
      );
    case "payments":
      return (
        <svg {...common}>
          {card(30, 30, 300, 90)}
          {line(46, 46, 70, c.mute, 8)}
          <rect x={46} y={66} width={268} height={20} rx={10} fill={c.softer} stroke={c.frame} />
          <rect x={46} y={66} width={170} height={20} rx={10} fill={c.green} />
          <circle cx={216} cy={76} r={4} fill="#fff" />
          <text x={50} y={106} fill={c.green} fontSize="10" fontFamily="monospace">INCASSATO</text>
          <text x={314} y={106} fill={c.mute} fontSize="10" textAnchor="end" fontFamily="monospace">RESIDUO</text>
        </svg>
      );
    case "invoice":
      return (
        <svg {...common}>
          {card(108, 12, 144, 126, c.softer)}
          {[30, 44, 58, 72, 86].map((y, k) => line(124, y, 112 - (k % 2) * 40))}
          <rect x={124} y={104} width={84} height={20} rx={10} fill={c.green} />
          <text x={166} y={118} fill="#fff" fontSize="9" textAnchor="middle" fontFamily="monospace">PAGATA</text>
          <circle cx={228} cy={112} r={12} fill="none" stroke={c.green} strokeWidth="1.6" />
          <path d="M 223 112 l 4 4 l 7 -8" stroke={c.green} strokeWidth="1.8" fill="none" />
        </svg>
      );
    case "projects":
      return (
        <svg {...common}>
          {[18, 134, 250].map((x, col) => (
            <g key={col}>
              {line(x + 6, 18, 60, c.mute, 8)}
              {Array.from({ length: 3 - (col === 2 ? 1 : 0) }).map((_, k) => (
                <g key={k}>{card(x, 34 + k * 34, 92, 28, c.softer)}{line(x + 10, 44 + k * 34, 50, k === 0 && col === 0 ? c.navy : c.lite)}</g>
              ))}
            </g>
          ))}
        </svg>
      );
    case "timesheet":
      return (
        <svg {...common}>
          {card(24, 18, 312, 114)}
          {[0, 1, 2, 3, 4].map((cx) => <text key={cx} x={66 + cx * 56} y={36} fill={c.mute} fontSize="8" textAnchor="middle" fontFamily="monospace">{["L", "M", "M", "G", "V"][cx]}</text>)}
          {[0, 1, 2].map((r) => (
            <g key={r}>
              {line(36, 54 + r * 26, 24, c.mute)}
              {[0, 1, 2, 3, 4].map((col) => {
                const filled = (r + col) % 2 === 0;
                return <g key={col}><rect x={44 + col * 56} y={48 + r * 26} width={44} height={16} rx={4} fill={filled ? c.navy : c.softer} opacity={filled ? 0.85 : 1} stroke={c.frame} />
                  {filled && <text x={66 + col * 56} y={60 + r * 26} fill="#fff" fontSize="8" textAnchor="middle" fontFamily="monospace">8h</text>}</g>;
              })}
            </g>
          ))}
        </svg>
      );
    case "permit":
      return (
        <svg {...common}>
          {card(64, 12, 130, 126, c.softer)}
          {[30, 44, 58, 72].map((y, k) => line(80, y, 98 - (k % 2) * 30))}
          <circle cx={150} cy={108} r={16} fill="none" stroke={c.navy} strokeWidth="1.6" strokeDasharray="3 2" />
          <text x={150} y={112} fill={c.navy} fontSize="8" textAnchor="middle" fontFamily="monospace">OK</text>
          {card(214, 36, 86, 78, c.softer)}
          <rect x={214} y={36} width={86} height={20} rx={6} fill={c.amber} />
          <text x={257} y={50} fill="#fff" fontSize="9" textAnchor="middle" fontFamily="monospace">SCADENZA</text>
          {[66, 84, 102].map((y, k) => line(226, y, 62 - k * 14, c.lite, 5))}
        </svg>
      );
    case "sitereport":
      return (
        <svg {...common}>
          {card(34, 16, 150, 118, c.softer)}
          <path d="M 46 116 L 86 70 L 110 100 L 134 60 L 172 116 Z" fill={c.navy} opacity="0.5" />
          <circle cx={150} cy={44} r={9} fill={c.amber} />
          {card(200, 16, 126, 118)}
          {[32, 48, 64, 80, 96, 112].map((y, k) => line(214, y, 98 - (k % 3) * 24))}
        </svg>
      );
    case "gantt":
      return (
        <svg {...common}>
          {card(24, 16, 312, 118)}
          {[0, 1, 2, 3].map((k) => <line key={k} x1={120 + k * 54} y1={28} x2={120 + k * 54} y2={124} stroke={c.frame} strokeWidth="1" />)}
          {[{ y: 40, x: 120, w: 110, col: c.navy }, { y: 66, x: 174, w: 90, col: c.green }, { y: 92, x: 120, w: 60, col: c.amber }].map((b, k) => (
            <g key={k}>{line(40, b.y + 4, 60, c.mute)}<rect x={b.x} y={b.y} width={b.w} height={14} rx={7} fill={b.col} /></g>
          ))}
        </svg>
      );
    case "team":
      return (
        <svg {...common}>
          {[0, 1, 2, 3].map((k) => (
            <g key={k}>
              <circle cx={70 + k * 75} cy={56} r={20} fill={k === 0 ? c.navy : c.softer} stroke={c.frame} strokeWidth="1.2" />
              <circle cx={70 + k * 75} cy={49} r={7} fill={k === 0 ? "#fff" : c.mute} />
              <path d={`M ${56 + k * 75} 70 a 14 10 0 0 1 28 0`} fill={k === 0 ? "#fff" : c.mute} />
              <rect x={48 + k * 75} y={88} width={44} height={14} rx={7} fill={c.softer} stroke={c.frame} />
              <text x={70 + k * 75} y={98} fill={c.mute} fontSize="7.5" textAnchor="middle" fontFamily="monospace">{["TITOLARE", "PM", "ARCH.", "COLLAB."][k]}</text>
            </g>
          ))}
        </svg>
      );
    case "analytics":
      return (
        <svg {...common}>
          {card(24, 16, 312, 118)}
          <line x1={44} y1={116} x2={320} y2={116} stroke={c.frame} strokeWidth="1.2" />
          {[40, 62, 54, 84, 72, 100].map((h, k) => (
            <rect key={k} x={56 + k * 44} y={116 - h} width={26} height={h} rx={4} fill={k === 5 ? c.green : c.navy} opacity={k === 5 ? 1 : 0.55 + k * 0.06} />
          ))}
        </svg>
      );
    case "rocket":
      return (
        <svg {...common}>
          <g transform="translate(180 78)">
            <path d="M 0 -42 C 16 -26 16 4 0 22 C -16 4 -16 -26 0 -42 Z" fill={c.navy} />
            <circle cx={0} cy={-14} r={7} fill={c.softer} />
            <path d="M -12 10 L -24 26 L -8 18 Z" fill={c.amber} />
            <path d="M 12 10 L 24 26 L 8 18 Z" fill={c.amber} />
            <path d="M -4 22 L 0 40 L 4 22 Z" fill={c.amber} opacity="0.8" />
          </g>
          {[[80, 40], [280, 50], [110, 110], [260, 112]].map(([x, y], k) => (
            <g key={k} stroke={c.mute} strokeWidth="1.4"><line x1={x - 5} y1={y} x2={x + 5} y2={y} /><line x1={x} y1={y - 5} x2={x} y2={y + 5} /></g>
          ))}
        </svg>
      );
    default:
      return <svg {...common}>{card(24, 16, 312, 118)}</svg>;
  }
}

// ══════════════════════════════════════════════════════════════════
//  Slide della guida (contenuti basati sulle funzioni reali dell'app)
// ══════════════════════════════════════════════════════════════════
const SLIDES = [
  {
    art: "welcome", emoji: "👋", titolo: "Benvenuto in SP Manager",
    testo: "Il gestionale per studi di architettura e professionisti tecnici: progetti, offerte, commesse, pagamenti, pratiche e team — tutto in un posto solo.",
    punti: ["Sfoglia con le frecce ← → o i pulsanti", "Riapri questa guida quando vuoi dalla pagina Info"],
  },
  {
    art: "flow", emoji: "🔄", titolo: "Il flusso di lavoro",
    testo: "Il cuore dell'app è il percorso che porta un lavoro dall'idea all'incasso:",
    punti: ["Offerta → Commessa → Proforma / Fattura", "Ogni passaggio eredita i dati dal precedente, senza riscrivere nulla"],
  },
  {
    art: "contacts", emoji: "👤", titolo: "Anagrafica & Clienti",
    testo: "La rubrica unica dello studio. Salvi una volta i dati di clienti e committenti e li richiami ovunque.",
    punti: ["Riusa i contatti in offerte, commesse e progetti", "Ogni cliente mostra i lavori collegati"],
  },
  {
    art: "services", emoji: "🧩", titolo: "Gestione Servizi",
    testo: "Definisci i tuoi servizi e le task predefinite per ciascuno. Quando avvii un lavoro, le attività si creano da sole.",
    punti: ["Imposta una volta i servizi tipici dello studio", "Riduci il lavoro manuale ad ogni nuovo progetto"],
  },
  {
    art: "lineitems", emoji: "📑", titolo: "Voci Offerta",
    testo: "Le voci predefinite con prezzo da inserire nelle offerte con un clic. Le attivi, disattivi e personalizzi per ogni offerta.",
    punti: ["Listino sempre pronto, niente importi a memoria", "Modifica il prezzo caso per caso quando serve"],
  },
  {
    art: "offer", emoji: "📋", titolo: "Offerte",
    testo: "Componi il preventivo scegliendo le voci e applicando sconti. Quando il cliente accetta, diventa una commessa.",
    punti: ["Totale calcolato in automatico", "Accettazione → commessa, in un clic"],
  },
  {
    art: "payments", emoji: "💼", titolo: "Commesse & pagamenti",
    testo: "Ogni commessa mostra a colpo d'occhio la situazione economica.",
    punti: ["Importo totale, incassato e residuo sempre aggiornati", "Rate, costi extra e costi interni per il margine reale"],
  },
  {
    art: "invoice", emoji: "🧾", titolo: "Proforma & Fatture", plan: "Studio",
    testo: "Genera proforma e fatture collegate alle commesse, senza perdere il filo dei pagamenti.",
    punti: ["Il flusso si adatta al tipo di cliente (privato o società)", "Scadenze e stato pagamento sotto controllo"],
  },
  {
    art: "projects", emoji: "📁", titolo: "Progetti & Scrivania",
    testo: "Organizza il lavoro per progetto e segui le attività.",
    punti: ["Progetti: contenitore di ogni lavoro con dati e stato", "Scrivania: il tuo centro personale con le task assegnate a te"],
  },
  {
    art: "timesheet", emoji: "⏱", titolo: "Timesheet",
    testo: "Registra le ore lavorate su ciascun progetto: è la base per redditività e carico di lavoro.",
    punti: ["Inserimento giorno per giorno, con note", "Le ore alimentano report e analisi automaticamente"],
  },
  {
    art: "permit", emoji: "🏛", titolo: "Pratiche edilizie",
    testo: "Tieni traccia delle pratiche di ogni progetto: tipo, stato e scadenze.",
    punti: ["Le scadenze compaiono nello Scadenzario in Dashboard", "Non perdi più una data importante"],
  },
  {
    art: "sitereport", emoji: "📐", titolo: "Report di cantiere",
    testo: "Documenta i sopralluoghi con note e foto, ed esportali in PDF professionale.",
    punti: ["Allega foto e annotazioni al progetto", "Personalizza intestazione e logo da Impostazioni → Report"],
  },
  {
    art: "gantt", emoji: "📅", titolo: "Calendario & Gantt", plan: "Studio",
    testo: "Pianifica scadenze e lavorazioni nel tempo.",
    punti: ["Calendario: eventi, scadenze e appuntamenti", "Gantt: le fasi dei progetti su una timeline visiva"],
  },
  {
    art: "team", emoji: "👥", titolo: "Team & permessi", plan: "Studio",
    testo: "Invita i collaboratori e assegna a ciascuno il ruolo giusto.",
    punti: ["Condividi il codice invito (in Profilo Studio)", "Ruoli da Titolare a Collaboratore, con permessi su misura"],
  },
  {
    art: "analytics", emoji: "📊", titolo: "Analisi & Report", plan: "Pro",
    testo: "Trasforma i dati in decisioni con viste aggregate su economia e produttività.",
    punti: ["Analisi: KPI, incassi, margini, andamento offerte", "Report: ore per progetto e per membro, esportabili"],
  },
  {
    art: "rocket", emoji: "🚀", titolo: "Sfruttala al massimo",
    testo: "Qualche consiglio per partire con il piede giusto:",
    punti: ["Completa Profilo Studio, Servizi e Voci offerta", "Esporta i dati quando vuoi · Aiuto: info@asmstudio.it"],
  },
];

export default function GuidaApp({ open, onClose }) {
  const { T, isDark } = useTheme();
  const isMobile = useIsMobile();
  const [i, setI] = useState(0);
  const mono = { fontFamily: "'IBM Plex Mono', monospace" };

  const isFirst = i === 0;
  const isLast = i === SLIDES.length - 1;
  const next = () => setI((v) => Math.min(SLIDES.length - 1, v + 1));
  const prev = () => setI((v) => Math.max(0, v - 1));

  useEffect(() => { if (open) setI(0); }, [open]);

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

  // Palette per le illustrazioni
  const c = {
    frame: T.borderMd,
    soft: isDark ? "rgba(255,255,255,0.045)" : "rgba(19,49,92,0.04)",
    softer: isDark ? "rgba(255,255,255,0.08)" : "rgba(19,49,92,0.07)",
    lite: `${T.muted}66`,
    mute: T.muted,
    navy: T.navy,
    green: "#1a9d5c",
    amber: "#d97706",
  };

  return (
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, zIndex: 80, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(14,14,13,0.6)", padding: 16 }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ width: "100%", maxWidth: 560, maxHeight: "92vh", overflowY: "auto", background: T.glassBg, backdropFilter: T.blur, WebkitBackdropFilter: T.blur, border: `1px solid ${T.glassBorder}`, borderRadius: T.radius, boxShadow: T.shadowLg, padding: isMobile ? "20px 18px" : "26px 30px", display: "flex", flexDirection: "column" }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <span style={{ ...mono, fontSize: 9, letterSpacing: "0.2em", textTransform: "uppercase", color: T.muted }}>
            Guida · {String(i + 1).padStart(2, "0")} / {String(SLIDES.length).padStart(2, "0")}
          </span>
          <button onClick={onClose} aria-label="Chiudi" style={{ background: "none", border: "none", cursor: "pointer", color: T.muted, fontSize: 22, lineHeight: 1 }}>×</button>
        </div>

        {/* Illustrazione */}
        <div style={{ height: isMobile ? 130 : 150, background: c.soft, border: `1px solid ${T.border}`, borderRadius: T.radiusSm, marginBottom: 18, padding: 8, boxSizing: "border-box" }}>
          <Art type={s.art} c={c} />
        </div>

        {/* Contenuto slide */}
        <div style={{ minHeight: isMobile ? 150 : 130 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8, flexWrap: "wrap" }}>
            <span style={{ fontSize: 22 }}>{s.emoji}</span>
            <h2 style={{ fontSize: 19, fontWeight: 700, color: T.ink, margin: 0, letterSpacing: "-0.02em" }}>{s.titolo}</h2>
            {s.plan && (
              <span style={{ ...mono, fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase", color: s.plan === "Pro" ? "#d97706" : T.navy, background: s.plan === "Pro" ? "rgba(217,119,6,0.12)" : `${T.navy}18`, border: `0.5px solid ${s.plan === "Pro" ? "rgba(217,119,6,0.3)" : `${T.navy}33`}`, padding: "2px 8px", borderRadius: 3 }}>
                Piano {s.plan}
              </span>
            )}
          </div>
          <p style={{ fontSize: 14, color: T.muted, lineHeight: 1.65, margin: "0 0 14px" }}>{s.testo}</p>
          {s.punti && (
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 9 }}>
              {s.punti.map((p, idx) => (
                <li key={idx} style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 13, color: T.ink, lineHeight: 1.55 }}>
                  <span style={{ color: T.navy, fontWeight: 700, flexShrink: 0 }}>→</span>
                  <span>{p}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Dots */}
        <div style={{ display: "flex", justifyContent: "center", flexWrap: "wrap", gap: 6, margin: "20px 0 16px" }}>
          {SLIDES.map((_, idx) => (
            <button key={idx} onClick={() => setI(idx)} aria-label={`Slide ${idx + 1}`}
              style={{ width: idx === i ? 18 : 7, height: 7, borderRadius: 4, border: "none", padding: 0, cursor: "pointer", background: idx === i ? T.navy : T.borderMd, transition: "all 0.2s" }} />
          ))}
        </div>

        {/* Footer navigazione */}
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, paddingTop: 14, borderTop: `0.5px solid ${T.border}` }}>
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
