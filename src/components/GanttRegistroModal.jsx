import { useMemo, useState } from "react";
import BodyPortal from "./BodyPortal";
import SlidingTabs from "./SlidingTabs";
import { useTheme } from "../contexts/ThemeContext";
import { useToast } from "../contexts/ToastContext";
import { useEscKey } from "../hooks/useEscKey";
import { useBodyScrollLock } from "../hooks/useBodyScrollLock";
import { useIsMobile } from "../hooks/useIsMobile";
import { supabase } from "../lib/supabase";

// Chiave per riconoscere la stessa voce (descrizione + impresa, senza maiuscole/spazi)
export const registroKey = (descrizione, operatore) =>
  `${(descrizione || "").trim().toLowerCase()}|${(operatore || "").trim().toLowerCase()}`;

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// Registro voci del Gantt: libreria di lavorazioni dello studio da riusare nei Gantt.
// - "Registro": voci salvate → selezionale e aggiungile al Gantt aperto, o creane di nuove
// - "Da questo Gantt": salva nel registro le lavorazioni del Gantt aperto
export default function GanttRegistroModal({ studioId, registro, registroError, reloadRegistro, lavorazioni, onAdd, onClose }) {
  const { T } = useTheme();
  const isMobile = useIsMobile();
  const showToast = useToast();
  useEscKey(onClose);
  useBodyScrollLock(true);

  const [tab, setTab] = useState("registro");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(() => new Set());
  const [startDate, setStartDate] = useState(todayISO());
  const [inSequenza, setInSequenza] = useState(true);
  const [busy, setBusy] = useState(false);
  const [nuova, setNuova] = useState({ descrizione: "", operatore: "", durata_giorni: 7 });

  const savedKeys = useMemo(() => new Set(registro.map(v => registroKey(v.descrizione, v.operatore))), [registro]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return registro;
    return registro.filter(v =>
      (v.descrizione || "").toLowerCase().includes(q) || (v.operatore || "").toLowerCase().includes(q));
  }, [registro, search]);

  // Lavorazioni del Gantt aperto non ancora nel registro (senza doppioni)
  const daSalvare = useMemo(() => {
    const seen = new Set();
    return lavorazioni.filter(l => {
      if (!(l.descrizione || "").trim()) return false;
      const k = registroKey(l.descrizione, l.operatore);
      if (savedKeys.has(k) || seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  }, [lavorazioni, savedKeys]);

  const toggle = (id) => setSelected(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const saveToRegistro = async (items) => {
    if (!items.length) return;
    setBusy(true);
    const rows = items.map(l => ({
      studio: studioId,
      descrizione: l.descrizione.trim(),
      operatore: (l.operatore || "").trim() || null,
      durata_giorni: Math.max(1, Number(l.durata_giorni) || 7),
    }));
    const { error } = await supabase.from("gantt_voci_registro").insert(rows);
    setBusy(false);
    if (error) { showToast("Errore nel salvataggio nel registro: " + error.message, "error"); return false; }
    showToast(rows.length === 1 ? "Voce salvata nel registro" : `${rows.length} voci salvate nel registro`, "success");
    await reloadRegistro();
    return true;
  };

  const handleNuova = async () => {
    if (!nuova.descrizione.trim()) return;
    if (savedKeys.has(registroKey(nuova.descrizione, nuova.operatore))) {
      showToast("Questa voce è già nel registro", "error");
      return;
    }
    const ok = await saveToRegistro([nuova]);
    if (ok) setNuova({ descrizione: "", operatore: "", durata_giorni: 7 });
  };

  const handleDelete = async (v) => {
    if (!window.confirm(`Togliere "${v.descrizione}" dal registro?\nLe lavorazioni già nei Gantt non cambiano.`)) return;
    const { error } = await supabase.from("gantt_voci_registro").delete().eq("id", v.id);
    if (error) { showToast("Errore: " + error.message, "error"); return; }
    setSelected(prev => { const n = new Set(prev); n.delete(v.id); return n; });
    await reloadRegistro();
  };

  const handleAdd = async () => {
    // Mantiene l'ordine del registro
    const voci = registro.filter(v => selected.has(v.id));
    if (!voci.length) return;
    setBusy(true);
    const ok = await onAdd(voci, { startDate, inSequenza });
    setBusy(false);
    if (ok) onClose();
  };

  const s = {
    input: { width: "100%", boxSizing: "border-box", background: T.inputBg, border: `1px solid ${T.inputBorder}`, color: T.inputText, borderRadius: T.radiusSm, padding: "9px 12px", fontFamily: "var(--font-ui)", fontSize: 13, outline: "none" },
    label: { fontFamily: "var(--font-label)", fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: T.muted, marginBottom: 4, display: "block" },
    primary: { background: T.navy, border: "none", borderRadius: T.radiusSm, cursor: "pointer", color: "#fff", padding: "10px 18px", fontFamily: "var(--font-label)", fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase" },
    secondary: { background: "transparent", border: `1px solid ${T.borderMd}`, borderRadius: T.radiusSm, cursor: "pointer", color: T.ink, padding: "10px 16px", fontFamily: "var(--font-label)", fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase" },
    small: { background: "none", border: `0.5px solid ${T.borderMd}`, borderRadius: T.radiusSm, cursor: "pointer", color: T.navy, padding: "5px 10px", fontFamily: "var(--font-label)", fontSize: 10, letterSpacing: "0.06em", textTransform: "uppercase", whiteSpace: "nowrap" },
    row: { display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderBottom: `0.5px solid ${T.border}` },
    list: { background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.radiusSm, overflow: "hidden" },
    meta: { fontFamily: "var(--font-label)", fontSize: 10, color: T.muted },
    empty: { fontFamily: "var(--font-label)", fontSize: 11, color: T.muted, textAlign: "center", padding: "24px 12px" },
  };

  const voceText = (descrizione, operatore, durata) => (
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontFamily: "var(--font-ui)", fontSize: 13, fontWeight: 600, color: T.ink, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{descrizione}</div>
      <div style={{ ...s.meta, marginTop: 2 }}>{[operatore || "Nessuna impresa", `${durata || 7} gg`].join(" · ")}</div>
    </div>
  );

  let body;
  if (registroError) {
    body = (
      <div style={{ ...s.empty, textAlign: "left", lineHeight: 1.5 }}>
        Il registro non è ancora attivo sul database. Va eseguito una volta lo script
        <b> database/gantt_registro_voci.sql</b> nel SQL Editor di Supabase.
      </div>
    );
  } else if (tab === "registro") {
    body = (
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cerca voce o impresa…" style={s.input} />
        <div style={s.list}>
          {filtered.length === 0 && (
            <div style={s.empty}>{registro.length ? "Nessuna voce trovata" : "Il registro è vuoto. Aggiungi una voce qui sotto o salva quelle di questo Gantt."}</div>
          )}
          {filtered.map(v => (
            <div key={v.id} style={{ ...s.row, cursor: "pointer", background: selected.has(v.id) ? T.navyLight : "transparent" }} onClick={() => toggle(v.id)}>
              <input type="checkbox" checked={selected.has(v.id)} onChange={() => toggle(v.id)} onClick={e => e.stopPropagation()} style={{ accentColor: T.navy, width: 16, height: 16, flexShrink: 0 }} />
              {voceText(v.descrizione, v.operatore, v.durata_giorni)}
              <button onClick={e => { e.stopPropagation(); handleDelete(v); }} aria-label="Togli dal registro" title="Togli dal registro"
                style={{ background: "none", border: "none", cursor: "pointer", color: T.muted, fontSize: 18, lineHeight: 1, padding: "0 4px", flexShrink: 0 }}>×</button>
            </div>
          ))}
        </div>

        <div style={{ background: T.navyLight, border: `1px dashed ${T.borderMd}`, borderRadius: T.radiusSm, padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
          <span style={{ ...s.label, marginBottom: 0 }}>Nuova voce nel registro</span>
          <input value={nuova.descrizione} onChange={e => setNuova(p => ({ ...p, descrizione: e.target.value }))}
            onKeyDown={e => { if (e.key === "Enter") handleNuova(); }}
            placeholder="Descrizione lavorazione" style={s.input} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 90px auto", gap: 8 }}>
            <input value={nuova.operatore} onChange={e => setNuova(p => ({ ...p, operatore: e.target.value }))} placeholder="Impresa (facoltativa)" style={s.input} />
            <input type="number" min={1} value={nuova.durata_giorni} onChange={e => setNuova(p => ({ ...p, durata_giorni: e.target.value }))} title="Durata (giorni)" style={s.input} />
            <button onClick={handleNuova} disabled={busy || !nuova.descrizione.trim()} style={{ ...s.primary, padding: "0 14px", opacity: busy || !nuova.descrizione.trim() ? 0.4 : 1 }}>Salva</button>
          </div>
        </div>
      </div>
    );
  } else {
    body = (
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={s.meta}>Lavorazioni di questo Gantt che non sono ancora nel registro.</div>
        <div style={s.list}>
          {daSalvare.length === 0 && <div style={s.empty}>Tutte le lavorazioni di questo Gantt sono già nel registro.</div>}
          {daSalvare.map(l => (
            <div key={l.id} style={s.row}>
              {voceText(l.descrizione, l.operatore, l.durata_giorni)}
              <button onClick={() => saveToRegistro([l])} disabled={busy} style={{ ...s.small, opacity: busy ? 0.5 : 1 }}>Salva</button>
            </div>
          ))}
        </div>
      </div>
    );
  }

  let footer = null;
  if (!registroError && tab === "registro") {
    footer = (
      <>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 12, flex: 1, flexWrap: "wrap" }}>
          <div>
            <label style={s.label}>Inizio</label>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={{ ...s.input, width: 150, padding: "7px 10px" }} />
          </div>
          <label style={{ display: "flex", alignItems: "center", gap: 6, fontFamily: "var(--font-label)", fontSize: 11, color: T.ink, cursor: "pointer", paddingBottom: 8 }}>
            <input type="checkbox" checked={inSequenza} onChange={e => setInSequenza(e.target.checked)} style={{ accentColor: T.navy }} />
            Una dopo l'altra
          </label>
        </div>
        <button onClick={handleAdd} disabled={busy || selected.size === 0} style={{ ...s.primary, opacity: busy || selected.size === 0 ? 0.4 : 1 }}>
          {selected.size > 0 ? `Aggiungi ${selected.size} al Gantt` : "Aggiungi al Gantt"}
        </button>
      </>
    );
  } else if (!registroError && daSalvare.length > 1) {
    footer = (
      <button onClick={() => saveToRegistro(daSalvare)} disabled={busy} style={{ ...s.primary, opacity: busy ? 0.4 : 1 }}>
        Salva tutte ({daSalvare.length})
      </button>
    );
  }

  return (
    <BodyPortal>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(10,16,30,0.35)", backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)", display: "flex", alignItems: isMobile ? "flex-end" : "center", justifyContent: "center", padding: isMobile ? 0 : 16 }}>
        <div onClick={e => e.stopPropagation()} style={{
          width: "100%", maxWidth: 520, maxHeight: isMobile ? "88vh" : "86vh", display: "flex", flexDirection: "column",
          background: T.glassBg, border: `1px solid ${T.glassBorder}`, boxShadow: T.shadowLg,
          borderRadius: isMobile ? `${T.radiusLg} ${T.radiusLg} 0 0` : T.radiusLg,
          paddingBottom: isMobile ? "env(safe-area-inset-bottom)" : 0,
        }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, padding: "20px 20px 12px" }}>
            <div>
              <div style={{ fontFamily: "var(--font-ui)", fontSize: 17, fontWeight: 700, letterSpacing: "-0.02em", color: T.ink }}>Registro voci</div>
              <div style={{ fontFamily: "var(--font-label)", fontSize: 10, letterSpacing: "0.08em", color: T.muted, marginTop: 4 }}>Lavorazioni salvate, riutilizzabili in tutti i Gantt</div>
            </div>
            <button onClick={onClose} aria-label="Chiudi" style={{ background: T.navyLight, border: "none", borderRadius: "50%", width: 28, height: 28, cursor: "pointer", color: T.navy, fontSize: 16, lineHeight: 1, flexShrink: 0 }}>×</button>
          </div>
          {!registroError && (
            <div style={{ padding: "0 20px 12px" }}>
              <SlidingTabs
                tabs={[{ key: "registro", label: `Registro (${registro.length})` }, { key: "gantt", label: `Da questo Gantt (${daSalvare.length})` }]}
                active={tab}
                onChange={setTab}
              />
            </div>
          )}
          <div style={{ padding: "0 20px 16px", overflowY: "auto", flex: 1 }}>{body}</div>
          {footer && <div style={{ padding: "12px 20px 20px", borderTop: `0.5px solid ${T.borderMd}`, display: "flex", gap: 8, justifyContent: "flex-end", alignItems: "flex-end", flexWrap: "wrap" }}>{footer}</div>}
        </div>
      </div>
    </BodyPortal>
  );
}
