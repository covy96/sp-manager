import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTheme } from "../../contexts/ThemeContext";
import { useStudio } from "../../hooks/useStudio";
import { usePageTitleOnMount } from "../../hooks/usePageTitle";
import { useToast } from "../../contexts/ToastContext";
import { supabase } from "../../lib/supabase";

function currency(v) {
  return new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(Number(v) || 0);
}

const STATI = {
  bozza:     { label: "Bozza",     color: "#7a7a8a",  bg: "rgba(122,122,138,0.10)" },
  inviato:   { label: "Inviato",   color: "#b8600a",  bg: "rgba(184,96,10,0.10)"   },
  accettato: { label: "Accettato", color: "#1a6b3c",  bg: "rgba(26,107,60,0.10)"   },
  rifiutato: { label: "Rifiutato", color: "#b91c1c",  bg: "rgba(185,28,28,0.10)"   },
};

const STATO_ORDER = ["bozza", "inviato", "accettato", "rifiutato"];

function StatoBadge({ stato, size = "sm" }) {
  const s = STATI[stato] ?? STATI.bozza;
  return (
    <span style={{
      fontFamily: "'IBM Plex Mono', monospace", fontSize: size === "lg" ? 11 : 9,
      letterSpacing: "0.08em", textTransform: "uppercase", color: s.color, background: s.bg,
      padding: size === "lg" ? "5px 14px" : "3px 9px", borderRadius: 99, display: "inline-block",
    }}>{s.label}</span>
  );
}

function Riga({ label, value, bold, dimmed, big }) {
  const { T } = useTheme();
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 0", borderBottom: `0.5px solid ${T.border}` }}>
      <span style={{ fontSize: 13, color: dimmed ? T.muted : T.ink, fontFamily: "'Space Grotesk', sans-serif" }}>{label}</span>
      <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: big ? 16 : 13, fontWeight: bold ? 700 : 400, color: dimmed ? T.muted : T.ink }}>
        {value}
      </span>
    </div>
  );
}

