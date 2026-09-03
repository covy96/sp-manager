import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import { useTheme } from "../contexts/ThemeContext";
import { useToast } from "../contexts/ToastContext";
import { useEscKey } from "../hooks/useEscKey";
import { useBodyScrollLock } from "../hooks/useBodyScrollLock";
import {
  resolveTemplate, estraiCampi, compilaTesto,
} from "../lib/offertaTemplate";
import {
  normalizzaDocumento, calcolaTotali, importoSezione, euro, quantitaVoce,
} from "../lib/offertaModel";
import { generaOffertaPdf } from "../lib/offertaPdf";
import { generaOffertaDocx } from "../lib/offertaDocx";

const mono = { fontFamily: "'IBM Plex Mono', monospace" };

// Testo senza i marcatori **…**, per l'anteprima nel pannello
const pulisci = (t) => String(t).replace(/\*\*/g, "");

// Data/ora leggibile per l'etichetta delle versioni.
const formattaData = (ts) => {
  try {
    return new Date(ts).toLocaleString("it-IT", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
  } catch { return ""; }
};

// Importo di una rata: importo_fisso (se ≠0) oppure percentuale × base. Stessa
// formula del trigger DB (database/incassato_trigger.sql).
const importoRata = (r, base) => {
  const f = Number(r?.importo_fisso);
  return (f && f !== 0) ? f : (Number(base) || 0) * (Number(r?.percentuale) || 0) / 100;
};
const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

// Campi «…» di un testo → input compilabili. Definito FUORI dal componente:
// se stesse dentro verrebbe ricreato ad ogni render e gli input perderebbero
// il focus dopo un solo carattere.
function CampiTesto({ testo, valori, onChange, inputSt }) {
  const campi = estraiCampi(testo);
  if (campi.length === 0) return null;
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
      {campi.map(c => (
        <div key={c.key} style={{ flex: "0 1 auto" }}>
          <input
            value={valori?.[c.key] || ""}
            onChange={e => onChange(c.key, e.target.value)}
            placeholder={c.label}
            style={{ ...inputSt, width: Math.max(90, Math.min(240, c.label.length * 7 + 30)), padding: "4px 8px", fontSize: 11 }}
          />
        </div>
      ))}
    </div>
  );
}

