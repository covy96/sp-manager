import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { usePageTitleOnMount } from "../../hooks/usePageTitle";
import { useStudio } from "../../hooks/useStudio";
import { useTheme } from "../../contexts/ThemeContext";
import { useIsMobile } from "../../hooks/useIsMobile";
import { useToast } from "../../contexts/ToastContext";
import { CAPITOLATO_CATEGORIE } from "../../lib/capitolatoTemplate";
import { loadLibreria, saveVoceLibreria, deleteVoceLibreria, defaultSommanoLabels, spostaVoce, saveLayout, scambiaCodici, prossimoCodice, ordinaLibreria, codiceDuplicato, codiceCopia } from "../../lib/capitolatoModel";

const mono = "var(--font-label)";
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
  const [copia, setCopia] = useState(null); // { dopo: id originale, dati: campi precompilati }
  const [mostraEliminate, setMostraEliminate] = useState(false);
  const [inModifica, setInModifica] = useState(() => new Set()); // id delle voci con modifiche non salvate

  // Il "Carico…" solo al primo caricamento: ai ricaricamenti successivi (voce
  // aggiunta/eliminata) le schede restano montate e non perdono le modifiche in corso.
  const ricarica = async () => {
    try { setVoci(await loadLibreria(studioId, { includiInattive: true })); }
    catch (e) { console.error(e); showToast("Errore nel caricamento delle voci", "error"); }
    finally { setLoading(false); }
  };
  const segnaModifica = (id, sporca) => setInModifica((prev) => {
    if (prev.has(id) === sporca) return prev;
    const n = new Set(prev); if (sporca) n.add(id); else n.delete(id); return n;
  });
  // avvisa prima di chiudere/ricaricare la pagina con modifiche non salvate
  useEffect(() => {
    if (!inModifica.size) return;
    const h = (e) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [inModifica.size]);
  useEffect(() => { if (studioId !== null) ricarica(); }, [studioId]); // eslint-disable-line

  const risultati = useMemo(() => {
    const q = norm(query.trim());
    let l = mostraEliminate ? voci.filter((v) => v.attiva === false) : voci.filter((v) => v.attiva !== false);
    if (catFilter) l = l.filter((v) => v.categoria_code === catFilter);
    if (q) l = l.filter((v) => norm(v.codice).includes(q) || norm(v.titolo).includes(q) || norm(v.descrizione).includes(q));
    return l;
  }, [voci, query, catFilter, mostraEliminate]);
  const nEliminate = useMemo(() => voci.filter((v) => v.attiva === false).length, [voci]);

  const gruppi = useMemo(() => CAPITOLATO_CATEGORIE
    .map((c) => ({ cat: c, items: risultati.filter((v) => v.categoria_code === c.code) }))
    .filter((g) => g.items.length > 0), [risultati]);

  const onSaved = (row) => setVoci((prev) => {
    // rimuovi la stessa riga e l'eventuale globale che ora è oscurata (stessa
    // _layoutKey), poi reinserisci. Mai per codice: due voci possono condividerlo.
    const filtered = prev.filter((v) => v.id !== row.id && !(row._layoutKey && v._layoutKey === row._layoutKey));
    return ordinaLibreria([...filtered, row]); // resta al suo posto (ordine per codice)
  });
  const onDeleted = () => { ricarica(); };

  // Riordino e spostamento tra sezioni. L'ordine segue il codice: ↑↓ scambiano il
  // codice con la voce vicina, "Sposta in…" dà il primo codice libero della sezione
  // di destinazione. Durante una ricerca testuale è disattivato (le voci vicine
  // potrebbero essere nascoste).
  const puoSpostare = !!studioId && !query.trim() && !mostraEliminate;
  const sposta = async (id, { dir, cat }) => {
    const prima = voci;
    const attive = voci.filter((v) => v.attiva !== false); // le eliminate non contano come vicine
    try {
      if (cat) {
        const res = spostaVoce(attive, id, { cat });
        if (!res) return;
        setVoci(ordinaLibreria([...res.voci, ...voci.filter((v) => v.attiva === false)]));
        await saveLayout(studioId, res.layout);
        onSaved(await saveVoceLibreria(res.voce, studioId));
      } else {
        const coppia = scambiaCodici(attive, id, dir);
        if (!coppia) return;
        for (const v of coppia) onSaved(await saveVoceLibreria(v, studioId));
      }
    } catch (e) {
      console.error(e); showToast("Errore nello spostamento: " + (e.message || ""), "error");
      setVoci(prima); ricarica();
    }
  };
  const codiceSuggerito = (cat) => prossimoCodice(voci, cat);
  // Duplica: apre sotto l'originale una nuova voce con gli stessi campi (quelli a
  // schermo, anche se non ancora salvati) e il codice <codice>.1, da salvare con Aggiungi
  const puoDuplicare = !!studioId && !mostraEliminate;
  const duplica = (id, campi) => {
    const attive = voci.filter((v) => v.attiva !== false);
    const { categoria_code, categoria_nome, titolo, descrizione, unita, tipo, sommano_labels } = campi;
    setCopia({ dopo: id, n: Date.now(), dati: { categoria_code, categoria_nome, titolo, descrizione, unita, tipo, sommano_labels: [...(sommano_labels || [])], codice: codiceCopia(attive, campi) } });
  };
  const codiceUsato = (v) => codiceDuplicato(voci.filter((x) => x.attiva !== false), v);

  const inputSt = { padding: "8px 10px", boxSizing: "border-box", border: `1px solid ${T.borderMd}`, borderRadius: T.radiusSm, background: T.surface, color: T.ink, fontSize: 13, fontFamily: "var(--font-ui)", outline: "none" };

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", padding: "24px 20px 80px" }}>
      <div style={{ marginBottom: 4, fontSize: 26, fontWeight: 700, letterSpacing: '-0.025em', color: T.ink }}>Regolazione capitolato</div>
      <div style={{ fontFamily: mono, fontSize: 11, color: T.muted, marginBottom: 20 }}>
        Libreria voci del computo metrico. Le voci del template sono condivise; modificandone il testo crei una versione dello studio. Le voci sono in ordine di codice: puoi aggiungerne di nuove, riordinarle con ↑↓ (scambiano il codice) e spostarle in un'altra sezione.
      </div>

      <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 16, flexWrap: "wrap" }}>
        <input placeholder="Cerca voci…" value={query} onChange={(e) => setQuery(e.target.value)} style={{ ...inputSt, flex: 1, minWidth: 220 }} />
        <button onClick={() => setAdding(true)} style={{ border: "none", background: T.navy, color: T.bg, borderRadius: T.radiusSm, fontFamily: mono, fontSize: 11, letterSpacing: "0.06em", textTransform: "uppercase", padding: "10px 16px", cursor: "pointer" }}>+ Nuova voce</button>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 20 }}>
        <Chip T={T} active={catFilter === ""} onClick={() => setCatFilter("")}>Tutte</Chip>
        {CAPITOLATO_CATEGORIE.map((c) => (
          <Chip key={c.code} T={T} active={catFilter === c.code} onClick={() => setCatFilter(catFilter === c.code ? "" : c.code)} title={c.nome}>{c.code}</Chip>
        ))}
      </div>

      {(inModifica.size > 0 || nEliminate > 0) && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 14, fontFamily: mono, fontSize: 11 }}>
          <span style={{ color: T.red }}>{inModifica.size > 0 ? `Modifiche non salvate su ${inModifica.size} ${inModifica.size === 1 ? "voce" : "voci"}: premi Salva su ognuna` : ""}</span>
          {nEliminate > 0 && (
            <button onClick={() => setMostraEliminate((x) => !x)} style={{ border: `0.5px solid ${T.borderMd}`, background: "transparent", color: T.muted, borderRadius: T.radiusSm, fontFamily: mono, fontSize: 10, padding: "4px 10px", cursor: "pointer" }}>
              {mostraEliminate ? "Torna alle voci" : `Voci eliminate (${nEliminate})`}
            </button>
          )}
        </div>
      )}

      {adding && (
        <VoceEditor nuova studioId={studioId} T={T} showToast={showToast} codiceSuggerito={codiceSuggerito} codiceUsato={codiceUsato}
          onSaved={() => { ricarica(); setAdding(false); showToast("Voce aggiunta", "success"); }}
          onCancel={() => setAdding(false)} />
      )}

      {loading ? (
        <div style={{ color: T.muted, fontFamily: mono, fontSize: 12, padding: 40, textAlign: "center" }}>Carico…</div>
      ) : gruppi.length === 0 ? (
        <div style={{ color: T.muted, fontFamily: mono, fontSize: 12, padding: 40, textAlign: "center" }}>Nessuna voce trovata.</div>
      ) : gruppi.map((g) => (
        <div key={g.cat.code} style={{ marginBottom: 28 }}>
          <div style={{ fontFamily: mono, fontSize: 12, fontWeight: 700, color: T.navy, letterSpacing: "0.05em", marginBottom: 8 }}>{g.cat.titoloPagina}</div>
          {g.items.map((v, i) => (
            <Fragment key={v.id}>
              <VoceEditor voce={v} studioId={studioId} T={T} showToast={showToast} onSaved={onSaved} onDeleted={onDeleted} codiceUsato={codiceUsato} onDirty={segnaModifica}
                onDuplica={puoDuplicare && v.attiva !== false ? (campi) => duplica(v.id, campi) : null}
                spostamento={puoSpostare ? { primo: i === 0, ultimo: i === g.items.length - 1, onMove: (dir) => sposta(v.id, { dir }), onMoveCat: (cat) => sposta(v.id, { cat }) } : null} />
              {copia?.dopo === v.id && (
                <VoceEditor key={`copia-${copia.n}`} nuova copiaDi={v.codice} iniziale={copia.dati} studioId={studioId} T={T} showToast={showToast} codiceSuggerito={codiceSuggerito} codiceUsato={codiceUsato}
                  onSaved={() => { ricarica(); setCopia(null); showToast("Voce duplicata", "success"); }}
                  onCancel={() => setCopia(null)} />
              )}
            </Fragment>
          ))}
        </div>
      ))}
    </div>
  );
}

