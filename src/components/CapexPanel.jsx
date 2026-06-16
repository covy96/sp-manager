import { useEffect, useState, useMemo, useRef } from "react";
import * as XLSX from "xlsx";
import { supabase } from "../lib/supabase";
import { useTheme } from "../contexts/ThemeContext";
import { useBodyScrollLock } from "../hooks/useBodyScrollLock";
import { useEscKey } from "../hooks/useEscKey";
import { useToast } from "../contexts/ToastContext";
import SlidingTabs from "./SlidingTabs";

const CATEGORIE = [
  "Edile", "Elettricista", "Idraulico", "Illuminotecnica", "Falegnameria",
  "Serramenti", "Cucina", "Pittura", "Arredo", "Altro",
];

function currency(v) {
  return new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR", maximumFractionDigits: 2 }).format(Number(v) || 0);
}
function fmtDate(d) {
  return d ? new Date(d).toLocaleDateString("it-IT") : "—";
}

// voce: preventivo principale o "extra" (parent_id valorizzato)
const EMPTY_VOCE = { categoria: "Edile", fornitore: "", data_preventivo: "", importo: "", note: "" };
const EMPTY_PAG = { data_pagamento: new Date().toISOString().slice(0, 10), importo: "", note: "" };

export default function CapexPanel({ projectId, studioId, projectName }) {
  const { T } = useTheme();
  const showToast = useToast();

  const mono = { fontFamily: "'IBM Plex Mono', monospace" };
  const inputSt = {
    width: '100%', padding: '7px 10px', boxSizing: 'border-box',
    border: `1px solid ${T.borderMd}`, borderRadius: T.radiusSm, background: T.surface, color: T.ink,
    fontSize: 12, fontFamily: "'Space Grotesk', sans-serif", outline: 'none',
  };

  const [voci, setVoci]       = useState([]);
  const [pagamenti, setPagamenti] = useState([]); // tutti i pagamenti delle voci accettate del progetto
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  useBodyScrollLock(modalOpen);
  useEscKey(() => setModalOpen(false), modalOpen);

  const [tab, setTab] = useState("preventivi");
  const [form, setForm] = useState(EMPTY_VOCE);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [catFocus, setCatFocus] = useState(false);
  const [extraParent, setExtraParent] = useState(null); // preventivo a cui agganciare un "extra"
  const modalScrollRef = useRef(null);

  const [expanded, setExpanded] = useState(null);   // voce_id con registro pagamenti aperto
  const [pagForm, setPagForm] = useState(EMPTY_PAG);
  const [savingPag, setSavingPag] = useState(false);

  useEffect(() => {
    if (!projectId || !studioId) return;
    load();
  }, [projectId, studioId]);

  const load = async () => {
    setLoading(true);
    const { data: v } = await supabase
      .from("capex_voci")
      .select("*")
      .eq("project_id", projectId)
      .is("deleted_at", null)
      .order("created_at", { ascending: true });
    const vv = v || [];
    setVoci(vv);
    const ids = vv.map(x => x.id);
    if (ids.length) {
      const { data: p } = await supabase
        .from("capex_pagamenti")
        .select("*")
        .in("voce_id", ids)
        .order("data_pagamento", { ascending: true });
      setPagamenti(p || []);
    } else {
      setPagamenti([]);
    }
    setLoading(false);
  };

  // ── Calcoli ──────────────────────────────────────────────────────────
  const pagatoByVoce = useMemo(() => {
    const m = {};
    pagamenti.forEach(p => { m[p.voce_id] = (m[p.voce_id] || 0) + Number(p.importo || 0); });
    return m;
  }, [pagamenti]);

  const accettate = useMemo(() => voci.filter(v => v.accettato), [voci]);
  const totaleAccettato = useMemo(() => accettate.reduce((s, v) => s + Number(v.importo || 0), 0), [accettate]);
  const totalePagato    = useMemo(() => accettate.reduce((s, v) => s + (pagatoByVoce[v.id] || 0), 0), [accettate, pagatoByVoce]);
  const totaleResiduo   = totaleAccettato - totalePagato;

  // Chiave categoria normalizzata (trim + case-insensitive) così "Edile",
  // "edile" e "Edile " finiscono nello stesso gruppo per il confronto.
  const catKey = (c) => (c || "Altro").trim().toLowerCase() || "altro";

  const breakdownCategoria = useMemo(() => {
    const m = {};
    accettate.forEach(v => {
      const k = catKey(v.categoria);
      if (!m[k]) m[k] = { label: (v.categoria || "Altro").trim() || "Altro", accettato: 0, pagato: 0 };
      m[k].accettato += Number(v.importo || 0);
      m[k].pagato += pagatoByVoce[v.id] || 0;
    });
    return Object.values(m).sort((a, b) => b.accettato - a.accettato);
  }, [accettate, pagatoByVoce]);

  // Extra raggruppati per voce padre
  const extrasByParent = useMemo(() => {
    const m = {};
    voci.forEach(v => { if (v.parent_id) (m[v.parent_id] = m[v.parent_id] || []).push(v); });
    return m;
  }, [voci]);

  // Preventivi raggruppati per categoria (normalizzata) — solo voci principali,
  // gli extra vengono annidati sotto il rispettivo padre.
  const vociPerCategoria = useMemo(() => {
    const m = {};
    voci.filter(v => !v.parent_id).forEach(v => {
      const k = catKey(v.categoria);
      if (!m[k]) m[k] = { label: (v.categoria || "Altro").trim() || "Altro", list: [] };
      m[k].list.push(v);
    });
    return Object.values(m).sort((a, b) => a.label.localeCompare(b.label));
  }, [voci]);

  // Accettati raggruppati per operatore (voce radice = parent_id || id)
  const accettatePerOperatore = useMemo(() => {
    const groups = {};
    accettate.forEach(v => {
      const rootId = v.parent_id || v.id;
      if (!groups[rootId]) {
        const root = voci.find(x => x.id === rootId) || v;
        groups[rootId] = { rootId, label: root.fornitore || "—", categoria: root.categoria, items: [] };
      }
      groups[rootId].items.push(v);
    });
    Object.values(groups).forEach(g => g.items.sort((a, b) => (a.parent_id ? 1 : 0) - (b.parent_id ? 1 : 0)));
    return Object.values(groups);
  }, [accettate, voci]);

  // ── Azioni voce ────────────────────────────────────────────────────
  const resetForm = () => { setForm(EMPTY_VOCE); setEditingId(null); setExtraParent(null); };

  // Avvia l'inserimento di un extra agganciato a un operatore: pre-compila
  // categoria e fornitore dal padre (bloccati) e porta il form in cima.
  const startAddExtra = (parent) => {
    setEditingId(null);
    setExtraParent(parent);
    setForm({ categoria: parent.categoria || "", fornitore: parent.fornitore || "", data_preventivo: "", importo: "", note: "" });
    if (modalScrollRef.current) modalScrollRef.current.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSaveVoce = async () => {
    const importo = Number(String(form.importo).replace(",", "."));
    if (!form.categoria.trim()) { showToast("Categoria obbligatoria"); return; }
    if (!(importo >= 0)) { showToast("Importo non valido"); return; }
    setSaving(true);
    // In modalità extra eredita categoria/fornitore dal padre.
    const payload = {
      project_id: projectId,
      categoria: (extraParent ? extraParent.categoria : form.categoria).trim(),
      fornitore: (extraParent ? extraParent.fornitore : form.fornitore)?.trim() || null,
      data_preventivo: form.data_preventivo || null,
      importo,
      note: form.note.trim() || null,
    };
    let error;
    if (editingId) {
      ({ error } = await supabase.from("capex_voci").update({ ...payload, updated_at: new Date().toISOString() }).eq("id", editingId));
    } else {
      ({ error } = await supabase.from("capex_voci").insert({ ...payload, parent_id: extraParent ? extraParent.id : null }));
    }
    setSaving(false);
    if (error) { showToast("Errore salvataggio: " + error.message); return; }
    resetForm();
    load();
  };

  const startEdit = (v) => {
    setEditingId(v.id);
    setForm({
      categoria: v.categoria || "Edile",
      fornitore: v.fornitore || "",
      data_preventivo: v.data_preventivo || "",
      importo: v.importo ?? "",
      note: v.note || "",
    });
    setTab("preventivi");
  };

  const toggleAccettato = async (v) => {
    const { error } = await supabase.from("capex_voci").update({ accettato: !v.accettato, updated_at: new Date().toISOString() }).eq("id", v.id);
    if (error) { showToast("Errore: " + error.message); return; }
    setVoci(prev => prev.map(x => x.id === v.id ? { ...x, accettato: !x.accettato } : x));
  };

  const softDeleteVoce = async (v) => {
    const { error } = await supabase.from("capex_voci").update({ deleted_at: new Date().toISOString() }).eq("id", v.id);
    setConfirmDelete(null);
    if (error) { showToast("Errore eliminazione: " + error.message); return; }
    load();
  };

  // ── Azioni pagamento ─────────────────────────────────────────────────
  const handleAddPagamento = async (voce) => {
    const importo = Number(String(pagForm.importo).replace(",", "."));
    if (!(importo > 0)) { showToast("Importo pagamento non valido"); return; }
    setSavingPag(true);
    const { error } = await supabase.from("capex_pagamenti").insert({
      voce_id: voce.id,
      data_pagamento: pagForm.data_pagamento || new Date().toISOString().slice(0, 10),
      importo,
      note: pagForm.note.trim() || null,
    });
    setSavingPag(false);
    if (error) { showToast("Errore pagamento: " + error.message); return; }
    setPagForm(EMPTY_PAG);
    load();
  };

  const deletePagamento = async (id) => {
    const { error } = await supabase.from("capex_pagamenti").delete().eq("id", id);
    if (error) { showToast("Errore: " + error.message); return; }
    setPagamenti(prev => prev.filter(p => p.id !== id));
  };

  // ── Export ───────────────────────────────────────────────────────────
  const exportXlsx = () => {
    const rows = [["Categoria", "Fornitore", "Data preventivo", "Importo", "Accettato", "Pagato", "Residuo", "Note"]];
    // voci principali seguite dai rispettivi extra
    voci.filter(v => !v.parent_id).forEach(v => {
      const emit = (x, isExtra) => {
        const pag = pagatoByVoce[x.id] || 0;
        rows.push([
          x.categoria || "", (isExtra ? "↳ extra " : "") + (x.fornitore || ""), x.data_preventivo || "",
          Number(x.importo || 0), x.accettato ? "Sì" : "No",
          x.accettato ? pag : "", x.accettato ? Number(x.importo || 0) - pag : "",
          x.note || "",
        ]);
      };
      emit(v, false);
      (extrasByParent[v.id] || []).forEach(e => emit(e, true));
    });
    rows.push([]);
    rows.push(["", "", "Totale accettato", totaleAccettato]);
    rows.push(["", "", "Totale pagato", totalePagato]);
    rows.push(["", "", "Totale da pagare", totaleResiduo]);
    const ws = XLSX.utils.aoa_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "CAPEX");
    XLSX.writeFile(wb, `capex-${(projectName || "progetto").replace(/\s+/g, "-")}.xlsx`);
  };

  // ── PILL ───────────────────────────────────────────────────────────
  const hasData = voci.length > 0;
  const widget = (
    <button onClick={() => { setModalOpen(true); setConfirmDelete(null); }} style={{
      display: 'flex', alignItems: 'center', gap: 8,
      border: `1px solid ${hasData ? T.navy : T.borderMd}`, borderRadius: T.radiusSm,
      background: hasData ? T.navyLight : 'transparent',
      height: 34, padding: '0 12px', cursor: 'pointer',
    }}>
      <span style={{ ...mono, fontSize: 9, letterSpacing: '0.15em', textTransform: 'uppercase', color: hasData ? T.navy : T.muted, fontWeight: 600 }}>
        CAPEX
      </span>
      {hasData ? (
        <span style={{ ...mono, fontSize: 9, color: T.navy, border: `1px solid ${T.navy}`, borderRadius: T.radiusSm, padding: '1px 6px' }}>
          {currency(totaleAccettato)}
        </span>
      ) : (
        <span style={{ ...mono, fontSize: 9, color: T.muted }}>+ Aggiungi</span>
      )}
    </button>
  );

  // ── Riga preventivo ──────────────────────────────────────────────────
  const renderRigaPreventivo = (v, isExtra = false) => {
    const isDel = confirmDelete === v.id;
    return (
      <div key={v.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px', background: isExtra ? T.surface : T.bg, border: `1px solid ${T.border}`, borderRadius: T.radius, marginLeft: isExtra ? 24 : 0, borderLeft: isExtra ? `2px solid ${T.brass}` : `1px solid ${T.border}` }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            {isExtra && <span style={{ ...mono, fontSize: 8, letterSpacing: '0.12em', textTransform: 'uppercase', color: T.brass, border: `1px solid ${T.brass}`, borderRadius: T.radiusSm, padding: '1px 5px' }}>Extra</span>}
            <span style={{ fontSize: 13, fontWeight: 600, color: T.ink }}>{isExtra ? (v.note || "Extra") : (v.fornitore || "—")}</span>
            <span style={{ ...mono, fontSize: 9, color: T.muted }}>{fmtDate(v.data_preventivo)}</span>
          </div>
          {!isExtra && v.note && <div style={{ ...mono, fontSize: 10, color: T.muted, marginTop: 3 }}>{v.note}</div>}
        </div>
        <div style={{ ...mono, fontSize: 13, fontWeight: 500, color: T.ink, flexShrink: 0 }}>{currency(v.importo)}</div>
        {/* toggle accettato */}
        <button onClick={() => toggleAccettato(v)} title={v.accettato ? "Accettato" : "Non accettato"} style={{
          display: 'flex', alignItems: 'center', gap: 6, border: `1px solid ${v.accettato ? T.green : T.borderMd}`,
          borderRadius: T.radiusSm, background: v.accettato ? T.greenLight : 'transparent', padding: '4px 9px', cursor: 'pointer', flexShrink: 0,
        }}>
          <span style={{ ...mono, fontSize: 9, letterSpacing: '0.06em', textTransform: 'uppercase', color: v.accettato ? T.green : T.muted }}>
            {v.accettato ? "✓ Accettato" : "Accetta"}
          </span>
        </button>
        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
          {isDel ? (
            <>
              <button onClick={() => softDeleteVoce(v)} style={{ border: `1px solid ${T.red}`, borderRadius: T.radiusSm, background: 'transparent', color: T.red, ...mono, fontSize: 10, padding: '4px 10px', cursor: 'pointer' }}>Sì</button>
              <button onClick={() => setConfirmDelete(null)} style={{ border: `1px solid ${T.borderMd}`, borderRadius: T.radiusSm, background: 'transparent', color: T.ink, ...mono, fontSize: 10, padding: '4px 10px', cursor: 'pointer' }}>No</button>
            </>
          ) : (
            <>
              <button onClick={() => startEdit(v)} style={{ border: `1px solid ${T.borderMd}`, borderRadius: T.radiusSm, background: 'transparent', color: T.ink, ...mono, fontSize: 10, padding: '4px 10px', cursor: 'pointer' }}>Modifica</button>
              <button onClick={() => setConfirmDelete(v.id)} style={{ border: `1px solid ${T.borderMd}`, borderRadius: T.radiusSm, background: 'transparent', color: T.red, ...mono, fontSize: 10, padding: '4px 10px', cursor: 'pointer' }}>✕</button>
            </>
          )}
        </div>
      </div>
    );
  };

  // ── Tab Preventivi ─────────────────────────────────────────────────
  const tabPreventivi = (
    <div>
      {/* Form inserimento / modifica */}
      <div style={{ border: `1px solid ${extraParent ? T.brass : T.border}`, borderRadius: T.radius, background: T.bg, padding: 16, marginBottom: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ ...mono, fontSize: 8, letterSpacing: '0.2em', textTransform: 'uppercase', color: extraParent ? T.brass : T.muted }}>
            {extraParent ? `Extra per ${extraParent.fornitore || "—"} · ${extraParent.categoria}` : editingId ? "Modifica preventivo" : "Nuovo preventivo"}
          </div>
          {extraParent && (
            <button onClick={resetForm} style={{ border: 'none', background: 'none', color: T.muted, ...mono, fontSize: 9, letterSpacing: '0.06em', textTransform: 'uppercase', cursor: 'pointer' }}>✕ annulla extra</button>
          )}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.4fr 1fr 1fr', gap: 10 }}>
          <div style={{ position: 'relative' }}>
            <div style={{ ...mono, fontSize: 8, letterSpacing: '0.2em', textTransform: 'uppercase', color: T.muted, marginBottom: 5 }}>Categoria *</div>
            <input
              value={form.categoria}
              disabled={!!extraParent}
              onChange={e => setForm(p => ({ ...p, categoria: e.target.value }))}
              onFocus={() => setCatFocus(true)}
              onBlur={() => setTimeout(() => setCatFocus(false), 150)}
              placeholder="Es. Edile, o scrivi liberamente" style={{ ...inputSt, opacity: extraParent ? 0.6 : 1, cursor: extraParent ? 'not-allowed' : 'text' }} autoComplete="off" />
            {catFocus && (() => {
              const q = (form.categoria || '').toLowerCase();
              const matches = CATEGORIE.filter(c => c.toLowerCase().includes(q));
              if (matches.length === 0) return null;
              return (
                <div style={{ position: 'absolute', left: 0, right: 0, top: '100%', marginTop: 4, zIndex: 200, background: T.surface, border: `1px solid ${T.borderMd}`, borderRadius: T.radiusSm, boxShadow: T.shadowMd, overflow: 'hidden', maxHeight: 220, overflowY: 'auto' }}>
                  {matches.map(c => (
                    <button key={c} type="button"
                      onMouseDown={() => { setForm(p => ({ ...p, categoria: c })); setCatFocus(false); }}
                      style={{ display: 'block', width: '100%', padding: '8px 12px', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: T.ink, fontFamily: "'Space Grotesk', sans-serif", borderBottom: `0.5px solid ${T.border}` }}
                      onMouseEnter={e => e.currentTarget.style.background = T.surface2}
                      onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                      {c}
                    </button>
                  ))}
                </div>
              );
            })()}
          </div>
          <div>
            <div style={{ ...mono, fontSize: 8, letterSpacing: '0.2em', textTransform: 'uppercase', color: T.muted, marginBottom: 5 }}>Fornitore</div>
            <input value={form.fornitore} disabled={!!extraParent} onChange={e => setForm(p => ({ ...p, fornitore: e.target.value }))} placeholder="Es. Impresa Rossi" style={{ ...inputSt, opacity: extraParent ? 0.6 : 1, cursor: extraParent ? 'not-allowed' : 'text' }} />
          </div>
          <div>
            <div style={{ ...mono, fontSize: 8, letterSpacing: '0.2em', textTransform: 'uppercase', color: T.muted, marginBottom: 5 }}>Data preventivo</div>
            <input type="date" value={form.data_preventivo} onChange={e => setForm(p => ({ ...p, data_preventivo: e.target.value }))} style={inputSt} />
          </div>
          <div>
            <div style={{ ...mono, fontSize: 8, letterSpacing: '0.2em', textTransform: 'uppercase', color: T.muted, marginBottom: 5 }}>Importo (€) *</div>
            <input type="number" min="0" step="0.01" value={form.importo} onChange={e => setForm(p => ({ ...p, importo: e.target.value }))} placeholder="0,00" style={{ ...inputSt, ...mono }} />
          </div>
        </div>
        <div style={{ marginTop: 10 }}>
          <div style={{ ...mono, fontSize: 8, letterSpacing: '0.2em', textTransform: 'uppercase', color: T.muted, marginBottom: 5 }}>Note</div>
          <input value={form.note} onChange={e => setForm(p => ({ ...p, note: e.target.value }))} placeholder="Note opzionali" style={inputSt} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
          {editingId && (
            <button onClick={resetForm} style={{ border: `1px solid ${T.borderMd}`, borderRadius: T.radiusSm, background: 'transparent', color: T.ink, ...mono, fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '8px 16px', cursor: 'pointer' }}>Annulla</button>
          )}
          <button onClick={handleSaveVoce} disabled={saving} style={{ background: T.navy, color: T.bg, border: 'none', borderRadius: T.radiusSm, ...mono, fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '8px 18px', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1 }}>
            {saving ? "Salvataggio..." : editingId ? "Aggiorna" : extraParent ? "Aggiungi extra" : "Aggiungi preventivo"}
          </button>
        </div>
      </div>

      {/* Lista raggruppata per categoria */}
      {voci.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '32px 20px', ...mono, fontSize: 11, color: T.muted }}>
          Nessun preventivo. Aggiungi il primo preventivo qui sopra.
        </div>
      ) : vociPerCategoria.map(({ label, list }) => (
        <div key={label.toLowerCase()} style={{ marginBottom: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ ...mono, fontSize: 9, letterSpacing: '0.15em', textTransform: 'uppercase', color: T.ink, fontWeight: 600 }}>{label}</span>
            <span style={{ ...mono, fontSize: 9, color: T.muted }}>{list.length} {list.length === 1 ? "preventivo" : "preventivi"}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {list.map(v => {
              const extras = extrasByParent[v.id] || [];
              return (
                <div key={v.id} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {renderRigaPreventivo(v, false)}
                  {extras.map(e => renderRigaPreventivo(e, true))}
                  <button onClick={() => startAddExtra(v)} style={{ alignSelf: 'flex-start', marginLeft: 24, border: `1px dashed ${T.borderMd}`, borderRadius: T.radiusSm, background: 'transparent', color: T.muted, ...mono, fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '5px 10px', cursor: 'pointer' }}>
                    + Aggiungi extra
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );

  // ── Card voce accettata (riusata per operatore principale + extra) ──
  const renderAccettataCard = (v, isExtra = false) => {
    const pagato = pagatoByVoce[v.id] || 0;
    const residuo = Number(v.importo || 0) - pagato;
    const overpaid = pagato > Number(v.importo || 0);
    const isOpen = expanded === v.id;
    const pags = pagamenti.filter(p => p.voce_id === v.id);
    return (
                <div key={v.id} style={{ border: `1px solid ${T.border}`, borderRadius: T.radius, overflow: 'hidden', background: isExtra ? T.surface : T.bg, marginLeft: isExtra ? 24 : 0, borderLeft: isExtra ? `2px solid ${T.brass}` : `1px solid ${T.border}` }}>
                  <div onClick={() => { setExpanded(isOpen ? null : v.id); setPagForm(EMPTY_PAG); }} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 12px', cursor: 'pointer' }}>
                    {isExtra
                      ? <span style={{ ...mono, fontSize: 8, letterSpacing: '0.1em', textTransform: 'uppercase', color: T.brass, border: `1px solid ${T.brass}`, borderRadius: T.radiusSm, padding: '2px 6px', flexShrink: 0 }}>Extra</span>
                      : <span style={{ ...mono, fontSize: 8, letterSpacing: '0.1em', textTransform: 'uppercase', color: T.navy, border: `1px solid ${T.navy}`, borderRadius: T.radiusSm, padding: '2px 6px', flexShrink: 0 }}>{v.categoria}</span>}
                    <span style={{ fontSize: 13, fontWeight: 600, color: T.ink, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{isExtra ? (v.note || "Extra") : (v.fornitore || "—")}</span>
                    <div style={{ display: 'flex', gap: 18, flexShrink: 0, alignItems: 'baseline' }}>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ ...mono, fontSize: 7, letterSpacing: '0.15em', textTransform: 'uppercase', color: T.muted }}>Accettato</div>
                        <div style={{ ...mono, fontSize: 12, color: T.ink }}>{currency(v.importo)}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ ...mono, fontSize: 7, letterSpacing: '0.15em', textTransform: 'uppercase', color: T.muted }}>Pagato</div>
                        <div style={{ ...mono, fontSize: 12, color: overpaid ? T.red : T.green }}>{currency(pagato)}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ ...mono, fontSize: 7, letterSpacing: '0.15em', textTransform: 'uppercase', color: T.muted }}>Residuo</div>
                        <div style={{ ...mono, fontSize: 12, color: residuo < 0 ? T.red : (residuo === 0 ? T.muted : T.navy) }}>{currency(residuo)}</div>
                      </div>
                    </div>
                    <span style={{ ...mono, fontSize: 11, color: T.muted, flexShrink: 0, width: 14, textAlign: 'center' }}>{isOpen ? "▾" : "▸"}</span>
                  </div>

                  {isOpen && (
                    <div style={{ borderTop: `0.5px solid ${T.border}`, padding: '12px', background: T.surface }}>
                      <div style={{ ...mono, fontSize: 8, letterSpacing: '0.2em', textTransform: 'uppercase', color: T.muted, marginBottom: 10 }}>Registro pagamenti</div>
                      {pags.length > 0 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
                          {pags.map(p => (
                            <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '7px 10px', background: T.bg, border: `1px solid ${T.border}` }}>
                              <span style={{ ...mono, fontSize: 10, color: T.muted, flexShrink: 0 }}>{fmtDate(p.data_pagamento)}</span>
                              <span style={{ ...mono, fontSize: 12, color: T.ink, flex: 1 }}>{currency(p.importo)}</span>
                              {p.note && <span style={{ ...mono, fontSize: 10, color: T.muted, flex: 2, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.note}</span>}
                              <button onClick={() => deletePagamento(p.id)} style={{ border: 'none', background: 'none', color: T.red, ...mono, fontSize: 12, cursor: 'pointer', flexShrink: 0 }}>✕</button>
                            </div>
                          ))}
                          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, ...mono, fontSize: 10, color: T.muted, paddingRight: 28 }}>
                            <span>Totale pagato:</span>
                            <span style={{ color: overpaid ? T.red : T.green }}>{currency(pagato)}</span>
                          </div>
                        </div>
                      )}
                      {/* form nuovo pagamento */}
                      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                        <div style={{ width: 140 }}>
                          <div style={{ ...mono, fontSize: 8, letterSpacing: '0.2em', textTransform: 'uppercase', color: T.muted, marginBottom: 5 }}>Data</div>
                          <input type="date" value={pagForm.data_pagamento} onChange={e => setPagForm(p => ({ ...p, data_pagamento: e.target.value }))} style={inputSt} />
                        </div>
                        <div style={{ width: 120 }}>
                          <div style={{ ...mono, fontSize: 8, letterSpacing: '0.2em', textTransform: 'uppercase', color: T.muted, marginBottom: 5 }}>Importo (€)</div>
                          <input type="number" min="0" step="0.01" value={pagForm.importo} onChange={e => setPagForm(p => ({ ...p, importo: e.target.value }))} placeholder="0,00" style={{ ...inputSt, ...mono }} />
                        </div>
                        <div style={{ flex: 1, minWidth: 120 }}>
                          <div style={{ ...mono, fontSize: 8, letterSpacing: '0.2em', textTransform: 'uppercase', color: T.muted, marginBottom: 5 }}>Nota</div>
                          <input value={pagForm.note} onChange={e => setPagForm(p => ({ ...p, note: e.target.value }))} placeholder="Es. acconto" style={inputSt} />
                        </div>
                        <button onClick={() => handleAddPagamento(v)} disabled={savingPag} style={{ background: T.navy, color: T.bg, border: 'none', borderRadius: T.radiusSm, ...mono, fontSize: 10, letterSpacing: '0.06em', textTransform: 'uppercase', padding: '8px 14px', cursor: savingPag ? 'not-allowed' : 'pointer', opacity: savingPag ? 0.6 : 1, height: 33 }}>
                          + Pagamento
                        </button>
                      </div>
                      {pagato > Number(v.importo || 0) && (
                        <div style={{ ...mono, fontSize: 10, color: T.red, marginTop: 8 }}>
                          ⚠ Il pagato supera l'importo accettato (variante/extra).
                        </div>
                      )}
                    </div>
                  )}
                </div>
    );
  };

  // ── Tab Accettati ─────────────────────────────────────────────────
  const tabAccettati = (
    <div>
      {accettate.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '32px 20px', ...mono, fontSize: 11, color: T.muted }}>
          Nessun preventivo accettato. Accetta un preventivo dalla scheda Preventivi.
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 18 }}>
            {accettatePerOperatore.map(g => {
              const gAcc = g.items.reduce((s, x) => s + Number(x.importo || 0), 0);
              const gPag = g.items.reduce((s, x) => s + (pagatoByVoce[x.id] || 0), 0);
              const hasExtra = g.items.length > 1;
              return (
                <div key={g.rootId} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {g.items.map(v => renderAccettataCard(v, !!v.parent_id))}
                  {hasExtra && (
                    <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'baseline', gap: 10, ...mono, fontSize: 9, color: T.muted, paddingRight: 28 }}>
                      <span style={{ textTransform: 'uppercase', letterSpacing: '0.08em' }}>Subtotale {g.label}</span>
                      <span style={{ color: T.ink }}>tot {currency(gAcc)}</span>
                      <span style={{ color: T.navy }}>residuo {currency(gAcc - gPag)}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Riepilogo totali */}
          <div style={{ border: `1px solid ${T.navy}`, borderRadius: T.radius, background: T.navyLight, padding: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
              <div>
                <div style={{ ...mono, fontSize: 8, letterSpacing: '0.15em', textTransform: 'uppercase', color: T.muted }}>Totale accettato</div>
                <div style={{ ...mono, fontSize: 16, fontWeight: 500, color: T.ink, marginTop: 3 }}>{currency(totaleAccettato)}</div>
              </div>
              <div>
                <div style={{ ...mono, fontSize: 8, letterSpacing: '0.15em', textTransform: 'uppercase', color: T.muted }}>Totale pagato</div>
                <div style={{ ...mono, fontSize: 16, fontWeight: 500, color: T.green, marginTop: 3 }}>{currency(totalePagato)}</div>
              </div>
              <div>
                <div style={{ ...mono, fontSize: 8, letterSpacing: '0.15em', textTransform: 'uppercase', color: T.muted }}>Totale da pagare</div>
                <div style={{ ...mono, fontSize: 16, fontWeight: 500, color: totaleResiduo < 0 ? T.red : T.navy, marginTop: 3 }}>{currency(totaleResiduo)}</div>
              </div>
            </div>
            {/* breakdown per categoria */}
            {breakdownCategoria.length > 1 && (
              <div style={{ marginTop: 14, paddingTop: 12, borderTop: `0.5px solid ${T.border}` }}>
                <div style={{ ...mono, fontSize: 8, letterSpacing: '0.2em', textTransform: 'uppercase', color: T.muted, marginBottom: 8 }}>Per categoria</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {breakdownCategoria.map(d => (
                    <div key={d.label.toLowerCase()} style={{ display: 'flex', alignItems: 'center', gap: 8, ...mono, fontSize: 10 }}>
                      <span style={{ flex: 1, color: T.ink }}>{d.label}</span>
                      <span style={{ color: T.muted }}>accettato {currency(d.accettato)}</span>
                      <span style={{ color: T.green }}>pagato {currency(d.pagato)}</span>
                      <span style={{ color: T.navy, width: 110, textAlign: 'right' }}>residuo {currency(d.accettato - d.pagato)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );

  // ── MODAL ────────────────────────────────────────────────────────
  const modal = modalOpen && (
    <div style={{ position: 'fixed', inset: 0, zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(14,14,13,0.5)', padding: 16 }}>
      <div ref={modalScrollRef} style={{ width: '100%', maxWidth: 880, background: T.glassBg, backdropFilter: T.blur, WebkitBackdropFilter: T.blur, border: `1px solid ${T.borderMd}`, borderRadius: T.radiusLg, padding: 28, maxHeight: '90vh', overflowY: 'auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 18 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 600, color: T.ink, letterSpacing: '-0.02em' }}>CAPEX — quadro economico cantiere</div>
            <div style={{ ...mono, fontSize: 10, color: T.muted, marginTop: 3 }}>Preventivi di imprese e fornitori del progetto, accettazione e pagamenti.</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {voci.length > 0 && (
              <button onClick={exportXlsx} style={{ border: `1px solid ${T.borderMd}`, borderRadius: T.radiusSm, background: 'transparent', color: T.muted, ...mono, fontSize: 10, letterSpacing: '0.06em', textTransform: 'uppercase', padding: '6px 12px', cursor: 'pointer' }}>↓ Excel</button>
            )}
            <button onClick={() => { setModalOpen(false); resetForm(); setConfirmDelete(null); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.muted, fontSize: 20, lineHeight: 1 }}>×</button>
          </div>
        </div>

        {/* Switch Preventivi/Accettati — stesso SlidingTabs del resto dell'app */}
        <div style={{ marginBottom: 22 }}>
          <SlidingTabs
            tabs={[
              { key: "preventivi", label: `Preventivi ${voci.length}` },
              { key: "accettati", label: `Accettati ${accettate.length}` },
            ]}
            active={tab}
            onChange={setTab}
          />
        </div>

        {tab === "preventivi" ? tabPreventivi : tabAccettati}
      </div>
    </div>
  );

  if (loading) return null;

  return (
    <>
      {widget}
      {modal}
    </>
  );
}