export default function PreventivoDetailPage() {
  usePageTitleOnMount("Preventivo");
  const navigate = useNavigate();
  const { id } = useParams();
  const { T } = useTheme();
  const { studioId } = useStudio();
  const toast = useToast();

  const [prev, setPrev] = useState(null);
  const [voci, setVoci] = useState([]);
  const [commessa, setCommessa] = useState(null);
  const [loading, setLoading] = useState(true);
  const [savingStato, setSavingStato] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!id || !studioId) return;
    Promise.all([
      supabase.from("preventivi").select("*").eq("id", id).eq("studio", studioId).single(),
      supabase.from("preventivo_voci").select("*").eq("preventivo_id", id).order("ordine"),
    ]).then(async ([{ data: p, error }, { data: v }]) => {
      if (error || !p) { navigate("/preventivi"); return; }
      setPrev(p);
      setVoci(v ?? []);
      if (p.commessa_id) {
        const { data: c } = await supabase.from("commesse").select("id,nome_commessa,numero_offerta").eq("id", p.commessa_id).single();
        setCommessa(c ?? null);
      }
      setLoading(false);
    });
  }, [id, studioId, navigate]);

  const handleChangeStato = async (stato) => {
    setSavingStato(true);
    const { error } = await supabase.from("preventivi").update({ stato }).eq("id", id);
    setSavingStato(false);
    if (error) { toast?.error("Errore aggiornamento stato"); return; }
    setPrev(p => ({ ...p, stato }));
  };

  const handleDuplica = async () => {
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
    if (error) { toast?.error("Errore duplicazione"); return; }
    if (voci.length) {
      await supabase.from("preventivo_voci").insert(
        voci.map(({ id: _id, preventivo_id: _pid, ...v }) => ({ ...v, preventivo_id: newPrev.id, studio: studioId }))
      );
    }
    toast?.success("Preventivo duplicato");
    navigate(`/preventivi/${newPrev.id}`);
  };

  const handleElimina = async () => {
    const { error } = await supabase.from("preventivi").update({ deleted_at: new Date().toISOString() }).eq("id", id);
    if (error) { toast?.error("Errore eliminazione"); return; }
    toast?.success("Preventivo spostato nel cestino");
    navigate("/preventivi");
  };

  const mono = { fontFamily: "'IBM Plex Mono', monospace" };
  const fg = { fontFamily: "'Space Grotesk', sans-serif" };

  if (loading) return (
    <div style={{ padding: 48, textAlign: "center", ...mono, fontSize: 11, color: T.muted }}>Caricamento…</div>
  );

  return (
    <div style={{ padding: "28px 24px", maxWidth: 740, margin: "0 auto" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <button onClick={() => navigate("/preventivi")} style={{ background: "none", border: "none", cursor: "pointer", color: T.muted, fontSize: 18, padding: "4px 8px" }}>←</button>
          <div>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: T.ink, ...fg }}>
              {prev.cliente || "Preventivo"}
            </h1>
            {commessa && (
              <div style={{ marginTop: 3, fontSize: 12, color: T.muted, ...mono }}>
                {commessa.nome_commessa || commessa.numero_offerta}
              </div>
            )}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, paddingTop: 4 }}>
          <StatoBadge stato={prev.stato} size="lg" />
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 280px", gap: 18, alignItems: "start" }}>

        {/* Breakdown voci */}
        <div>
          <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.radius, boxShadow: T.shadow, overflow: "hidden", marginBottom: 16 }}>
            <div style={{ padding: "13px 20px", borderBottom: `0.5px solid ${T.borderMd}` }}>
              <div style={{ ...mono, fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", color: T.navy, fontWeight: 600 }}>Dettaglio voci</div>
            </div>
            <div style={{ padding: "16px 20px" }}>
              {voci.map(v => (
                <Riga key={v.id} label={v.label} value={currency(v.importo)} />
              ))}
              {voci.length === 0 && (
                <div style={{ fontSize: 12, color: T.muted, ...fg }}>Nessuna voce registrata.</div>
              )}
            </div>
          </div>

          {/* Parametri di calcolo */}
          <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.radius, boxShadow: T.shadow, overflow: "hidden" }}>
            <div style={{ padding: "13px 20px", borderBottom: `0.5px solid ${T.borderMd}` }}>
              <div style={{ ...mono, fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", color: T.navy, fontWeight: 600 }}>Parametri</div>
            </div>
            <div style={{ padding: "16px 20px" }}>
              <Riga label="Superficie (mq)" value={`${prev.mq} mq`} />
              <Riga label="Tariffa €/mq (snapshot)" value={currency(prev.tariffa_mq_snapshot)} />
              <Riga label="Importo lavori" value={currency(prev.importo_lavori)} />
              <Riga label="Durata DL (settimane)" value={`${prev.durata_settimane}`} />
              <Riga label="Tariffa settimanale DL (snapshot)" value={currency(prev.tariffa_settimanale_snapshot)} />
              <Riga label="Creato il" value={new Date(prev.created_at).toLocaleDateString("it-IT")} dimmed />
            </div>
          </div>
        </div>

        {/* Colonna destra: riepilogo + azioni */}
        <div>
          {/* Totali */}
          <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.radius, boxShadow: T.shadowMd, overflow: "hidden", marginBottom: 14 }}>
            <div style={{ padding: "13px 18px", borderBottom: `0.5px solid ${T.borderMd}` }}>
              <div style={{ ...mono, fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", color: T.navy, fontWeight: 600 }}>Riepilogo</div>
            </div>
            <div style={{ padding: "14px 18px" }}>
              <Riga label="Progettazione" value={currency(prev.tot_progettazione)} />
              <Riga label="Direzione Lavori" value={currency(prev.tot_dl)} />
              <Riga label="Voci fisse" value={currency(prev.tot_fisse)} />
              <div style={{ height: 1, background: T.borderMd, margin: "8px 0" }} />
              <Riga label="Imponibile" value={currency(prev.imponibile)} />
              <Riga label="Rivalsa Inarcassa" value={currency(prev.rivalsa_inarcassa)} dimmed />
              <div style={{ height: 1, background: T.borderHeavy, margin: "8px 0" }} />
              <Riga label="Totale" value={currency(prev.totale)} bold big />
            </div>
          </div>

          {/* Cambia stato */}
          <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.radius, boxShadow: T.shadow, overflow: "hidden", marginBottom: 14 }}>
            <div style={{ padding: "12px 16px", borderBottom: `0.5px solid ${T.borderMd}` }}>
              <div style={{ ...mono, fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: T.muted }}>Cambia stato</div>
            </div>
            <div style={{ padding: "12px 16px", display: "flex", flexWrap: "wrap", gap: 6 }}>
              {STATO_ORDER.map(s => (
                <button key={s} onClick={() => handleChangeStato(s)} disabled={savingStato || s === prev.stato} style={{
                  background: s === prev.stato ? STATI[s].bg : "transparent",
                  border: `0.5px solid ${s === prev.stato ? STATI[s].color : T.borderMd}`,
                  borderRadius: 99, cursor: s === prev.stato ? "default" : "pointer",
                  ...mono, fontSize: 9, letterSpacing: "0.08em", textTransform: "uppercase",
                  color: s === prev.stato ? STATI[s].color : T.muted,
                  padding: "5px 12px", opacity: savingStato ? 0.5 : 1,
                }}>{STATI[s].label}</button>
              ))}
            </div>
          </div>

          {/* Azioni */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <button onClick={handleDuplica} style={{
              background: "transparent", border: `0.5px solid ${T.borderMd}`, borderRadius: 8,
              ...mono, fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase",
              color: T.ink, padding: "9px 0", cursor: "pointer", width: "100%",
            }}>Duplica preventivo</button>

            {!confirmDelete ? (
              <button onClick={() => setConfirmDelete(true)} style={{
                background: "transparent", border: `0.5px solid ${T.borderMd}`, borderRadius: 8,
                ...mono, fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase",
                color: T.muted, padding: "9px 0", cursor: "pointer", width: "100%",
              }}>Sposta nel Cestino</button>
            ) : (
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => setConfirmDelete(false)} style={{
                  flex: 1, background: "transparent", border: `0.5px solid ${T.borderMd}`, borderRadius: 8,
                  ...mono, fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase",
                  color: T.muted, padding: "9px 0", cursor: "pointer",
                }}>Annulla</button>
                <button onClick={handleElimina} style={{
                  flex: 1, background: "#b91c1c", border: "none", borderRadius: 8,
                  ...mono, fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase",
                  color: "#fff", padding: "9px 0", cursor: "pointer",
                }}>Conferma</button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
