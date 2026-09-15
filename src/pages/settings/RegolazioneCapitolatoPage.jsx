import { useEffect, useMemo, useState } from "react";
import { usePageTitleOnMount } from "../../hooks/usePageTitle";
import { useStudio } from "../../hooks/useStudio";
import { useTheme } from "../../contexts/ThemeContext";
import { useToast } from "../../contexts/ToastContext";
import { CAPITOLATO_CATEGORIE } from "../../lib/capitolatoTemplate";
import { loadLibreria, saveVoceLibreria, deleteVoceLibreria, defaultSommanoLabels } from "../../lib/capitolatoModel";

const mono = "'IBM Plex Mono', monospace";
const norm = (s) => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
const UNITA = ["", "a corpo", "mq", "cad", "ml", "mc", "kg"];

export default function RegolazioneCapitolatoPage() {
  const { T } = useTheme();
  const showToast = useToast();
  usePageTitleOnMount("Regolazione capitolato");
  const { studioId } = useStudio();

  const [voci, setVoci] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [catFilter, setCatFilter] = useState("");
  const [adding, setAdding] = useState(false);

  const ricarica = async () => {
    setLoading(true);
    try { setVoci(await loadLibreria(studioId, { includiInattive: true })); }
    catch (e) { console.error(e); showToast("Errore nel caricamento delle voci", "error"); }
    finally { setLoading(false); }
  };
  useEffect(() => { if (studioId !== null) ricarica(); }, [studioId]); // eslint-disable-line

  const risultati = useMemo(() => {
    const q = norm(query.trim());
    let l = voci;
    if (catFilter) l = l.filter((v) => v.categoria_code === catFilter);
    if (q) l = l.filter((v) => norm(v.codice).includes(q) || norm(v.titolo).includes(q) || norm(v.descrizione).includes(q));
    return l;
  }, [voci, query, catFilter]);

  const gruppi = useMemo(() => CAPITOLATO_CATEGORIE
    .map((c) => ({ cat: c, items: risultati.filter((v) => v.categoria_code === c.code) }))
    .filter((g) => g.items.length > 0), [risultati]);

  const onSaved = (row) => setVoci((prev) => {
    // rimuovi eventuale globale oscurata e la stessa riga, poi reinserisci
    const filtered = prev.filter((v) => v.id !== row.id &&
      !(v.categoria_code === row.categoria_code && v.codice === row.codice && v.studio == null && row.studio));
    return [...filtered, row];
  });
  const onDeleted = (id) => { ricarica(); };

  const inputSt = { padding: "7px 10px", boxSizing: "border-box", border: `1px solid ${T.borderMd}`, borderRadius: T.radiusSm, background: T.surface, color: T.ink, fontSize: 13, fontFamily: "'Space Grotesk', sans-serif", outline: "none" };

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", padding: "24px 20px 80px" }}>
      <div style={{ marginBottom: 4, fontSize: 20, fontWeight: 700, color: T.ink }}>Regolazione capitolato</div>
      <div style={{ fontFamily: mono, fontSize: 11, color: T.muted, marginBottom: 20 }}>
        Libreria voci del computo metrico. Le voci del template sono condivise; modificandone il testo crei una versione dello studio. Puoi aggiungere voci nuove.
      </div>

      <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 14, flexWrap: "wrap" }}>
        <input placeholder="Cerca voci…" value={query} onChange={(e) => setQuery(e.target.value)} style={{ ...inputSt, flex: 1, minWidth: 220 }} />
        <button onClick={() => setAdding(true)} style={{ border: "none", background: T.navy, color: T.bg, borderRadius: T.radiusSm, fontFamily: mono, fontSize: 11, letterSpacing: "0.06em", textTransform: "uppercase", padding: "9px 16px", cursor: "pointer" }}>+ Nuova voce</button>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 20 }}>
        <Chip T={T} active={catFilter === ""} onClick={() => setCatFilter("")}>Tutte</Chip>
        {CAPITOLATO_CATEGORIE.map((c) => (
          <Chip key={c.code} T={T} active={catFilter === c.code} onClick={() => setCatFilter(catFilter === c.code ? "" : c.code)} title={c.nome}>{c.code}</Chip>
        ))}
      </div>

      {adding && (
        <VoceEditor nuova studioId={studioId} T={T} showToast={showToast}
          onSaved={(r) => { onSaved(r); setAdding(false); showToast("Voce aggiunta", "success"); }}
          onCancel={() => setAdding(false)} />
      )}

      {loading ? (
        <div style={{ color: T.muted, fontFamily: mono, fontSize: 12, padding: 40, textAlign: "center" }}>Carico…</div>
      ) : gruppi.length === 0 ? (
        <div style={{ color: T.muted, fontFamily: mono, fontSize: 12, padding: 40, textAlign: "center" }}>Nessuna voce trovata.</div>
      ) : gruppi.map((g) => (
        <div key={g.cat.code} style={{ marginBottom: 26 }}>
          <div style={{ fontFamily: mono, fontSize: 12, fontWeight: 700, color: T.navy, letterSpacing: "0.05em", marginBottom: 8 }}>{g.cat.titoloPagina}</div>
          {g.items.map((v) => (
            <VoceEditor key={v.id} voce={v} studioId={studioId} T={T} showToast={showToast} onSaved={onSaved} onDeleted={onDeleted} />
          ))}
        </div>
      ))}
    </div>
  );
}