function Chip({ T, active, children, ...rest }) {
  return (
    <button {...rest} style={{ fontFamily: mono, fontSize: 10, padding: "4px 10px", cursor: "pointer",
      border: `0.5px solid ${active ? T.navy : T.borderMd}`, borderRadius: T.radiusSm,
      background: active ? T.navy : "transparent", color: active ? T.bg : T.muted }}>{children}</button>
  );
}

const CAT_BY_CODE = Object.fromEntries(CAPITOLATO_CATEGORIE.map((c) => [c.code, c]));

function VoceEditor({ voce, nuova, iniziale, copiaDi, onDuplica, studioId, T, showToast, onSaved, onDeleted, onCancel, spostamento, codiceSuggerito, codiceUsato, onDirty }) {
  const blank = { categoria_code: "A", categoria_nome: CAT_BY_CODE["A"]?.nome || "", codice: codiceSuggerito?.("A") || "", titolo: "", descrizione: "", unita: "a corpo", tipo: "singolo", sommano_labels: [] };
  const isMobile = useIsMobile();
  const [d, setD] = useState(voce ? { ...voce } : iniziale ? { ...blank, ...iniziale } : blank);
  const codiceIniziale = useRef(iniziale?.codice);
  // la copia appena aperta viene portata in vista, col titolo pronto da modificare
  const boxRef = useRef(null);
  const titoloRef = useRef(null);
  useEffect(() => {
    if (!iniziale) return;
    boxRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    titoloRef.current?.focus({ preventScroll: true });
  }, []); // eslint-disable-line
  const [dirty, setDirty] = useState(!!nuova);
  // la voce può cambiare da fuori (codice scambiato con ↑↓, spostamento): riallinea
  // il form; con modifiche in corso aggiorna solo codice e identità, così un
  // salvataggio successivo non rimette il codice vecchio
  const prevVoce = useRef(voce);
  useEffect(() => {
    const prima = prevVoce.current; prevVoce.current = voce;
    if (!voce) return;
    if (!dirty) setD({ ...voce });
    else if (prima && (prima.codice !== voce.codice || prima.id !== voce.id))
      setD((p) => ({ ...p, codice: voce.codice, id: voce.id, studio: voce.studio }));
  }, [voce]); // eslint-disable-line
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState(false);
  const voceId = voce?.id;
  useEffect(() => { if (voceId) onDirty?.(voceId, dirty); }, [voceId, dirty]); // eslint-disable-line
  useEffect(() => () => { if (voceId) onDirty?.(voceId, false); }, [voceId]); // eslint-disable-line

  const set = (patch) => { setD((p) => ({ ...p, ...patch })); setDirty(true); };
  const setUnitaTipo = (patch) => {
    setD((p) => { const n = { ...p, ...patch }; n.sommano_labels = defaultSommanoLabels(n.unita, n.tipo); return n; });
    setDirty(true);
  };

  const isGlobale = voce && voce.studio == null;

  const salva = async () => {
    if (!d.codice.trim() || !d.titolo.trim()) { showToast("Codice e titolo obbligatori", "error"); return; }
    // codice già usato nella sezione: si salva lo stesso (le voci non si identificano
    // per codice), ma lo segnaliamo perché l'ordine tra le due resta ambiguo
    const codiceCambiato = !voce || d.codice.trim().toLowerCase() !== String(voce.codice || "").trim().toLowerCase();
    const doppio = codiceCambiato && codiceUsato?.({ id: voce?.id, categoria_code: voce ? voce.categoria_code : d.categoria_code, codice: d.codice });
    setSaving(true);
    try {
      const payload = voce
        // sezione/ordine/identità dalla voce corrente (può essere stata spostata dopo il mount)
        ? { ...d, categoria_code: voce.categoria_code, categoria_nome: voce.categoria_nome, ordine: voce.ordine, _orig: voce._orig, _layoutKey: voce._layoutKey }
        : { ...d, categoria_nome: CAT_BY_CODE[d.categoria_code]?.nome || d.categoria_nome || "", ordine: 0 };
      if (!payload.sommano_labels || !payload.sommano_labels.length) payload.sommano_labels = defaultSommanoLabels(payload.unita, payload.tipo);
      const row = await saveVoceLibreria(payload, studioId);
      setD({ ...row }); setDirty(false); onSaved?.(row);
      if (doppio) showToast(`Salvata. Attenzione: il codice ${d.codice.trim()} è usato anche da un'altra voce della sezione`, "warning");
      else if (!nuova) showToast("Voce salvata", "success");
    } catch (e) { console.error(e); showToast("Errore nel salvataggio: " + (e.message || ""), "error"); }
    finally { setSaving(false); }
  };

  const eliminata = voce?.attiva === false;
  const elimina = async () => {
    if (!voce?.id) return;
    if (!window.confirm(`Eliminare la voce ${voce.codice || ""} dalla libreria?`)) return;
    setBusy(true);
    try { await deleteVoceLibreria({ ...voce, _orig: voce._orig, _layoutKey: voce._layoutKey }, studioId); setDirty(false); onDeleted?.(voce.id); showToast("Voce eliminata", "success"); }
    catch (e) { console.error(e); showToast("Errore eliminazione: " + (e.message || ""), "error"); }
    finally { setBusy(false); }
  };
  const ripristina = async () => {
    setBusy(true);
    try { onSaved?.(await saveVoceLibreria({ ...voce, attiva: true }, studioId)); showToast("Voce ripristinata", "success"); }
    catch (e) { console.error(e); showToast("Errore nel ripristino: " + (e.message || ""), "error"); }
    finally { setBusy(false); }
  };

  const inp = { padding: "6px 10px", boxSizing: "border-box", border: `1px solid ${T.borderMd}`, borderRadius: T.radiusSm, background: T.surface, color: T.ink, fontSize: 12.5, fontFamily: "var(--font-ui)", outline: "none" };
  const lbl = { fontFamily: mono, fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase", color: T.muted, marginBottom: 4 };

  return (
    <div ref={boxRef} style={{ border: `1px solid ${dirty ? T.navy : T.border}`, borderRadius: T.radiusSm, padding: 12, marginBottom: 8, background: T.surface }}>
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : nuova ? "70px 90px 1fr 110px 130px" : "70px 1fr 110px 130px", gap: 8, alignItems: "end" }}>
        {nuova && (
          <div>
            <div style={lbl}>Cat.</div>
            <select value={d.categoria_code} onChange={(e) => {
              const cat = e.target.value;
              // codice ancora quello suggerito (o vuoto) → suggerisci quello della nuova sezione
              const auto = !d.codice || d.codice === codiceSuggerito?.(d.categoria_code) || d.codice === codiceIniziale.current;
              set({ categoria_code: cat, ...(auto ? { codice: codiceSuggerito?.(cat) || "" } : {}) });
            }} style={{ ...inp, width: "100%" }}>
              {CAPITOLATO_CATEGORIE.map((c) => <option key={c.code} value={c.code}>{c.code}</option>)}
            </select>
          </div>
        )}
        <div>
          <div style={lbl}>Codice</div>
          <input value={d.codice} onChange={(e) => set({ codice: e.target.value })} style={{ ...inp, width: "100%" }} />
        </div>
        <div style={isMobile ? { gridColumn: "1 / -1" } : undefined}>
          <div style={lbl}>Titolo</div>
          <input ref={titoloRef} value={d.titolo} onChange={(e) => set({ titolo: e.target.value })} style={{ ...inp, width: "100%" }} />
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
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
        <div style={{ fontFamily: mono, fontSize: 10, color: T.muted }}>
          {copiaDi != null ? `copia di ${copiaDi || "voce"}` : nuova ? "nuova voce" : eliminata ? "voce eliminata" : isGlobale ? "template globale — modificando crei la versione dello studio" : "voce dello studio"}
          {" · SOMMANO: " + (d.sommano_labels && d.sommano_labels.length ? d.sommano_labels.join(" / ") : defaultSommanoLabels(d.unita, d.tipo).join(" / "))}
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", marginLeft: "auto" }}>
          {spostamento && (
            <>
              <button title={dirty ? "Salva prima di spostare" : "Sposta su"} onClick={() => spostamento.onMove(-1)} disabled={dirty || spostamento.primo}
                style={{ ...moveBtn(T), opacity: dirty || spostamento.primo ? 0.35 : 1 }}>↑</button>
              <button title={dirty ? "Salva prima di spostare" : "Sposta giù"} onClick={() => spostamento.onMove(1)} disabled={dirty || spostamento.ultimo}
                style={{ ...moveBtn(T), opacity: dirty || spostamento.ultimo ? 0.35 : 1 }}>↓</button>
              <select value="" disabled={dirty} title={dirty ? "Salva prima di spostare" : "Sposta in un'altra sezione"}
                onChange={(e) => e.target.value && spostamento.onMoveCat(e.target.value)}
                style={{ ...inp, fontFamily: mono, fontSize: 10, padding: "6px 6px", cursor: dirty ? "default" : "pointer", opacity: dirty ? 0.35 : 1 }}>
                <option value="">Sposta in…</option>
                {CAPITOLATO_CATEGORIE.filter((c) => c.code !== voce.categoria_code).map((c) => <option key={c.code} value={c.code}>{c.code}) {c.nome}</option>)}
              </select>
            </>
          )}
          {onDuplica && <button onClick={() => onDuplica(d)} title="Crea una nuova voce partendo da questa"
            style={{ border: `0.5px solid ${T.borderMd}`, background: "transparent", color: T.ink, borderRadius: T.radiusSm, fontFamily: mono, fontSize: 11, padding: "8px 12px", cursor: "pointer" }}>Duplica</button>}
          {nuova && <button onClick={onCancel} style={{ border: `0.5px solid ${T.borderMd}`, background: "transparent", color: T.ink, borderRadius: T.radiusSm, fontFamily: mono, fontSize: 11, padding: "8px 16px", cursor: "pointer" }}>Annulla</button>}
          {eliminata && <button onClick={ripristina} disabled={busy} style={{ border: `0.5px solid ${T.borderMd}`, background: "transparent", color: T.ink, borderRadius: T.radiusSm, fontFamily: mono, fontSize: 11, padding: "8px 12px", cursor: "pointer" }}>Ripristina</button>}
          {!nuova && !eliminata && <button onClick={elimina} disabled={busy} style={{ border: `0.5px solid ${T.borderMd}`, background: "transparent", color: T.red, borderRadius: T.radiusSm, fontFamily: mono, fontSize: 11, padding: "8px 12px", cursor: "pointer" }}>Elimina</button>}
          <button onClick={salva} disabled={saving || (!dirty && !nuova)} style={{ border: "none", background: T.navy, color: T.bg, borderRadius: T.radiusSm, fontFamily: mono, fontSize: 11, letterSpacing: "0.06em", textTransform: "uppercase", padding: "8px 16px", cursor: "pointer", opacity: saving || (!dirty && !nuova) ? 0.5 : 1 }}>{saving ? "Salvo…" : nuova ? "Aggiungi" : "Salva"}</button>
        </div>
      </div>
    </div>
  );
}

function moveBtn(T) {
  return { border: `0.5px solid ${T.borderMd}`, background: "transparent", color: T.ink, borderRadius: T.radiusSm, fontFamily: mono, fontSize: 12, width: 28, height: 28, padding: 0, cursor: "pointer" };
}
