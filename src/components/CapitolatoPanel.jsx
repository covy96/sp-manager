import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import { useTheme } from "../contexts/ThemeContext";
import { useBodyScrollLock } from "../hooks/useBodyScrollLock";
import { useEscKey } from "../hooks/useEscKey";
import { useToast } from "../contexts/ToastContext";
import { CAPITOLATO_CATEGORIE } from "../lib/capitolatoTemplate";
import {
  loadLibreria, loadCapitolato, createCapitolato, saveCapitolato,
  rigaFromVoce, emptyMisurazione, qtaMisurazione, totaleRiga, fmtNum, componiGruppi,
  snapshotCapitolato, saveVersioni,
} from "../lib/capitolatoModel";
import { generaCapitolatoPdf } from "../lib/capitolatoPdf";
import { generaCapitolatoXlsx } from "../lib/capitolatoXlsx";

const STUDIO_FIELDS =
  "name,indirizzo,città,cap,piva,report_header_name,report_header_text,report_logo_url,report_logo_size,report_footer_left,report_footer_center,report_footer_right,report_footer_font,report_body_font_enabled";

const norm = (s) => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
const oggi = () => new Date().toISOString().slice(0, 10);
const formattaData = (iso) => {
  const d = new Date(iso);
  if (isNaN(d)) return "";
  const p = (n) => String(n).padStart(2, "0");
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
};