function Chip({ T, active, children, ...rest }) {
  return (
    <button {...rest} style={{ fontFamily: mono, fontSize: 10, padding: "4px 9px", cursor: "pointer",
      border: `0.5px solid ${active ? T.navy : T.borderMd}`, borderRadius: T.radiusSm,
      background: active ? T.navy : "transparent", color: active ? T.bg : T.muted }}>{children}</button>
  );
}

const CAT_BY_CODE = Object.fromEntries(CAPITOLATO_CATEGORIE.map((c) => [c.code, c]));

function VoceEditor({ voce, nuova, studioId, T, showToast, onSaved, onDeleted, onCancel }) {
  const blank = { categoria_code: "A", categoria_nome: CAT_BY_CODE["A"]?.nome || "", codice: "", titolo: "", descrizione: "", unita: "a corpo", tipo: "singolo", sommano_labels: [] };
  const [d, setD] = useState(voce ? { ...voce } : blank);
  const [dirty, setDirty] = useState(!!nuova);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState(false);

  const set = (patch) => { setD((p) => ({ ...p, ...patch })); setDirty(true); };
  const setUnitaTipo = (patch) => {
    setD((p) => { const n = { ...p, ...patch }; n.sommano_labels = defaultSommanoLabels(n.unita, n.tipo); return n; });
    setDirty(true);
  };

  const isGlobale = voce && voce.studio == null;

  const salva = async () => {
    if (!d.codice.trim() || !d.titolo.trim()) { showToast("Codice e titolo obbligatori", "error"); return; }
    setSaving(true);
    try {
      const payload = { ...d, categoria_nome: CAT_BY_CODE[d.categoria_code]?.nome || d.categoria_nome || "" };
      if (!payload.sommano_labels || !payload.sommano_labels.length) payload.sommano_labels = defaultSommanoLabels(payload.unita, payload.tipo);
      const row = await saveVoceLibreria(payload, studioId);
      setD({ ...row }); setDirty(false); onSaved?.(row);
      if (!nuova) showToast("Voce salvata", "success");
    } catch (e) { console.error(e); showToast("Errore nel salvataggio: " + (e.message || ""), "error"); }
    finally { setSaving(false); }
  };

  const elimina = async () => {
    if (!voce?.id || isGlobale) return;
    if (!window.confirm("Eliminare questa voce dello studio?")) return;
    setBusy(true);
    try { await deleteVoceLibreria(voce.id); onDeleted?.(voce.id); }
    catch (e) { console.error(e); showToast("Errore eliminazione: " + (e.message || ""), "error"); }
    finally { setBusy(false); }
  };

  const inp = { padding: "6px 9px", boxSizing: "border-box", border: `1px solid ${T.borderMd}`, borderRadius: T.radiusSm, background: T.surface, color: T.ink, fontSize: 12.5, fontFamily: "'Space Grotesk', sans-serif", outline: "none" };
  const lbl = { fontFamily: mono, fontSize: 8, letterSpacing: "0.18em", textTransform: "uppercase", color: T.muted, marginBottom: 4 };

  return (
    <div style={{ border: `1px solid ${dirty ? T.navy : T.border}`, borderRadius: T.radiusSm, padding: 12, marginBottom: 8, background: T.surface }}>
      <div style={{ display: "grid", gridTemplateColumns: nuova ? "70px 90px 1fr 110px 130px" : "70px 1fr 110px 130px", gap: 8, alignItems: "end" }}>
        {nuova && (
          <div>
            <div style={lbl}>Cat.</div>
            <select value={d.categoria_code} onChange={(e) => set({ categoria_code: e.target.value })} style={{ ...inp, width: "100%" }}>
              {CAPITOLATO_CATEGORIE.map((c) => <option key={c.code} value={c.code}>{c.code}</option>)}
            </select>
          </div>
        )}
        <div>
          <div style={lbl}>Codice</div>
          <input value={d.codice} onChange={(e) => set({ codice: e.target.value })} style={{ ...inp, width: "100%" }} />
        </div>
        <div>
          <div style={lbl}>Titolo</div>
          <input value={d.titolo} onChange={(e) => set({ titolo: e.target.value })} style={{ ...inp, width: "100%" }} />
        </div>
        <div>
          <div style={lbl}>Unità</div>
          <select value={d.unita} onChange={(e) => setUnitaTipo({ unita: e.target.value })} style={{ ...inp, width: "100%" }}>
            {UNITA.map((u) => <option key={u} value={u}>{u || "—"}</option>)}
          </select>
        </div>
        <div>
          <div style={lbl}>Tipo</div>
          <select value={d.tipo} onChange={(e) => setUnitaTipo({ tipo: e.target.value })} style={{ ...inp, width: "100%" }}>
            <option value="singolo">singolo</option>
            <option value="fornitura_posa">fornitura + posa</option>
          </select>
        </div>
      </div>
      <div style={{ marginTop: 8 }}>
        <div style={lbl}>Descrizione</div>
        <textarea value={d.descrizione} onChange={(e) => set({ descrizione: e.target.value })} rows={Math.max(2, String(d.descrizione || "").split("\n").length)}
          style={{ ...inp, width: "100%", resize: "vertical", lineHeight: 1.4 }} />
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 8 }}>
        <div style={{ fontFamily: mono, fontSize: 9, color: T.muted }}>
          {nuova ? "nuova voce" : isGlobale ? "template globale — modificando crei la versione dello studio" : "voce dello studio"}
          {" · SOMMANO: " + (d.sommano_labels && d.sommano_labels.length ? d.sommano_labels.join(" / ") : defaultSommanoLabels(d.unita, d.tipo).join(" / "))}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {nuova && <button onClick={onCancel} style={{ border: `0.5px solid ${T.borderMd}`, background: "transparent", color: T.ink, borderRadius: T.radiusSm, fontFamily: mono, fontSize: 11, padding: "7px 14px", cursor: "pointer" }}>Annulla</button>}
          {!nuova && !isGlobale && <button onClick={elimina} disabled={busy} style={{ border: `0.5px solid ${T.borderMd}`, background: "transparent", color: T.red, borderRadius: T.radiusSm, fontFamily: mono, fontSize: 11, padding: "7px 12px", cursor: "pointer" }}>Elimina</button>}
          <button onClick={salva} disabled={saving || (!dirty && !nuova)} style={{ border: "none", background: T.navy, color: T.bg, borderRadius: T.radiusSm, fontFamily: mono, fontSize: 11, letterSpacing: "0.06em", textTransform: "uppercase", padding: "7px 16px", cursor: "pointer", opacity: saving || (!dirty && !nuova) ? 0.5 : 1 }}>{saving ? "Salvo…" : nuova ? "Aggiungi" : "Salva"}</button>
        </div>
      </div>
    </div>
  );
}