export default function OffertaDocumentPanel({
  offerta, studio, onClose, onSaved,
  mode = "edit",
  progetti = [], globalContacts = [], serviceTemplates = [], teamMembers = [],
  onCreate,
}) {
  const { T } = useTheme();
  const showToast = useToast();
  const isCreate = mode === "create";
  useEscKey(onClose, true);
  useBodyScrollLock(true);

  // Template del documento risolto per lo studio (default + override salvati).
  const tpl = useMemo(() => resolveTemplate(studio), [studio]);
  const { SEZIONI, BLOCCHI_FISSI, INQUADRAMENTO, MODALITA_PAGAMENTO } = tpl;

  const [doc, setDoc]         = useState(() => normalizzaDocumento(offerta?.documento, offerta, tpl));
  const [saving, setSaving]   = useState(false);
  const [busy, setBusy]       = useState("");
  const [aperte, setAperte]   = useState({});

  // Storico versioni: ogni salvataggio aggiunge uno snapshot in cima.
  const [versioni, setVersioni] = useState(() => Array.isArray(offerta?.documento_versioni) ? offerta.documento_versioni : []);
  const [versioneAttiva, setVersioneAttiva] = useState(() => (Array.isArray(offerta?.documento_versioni) && offerta.documento_versioni[0]?.n) || null);
  const [versioniAperte, setVersioniAperte] = useState(false);
  const [menuVer, setMenuVer] = useState(null); // n della versione col menu ⋮ aperto

  // Sincronizzazione commessa quando si modifica un'offerta accettata.
  const [syncModal, setSyncModal] = useState(null); // dati per il modal "Aggiorna commessa"
  const [syncStep, setSyncStep]   = useState("scelta"); // 'scelta' | 'tieni'
  const [syncSaving, setSyncSaving] = useState(false);

  // ── Anagrafica offerta (solo in modalità create) ────────────────────────────
  const [ana, setAna] = useState({
    numero_offerta: "", data_offerta: new Date().toISOString().slice(0, 10),
    nome_offerta: "", cliente: "", note: "",
  });
  const [clientSuggestions, setClientSuggestions] = useState([]);
  const [createError, setCreateError] = useState("");

  useEffect(() => {
    const nd = normalizzaDocumento(offerta?.documento, offerta, tpl);
    setDoc(nd);
    const vs = Array.isArray(offerta?.documento_versioni) ? offerta.documento_versioni : [];
    setVersioni(vs);
    // Versione attiva = quella che coincide col documento corrente dell'offerta.
    const ndStr = JSON.stringify(nd);
    const match = vs.find(v => JSON.stringify(normalizzaDocumento(v.doc, offerta, tpl)) === ndStr);
    setVersioneAttiva(match?.n ?? vs[0]?.n ?? null);
  }, [offerta?.id]);

  const tot = useMemo(() => calcolaTotali(doc, tpl), [doc, tpl]);

  // Oggetto offerta minimo per i generatori (numero/nome) in modalità create.
  const offGen = isCreate ? { numero_offerta: ana.numero_offerta, nome_offerta: ana.nome_offerta, cliente: ana.cliente } : offerta;

  // Cliente → committente: rispecchia il valore, ma non sovrascrive un
  // committente già modificato a mano.
  const onClienteChange = (val) => {
    setDoc(d => ({
      ...d,
      destinatario: {
        ...d.destinatario,
        nome: (!d.destinatario.nome || d.destinatario.nome === ana.cliente) ? val : d.destinatario.nome,
      },
    }));
    setAna(p => ({ ...p, cliente: val }));
    const q = val.trim().toLowerCase();
    setClientSuggestions(q.length >= 2
      ? globalContacts.filter(c => (c.full_name || "").toLowerCase().includes(q)).slice(0, 8)
      : []);
  };

  // ── stili ──────────────────────────────────────────────────────────────────
  const inputSt = {
    width: "100%", padding: "7px 10px", boxSizing: "border-box",
    border: `0.5px solid ${T.borderMd}`, borderRadius: T.radiusSm,
    background: T.surface, color: T.ink, fontSize: 12,
    fontFamily: "'Space Grotesk', sans-serif", outline: "none",
  };
  const labelSt = { ...mono, fontSize: 9, letterSpacing: "0.18em", textTransform: "uppercase", color: T.muted, marginBottom: 5 };
  const cardSt = { background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.radius, padding: "16px 18px", marginBottom: 12 };
  const btn = (primary, extra = {}) => ({
    background: primary ? T.navy : "transparent",
    color: primary ? T.bg : T.ink,
    border: primary ? "none" : `0.5px solid ${T.borderMd}`,
    borderRadius: T.radiusSm, ...mono, fontSize: 11,
    letterSpacing: "0.08em", textTransform: "uppercase",
    padding: "9px 18px", cursor: "pointer", ...extra,
  });

  // ── mutatori ───────────────────────────────────────────────────────────────
  const set = (patch) => setDoc(d => ({ ...d, ...patch }));
  const setDest = (k, v) => setDoc(d => ({ ...d, destinatario: { ...d.destinatario, [k]: v } }));
  const setSez = (sid, patch) => setDoc(d => ({ ...d, sezioni: { ...d.sezioni, [sid]: { ...d.sezioni[sid], ...patch } } }));
  const setVoce = (sid, vid, patch) => setDoc(d => ({
    ...d,
    sezioni: { ...d.sezioni, [sid]: { ...d.sezioni[sid], voci: { ...d.sezioni[sid].voci, [vid]: { ...d.sezioni[sid].voci[vid], ...patch } } } },
  }));
  const setCampoVoce = (sid, vid, key, val) => setDoc(d => {
    const v = d.sezioni[sid].voci[vid];
    return { ...d, sezioni: { ...d.sezioni, [sid]: { ...d.sezioni[sid], voci: { ...d.sezioni[sid].voci, [vid]: { ...v, campi: { ...v.campi, [key]: val } } } } } };
  });
  const setCampoInq = (key, val) => setDoc(d => ({ ...d, inquadramento: { ...d.inquadramento, campi: { ...d.inquadramento.campi, [key]: val } } }));
  const setInq = (patch) => setDoc(d => ({ ...d, inquadramento: { ...d.inquadramento, ...patch } }));
  const toggleBlocco = (bid) => setDoc(d => ({ ...d, blocchi: { ...d.blocchi, [bid]: !d.blocchi[bid] } }));
  const togglePagamento = (oid) => setDoc(d => {
    const cur = d.pagamento.opzioni || [];
    return { ...d, pagamento: { ...d.pagamento, opzioni: cur.includes(oid) ? cur.filter(x => x !== oid) : [...cur, oid] } };
  });
  const setRateC = (idx, patch) => setDoc(d => ({ ...d, pagamento: { ...d.pagamento, rateC: (d.pagamento.rateC || []).map((r, i) => i === idx ? { ...r, ...patch } : r) } }));
  const addRateC = () => setDoc(d => ({ ...d, pagamento: { ...d.pagamento, rateC: [...(d.pagamento.rateC || []), { percentuale: 0, descrizione: "" }] } }));
  const removeRateC = (idx) => setDoc(d => ({ ...d, pagamento: { ...d.pagamento, rateC: (d.pagamento.rateC || []).filter((_, i) => i !== idx) } }));

  // ── azioni ─────────────────────────────────────────────────────────────────
  const salva = async () => {
    setSaving(true);
    const stamp = Date.now();
    const docStr = JSON.stringify(doc);
    // Se il documento coincide con una versione già in storico non ne creo una
    // nuova: la promuovo a principale. Altrimenti registro una nuova versione.
    const esistente = versioni.find(v => JSON.stringify(normalizzaDocumento(v.doc, offerta, tpl)) === docStr);
    let nuoveVersioni = versioni;
    let attivaN;
    if (esistente) {
      attivaN = esistente.n;
    } else {
      const nPrec = versioni.reduce((mx, v) => Math.max(mx, Number(v.n) || 0), 0);
      const nuova = { n: nPrec + 1, ts: new Date().toISOString(), doc };
      nuoveVersioni = [nuova, ...versioni].slice(0, 30);
      attivaN = nuova.n;
    }

    // Il recap dell'offerta segue sempre la versione salvata: le sezioni attive
    // diventano le voci, con sconti e totale allineati. Se il documento non ha
    // prestazioni attive le voci esistenti non vengono toccate.
    const patch = { documento: doc, documento_versioni: nuoveVersioni };
    if (tot.righe.length > 0) {
      patch.voci = tot.righe.map((r, i) => ({ id: `sez${i}_${stamp}`, nome: r.titolo, prezzo: r.importo, attiva: true }));
      patch.sconto = Number(doc.sconto) || 0;
      patch.sconto_fisso = Number(doc.scontoFisso) || null;
      patch.importo_offerta_base = tot.totale;
      patch.importo_totale = tot.totale;
    }

    const { error } = await supabase.from("offerte").update(patch).eq("id", offerta.id);
    setSaving(false);
    if (error) { showToast(`Errore salvataggio: ${error.message}`, "error"); return false; }
    setVersioni(nuoveVersioni);
    setVersioneAttiva(attivaN);
    showToast(esistente ? `Versione ${attivaN} resa principale` : `Versione ${attivaN} salvata`, "success");
    onSaved?.({ ...offerta, ...patch });
    // Offerta già accettata: propone di aggiornare la commessa collegata.
    if (offerta.stato === "accettata" && offerta.commessa_id) {
      await checkCommessaSync(tot.totale);
    }
    return true;
  };

  const eliminaVersione = async (v) => {
    setMenuVer(null);
    if (!window.confirm(`Eliminare la Versione ${v.n}? L'operazione non è reversibile.`)) return;
    const nuove = versioni.filter(x => x.n !== v.n);
    const { error } = await supabase.from("offerte").update({ documento_versioni: nuove }).eq("id", offerta.id);
    if (error) { showToast("Errore eliminazione: " + error.message, "error"); return; }
    setVersioni(nuove);
    // Ricalcola la versione attiva rispetto al documento corrente.
    const docStr = JSON.stringify(doc);
    const match = nuove.find(x => JSON.stringify(normalizzaDocumento(x.doc, offerta, tpl)) === docStr);
    setVersioneAttiva(match?.n ?? null);
    showToast(`Versione ${v.n} eliminata`, "success");
    onSaved?.({ ...offerta, documento_versioni: nuove });
  };

  const caricaVersione = (v) => {
    setDoc(normalizzaDocumento(v.doc, offerta, tpl));
    setVersioneAttiva(v.n);
    setVersioniAperte(false);
    showToast(`Versione ${v.n} caricata — premi Salva per renderla principale`, "success");
  };

  // Righe rata dal documento (Opzione C → una per %, A/B → unica 100%).
  const buildRateRows = (commessaId, pagamento) => {
    const opz = pagamento?.opzioni || [];
    if (opz.includes("C") && Array.isArray(pagamento?.rateC) && pagamento.rateC.length > 0) {
      return pagamento.rateC.map((r, i) => ({
        commessa_id: commessaId, studio: offerta.studio, numero_rata: i + 1,
        label: (r.descrizione || "").trim() || `Rata ${i + 1}`,
        percentuale: Number(r.percentuale) || 0, importo_fisso: null, pagato: false,
      }));
    }
    if (opz.includes("A") || opz.includes("B")) {
      const label = opz.includes("A") ? "Saldo alla presentazione" : "Saldo all'accettazione";
      return [{ commessa_id: commessaId, studio: offerta.studio, numero_rata: 1, label, percentuale: 100, importo_fisso: null, pagato: false }];
    }
    return [];
  };

  // Dopo aver salvato un'offerta accettata: se il totale cambia, propone di
  // aggiornare la commessa e ricalibrare le rate.
  const checkCommessaSync = async (newTotal) => {
    const { data: comm } = await supabase.from("commesse").select("id, importo_offerta_base").eq("id", offerta.commessa_id).single();
    if (!comm) return;
    const oldBase = Number(comm.importo_offerta_base) || 0;
    if (Math.abs(round2(newTotal) - round2(oldBase)) < 0.005) return; // nessuna differenza
    const { data: rate } = await supabase.from("suddivisione_pagamenti").select("*").eq("commessa_id", comm.id).is("deleted_at", null).order("numero_rata", { ascending: true });
    const rateAll = rate || [];
    const pagate = rateAll.filter(r => r.pagato);
    const nonPagate = rateAll.filter(r => !r.pagato);
    const sommaPagate = round2(pagate.reduce((s, r) => s + importoRata(r, oldBase), 0));
    const residuo = round2(Math.max(0, newTotal - sommaPagate));
    // Precompila le non pagate proporzionalmente alle quote attuali.
    const pesoTot = nonPagate.reduce((s, r) => s + importoRata(r, oldBase), 0);
    const editRate = nonPagate.map(r => {
      const peso = pesoTot > 0 ? importoRata(r, oldBase) / pesoTot : 1 / (nonPagate.length || 1);
      return { id: r.id, label: r.label, numero_rata: r.numero_rata, importo: round2(residuo * peso) };
    });
    if (editRate.length > 0) {
      const somma = editRate.reduce((s, e) => s + e.importo, 0);
      editRate[editRate.length - 1].importo = round2(editRate[editRate.length - 1].importo + (residuo - somma));
    }
    const nuovaRata = (nonPagate.length === 0 && residuo > 0) ? { importo: residuo } : null;
    const maxN = rateAll.reduce((mx, r) => Math.max(mx, Number(r.numero_rata) || 0), 0);
    setSyncStep("scelta");
    setSyncModal({ commessaId: comm.id, oldBase, newTotal, pagate, nonPagate, sommaPagate, residuo, editRate, nuovaRata, maxN });
  };

  // Riallinea gli importi dei proforma della commessa alla somma delle rate/costi
  // collegati sul nuovo importo base (i proforma memorizzano importo_totale).
  const ricalcolaProforme = async (commessaId, base) => {
    const [{ data: rateNow }, { data: costiNow }, { data: prof }] = await Promise.all([
      supabase.from("suddivisione_pagamenti").select("id, percentuale, importo_fisso").eq("commessa_id", commessaId).is("deleted_at", null),
      supabase.from("costi_extra").select("id, importo").eq("commessa_id", commessaId).is("deleted_at", null),
      supabase.from("proforma").select("id, suddivisione_pagamento_ids, costo_extra_ids").eq("commessa_id", commessaId),
    ]);
    const rateMap = Object.fromEntries((rateNow || []).map(r => [r.id, r]));
    const costiMap = Object.fromEntries((costiNow || []).map(c => [c.id, Number(c.importo) || 0]));
    for (const p of (prof || [])) {
      const fromRate = (p.suddivisione_pagamento_ids || []).reduce((s, id) => s + (rateMap[id] ? importoRata(rateMap[id], base) : 0), 0);
      const fromCosti = (p.costo_extra_ids || []).reduce((s, id) => s + (costiMap[id] || 0), 0);
      await supabase.from("proforma").update({ importo_totale: round2(fromRate + fromCosti) }).eq("id", p.id);
    }
  };

  const applicaSync = async (scelta) => {
    const sm = syncModal;
    if (!sm) return;
    setSyncSaving(true);
    try {
      if (scelta === "ricalibra") {
        // Nessun pagamento: se il nuovo documento definisce una modalità di
        // pagamento, rigenera le rate; altrimenti mantiene le rate (%) esistenti.
        const nuove = buildRateRows(sm.commessaId, doc.pagamento);
        if (nuove.length > 0) {
          const ids = [...sm.pagate, ...sm.nonPagate].map(r => r.id);
          if (ids.length) await supabase.from("suddivisione_pagamenti").update({ deleted_at: new Date().toISOString() }).in("id", ids);
          await supabase.from("suddivisione_pagamenti").insert(nuove);
        }
        await supabase.from("commesse").update({ importo_offerta_base: sm.newTotal, importo_totale: sm.newTotal }).eq("id", sm.commessaId);
      } else if (scelta === "aggiornaTutto") {
        await supabase.from("commesse").update({ importo_offerta_base: sm.newTotal, importo_totale: sm.newTotal }).eq("id", sm.commessaId);
      } else if (scelta === "tieni") {
        // Congela le pagate al loro importo attuale.
        for (const r of sm.pagate) {
          await supabase.from("suddivisione_pagamenti").update({ importo_fisso: importoRata(r, sm.oldBase), percentuale: null }).eq("id", r.id);
        }
        // Applica gli importi (editati) alle rate non pagate.
        for (const e of sm.editRate) {
          await supabase.from("suddivisione_pagamenti").update({ importo_fisso: round2(e.importo), percentuale: null }).eq("id", e.id);
        }
        // Eventuale nuova rata col saldo rimanente.
        if (sm.nuovaRata && round2(sm.nuovaRata.importo) > 0) {
          await supabase.from("suddivisione_pagamenti").insert({ commessa_id: sm.commessaId, studio: offerta.studio, numero_rata: sm.maxN + 1, label: "Saldo rimanente", percentuale: null, importo_fisso: round2(sm.nuovaRata.importo), pagato: false });
        }
        await supabase.from("commesse").update({ importo_offerta_base: sm.newTotal, importo_totale: sm.newTotal }).eq("id", sm.commessaId);
      }
      // Ricalcola gli importi dei proforma collegati alle rate/costi aggiornati.
      await ricalcolaProforme(sm.commessaId, sm.newTotal);
      showToast("Commessa aggiornata", "success");
    } catch (e) {
      showToast("Errore aggiornamento commessa: " + (e?.message || e), "error");
    }
    setSyncSaving(false);
    setSyncModal(null);
  };

  const generaPdf = async () => {
    setBusy("pdf");
    try { await generaOffertaPdf({ offerta: offGen, studio, documento: doc }); }
    catch (e) { showToast(`Errore PDF: ${e.message}`, "error"); }
    setBusy("");
  };

  const generaWord = async () => {
    setBusy("docx");
    try { await generaOffertaDocx({ offerta: offGen, studio, documento: doc }); }
    catch (e) { showToast(`Errore Word: ${e.message}`, "error"); }
    setBusy("");
  };

  // Crea una nuova offerta a partire dal documento: le sezioni attive diventano
  // le voci dell'offerta (una voce per sezione) e la config documento è salvata.
  const crea = async () => {
    if (!ana.nome_offerta.trim() || !ana.cliente.trim()) {
      setCreateError("Compila nome offerta e cliente");
      return;
    }
    setCreateError("");
    setSaving(true);
    const stamp = Date.now();
    const voci = tot.righe.map((r, i) => ({
      id: `sez${i}_${stamp}`, nome: r.titolo, prezzo: r.importo, attiva: true,
    }));
    await onCreate?.({
      numero_offerta: ana.numero_offerta,
      nome_offerta: ana.nome_offerta,
      cliente: ana.cliente,
      data_offerta: ana.data_offerta,
      note: ana.note,
      voci,
      sconto: doc.sconto,
      sconto_fisso: doc.scontoFisso,
      documento: doc,
    });
    setSaving(false);
    // onCreate gestisce la chiusura in caso di successo.
  };

  const Check = ({ checked, onChange }) => (
    <input type="checkbox" checked={!!checked} onChange={onChange}
      style={{ accentColor: T.navy, width: 14, height: 14, flexShrink: 0, cursor: "pointer" }} />
  );

  // Campo modificabile "in linea" nel fac-simile della lettera: testo rosso,
  // larghezza automatica. È una funzione che ritorna un <input> (non un
  // componente): reconciliato per posizione, non perde il focus.
  const campoInline = (value, onChange, placeholder = "", extra = {}) => {
    const len = String(value || placeholder || "").length;
    return (
      <input value={value || ""} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        style={{ display: "inline-block", verticalAlign: "baseline", border: "none", borderBottom: `1px dashed ${T.red}`, background: "transparent", color: T.red, fontWeight: 600, fontFamily: "inherit", fontSize: "inherit", lineHeight: "inherit", padding: "0 3px", outline: "none", width: `${Math.max(len + 1, 4)}ch`, maxWidth: "100%", ...extra }} />
    );
  };

  return (
    <>
    <div className="asm-modal-bg" style={{ position: "fixed", inset: 0, zIndex: 70, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div className="asm-modal-content" style={{
        width: "100%", maxWidth: 860, maxHeight: "92vh", display: "flex", flexDirection: "column",
        background: T.glassBg, backdropFilter: T.blur, WebkitBackdropFilter: T.blur,
        border: `1px solid ${T.glassBorder}`, boxShadow: T.shadowLg, borderRadius: T.radiusLg,
      }}>
        {/* Testata */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 26px 14px", borderBottom: `0.5px solid ${T.border}` }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ ...mono, fontSize: 9, letterSpacing: "0.2em", textTransform: "uppercase", color: T.muted, marginBottom: 3 }}>{isCreate ? "Nuova offerta" : "Documento offerta"}</div>
            <div style={{ fontSize: 16, fontWeight: 600, color: T.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {isCreate
                ? (ana.nome_offerta || "Crea offerta dal documento")
                : `${offerta?.numero_offerta} — ${offerta?.nome_offerta}`}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 14, flexShrink: 0 }}>
            {!isCreate && versioneAttiva != null && (
              <span style={{ ...mono, fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", fontWeight: 600, color: T.navy, background: T.navyLight || T.surface2, border: `1px solid ${T.navy}`, borderRadius: 999, padding: "5px 12px", whiteSpace: "nowrap" }}>
                Versione {versioneAttiva}
              </span>
            )}
            <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: T.muted, fontSize: 22, lineHeight: 1 }}>×</button>
          </div>
        </div>

        {/* Corpo scrollabile */}
        <div style={{ flex: 1, overflowY: "auto", padding: "18px 26px" }}>

          {/* Anagrafica offerta — solo in creazione */}
          {isCreate && (
            <div style={{ ...cardSt, border: `1px solid ${T.navy}` }}>
              <div style={{ ...labelSt, marginBottom: 12, color: T.navy }}>Dati offerta</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <div style={labelSt}>N° Offerta</div>
                  <input value={ana.numero_offerta} onChange={e => setAna(p => ({ ...p, numero_offerta: e.target.value }))} placeholder="OFF.001" style={inputSt} />
                </div>
                <div>
                  <div style={labelSt}>Data offerta</div>
                  <input type="date" value={ana.data_offerta} onChange={e => setAna(p => ({ ...p, data_offerta: e.target.value }))} style={inputSt} />
                </div>
                <div style={{ gridColumn: "span 2" }}>
                  <div style={labelSt}>Nome offerta *</div>
                  <input value={ana.nome_offerta} onChange={e => setAna(p => ({ ...p, nome_offerta: e.target.value }))} autoFocus placeholder="Es. Ristrutturazione appartamento" style={inputSt} />
                </div>
                <div style={{ gridColumn: "span 2", position: "relative" }}>
                  <div style={labelSt}>Cliente *</div>
                  <input value={ana.cliente} autoComplete="off" style={inputSt}
                    onChange={e => onClienteChange(e.target.value)}
                    onBlur={() => setTimeout(() => setClientSuggestions([]), 150)} />
                  {clientSuggestions.length > 0 && (
                    <div style={{ position: "absolute", left: 0, right: 0, top: "100%", background: T.glassBg, backdropFilter: T.blur, WebkitBackdropFilter: T.blur, border: `1px solid ${T.glassBorder}`, borderRadius: 12, boxShadow: T.shadowMd, zIndex: 50, maxHeight: 200, overflowY: "auto" }}>
                      {clientSuggestions.map(c => (
                        <button key={c.id} type="button" onMouseDown={() => { onClienteChange(c.full_name); setClientSuggestions([]); }}
                          style={{ display: "block", width: "100%", padding: "9px 12px", textAlign: "left", background: "none", border: "none", cursor: "pointer", fontSize: 13, color: T.ink, fontFamily: "'Space Grotesk', sans-serif" }}>
                          {c.full_name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div style={{ gridColumn: "span 2" }}>
                  <div style={labelSt}>Note</div>
                  <input value={ana.note} onChange={e => setAna(p => ({ ...p, note: e.target.value }))} placeholder="Note aggiuntive…" style={inputSt} />
                </div>
              </div>
              <div style={{ ...mono, fontSize: 10, color: T.muted, marginTop: 12, lineHeight: 1.5 }}>
                Le sezioni attive qui sotto diventano le voci dell'offerta. Compila prezzi e testi, poi premi <b>Crea offerta</b>. Dopo potrai collegare un progetto.
              </div>
            </div>
          )}

          {/* Storico versioni — solo in modifica */}
          {!isCreate && versioni.length > 0 && (
            <div style={cardSt}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer" }} onClick={() => setVersioniAperte(x => !x)}>
                <div style={{ ...labelSt, marginBottom: 0 }}>Versioni salvate ({versioni.length}){versioneAttiva ? ` · in modifica: v${versioneAttiva}` : ""}</div>
                <span style={{ color: T.muted, fontSize: 11 }}>{versioniAperte ? "▲" : "▼"}</span>
              </div>
              {versioniAperte && (
                <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 6 }}>
                  {versioni.map(v => {
                    const totV = calcolaTotali(normalizzaDocumento(v.doc, offerta, tpl), tpl).totale;
                    return (
                    <div key={v.n} style={{ position: "relative", display: "flex", alignItems: "center", gap: 10, padding: "7px 10px", border: `0.5px solid ${T.border}`, borderRadius: T.radiusSm, background: versioneAttiva === v.n ? T.surface2 : "transparent" }}>
                      <span style={{ ...mono, fontSize: 11, fontWeight: 600, color: versioneAttiva === v.n ? T.navy : T.ink }}>Versione {v.n}</span>
                      <span style={{ ...mono, fontSize: 10, color: T.muted, flex: 1 }}>{formattaData(v.ts)}</span>
                      <span style={{ ...mono, fontSize: 11, fontWeight: 600, color: versioneAttiva === v.n ? T.navy : T.ink }}>{euro(totV)}</span>
                      <button type="button" onClick={() => caricaVersione(v)}
                        style={{ ...mono, fontSize: 10, letterSpacing: "0.06em", textTransform: "uppercase", border: `0.5px solid ${T.borderMd}`, borderRadius: T.radiusSm, background: "transparent", color: T.navy, padding: "5px 12px", cursor: "pointer" }}>
                        Carica
                      </button>
                      <button type="button" onClick={() => setMenuVer(menuVer === v.n ? null : v.n)} title="Altre azioni"
                        style={{ background: "none", border: "none", cursor: "pointer", color: T.muted, fontSize: 16, lineHeight: 1, padding: "2px 4px", flexShrink: 0 }}>⋮</button>
                      {menuVer === v.n && (
                        <div style={{ position: "absolute", right: 6, top: "100%", marginTop: 2, zIndex: 10, background: T.surface, border: `1px solid ${T.borderMd}`, borderRadius: T.radiusSm, boxShadow: T.shadowMd, overflow: "hidden", minWidth: 150 }}>
                          <button type="button" onClick={() => eliminaVersione(v)}
                            style={{ display: "block", width: "100%", textAlign: "left", background: "none", border: "none", cursor: "pointer", color: T.red, ...mono, fontSize: 11, padding: "9px 12px" }}>
                            Elimina versione
                          </button>
                        </div>
                      )}
                    </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Intestazione — fac-simile della lettera, parti in rosso editabili */}
          <div style={cardSt}>
            <div style={{ ...labelSt, marginBottom: 4 }}>Intestazione — lettera</div>
            <div style={{ ...mono, fontSize: 9.5, color: T.muted, marginBottom: 14 }}>
              Le parti in <span style={{ color: T.red, fontWeight: 600 }}>rosso</span> sono modificabili: clicca e scrivi. È l'anteprima della pagina dopo la copertina.
            </div>

            <div style={{ background: T.bg, border: `1px solid ${T.border}`, borderRadius: T.radiusSm, padding: "18px 22px", fontFamily: "'Space Grotesk', sans-serif", fontSize: 13, lineHeight: 2, color: T.ink }}>
              <div style={{ textAlign: "right", marginBottom: 12 }}>
                {campoInline(doc.luogo, v => set({ luogo: v }), "Milano")} lì,{" "}
                <input type="date" value={doc.data} onChange={e => set({ data: e.target.value })}
                  style={{ display: "inline-block", border: "none", borderBottom: `1px dashed ${T.red}`, background: "transparent", color: T.red, fontWeight: 600, fontFamily: "inherit", fontSize: "inherit", padding: "0 3px", outline: "none" }} />
              </div>
              <div style={{ fontWeight: 600, marginBottom: 2 }}>
                {offerta?.numero_offerta || "OFF."} PRESTAZIONI PROFESSIONALI PER {campoInline(doc.oggettoIncarico, v => set({ oggettoIncarico: v }), "oggetto dell'incarico", { textTransform: "uppercase" })}.
              </div>
              <div style={{ borderTop: `1px solid ${T.borderMd}`, margin: "8px 0 14px" }} />
              <div style={{ marginBottom: 12 }}>OGGETTO: Offerta di prestazioni professionali.</div>
              <div style={{ marginBottom: 12 }}>Egregio/Spettabile {campoInline(doc.destinatario.nome, v => setDest("nome", v), "Committente")},</div>
              <div style={{ marginBottom: 12 }}>
                circa la manifestata necessità {campoInline(doc.necessita, v => set({ necessita: v }), "della sua attività")}, con sede in {campoInline(doc.destinatario.sede, v => setDest("sede", v), "sede legale")}, C.F. {campoInline(doc.destinatario.cf, v => setDest("cf", v), "—")} P.IVA {campoInline(doc.destinatario.piva, v => setDest("piva", v), "—")}, si inoltra nostra miglior offerta per le competenze richieste.
              </div>
              <div>In attesa di un vostro cordiale riscontro porgiamo i nostri migliori saluti.</div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 16, marginTop: 14, alignItems: "end" }}>
              <div>
                <div style={labelSt}>Indirizzo in copertina</div>
                <input value={doc.destinatario.indirizzo} onChange={e => setDest("indirizzo", e.target.value)} placeholder="Via Gaudenzio Ferrari, Milano" style={inputSt} />
              </div>
              <div style={{ display: "flex", gap: 18, flexWrap: "wrap", paddingBottom: 8 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 7, cursor: "pointer", ...mono, fontSize: 11, color: T.ink }}>
                  <Check checked={doc.copertina} onChange={() => set({ copertina: !doc.copertina })} /> Copertina
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: 7, cursor: "pointer", ...mono, fontSize: 11, color: T.ink }}>
                  <Check checked={doc.firma} onChange={() => set({ firma: !doc.firma })} /> Firma
                </label>
              </div>
            </div>
          </div>

          {/* Inquadramento */}
          <div style={cardSt}>
            <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", marginBottom: doc.inquadramento.attivo ? 10 : 0 }}>
              <Check checked={doc.inquadramento.attivo}
                onChange={() => setDoc(d => ({ ...d, inquadramento: { ...d.inquadramento, attivo: !d.inquadramento.attivo } }))} />
              <span style={{ fontSize: 13, fontWeight: 600, color: T.ink }}>{INQUADRAMENTO.titolo}</span>
            </label>
            {doc.inquadramento.attivo && (
              <>
                {(doc.inquadramento.testoLibero || "").trim() ? (
                  <textarea value={doc.inquadramento.testoLibero} onChange={e => setInq({ testoLibero: e.target.value })} rows={5}
                    style={{ ...inputSt, resize: "vertical", fontSize: 12.5, lineHeight: 1.6 }} />
                ) : (
                  <div style={{ fontSize: 12.5, lineHeight: 2, color: T.ink }}>
                    {(() => {
                      let fi = 0;
                      return INQUADRAMENTO.testo.split(/«([^»]*)»/).map((part, i) => {
                        if (i % 2 === 0) return <span key={i}>{part}</span>;
                        const key = `f${fi++}`;
                        const val = doc.inquadramento.campi?.[key] || "";
                        const len = String(val || part || "").length;
                        return (
                          <input key={i} value={val} onChange={e => setCampoInq(key, e.target.value)} placeholder={part}
                            style={{ display: "inline-block", verticalAlign: "baseline", border: "none", borderBottom: `1px dashed ${T.red}`, background: "transparent", color: T.red, fontWeight: 600, fontFamily: "inherit", fontSize: "inherit", lineHeight: "inherit", padding: "0 3px", outline: "none", width: `${Math.max(len + 1, 4)}ch`, maxWidth: "100%" }} />
                        );
                      });
                    })()}
                  </div>
                )}
                <div style={{ ...mono, fontSize: 9.5, color: T.muted, marginTop: 10, display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
                  {(doc.inquadramento.testoLibero || "").trim() ? (
                    <>
                      <span>Stai modificando tutto il testo liberamente.</span>
                      <button type="button" onClick={() => setInq({ testoLibero: "" })} style={{ ...mono, fontSize: 9.5, background: "none", border: "none", color: T.navy, cursor: "pointer", padding: 0 }}>← Torna ai campi guidati</button>
                    </>
                  ) : (
                    <>
                      <span>Le parti in <span style={{ color: T.red, fontWeight: 600 }}>rosso</span> sono da adattare al progetto.</span>
                      <button type="button" onClick={() => setInq({ testoLibero: compilaTesto(INQUADRAMENTO.testo, doc.inquadramento.campi) })} style={{ ...mono, fontSize: 9.5, background: "none", border: "none", color: T.navy, cursor: "pointer", padding: 0 }}>✎ Modifica tutto il testo</button>
                    </>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Sezioni prestazione */}
          <div style={{ ...labelSt, marginTop: 18, marginBottom: 8 }}>Prestazioni</div>
          {SEZIONI.map(sez => {
            const cfgS = doc.sezioni[sez.id];
            const aperta = aperte[sez.id] ?? false;
            const imp = importoSezione(sez, doc);
            return (
              <div key={sez.id} style={{ ...cardSt, padding: "12px 16px", opacity: cfgS.attiva ? 1 : 0.62 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <Check checked={cfgS.attiva} onChange={() => { setSez(sez.id, { attiva: !cfgS.attiva }); setAperte(a => ({ ...a, [sez.id]: !cfgS.attiva })); }} />
                  <div style={{ flex: 1, minWidth: 0, cursor: "pointer" }} onClick={() => setAperte(a => ({ ...a, [sez.id]: !aperta }))}>
                    <div style={{ fontSize: 12.5, fontWeight: 600, color: T.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{sez.titolo}</div>
                    <div style={{ ...mono, fontSize: 9, color: T.muted, marginTop: 2 }}>
                      {sez.modoPrezzo === "voci" ? "prezzo per voce" : "prezzo forfettario"}
                    </div>
                  </div>
                  {sez.modoPrezzo === "forfait" ? (
                    <input type="number" value={cfgS.prezzo} onChange={e => setSez(sez.id, { prezzo: e.target.value })}
                      disabled={!cfgS.attiva} placeholder="€"
                      style={{ ...inputSt, width: 110, padding: "5px 8px", fontSize: 12, textAlign: "right" }} />
                  ) : (
                    <div style={{ ...mono, fontSize: 12, color: T.navy, fontWeight: 600, width: 110, textAlign: "right" }}>{euro(imp)}</div>
                  )}
                  <button onClick={() => setAperte(a => ({ ...a, [sez.id]: !aperta }))}
                    style={{ background: "none", border: "none", cursor: "pointer", color: T.muted, fontSize: 11, padding: "2px 4px" }}>
                    {aperta ? "▲" : "▼"}
                  </button>
                </div>

                {aperta && (
                  <div style={{ marginTop: 12, paddingTop: 12, borderTop: `0.5px solid ${T.border}` }}>
                    {sez.gruppi.map((g, gi) => (
                      <div key={gi} style={{ marginBottom: 10 }}>
                        {g.label && <div style={{ ...mono, fontSize: 9.5, letterSpacing: "0.14em", color: T.muted, marginBottom: 8 }}>{g.label}</div>}
                        {g.voci.map(v => {
                          const vc = cfgS.voci[v.id];
                          return (
                            <div key={v.id} style={{ display: "flex", gap: 9, padding: "7px 0", borderBottom: `0.5px solid ${T.border}`, opacity: vc.attiva ? 1 : 0.5 }}>
                              <div style={{ paddingTop: 2 }}>
                                <Check checked={vc.attiva} onChange={() => setVoce(sez.id, v.id, { attiva: !vc.attiva })} />
                              </div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: 11.5, color: T.ink, lineHeight: 1.5 }}>
                                  {pulisci(compilaTesto(v.testo, vc.campi))}
                                </div>
                                {vc.attiva && <CampiTesto testo={v.testo} valori={vc.campi} onChange={(k, val) => setCampoVoce(sez.id, v.id, k, val)} inputSt={inputSt} />}
                              </div>
                              {sez.modoPrezzo === "voci" && v.prezzo && (() => {
                                const isCad = /cad/i.test(v.prezzoLabel || "");
                                const q = isCad ? quantitaVoce(v, vc) : 1;
                                const unit = Number(vc.prezzo) || 0;
                                return (
                                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 3, flexShrink: 0 }}>
                                    <input type="number" value={vc.prezzo} onChange={e => setVoce(sez.id, v.id, { prezzo: e.target.value })}
                                      disabled={!vc.attiva} placeholder={v.prezzoLabel || "€"}
                                      style={{ ...inputSt, width: 100, height: 30, padding: "4px 8px", fontSize: 11.5, textAlign: "right" }} />
                                    {isCad && vc.attiva && q > 1 && unit > 0 && (
                                      <span style={{ ...mono, fontSize: 9.5, color: T.navy }}>× {q} = {euro(unit * q)}</span>
                                    )}
                                  </div>
                                );
                              })()}
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {/* Testi fissi */}
          <div style={{ ...labelSt, marginTop: 18, marginBottom: 8 }}>Testi fissi</div>
          <div style={cardSt}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "10px 22px" }}>
              {BLOCCHI_FISSI.map(b => (
                <label key={b.id} style={{ display: "flex", alignItems: "center", gap: 7, cursor: "pointer", ...mono, fontSize: 11, color: T.ink }}>
                  <Check checked={doc.blocchi[b.id]} onChange={() => toggleBlocco(b.id)} /> {b.titolo}
                </label>
              ))}
            </div>
          </div>

          {/* Pagamento */}
          <div style={{ ...labelSt, marginTop: 18, marginBottom: 8 }}>Modalità di pagamento</div>
          <div style={cardSt}>
            {MODALITA_PAGAMENTO.map(o => {
              const selected = (doc.pagamento.opzioni || []).includes(o.id);
              return (
                <div key={o.id} style={{ padding: "6px 0" }}>
                  <label style={{ display: "flex", alignItems: "flex-start", gap: 8, cursor: "pointer" }}>
                    <div style={{ paddingTop: 2 }}><Check checked={selected} onChange={() => togglePagamento(o.id)} /></div>
                    <span style={{ fontSize: 11.5, color: T.ink, lineHeight: 1.5 }}>
                      <b>Opzione {o.id} —</b> {o.rate ? "pagamento a stato avanzamento (percentuali personalizzabili)." : o.testo}
                    </span>
                  </label>
                  {o.rate && selected && (
                    <div style={{ marginTop: 8, marginLeft: 26, display: "flex", flexDirection: "column", gap: 6 }}>
                      {(doc.pagamento.rateC || []).map((r, i) => (
                        <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <input type="number" min={0} max={100} value={r.percentuale}
                            onChange={e => setRateC(i, { percentuale: e.target.value })}
                            style={{ ...inputSt, width: 68, padding: "4px 8px", fontSize: 11.5, textAlign: "right" }} />
                          <span style={{ ...mono, fontSize: 11, color: T.muted }}>%</span>
                          <input value={r.descrizione} onChange={e => setRateC(i, { descrizione: e.target.value })}
                            placeholder="descrizione rata (es. inizio lavori)"
                            style={{ ...inputSt, flex: 1, padding: "4px 8px", fontSize: 11.5 }} />
                          <button type="button" onClick={() => removeRateC(i)}
                            style={{ background: "none", border: "none", cursor: "pointer", color: T.red, fontSize: 15, lineHeight: 1, padding: "0 4px", flexShrink: 0 }}>×</button>
                        </div>
                      ))}
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                        <button type="button" onClick={addRateC}
                          style={{ ...mono, fontSize: 10, letterSpacing: "0.06em", border: `0.5px solid ${T.borderMd}`, borderRadius: T.radiusSm, background: "transparent", color: T.muted, padding: "5px 12px", cursor: "pointer" }}>
                          + Aggiungi rata
                        </button>
                        {(() => {
                          const totPerc = (doc.pagamento.rateC || []).reduce((s, r) => s + (Number(r.percentuale) || 0), 0);
                          return <span style={{ ...mono, fontSize: 10, color: totPerc === 100 ? T.green : T.red }}>Totale {totPerc}%{totPerc !== 100 ? " — dev'essere 100%" : ""}</span>;
                        })()}
                      </div>
                      <div style={{ ...mono, fontSize: 9.5, color: T.muted, lineHeight: 1.5 }}>
                        All'accettazione dell'offerta questa suddivisione genera automaticamente le rate della commessa.
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            <div style={{ marginTop: 10 }}>
              <div style={labelSt}>Testo libero aggiuntivo</div>
              <textarea value={doc.pagamento.testoLibero} onChange={e => setDoc(d => ({ ...d, pagamento: { ...d.pagamento, testoLibero: e.target.value } }))}
                rows={2} style={{ ...inputSt, resize: "vertical" }} />
            </div>
          </div>

          {/* Riepilogo economico */}
          <div style={{ ...labelSt, marginTop: 18, marginBottom: 8 }}>Compensi e oneri</div>
          <div style={cardSt}>
            {tot.righe.length === 0 && (
              <div style={{ ...mono, fontSize: 11, color: T.muted, textAlign: "center", padding: "10px 0" }}>Nessuna prestazione selezionata</div>
            )}
            {tot.righe.map(r => (
              <div key={r.lettera} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 0", borderBottom: `0.5px solid ${T.border}` }}>
                <span style={{ ...mono, fontSize: 10, color: T.muted, width: 24 }}>({r.lettera})</span>
                <span style={{ flex: 1, fontSize: 12, fontWeight: 600, color: T.ink }}>{r.titolo}</span>
                <span style={{ ...mono, fontSize: 12, color: T.ink }}>{euro(r.importo)}</span>
              </div>
            ))}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 12, paddingTop: 10 }}>
              <span style={{ ...mono, fontSize: 10, color: T.muted }}>IMPONIBILE</span>
              <span style={{ ...mono, fontSize: 12, color: T.ink }}>{euro(tot.lordo)}</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 10, marginTop: 8 }}>
              <span style={{ ...mono, fontSize: 10, color: T.muted }}>SCONTO %</span>
              <input type="number" min={0} max={100} step={0.1} value={doc.sconto} onChange={e => set({ sconto: e.target.value })}
                style={{ ...inputSt, width: 90, padding: "4px 8px", fontSize: 11.5, textAlign: "right" }} />
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 10, marginTop: 6 }}>
              <span style={{ ...mono, fontSize: 10, color: T.muted }}>SCONTO €</span>
              <input type="number" min={0} step={0.01} value={doc.scontoFisso} onChange={e => set({ scontoFisso: e.target.value })}
                style={{ ...inputSt, width: 90, padding: "4px 8px", fontSize: 11.5, textAlign: "right" }} />
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 12, marginTop: 12, paddingTop: 10, borderTop: `0.5px solid ${T.borderMd}` }}>
              <span style={{ ...mono, fontSize: 10, letterSpacing: "0.14em", color: T.muted }}>TOTALE PARCELLA</span>
              <span style={{ ...mono, fontSize: 15, fontWeight: 700, color: T.navy }}>{euro(tot.totale)}</span>
            </div>
          </div>
        </div>

        {/* Barra azioni */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "14px 26px", borderTop: `0.5px solid ${T.border}`, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <button onClick={onClose} style={btn(false)}>Annulla</button>
            {createError && <span style={{ ...mono, fontSize: 11, color: T.red }}>{createError}</span>}
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button onClick={generaWord} disabled={!!busy} style={btn(false, { borderColor: T.navy, color: T.navy, opacity: busy ? 0.6 : 1 })}>
              {busy === "docx" ? "Genero…" : "Genera Word"}
            </button>
            <button onClick={generaPdf} disabled={!!busy} style={btn(false, { borderColor: T.navy, color: T.navy, opacity: busy ? 0.6 : 1 })}>
              {busy === "pdf" ? "Genero…" : "Genera PDF"}
            </button>
            {isCreate ? (
              <button onClick={crea} disabled={saving} style={btn(true, { opacity: saving ? 0.6 : 1 })}>
                {saving ? "Creo…" : "Crea offerta"}
              </button>
            ) : (
              <button onClick={salva} disabled={saving} style={btn(true, { opacity: saving ? 0.6 : 1 })}>
                {saving ? "Salvo…" : "Salva configurazione"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>

    {/* Modal: aggiorna la commessa collegata dopo modifica offerta accettata */}
    {syncModal && (
      <div className="asm-modal-bg" style={{ position: "fixed", inset: 0, zIndex: 80, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
        <div className="asm-modal-content" style={{ width: "100%", maxWidth: 520, background: T.glassBg, backdropFilter: T.blur, WebkitBackdropFilter: T.blur, border: `1px solid ${T.glassBorder}`, boxShadow: T.shadowLg, borderRadius: T.radiusLg, padding: 26, maxHeight: "90vh", overflowY: "auto" }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 6 }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 600, color: T.ink }}>Aggiorna commessa</div>
              <div style={{ ...mono, fontSize: 10, color: T.muted, marginTop: 3 }}>Il totale dell'offerta è cambiato.</div>
            </div>
            <button onClick={() => setSyncModal(null)} style={{ background: "none", border: "none", cursor: "pointer", color: T.muted, fontSize: 20 }}>×</button>
          </div>

          <div style={{ display: "flex", gap: 16, margin: "14px 0", padding: "12px 14px", background: T.bg, border: `1px solid ${T.border}`, borderRadius: T.radiusSm }}>
            <div>
              <div style={{ ...labelSt, marginBottom: 3 }}>Totale attuale</div>
              <div style={{ ...mono, fontSize: 14, color: T.muted }}>{euro(syncModal.oldBase)}</div>
            </div>
            <div style={{ borderLeft: `0.5px solid ${T.border}`, paddingLeft: 16 }}>
              <div style={{ ...labelSt, marginBottom: 3 }}>Nuovo totale</div>
              <div style={{ ...mono, fontSize: 14, fontWeight: 700, color: T.navy }}>{euro(syncModal.newTotal)}</div>
            </div>
          </div>

          {syncModal.pagate.length === 0 ? (
            <>
              <div style={{ fontSize: 12, color: T.ink, lineHeight: 1.6, marginBottom: 16 }}>
                Nessuna rata risulta pagata: le rate della commessa verranno ricalibrate in base alla nuova versione del documento.
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                <button onClick={() => setSyncModal(null)} style={btn(false)}>Annulla</button>
                <button onClick={() => applicaSync("ricalibra")} disabled={syncSaving} style={btn(true, { opacity: syncSaving ? 0.6 : 1 })}>{syncSaving ? "Aggiorno…" : "Aggiorna commessa"}</button>
              </div>
            </>
          ) : syncStep === "scelta" ? (
            <>
              <div style={{ ...mono, fontSize: 10, color: T.muted, marginBottom: 10 }}>Ci sono {syncModal.pagate.length} rate già pagate ({euro(syncModal.sommaPagate)}). Come procedo?</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <button onClick={() => applicaSync("aggiornaTutto")} disabled={syncSaving} className="asm-card" style={{ textAlign: "left", padding: "14px", background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.radius, cursor: "pointer" }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: T.ink }}>Aggiorna tutto alla nuova versione</div>
                  <div style={{ ...mono, fontSize: 9.5, color: T.muted, marginTop: 4, lineHeight: 1.5 }}>Tutte le rate (comprese le pagate) vengono ricalcolate sul nuovo totale.</div>
                </button>
                <button onClick={() => setSyncStep("tieni")} disabled={syncSaving} className="asm-card" style={{ textAlign: "left", padding: "14px", background: T.surface, border: `1px solid ${T.navy}`, borderRadius: T.radius, cursor: "pointer" }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: T.navy }}>Tieni i pagamenti e ridistribuisci il resto</div>
                  <div style={{ ...mono, fontSize: 9.5, color: T.muted, marginTop: 4, lineHeight: 1.5 }}>Le rate pagate restano invariate; il residuo di {euro(syncModal.residuo)} viene ripartito sulle rate successive (modificabili).</div>
                </button>
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
                <button onClick={() => setSyncModal(null)} style={btn(false)}>Annulla</button>
              </div>
            </>
          ) : (
            <>
              <div style={{ ...mono, fontSize: 10, color: T.muted, marginBottom: 8 }}>Pagate (invariate): {euro(syncModal.sommaPagate)} · Residuo da coprire: {euro(syncModal.residuo)}</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 10 }}>
                {syncModal.editRate.map((e, i) => (
                  <div key={e.id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ flex: 1, fontSize: 12, color: T.ink }}>{e.label || `Rata ${e.numero_rata}`}</span>
                    <input type="number" value={e.importo} onChange={ev => setSyncModal(s => ({ ...s, editRate: s.editRate.map((x, j) => j === i ? { ...x, importo: ev.target.value } : x) }))} style={{ ...inputSt, width: 120, textAlign: "right" }} />
                    <span style={{ ...mono, fontSize: 11, color: T.muted }}>€</span>
                  </div>
                ))}
                {syncModal.nuovaRata && (
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ flex: 1, fontSize: 12, color: T.navy }}>Saldo rimanente (nuova rata)</span>
                    <input type="number" value={syncModal.nuovaRata.importo} onChange={ev => setSyncModal(s => ({ ...s, nuovaRata: { importo: ev.target.value } }))} style={{ ...inputSt, width: 120, textAlign: "right" }} />
                    <span style={{ ...mono, fontSize: 11, color: T.muted }}>€</span>
                  </div>
                )}
              </div>
              {(() => {
                const somma = round2(syncModal.editRate.reduce((s, e) => s + (Number(e.importo) || 0), 0) + (syncModal.nuovaRata ? Number(syncModal.nuovaRata.importo) || 0 : 0));
                const ok = Math.abs(somma - syncModal.residuo) < 0.005;
                return <div style={{ ...mono, fontSize: 10, color: ok ? T.green : T.red, marginBottom: 12 }}>Somma rate successive: {euro(somma)} {ok ? "= residuo ✓" : `(residuo ${euro(syncModal.residuo)})`}</div>;
              })()}
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                <button onClick={() => setSyncStep("scelta")} style={btn(false)}>← Indietro</button>
                <button onClick={() => applicaSync("tieni")} disabled={syncSaving} style={btn(true, { opacity: syncSaving ? 0.6 : 1 })}>{syncSaving ? "Aggiorno…" : "Conferma"}</button>
              </div>
            </>
          )}
        </div>
      </div>
    )}
    </>
  );
}