export default function CapitolatoPanel({ projectId, studioId, project }) {
  const { T } = useTheme();
  const showToast = useToast();

  const [open, setOpen] = useState(false);
  useBodyScrollLock(open);
  useEscKey(() => setOpen(false), open);

  const [loading, setLoading] = useState(false);
  const [libreria, setLibreria] = useState([]);
  const [studio, setStudio] = useState(null);
  const [meta, setMeta] = useState({ id: null, nome: "Capitolato", committente: "", localita: "", data: oggi(), revisione: "" });
  const [righe, setRighe] = useState([]);
  const [query, setQuery] = useState("");
  const [catFilter, setCatFilter] = useState("");
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [versioni, setVersioni] = useState([]);
  const [versioneAttiva, setVersioneAttiva] = useState(null);
  const [menuVer, setMenuVer] = useState(null);
  const [view, setView] = useState("versioni"); // versioni | recap | edit

  // ── caricamento all'apertura ────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    let alive = true;
    setView("versioni"); setMenuVer(null);
    (async () => {
      setLoading(true);
      try {
        const [lib, existing, stu] = await Promise.all([
          loadLibreria(studioId),
          loadCapitolato(projectId),
          studioId ? supabase.from("studios").select(STUDIO_FIELDS).eq("id", studioId).single() : Promise.resolve({ data: null }),
        ]);
        if (!alive) return;
        setLibreria(lib);
        setStudio(stu?.data || null);
        if (existing) {
          const c = existing.capitolato;
          const m = { id: c.id, nome: c.nome || "Capitolato", committente: c.committente || "", localita: c.localita || "", data: c.data || oggi(), revisione: c.revisione || "" };
          setMeta(m);
          setRighe(existing.righe);
          const vers = Array.isArray(c.versioni) ? c.versioni : [];
          setVersioni(vers);
          const snap = JSON.stringify(snapshotCapitolato(m, existing.righe));
          setVersioneAttiva(vers.find((v) => JSON.stringify(v.snapshot) === snap)?.n ?? null);
        } else {
          setMeta({ id: null, nome: "Capitolato", committente: project?.committente || project?.cliente || "", localita: "", data: oggi(), revisione: "" });
          setRighe([]);
          setVersioni([]);
          setVersioneAttiva(null);
        }
        setDirty(false);
      } catch (e) {
        console.error(e);
        showToast?.("Errore nel caricamento del capitolato", "error");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [open, projectId, studioId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── ricerca voci ─────────────────────────────────────────────────────────────
  const risultati = useMemo(() => {
    const q = norm(query.trim());
    const usateIds = new Set(righe.map((r) => r.voce_id).filter(Boolean));
    let list = libreria;
    if (catFilter) list = list.filter((v) => v.categoria_code === catFilter);
    if (q) list = list.filter((v) => norm(v.codice).includes(q) || norm(v.titolo).includes(q) || norm(v.descrizione).includes(q));
    return list.slice(0, 80).map((v) => ({ ...v, _added: usateIds.has(v.id) }));
  }, [libreria, query, catFilter, righe]);

  const catConVoci = useMemo(() => {
    const s = new Set(libreria.map((v) => v.categoria_code));
    return CAPITOLATO_CATEGORIE.filter((c) => s.has(c.code));
  }, [libreria]);

  // righe raggruppate per categoria, con lettere/codici re-assegnati (come nell'export)
  const gruppi = useMemo(() => componiGruppi(righe), [righe]);

  // ── mutazioni righe ──────────────────────────────────────────────────────────
  const touch = () => setDirty(true);
  const addVoce = (voce) => { setRighe((p) => [...p, rigaFromVoce(voce)]); touch(); };
  const removeRiga = (key) => { setRighe((p) => p.filter((r) => r._key !== key)); touch(); };
  const patchRiga = (key, patch) => { setRighe((p) => p.map((r) => (r._key === key ? { ...r, ...patch } : r))); touch(); };
  const addMisura = (key) => setRighe((p) => { touch(); return p.map((r) => (r._key === key ? { ...r, misurazioni: [...r.misurazioni, emptyMisurazione()] } : r)); });
  const patchMisura = (key, idx, patch) => setRighe((p) => { touch(); return p.map((r) => r._key === key ? { ...r, misurazioni: r.misurazioni.map((m, i) => (i === idx ? { ...m, ...patch } : m)) } : r); });
  const removeMisura = (key, idx) => setRighe((p) => { touch(); return p.map((r) => r._key === key ? { ...r, misurazioni: r.misurazioni.filter((_, i) => i !== idx) || [emptyMisurazione()] } : r); });

  // sposta una riga su/giù all'interno della stessa categoria
  const moveRiga = (key, dir) => setRighe((p) => {
    const idx = p.findIndex((r) => r._key === key);
    if (idx < 0) return p;
    const cat = p[idx].categoria_code;
    const sameCat = p.map((r, i) => ({ r, i })).filter((x) => x.r.categoria_code === cat);
    const pos = sameCat.findIndex((x) => x.i === idx);
    const target = sameCat[pos + dir];
    if (!target) return p;
    const next = [...p];
    [next[idx], next[target.i]] = [next[target.i], next[idx]];
    return next;
  });

  // ── salvataggio ed export ─────────────────────────────────────────────────────
  const metaDb = () => ({ nome: meta.nome || "Capitolato", committente: meta.committente || null, localita: meta.localita || null, data: meta.data || null, revisione: meta.revisione || null });

  const handleSave = async () => {
    setSaving(true);
    try {
      let id = meta.id;
      if (!id) { const c = await createCapitolato(projectId, metaDb()); id = c.id; setMeta((m) => ({ ...m, id })); }
      // storico versioni: se lo stato coincide con una versione esistente la si rende
      // attiva, altrimenti se ne registra una nuova (più recente in cima, max 30).
      const snap = snapshotCapitolato(metaDb(), righe);
      const snapStr = JSON.stringify(snap);
      const esistente = versioni.find((v) => JSON.stringify(v.snapshot) === snapStr);
      let nuove = versioni, attivaN;
      if (esistente) { attivaN = esistente.n; }
      else {
        const nPrec = versioni.reduce((mx, v) => Math.max(mx, Number(v.n) || 0), 0);
        const nv = { n: nPrec + 1, ts: new Date().toISOString(), snapshot: snap };
        nuove = [nv, ...versioni].slice(0, 30);
        attivaN = nv.n;
      }
      try {
        await saveCapitolato(id, metaDb(), righe, nuove);
        setVersioni(nuove); setVersioneAttiva(attivaN); setDirty(false);
        showToast?.(esistente ? `Versione ${attivaN} resa principale` : `Versione ${attivaN} salvata`, "success");
      } catch (e) {
        // colonna 'versioni' non ancora creata sul DB (migration mancante): salva comunque
        const missing = e?.code === "42703" || /versioni/i.test(e?.message || "") && /(does not exist|column)/i.test(e?.message || "");
        if (missing) {
          await saveCapitolato(id, metaDb(), righe); // senza versioni
          setDirty(false);
          showToast?.("Capitolato salvato. Per lo storico versioni esegui la migration DB (capitolato_versioni.sql): non è ancora applicata.", "warning");
        } else { throw e; }
      }
    } catch (e) {
      console.error(e); showToast?.("Errore nel salvataggio: " + (e?.message || e?.details || e?.hint || ""), "error");
    } finally { setSaving(false); }
  };

  // Apre una versione: ne carica lo snapshot in stato e va al recap.
  const apriVersione = (v) => {
    const s = v.snapshot || {};
    setMeta((m) => ({ ...m, nome: s.nome || "Capitolato", committente: s.committente || "", localita: s.localita || "", data: s.data || oggi(), revisione: s.revisione || "" }));
    setRighe((s.righe || []).map((r) => ({
      ...r,
      _key: (typeof crypto !== "undefined" && crypto.randomUUID) ? crypto.randomUUID() : String(Math.random()),
      misurazioni: Array.isArray(r.misurazioni) && r.misurazioni.length ? r.misurazioni : [emptyMisurazione()],
      sommano_labels: Array.isArray(r.sommano_labels) ? r.sommano_labels : [],
    })));
    setVersioneAttiva(v.n); setDirty(false); setMenuVer(null); setView("recap");
  };

  const eliminaVersione = async (v) => {
    setMenuVer(null);
    if (!window.confirm(`Eliminare la Versione ${v.n}? L'operazione non è reversibile.`)) return;
    const nuove = versioni.filter((x) => x.n !== v.n);
    try {
      if (meta.id) await saveVersioni(meta.id, nuove);
      setVersioni(nuove);
      if (versioneAttiva === v.n) setVersioneAttiva(null);
      showToast?.(`Versione ${v.n} eliminata`, "success");
    } catch (e) { console.error(e); showToast?.("Errore eliminazione versione", "error"); }
  };

  const exportSnapshot = () => ({ capitolato: metaDb(), righe, project, studio });

  const handlePdf = async () => {
    if (!righe.length) { showToast?.("Aggiungi almeno una voce", "error"); return; }
    setBusy(true);
    try { await generaCapitolatoPdf(exportSnapshot()); }
    catch (e) { console.error(e); showToast?.("Errore nella generazione del PDF", "error"); }
    finally { setBusy(false); }
  };
  const handleXlsx = () => {
    if (!righe.length) { showToast?.("Aggiungi almeno una voce", "error"); return; }
    setBusy(true);
    try { generaCapitolatoXlsx(exportSnapshot()); }
    catch (e) { console.error(e); showToast?.("Errore nell'export Excel", "error"); }
    finally { setBusy(false); }
  };

  const nVoci = righe.length;

  // ── stili ──────────────────────────────────────────────────────────────────
  const mono = "'IBM Plex Mono', monospace";
  const inputSt = { padding: "6px 9px", boxSizing: "border-box", border: `1px solid ${T.borderMd}`, borderRadius: T.radiusSm, background: T.surface, color: T.ink, fontSize: 12, fontFamily: "'Space Grotesk', sans-serif", outline: "none" };
  const miniInput = { ...inputSt, padding: "3px 5px", fontSize: 11, fontFamily: mono, textAlign: "right", width: "100%" };
  const labelSt = { fontFamily: mono, fontSize: 8, letterSpacing: "0.18em", textTransform: "uppercase", color: T.muted, marginBottom: 4 };
  const btnGhost = { border: `0.5px solid ${T.borderMd}`, borderRadius: T.radiusSm, background: "transparent", color: T.ink, fontFamily: mono, fontSize: 11, letterSpacing: "0.06em", textTransform: "uppercase", padding: "8px 14px", cursor: "pointer" };
  const btnPrimary = { ...btnGhost, border: "none", background: T.navy, color: T.bg };

  return (
    <>
      <button onClick={() => setOpen(true)} style={{
        display: "flex", alignItems: "center", gap: 8, height: 34, padding: "0 14px",
        border: `0.5px solid ${T.borderMd}`, borderRadius: T.radiusSm, background: "transparent",
        cursor: "pointer", color: T.ink, fontFamily: mono, fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase",
      }}>
        ▤ Capitolato
      </button>

      {open && (
        <div style={{ position: "fixed", inset: 0, zIndex: 70, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.62)", padding: 12 }}>
          <div style={{ width: "100%", maxWidth: 1180, height: "92vh", display: "flex", flexDirection: "column", background: T.glassBg, backdropFilter: T.blur, WebkitBackdropFilter: T.blur, border: `1px solid ${T.glassBorder}`, borderRadius: T.radiusLg, overflow: "hidden", boxShadow: "0 24px 80px rgba(0,0,0,0.35)" }}>

            {/* Intestazione */}
            <div style={{ padding: "16px 20px", borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexShrink: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, minWidth: 0 }}>
                {!loading && view !== "versioni" && (
                  <button onClick={() => setView(view === "edit" ? "recap" : "versioni")} title="Indietro" style={{ ...iconBtn(T), width: 30, height: 30, fontSize: 16 }}>←</button>
                )}
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 16, fontWeight: 600, color: T.ink }}>
                    Capitolato · {view === "versioni" ? "Versioni" : view === "recap" ? "Recap" : "Modifica"}
                  </div>
                  <div style={{ fontFamily: mono, fontSize: 10, color: T.muted, marginTop: 2 }}>
                    {project?.name || "Progetto"}
                    {view === "versioni"
                      ? ` · ${versioni.length} ${versioni.length === 1 ? "versione" : "versioni"}`
                      : ` · ${nVoci} ${nVoci === 1 ? "voce" : "voci"}${versioneAttiva ? ` · v${versioneAttiva}` : ""}${dirty ? " · non salvato" : ""}`}
                  </div>
                </div>
              </div>
              <button onClick={() => setOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", color: T.muted, fontSize: 22, lineHeight: 1 }}>×</button>
            </div>

            {loading ? (
              <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: T.muted, fontFamily: mono, fontSize: 12 }}>Carico…</div>
            ) : view === "versioni" ? (
              <div style={{ flex: 1, overflowY: "auto", padding: 20, minHeight: 0 }}>
                {versioni.length === 0 ? (
                  <div style={{ textAlign: "center", marginTop: 40, color: T.muted, fontFamily: mono, fontSize: 12 }}>
                    <div style={{ marginBottom: 14 }}>Nessuna versione salvata.</div>
                    <button onClick={() => setView("recap")} style={btnPrimary}>Apri capitolato</button>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, maxWidth: 720, margin: "0 auto" }}>
                    {versioni.map((v) => {
                      const nv = (v.snapshot?.righe || []).length;
                      const rev = v.snapshot?.revisione;
                      const att = versioneAttiva === v.n;
                      return (
                        <div key={v.n} style={{ position: "relative", display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", border: `0.5px solid ${att ? T.navy : T.border}`, borderRadius: T.radiusSm, background: T.surface }}>
                          <button onClick={() => apriVersione(v)} style={{ flex: 1, display: "flex", alignItems: "center", gap: 12, background: "none", border: "none", cursor: "pointer", textAlign: "left", padding: 0 }}>
                            <span style={{ fontSize: 14, fontWeight: 700, color: att ? T.navy : T.ink }}>Versione {v.n}</span>
                            {rev ? <span style={{ fontFamily: mono, fontSize: 10, color: T.muted, border: `0.5px solid ${T.border}`, borderRadius: 3, padding: "1px 6px" }}>rev {rev}</span> : null}
                            <span style={{ fontFamily: mono, fontSize: 10, color: T.muted, flex: 1 }}>{formattaData(v.ts)} · {nv} {nv === 1 ? "voce" : "voci"}</span>
                            {att ? <span style={{ fontFamily: mono, fontSize: 9, color: T.navy }}>attiva</span> : null}
                            <span style={{ fontFamily: mono, fontSize: 9, letterSpacing: "0.06em", textTransform: "uppercase", color: T.navy }}>Apri →</span>
                          </button>
                          <button onClick={() => setMenuVer(menuVer === v.n ? null : v.n)} title="Altre azioni" style={{ background: "none", border: "none", cursor: "pointer", color: T.muted, fontSize: 16, lineHeight: 1, padding: "2px 4px" }}>⋮</button>
                          {menuVer === v.n && (
                            <div style={{ position: "absolute", right: 6, top: "100%", marginTop: 2, zIndex: 10, background: T.surface, border: `1px solid ${T.borderMd}`, borderRadius: T.radiusSm, overflow: "hidden", minWidth: 150 }}>
                              <button onClick={() => eliminaVersione(v)} style={{ display: "block", width: "100%", textAlign: "left", background: "none", border: "none", cursor: "pointer", color: T.red, fontFamily: mono, fontSize: 11, padding: "9px 12px" }}>Elimina versione</button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : view === "recap" ? (
              <div style={{ flex: 1, overflowY: "auto", padding: 20, minHeight: 0 }}>
                <div style={{ maxWidth: 820, margin: "0 auto" }}>
                  <div style={{ fontFamily: mono, fontSize: 10, color: T.muted, marginBottom: 14 }}>
                    {[meta.committente && `Committente: ${meta.committente}`, meta.localita && `Località: ${meta.localita}`, meta.revisione && `Rev ${meta.revisione}`, versioneAttiva && `Versione ${versioneAttiva}`].filter(Boolean).join("  ·  ") || "—"}
                  </div>
                  {gruppi.length === 0 ? (
                    <div style={{ textAlign: "center", marginTop: 30, color: T.muted, fontFamily: mono, fontSize: 12 }}>
                      <div style={{ marginBottom: 14 }}>Capitolato vuoto.</div>
                      <button onClick={() => setView("edit")} style={btnPrimary}>Aggiungi voci</button>
                    </div>
                  ) : gruppi.map((g) => (
                    <button key={g.code} onClick={() => setView("edit")} style={{ display: "block", width: "100%", textAlign: "left", marginBottom: 10, padding: 0, background: "none", border: "none", cursor: "pointer" }}>
                      <div style={{ border: `0.5px solid ${T.border}`, borderRadius: T.radiusSm, overflow: "hidden", background: T.surface }}>
                        <div style={{ background: T.navy, color: "#fff", padding: "7px 12px", fontFamily: mono, fontSize: 11, fontWeight: 700, display: "flex", justifyContent: "space-between" }}>
                          <span>{g.titoloPagina}</span>
                          <span style={{ opacity: 0.85 }}>{g.items.length} {g.items.length === 1 ? "voce" : "voci"}</span>
                        </div>
                        <div style={{ padding: "8px 12px" }}>
                          {g.items.map((r) => (
                            <div key={r._key} style={{ display: "flex", alignItems: "baseline", gap: 8, padding: "3px 0", fontSize: 12 }}>
                              <span style={{ fontFamily: mono, fontSize: 9, color: T.navy, fontWeight: 600, width: 34, flexShrink: 0 }}>{r._code}</span>
                              <span style={{ color: T.ink, flex: 1 }}>{r.titolo}</span>
                              <span style={{ fontFamily: mono, fontSize: 10, color: T.muted }}>{fmtNum(totaleRiga(r))} {r.unita}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {/* Meta copertina */}
                <div style={{ padding: "12px 20px", borderBottom: `1px solid ${T.border}`, display: "grid", gridTemplateColumns: "2fr 2fr 1.4fr 1fr", gap: 10, flexShrink: 0 }}>
                  {[
                    ["Nome / Locale", "nome"],
                    ["Committente", "committente"],
                    ["Località", "localita"],
                    ["Revisione", "revisione"],
                  ].map(([lab, key]) => (
                    <div key={key}>
                      <div style={labelSt}>{lab}</div>
                      <input style={{ ...inputSt, width: "100%" }} value={meta[key]} onChange={(e) => { setMeta((m) => ({ ...m, [key]: e.target.value })); touch(); }} />
                    </div>
                  ))}
                </div>
                <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
                {/* Colonna ricerca */}
                <div style={{ width: 340, borderRight: `1px solid ${T.border}`, display: "flex", flexDirection: "column", minHeight: 0 }}>
                  <div style={{ padding: "12px 14px", borderBottom: `1px solid ${T.border}` }}>
                    <input autoFocus placeholder="Cerca voci (es. cartongessi)…" value={query} onChange={(e) => setQuery(e.target.value)} style={{ ...inputSt, width: "100%" }} />
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 8 }}>
                      <button onClick={() => setCatFilter("")} style={{ ...chip(T, catFilter === "") }}>Tutte</button>
                      {catConVoci.map((c) => (
                        <button key={c.code} onClick={() => setCatFilter(catFilter === c.code ? "" : c.code)} title={c.nome} style={{ ...chip(T, catFilter === c.code) }}>{c.code}</button>
                      ))}
                    </div>
                  </div>
                  <div style={{ flex: 1, overflowY: "auto", padding: 8 }}>
                    {risultati.length === 0 ? (
                      <div style={{ color: T.muted, fontFamily: mono, fontSize: 11, padding: 12, textAlign: "center" }}>Nessuna voce</div>
                    ) : risultati.map((v) => (
                      <button key={v.id} onClick={() => addVoce(v)} disabled={v._added}
                        style={{ display: "block", width: "100%", textAlign: "left", padding: "8px 10px", marginBottom: 5, background: v._added ? T.surface2 : "transparent", border: `0.5px solid ${T.border}`, borderRadius: T.radiusSm, cursor: v._added ? "default" : "pointer", opacity: v._added ? 0.55 : 1 }}
                        onMouseEnter={(e) => { if (!v._added) e.currentTarget.style.borderColor = T.navy; }}
                        onMouseLeave={(e) => { e.currentTarget.style.borderColor = T.border; }}>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                          <span style={{ fontFamily: mono, fontSize: 9, color: T.navy, fontWeight: 600 }}>{v.codice}</span>
                          <span style={{ fontFamily: mono, fontSize: 8, color: T.muted }}>{v.categoria_code}{v.unita ? " · " + v.unita : ""}{v._added ? " · ✓" : ""}</span>
                        </div>
                        <div style={{ fontSize: 11.5, fontWeight: 600, color: T.ink, marginTop: 2 }}>{v.titolo}</div>
                        <div style={{ fontSize: 10, color: T.muted, marginTop: 2, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{v.descrizione}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Colonna capitolato composto */}
                <div style={{ flex: 1, overflowY: "auto", padding: 16, minHeight: 0 }}>
                  {gruppi.length === 0 ? (
                    <div style={{ color: T.muted, fontFamily: mono, fontSize: 12, textAlign: "center", marginTop: 40 }}>
                      Cerca una voce a sinistra e aggiungila al capitolato.
                    </div>
                  ) : gruppi.map((g) => (
                    <div key={g.code} style={{ marginBottom: 22 }}>
                      <div style={{ fontFamily: mono, fontSize: 11, fontWeight: 700, color: T.navy, letterSpacing: "0.05em", marginBottom: 8 }}>
                        {g.titoloPagina}
                      </div>
                      {g.items.map((r) => (
                        <RigaEditor key={r._key} r={r} T={T} mono={mono} miniInput={miniInput}
                          onPatch={(patch) => patchRiga(r._key, patch)}
                          onRemove={() => removeRiga(r._key)}
                          onMove={(d) => moveRiga(r._key, d)}
                          onAddMisura={() => addMisura(r._key)}
                          onPatchMisura={(i, p) => patchMisura(r._key, i, p)}
                          onRemoveMisura={(i) => removeMisura(r._key, i)} />
                      ))}
                    </div>
                  ))}
                </div>
              </div>
              </>
            )}

            {/* Footer azioni — per vista */}
            {!loading && view !== "versioni" && (
              <div style={{ padding: "12px 20px", borderTop: `1px solid ${T.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexShrink: 0 }}>
                <div style={{ fontFamily: mono, fontSize: 10, color: T.muted }}>
                  {nVoci} voci in {gruppi.length} {gruppi.length === 1 ? "categoria" : "categorie"}
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={handleXlsx} disabled={busy || !nVoci} style={{ ...btnGhost, opacity: busy || !nVoci ? 0.5 : 1 }}>Export Excel</button>
                  <button onClick={handlePdf} disabled={busy || !nVoci} style={{ ...btnGhost, opacity: busy || !nVoci ? 0.5 : 1 }}>{busy ? "…" : "Stampa PDF"}</button>
                  {view === "recap"
                    ? <button onClick={() => setView("edit")} style={btnPrimary}>Modifica</button>
                    : <button onClick={handleSave} disabled={saving} style={{ ...btnPrimary, opacity: saving ? 0.6 : 1 }}>{saving ? "Salvo…" : "Salva"}</button>}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function chip(T, active) {
  return {
    fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, padding: "3px 7px", cursor: "pointer",
    border: `0.5px solid ${active ? T.navy : T.border}`, borderRadius: T.radiusSm,
    background: active ? T.navy : "transparent", color: active ? T.bg : T.muted,
  };
}

// ── Editor di una singola voce (riga) ──────────────────────────────────────────
function RigaEditor({ r, T, mono, miniInput, onPatch, onRemove, onMove, onAddMisura, onPatchMisura, onRemoveMisura }) {
  const tot = totaleRiga(r);
  const labels = (r.sommano_labels && r.sommano_labels.length) ? r.sommano_labels : [`SOMMANO ${r.unita || ""}`.trim()];
  const cellHead = { fontFamily: mono, fontSize: 8, color: T.muted, textAlign: "center", paddingBottom: 2 };
  const grid = "1fr 52px 52px 52px 60px 24px"; // descrizione, lung, larg, hpeso, qta, x

  return (
    <div style={{ border: `0.5px solid ${T.border}`, borderRadius: T.radiusSm, padding: "10px 12px", marginBottom: 8, background: T.surface }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontFamily: mono, fontSize: 9, fontWeight: 700, color: T.navy, flexShrink: 0 }}>{r._code || r.codice}</span>
            <input value={r.titolo} onChange={(e) => onPatch({ titolo: e.target.value })}
              style={{ flex: 1, minWidth: 0, fontSize: 12.5, fontWeight: 700, color: T.ink, background: "transparent", border: "none", borderBottom: `1px dashed transparent`, outline: "none", fontFamily: "'Space Grotesk', sans-serif", padding: "1px 0" }}
              onFocus={(e) => (e.target.style.borderBottomColor = T.borderMd)}
              onBlur={(e) => (e.target.style.borderBottomColor = "transparent")} />
            {r.unita ? <span style={{ fontFamily: mono, fontSize: 8, color: T.muted, border: `0.5px solid ${T.border}`, borderRadius: 3, padding: "1px 5px", flexShrink: 0 }}>{r.unita}</span> : null}
            {r.tipo === "fornitura_posa" ? <span style={{ fontFamily: mono, fontSize: 8, color: "#b45309", flexShrink: 0 }}>F+P</span> : null}
          </div>
          <textarea value={r.descrizione} onChange={(e) => onPatch({ descrizione: e.target.value })}
            rows={Math.max(2, String(r.descrizione || "").split("\n").length)}
            style={{ width: "100%", boxSizing: "border-box", fontSize: 10.5, color: T.muted, marginTop: 4, background: "transparent", border: `1px solid transparent`, borderRadius: T.radiusSm, outline: "none", resize: "vertical", fontFamily: "'Space Grotesk', sans-serif", lineHeight: 1.35, padding: "2px 4px" }}
            onFocus={(e) => (e.target.style.borderColor = T.borderMd)}
            onBlur={(e) => (e.target.style.borderColor = "transparent")} />
        </div>
        <div style={{ display: "flex", gap: 3, flexShrink: 0 }}>
          <button title="Su" onClick={() => onMove(-1)} style={iconBtn(T)}>↑</button>
          <button title="Giù" onClick={() => onMove(1)} style={iconBtn(T)}>↓</button>
          <button title="Rimuovi" onClick={onRemove} style={{ ...iconBtn(T), color: T.red }}>×</button>
        </div>
      </div>

      {/* Misurazioni */}
      <div style={{ marginTop: 8 }}>
        <div style={{ display: "grid", gridTemplateColumns: grid, gap: 5, alignItems: "center" }}>
          <div style={{ ...cellHead, textAlign: "left" }}>MISURAZIONI</div>
          <div style={cellHead}>Lung.</div><div style={cellHead}>Larg.</div><div style={cellHead}>H/peso</div>
          <div style={cellHead}>Quantità</div><div />
        </div>
        {r.misurazioni.map((m, i) => {
          const auto = ["lung", "larg", "hpeso"].some((k) => String(m[k] ?? "") !== "");
          const q = qtaMisurazione(m);
          return (
            <div key={i} style={{ display: "grid", gridTemplateColumns: grid, gap: 5, alignItems: "center", marginBottom: 4 }}>
              <input placeholder="descrizione misura" value={m.descrizione} onChange={(e) => onPatchMisura(i, { descrizione: e.target.value })}
                style={{ ...miniInput, textAlign: "left", fontFamily: "'Space Grotesk', sans-serif" }} />
              <input value={m.lung} onChange={(e) => onPatchMisura(i, { lung: e.target.value })} style={miniInput} />
              <input value={m.larg} onChange={(e) => onPatchMisura(i, { larg: e.target.value })} style={miniInput} />
              <input value={m.hpeso} onChange={(e) => onPatchMisura(i, { hpeso: e.target.value })} style={miniInput} />
              {auto ? (
                <div style={{ fontFamily: mono, fontSize: 11, textAlign: "right", color: T.ink, padding: "3px 5px" }}>{fmtNum(q)}</div>
              ) : (
                <input value={m.qta} onChange={(e) => onPatchMisura(i, { qta: e.target.value })} style={miniInput} />
              )}
              <button onClick={() => onRemoveMisura(i)} style={{ ...iconBtn(T), color: T.muted }}>–</button>
            </div>
          );
        })}
        <button onClick={onAddMisura} style={{ fontFamily: mono, fontSize: 9, color: T.navy, background: "none", border: "none", cursor: "pointer", padding: "2px 0", letterSpacing: "0.05em" }}>+ aggiungi misura</button>
      </div>

      {/* SOMMANO */}
      <div style={{ marginTop: 6, paddingTop: 6, borderTop: `0.5px dashed ${T.border}` }}>
        {labels.map((lab, i) => (
          <div key={i} style={{ display: "flex", justifyContent: "space-between", fontFamily: mono, fontSize: 10.5, fontWeight: 700, color: T.ink }}>
            <span>{lab}</span><span>{fmtNum(tot)}</span>
          </div>
        ))}
      </div>

      {/* Nota */}
      <input placeholder="NOTE (opzionale)" value={r.note || ""} onChange={(e) => onPatch({ note: e.target.value })}
        style={{ marginTop: 6, width: "100%", boxSizing: "border-box", padding: "4px 8px", border: `1px solid ${T.border}`, borderRadius: T.radiusSm, background: "transparent", color: T.muted, fontSize: 10.5, fontFamily: "'Space Grotesk', sans-serif", outline: "none" }} />
    </div>
  );
}

function iconBtn(T) {
  return { width: 24, height: 24, borderRadius: T.radiusSm, border: `0.5px solid ${T.border}`, background: "transparent", color: T.ink, cursor: "pointer", fontSize: 13, lineHeight: 1, display: "flex", alignItems: "center", justifyContent: "center" };
}
