import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../../contexts/ThemeContext";
import { useStudio } from "../../hooks/useStudio";
import { usePageTitleOnMount } from "../../hooks/usePageTitle";
import { useToast } from "../../contexts/ToastContext";
import { supabase } from "../../lib/supabase";

function currency(v) {
  return new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(Number(v) || 0);
}

const STATI = {
  bozza:     { label: "Bozza",     color: "#7a7a8a",  bg: "rgba(122,122,138,0.10)" },
  inviato:   { label: "Inviato",   color: "#b8600a",  bg: "rgba(184,96,10,0.10)"   },
  accettato: { label: "Accettato", color: "#1a6b3c",  bg: "rgba(26,107,60,0.10)"   },
  rifiutato: { label: "Rifiutato", color: "#b91c1c",  bg: "rgba(185,28,28,0.10)"   },
};

const STATO_ORDER = ["bozza", "inviato", "accettato", "rifiutato"];

function StatoBadge({ stato }) {
  const s = STATI[stato] ?? STATI.bozza;
  return (
    <span style={{
      fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, letterSpacing: "0.08em",
      textTransform: "uppercase", color: s.color, background: s.bg,
      padding: "3px 9px", borderRadius: 99, display: "inline-block",
    }}>{s.label}</span>
  );
}

function RowMenu({ prev, onChangeStato, onDuplica, onElimina }) {
  const { T } = useTheme();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button onClick={(e) => { e.stopPropagation(); setOpen(p => !p); }}
        style={{ background: "none", border: "none", cursor: "pointer", padding: "4px 8px", color: T.muted, fontSize: 18, lineHeight: 1 }}>
        ⋯
      </button>
      {open && (
        <div onClick={e => e.stopPropagation()} style={{
          position: "absolute", right: 0, top: "100%", zIndex: 30, minWidth: 160,
          background: T.glassBg, border: `1px solid ${T.border}`, borderRadius: T.radiusSm,
          boxShadow: T.shadowMd, padding: "4px 0",
        }}>
          <div style={{ padding: "4px 8px 2px", fontFamily: "'IBM Plex Mono', monospace", fontSize: 8, letterSpacing: "0.1em", textTransform: "uppercase", color: T.muted }}>
            Cambia stato
          </div>
          {STATO_ORDER.filter(s => s !== prev.stato).map(s => (
            <button key={s} onClick={() => { onChangeStato(s); setOpen(false); }} style={{
              display: "block", width: "100%", textAlign: "left", background: "none", border: "none",
              cursor: "pointer", padding: "7px 14px", fontFamily: "'Space Grotesk', sans-serif",
              fontSize: 12, color: T.ink,
            }}>
              <StatoBadge stato={s} />
            </button>
          ))}
          <div style={{ height: "0.5px", background: T.border, margin: "4px 0" }} />
          <button onClick={() => { onDuplica(); setOpen(false); }} style={{
            display: "block", width: "100%", textAlign: "left", background: "none", border: "none",
            cursor: "pointer", padding: "7px 14px", fontFamily: "'Space Grotesk', sans-serif",
            fontSize: 12, color: T.ink,
          }}>Duplica</button>
          <button onClick={() => { onElimina(); setOpen(false); }} style={{
            display: "block", width: "100%", textAlign: "left", background: "none", border: "none",
            cursor: "pointer", padding: "7px 14px", fontFamily: "'Space Grotesk', sans-serif",
            fontSize: 12, color: "#b91c1c",
          }}>Sposta nel Cestino</button>
        </div>
      )}
    </div>
  );
}

