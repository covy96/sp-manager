// ─────────────────────────────────────────────────────────────────────────────
// CAPEX · Caricamento e analisi AI di un preventivo
// Bottone di upload (PDF/Excel) → estrazione via Edge Function → card di
// revisione con i dati proposti (editabili) → creazione della voce CAPEX.
// Componente autonomo: la sola integrazione richiesta in CapexPanel è renderlo
// e ricaricare la lista tramite onCreated.
// ─────────────────────────────────────────────────────────────────────────────
import { useRef, useState } from "react";
import { supabase } from "../lib/supabase";
import { useTheme } from "../contexts/ThemeContext";
import { useToast } from "../contexts/ToastContext";
import { analizzaPreventivo, aggiornaAnalisi } from "../lib/capexAnalisi";

const CATEGORIE = [
  "Edile", "Elettricista", "Idraulico", "Illuminotecnica", "Falegnameria",
  "Serramenti", "Cucina", "Pittura", "Arredo", "Altro",
];

function currency(v) {
  return new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR", maximumFractionDigits: 2 }).format(Number(v) || 0);
}

const EMPTY_FORM = { fornitore: "", categoria: "Edile", data_preventivo: "", importo: "", note: "" };

export default function CapexAnalisiUpload({ projectId, onCreated }) {
  const { T } = useTheme();
  const showToast = useToast();
  const fileRef = useRef(null);

  const mono = { fontFamily: "'IBM Plex Mono', monospace" };
  const inputSt = {
    width: "100%", padding: "7px 10px", boxSizing: "border-box",
    border: `1px solid ${T.borderMd}`, borderRadius: T.radiusSm, background: T.surface, color: T.ink,
    fontSize: 12, fontFamily: "'Space Grotesk', sans-serif", outline: "none",
  };
  const labelSt = { ...mono, fontSize: 8, letterSpacing: "0.2em", textTransform: "uppercase", color: T.muted, marginBottom: 5 };

  const [phase, setPhase]     = useState("idle");   // idle | analyzing | review | saving
  const [analisi, setAnalisi] = useState(null);
  const [form, setForm]       = useState(EMPTY_FORM);
  const [showRighe, setShowRighe] = useState(false);

  const reset = () => {
    setPhase("idle"); setAnalisi(null); setForm(EMPTY_FORM); setShowRighe(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  const onPick = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhase("analyzing");
    try {
      const a = await analizzaPreventivo(file, projectId);
      setAnalisi(a);
      setForm({
        fornitore: a.fornitore || "",
        categoria: a.categoria || "Altro",
        data_preventivo: a.data_preventivo || "",
        importo: a.importo_totale ?? "",
        note: a.note || a.raw?.note || "",
      });
      setPhase("review");
    } catch (err) {
      showToast(err.message || "Analisi non riuscita");
      reset();
    }
  };

  const handleCrea = async () => {
    const importo = Number(String(form.importo).replace(",", "."));
    if (!form.categoria.trim()) { showToast("Categoria obbligatoria"); return; }
    if (!(importo >= 0)) { showToast("Importo non valido"); return; }
    setPhase("saving");
    try {
      const { data: voce, error } = await supabase.from("capex_voci").insert({
        project_id: projectId,
        categoria: form.categoria.trim(),
        fornitore: form.fornitore.trim() || null,
        data_preventivo: form.data_preventivo || null,
        importo,
        note: form.note.trim() || null,
      }).select("*").single();
      if (error) throw error;
      // Collega l'analisi alla voce creata (best-effort).
      if (analisi?.id) { try { await aggiornaAnalisi(analisi.id, { capex_voce_id: voce.id }); } catch { /* ignore */ } }
      showToast("Voce CAPEX creata dal preventivo");
      reset();
      onCreated?.();
    } catch (err) {
      showToast("Errore creazione voce: " + (err.message || err));
      setPhase("review");
    }
  };

  // ── Stato: idle → bottone di caricamento ────────────────────────────
  if (phase === "idle") {
    return (
      <div style={{ marginBottom: 18 }}>
        <input ref={fileRef} type="file" accept=".pdf,.xlsx,.xls,.xlsm,application/pdf" onChange={onPick} style={{ display: "none" }} />
        <button
          onClick={() => fileRef.current?.click()}
          style={{
            display: "flex", alignItems: "center", justifyContent: "center", gap: 10, width: "100%",
            border: `1px dashed ${T.navy}`, borderRadius: T.radius, background: T.navyLight,
            padding: "14px 16px", cursor: "pointer",
          }}>
          <span style={{ fontSize: 15 }}>✦</span>
          <span style={{ ...mono, fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: T.navy, fontWeight: 600 }}>
            Carica preventivo (PDF/Excel) · analisi AI
          </span>
        </button>
        <div style={{ ...mono, fontSize: 9, color: T.muted, marginTop: 6, textAlign: "center" }}>
          L'AI estrae fornitore, categoria e importo. Rivedi e conferma prima di creare la voce.
        </div>
      </div>
    );
  }

  // ── Stato: analyzing → spinner ──────────────────────────────────────
  if (phase === "analyzing") {
    return (
      <div style={{ marginBottom: 18, border: `1px solid ${T.navy}`, borderRadius: T.radius, background: T.navyLight, padding: "18px 16px", textAlign: "center" }}>
        <div style={{ ...mono, fontSize: 11, letterSpacing: "0.06em", textTransform: "uppercase", color: T.navy, fontWeight: 600 }}>
          Analisi del preventivo in corso…
        </div>
        <div style={{ ...mono, fontSize: 9, color: T.muted, marginTop: 6 }}>
          Lettura del documento ed estrazione dei dati. Può richiedere qualche secondo.
        </div>
      </div>
    );
  }

  // ── Stato: review / saving → card di revisione ──────────────────────
  const confColor = analisi?.confidence === "alta" ? T.green : analisi?.confidence === "bassa" ? T.red : T.brass;
  const righe = Array.isArray(analisi?.righe) ? analisi.righe : [];
  const saving = phase === "saving";

  return (
    <div style={{ marginBottom: 18, border: `1px solid ${T.brass}`, borderRadius: T.radius, background: T.bg, padding: 16 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, gap: 8 }}>
        <div style={{ ...mono, fontSize: 8, letterSpacing: "0.2em", textTransform: "uppercase", color: T.brass }}>
          ✦ Proposta AI dal preventivo{analisi?.file_name ? ` · ${analisi.file_name}` : ""}
        </div>
        {analisi?.confidence && (
          <span style={{ ...mono, fontSize: 8, letterSpacing: "0.1em", textTransform: "uppercase", color: confColor, border: `1px solid ${confColor}`, borderRadius: T.radiusSm, padding: "2px 6px" }}>
            Affidabilità {analisi.confidence}
          </span>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1.2fr 1fr 1fr", gap: 10 }}>
        <div>
          <div style={labelSt}>Fornitore</div>
          <input value={form.fornitore} onChange={e => setForm(p => ({ ...p, fornitore: e.target.value }))} placeholder="Es. Impresa Rossi" style={inputSt} />
        </div>
        <div>
          <div style={labelSt}>Categoria *</div>
          <input list="capex-cat-list" value={form.categoria} onChange={e => setForm(p => ({ ...p, categoria: e.target.value }))} placeholder="Es. Edile" style={inputSt} autoComplete="off" />
          <datalist id="capex-cat-list">
            {CATEGORIE.map(c => <option key={c} value={c} />)}
          </datalist>
        </div>
        <div>
          <div style={labelSt}>Data preventivo</div>
          <input type="date" value={form.data_preventivo} onChange={e => setForm(p => ({ ...p, data_preventivo: e.target.value }))} style={inputSt} />
        </div>
        <div>
          <div style={labelSt}>Importo (€) *</div>
          <input type="number" min="0" step="0.01" value={form.importo} onChange={e => setForm(p => ({ ...p, importo: e.target.value }))} placeholder="0,00" style={{ ...inputSt, ...mono }} />
        </div>
      </div>

      <div style={{ marginTop: 10 }}>
        <div style={labelSt}>Note</div>
        <input value={form.note} onChange={e => setForm(p => ({ ...p, note: e.target.value }))} placeholder="Note opzionali" style={inputSt} />
      </div>

      {/* Anteprima righe estratte (per controllo / futuro riscontro col capitolato) */}
      {righe.length > 0 && (
        <div style={{ marginTop: 12, border: `1px solid ${T.border}`, borderRadius: T.radiusSm, overflow: "hidden" }}>
          <button onClick={() => setShowRighe(s => !s)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", padding: "8px 10px", background: T.surface, border: "none", cursor: "pointer" }}>
            <span style={{ ...mono, fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase", color: T.muted }}>
              {righe.length} righe estratte
            </span>
            <span style={{ ...mono, fontSize: 11, color: T.muted }}>{showRighe ? "▾" : "▸"}</span>
          </button>
          {showRighe && (
            <div style={{ padding: "4px 0", maxHeight: 220, overflowY: "auto", background: T.surface }}>
              {righe.map((r, i) => (
                <div key={i} style={{ display: "flex", alignItems: "baseline", gap: 8, padding: "5px 10px", borderTop: `0.5px solid ${T.border}` }}>
                  <span style={{ fontSize: 11, color: T.ink, flex: 1, minWidth: 0 }}>{r.descrizione || "—"}</span>
                  {(r.quantita != null) && <span style={{ ...mono, fontSize: 9, color: T.muted }}>{r.quantita}{r.unita ? ` ${r.unita}` : ""}</span>}
                  {(r.importo != null) && <span style={{ ...mono, fontSize: 10, color: T.ink }}>{currency(r.importo)}</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 14 }}>
        <button onClick={reset} disabled={saving} style={{ border: `1px solid ${T.borderMd}`, borderRadius: T.radiusSm, background: "transparent", color: T.ink, ...mono, fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", padding: "8px 16px", cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.6 : 1 }}>
          Scarta
        </button>
        <button onClick={handleCrea} disabled={saving} style={{ background: T.navy, color: T.bg, border: "none", borderRadius: T.radiusSm, ...mono, fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", padding: "8px 18px", cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.6 : 1 }}>
          {saving ? "Creazione…" : "Crea voce CAPEX"}
        </button>
      </div>
    </div>
  );
}