export default function PreventiviPage() {
  usePageTitleOnMount("Preventivi");
  const navigate = useNavigate();
  const { T } = useTheme();
  const { studioId } = useStudio();
  const toast = useToast();

  const [preventivi, setPreventivi] = useState([]);
  const [commesse, setCommesse] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtroStato, setFiltroStato] = useState("tutti");

  useEffect(() => {
    if (!studioId) return;
    Promise.all([
      supabase.from("preventivi").select("*").eq("studio", studioId).is("deleted_at", null).order("created_at", { ascending: false }),
      supabase.from("commesse").select("id,nome_commessa,numero_offerta").eq("studio", studioId).is("deleted_at", null),
    ]).then(([{ data: p }, { data: c }]) => {
      setPreventivi(p ?? []);
      setCommesse(c ?? []);
      setLoading(false);
    });
  }, [studioId]);

  const commessaMap = Object.fromEntries((commesse ?? []).map(c => [c.id, c]));

  const filtrati = filtroStato === "tutti" ? preventivi : preventivi.filter(p => p.stato === filtroStato);

  const handleChangeStato = async (prev, stato) => {
    setPreventivi(ps => ps.map(p => p.id === prev.id ? { ...p, stato } : p));
    const { error } = await supabase.from("preventivi").update({ stato }).eq("id", prev.id);
    if (error) { toast?.error("Errore aggiornamento stato"); setPreventivi(ps => ps.map(p => p.id === prev.id ? { ...p, stato: prev.stato } : p)); }
  };

  const handleDuplica = async (prev) => {
    const { data: voci } = await supabase.from("preventivo_voci").select("*").eq("preventivo_id", prev.id);
    const { data: newPrev, error } = await supabase.from("preventivi").insert({
      studio: studioId,
      commessa_id: prev.commessa_id,
      cliente: prev.cliente,
      mq: prev.mq,
      tariffa_mq_snapshot: prev.tariffa_mq_snapshot,
      importo_lavori: prev.importo_lavori,
      durata_settimane: prev.durata_settimane,
      tariffa_settimanale_snapshot: prev.tariffa_settimanale_snapshot,
      tot_progettazione: prev.tot_progettazione,
      tot_dl: prev.tot_dl,
      tot_fisse: prev.tot_fisse,
      imponibile: prev.imponibile,
      rivalsa_inarcassa: prev.rivalsa_inarcassa,
      totale: prev.totale,
      stato: "bozza",
    }).select().single();
    if (error) { toast?.error("Errore nella duplicazione"); return; }
    if (voci?.length) {
      await supabase.from("preventivo_voci").insert(
        voci.map(({ id: _id, preventivo_id: _pid, ...v }) => ({ ...v, preventivo_id: newPrev.id, studio: studioId }))
      );
    }
    setPreventivi(ps => [newPrev, ...ps]);
    toast?.success("Preventivo duplicato");
  };

  const handleElimina = async (prev) => {
    setPreventivi(ps => ps.filter(p => p.id !== prev.id));
    const { error } = await supabase.from("preventivi").update({ deleted_at: new Date().toISOString() }).eq("id", prev.id);
    if (error) { toast?.error("Errore eliminazione"); setPreventivi(ps => [prev, ...ps]); }
    else toast?.success("Preventivo spostato nel cestino");
  };

  const mono = { fontFamily: "'IBM Plex Mono', monospace" };

  const thSt = { padding: "10px 14px", fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase", color: T.muted, textAlign: "left", borderBottom: `0.5px solid ${T.borderMd}`, fontWeight: 400, whiteSpace: "nowrap" };
  const tdSt = { padding: "13px 14px", borderBottom: `0.5px solid ${T.border}`, fontSize: 13, color: T.ink, verticalAlign: "middle" };

  return (
    <div style={{ padding: "28px 24px", maxWidth: 900, margin: "0 auto" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: T.ink, fontFamily: "'Space Grotesk', sans-serif" }}>
            Preventivi <span style={{ ...mono, fontSize: 10, color: T.muted, fontWeight: 400, letterSpacing: "0.1em", textTransform: "uppercase", marginLeft: 8, background: T.navyLight, padding: "2px 8px", borderRadius: 99 }}>BETA</span>
          </h1>
          <p style={{ margin: "4px 0 0", fontSize: 12, color: T.muted, fontFamily: "'Space Grotesk', sans-serif" }}>
            {preventivi.length} preventiv{preventivi.length === 1 ? "o" : "i"} totali
          </p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={() => navigate("/preventivi/config")} style={{
            background: "transparent", border: `0.5px solid ${T.borderMd}`, borderRadius: 8,
            ...mono, fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase",
            color: T.muted, padding: "8px 14px", cursor: "pointer",
          }}>
            ⚙ Config
          </button>
          <button onClick={() => navigate("/preventivi/nuovo")} style={{
            background: T.navy, border: "none", borderRadius: 8, color: T.bg,
            ...mono, fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase",
            padding: "8px 18px", cursor: "pointer",
          }}>
            + Nuovo
          </button>
        </div>
      </div>

      {/* Filtro stato */}
      <div style={{ display: "flex", gap: 6, marginBottom: 18 }}>
        {[["tutti", "Tutti"], ...STATO_ORDER.map(s => [s, STATI[s].label])].map(([k, l]) => (
          <button key={k} onClick={() => setFiltroStato(k)} style={{
            background: filtroStato === k ? T.navy : "transparent",
            border: `0.5px solid ${filtroStato === k ? T.navy : T.borderMd}`,
            borderRadius: 99, color: filtroStato === k ? T.bg : T.muted,
            ...mono, fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase",
            padding: "5px 12px", cursor: "pointer",
          }}>{l}</button>
        ))}
      </div>

      {/* Tabella */}
      <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.radius, boxShadow: T.shadow, overflow: "hidden" }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: "center", ...mono, fontSize: 11, color: T.muted }}>Caricamento…</div>
        ) : filtrati.length === 0 ? (
          <div style={{ padding: 48, textAlign: "center" }}>
            <div style={{ fontSize: 13, color: T.muted, fontFamily: "'Space Grotesk', sans-serif" }}>
              {filtroStato === "tutti" ? "Nessun preventivo ancora." : `Nessun preventivo in stato "${STATI[filtroStato]?.label}".`}
            </div>
            {filtroStato === "tutti" && (
              <button onClick={() => navigate("/preventivi/nuovo")} style={{
                marginTop: 14, background: T.navy, border: "none", borderRadius: 8, color: T.bg,
                ...mono, fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase",
                padding: "8px 18px", cursor: "pointer",
              }}>
                + Crea il primo preventivo
              </button>
            )}
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={thSt}>Cliente / Commessa</th>
                  <th style={{ ...thSt, textAlign: "right" }}>Totale</th>
                  <th style={thSt}>Stato</th>
                  <th style={thSt}>Data</th>
                  <th style={{ ...thSt, width: 40 }} />
                </tr>
              </thead>
              <tbody>
                {filtrati.map(prev => {
                  const comm = commessaMap[prev.commessa_id];
                  return (
                    <tr key={prev.id} onClick={() => navigate(`/preventivi/${prev.id}`)}
                      style={{ cursor: "pointer", transition: "background 120ms" }}
                      onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.25)"}
                      onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                      <td style={tdSt}>
                        <div style={{ fontWeight: 600 }}>{prev.cliente || <span style={{ color: T.muted }}>—</span>}</div>
                        {comm && <div style={{ fontSize: 11, color: T.muted, marginTop: 2, fontFamily: "'IBM Plex Mono', monospace" }}>{comm.nome_commessa || comm.numero_offerta}</div>}
                      </td>
                      <td style={{ ...tdSt, textAlign: "right", ...mono, fontWeight: 700, fontSize: 14 }}>
                        {currency(prev.totale)}
                      </td>
                      <td style={tdSt}><StatoBadge stato={prev.stato} /></td>
                      <td style={{ ...tdSt, color: T.muted, ...mono, fontSize: 11 }}>
                        {new Date(prev.created_at).toLocaleDateString("it-IT")}
                      </td>
                      <td style={{ ...tdSt, padding: "4px 6px" }} onClick={e => e.stopPropagation()}>
                        <RowMenu
                          prev={prev}
                          onChangeStato={s => handleChangeStato(prev, s)}
                          onDuplica={() => handleDuplica(prev)}
                          onElimina={() => handleElimina(prev)}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
