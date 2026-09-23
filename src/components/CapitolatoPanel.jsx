import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../lib/supabase";
import { useTheme } from "../contexts/ThemeContext";
import { useBodyScrollLock } from "../hooks/useBodyScrollLock";
import { useEscKey } from "../hooks/useEscKey";
import { useToast } from "../contexts/ToastContext";
import { CAPITOLATO_CATEGORIE } from "../lib/capitolatoTemplate";
import {
  loadLibreria, loadCapitolato, createCapitolato, saveCapitolato,
  rigaFromVoce, emptyMisurazione, qtaMisurazione, totaleRigaEff, fmtNum, componiGruppi,
  snapshotCapitolato, saveVersioni, deleteCapitolato, loadCapitolatiImportabili, loadRigheImport,
  defaultSommanoLabels, saveVoceLibreria, IMPIANTI_ASSISTENZA, assistenzaLabel, assistenzaBasi,
} from "../lib/capitolatoModel";
import { generaCapitolatoPdf } from "../lib/capitolatoPdf";
import { generaCapitolatoXlsx } from "../lib/capitolatoXlsx";

const STUDIO_FIELDS =
  "name,indirizzo,città,cap,piva,report_header_name,report_header_text,report_logo_url,report_logo_size,report_footer_left,report_footer_center,report_footer_right,report_footer_font,report_body_font_enabled";

const norm = (s) => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
const oggi = () => new Date().toISOString().slice(0, 10);

// Preset di "sommano" scegliibili per ogni voce dentro il capitolato.
// Un'unità (tipo singolo) oppure Fornitura + Posa (tipo fornitura_posa, mantiene
// l'unità corrente). Cambiare preset rigenera anche le etichette SOMMANO.
const SOMMANO_PRESETS = [
  { key: "mq", label: "Sommano mq", unita: "mq", tipo: "singolo" },
  { key: "ml", label: "Sommano ml", unita: "ml", tipo: "singolo" },
  { key: "mc", label: "Sommano mc", unita: "mc", tipo: "singolo" },
  { key: "kg", label: "Sommano kg", unita: "kg", tipo: "singolo" },
  { key: "cad", label: "Sommano cad", unita: "cad", tipo: "singolo" },
  { key: "corpo", label: "Sommano a corpo", unita: "a corpo", tipo: "singolo" },
  { key: "fp", label: "Fornitura + Posa", unita: null, tipo: "fornitura_posa" },
  { key: "assist", label: "Assistenza muraria %", unita: "%", tipo: "assistenza" },
];
// Chiave del preset attivo per una riga (per posizionare la select).
const presetKeyOf = (r) => {
  if (r.assistenza) return "assist";
  if (r.tipo === "fornitura_posa") return "fp";
  const u = String(r.unita || "").toLowerCase();
  return SOMMANO_PRESETS.find((p) => p.key !== "fp" && p.key !== "assist" && p.unita === u)?.key || "";
};
// Patch da applicare quando si sceglie un preset per la riga r.
const presetPatch = (r, key) => {
  const p = SOMMANO_PRESETS.find((x) => x.key === key);
  if (!p) return null;
  if (p.key === "assist") {
    // diventa assistenza a %: default = tutti gli impianti tranne la categoria
    // della voce (anti-circolare); percentuale vuota (la mette l'impresa).
    const basi = IMPIANTI_ASSISTENZA.map((x) => x.code).filter((c) => c !== r.categoria_code);
    return { unita: "%", tipo: "assistenza", sommano_labels: [], assistenza: r.assistenza || { basi, perc: "" } };
  }
  const unita = p.tipo === "fornitura_posa" ? (r.unita || "mq") : p.unita;
  return { unita, tipo: p.tipo, sommano_labels: defaultSommanoLabels(unita, p.tipo), assistenza: null };
};
const formattaData = (iso) => {
  const d = new Date(iso);
  if (isNaN(d)) return "";
  const p = (n) => String(n).padStart(2, "0");
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
};

export default function CapitolatoPanel({ projectId, studioId, project, openSignal }) {
  const { T } = useTheme();
  const showToast = useToast();

  const [open, setOpen] = useState(false);
  useBodyScrollLock(open);
  useEscKey(() => setOpen(false), open);
  // apertura esterna (dal Centro documenti)
  useEffect(() => { if (openSignal) setOpen(true); }, [openSignal]);

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
  const [importOpen, setImportOpen] = useState(false);
  const [importList, setImportList] = useState([]);
  const [importLoading, setImportLoading] = useState(false);
  const [versCount, setVersCount] = useState(0); // badge sul pulsante: n. versioni salvate
  const [catInsert, setCatInsert] = useState(null); // macro-categoria in cui finiscono le voci aggiunte
  const [catPickerOpen, setCatPickerOpen] = useState(false); // selettore "mega voce"
  const [nuovaOpen, setNuovaOpen] = useState(false); // form "nuova voce" (non in libreria)
  const [nuova, setNuova] = useState({ titolo: "", descrizione: "", categoria_code: "", unita: "mq", tipo: "singolo", salvaLibreria: true });
  const [autoState, setAutoState] = useState("idle"); // idle | saving | saved (auto-save bozza)

  // Ref per l'auto-save bozza (debounce + guardie anti-doppioni).
  const autosaveTimer = useRef(null);
  const skipAutosave = useRef(true); // salta il primo run dopo un caricamento/reset
  const creatingRow = useRef(false);  // evita create concorrenti della riga capitolato
  const capIdRef = useRef(null);      // id riga capitolato, aggiornato subito dopo la create

  // ── caricamento all'apertura ────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    let alive = true;
    setView("versioni"); setMenuVer(null);
    setCatInsert(null); setCatPickerOpen(false); setAutoState("idle");
    skipAutosave.current = true; // il set di stato del caricamento non deve auto-salvare
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
          capIdRef.current = c.id;
          setMeta(m);
          setRighe(existing.righe);
          const vers = Array.isArray(c.versioni) ? c.versioni : [];
          setVersioni(vers);
          const snap = JSON.stringify(snapshotCapitolato(m, existing.righe));
          setVersioneAttiva(vers.find((v) => JSON.stringify(v.snapshot) === snap)?.n ?? null);
        } else {
          capIdRef.current = null;
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

  // Conteggio versioni per il badge sul pulsante: caricato all'avvio e ad ogni
  // chiusura del pannello (così riflette salvataggi/eliminazioni appena fatti).
  useEffect(() => {
    if (open) return;
    let alive = true;
    (async () => {
      const { data } = await supabase.from("capitolati")
        .select("versioni").eq("project_id", projectId).is("deleted_at", null)
        .order("created_at", { ascending: false }).limit(1);
      const v = data?.[0]?.versioni; // colonna assente → data null → resta 0
      if (alive) setVersCount(Array.isArray(v) ? v.length : 0);
    })();
    return () => { alive = false; };
  }, [open, projectId]);

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
  // La voce aggiunta finisce nella macro-categoria scelta (catInsert), non in
  // quella d'origine della libreria; senza scelta usa quella della voce.
  const addVoce = (voce) => {
    const code = catInsert || voce.categoria_code;
    const cat = CAPITOLATO_CATEGORIE.find((c) => c.code === code);
    const riga = { ...rigaFromVoce(voce), categoria_code: code, categoria_nome: cat?.nome || voce.categoria_nome || "" };
    setRighe((p) => [...p, riga]); touch();
  };
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

  // Apre il selettore di macro-categoria ("mega voce") per iniziare ad aggiungere.
  const openCatPicker = () => setCatPickerOpen(true);
  const scegliCategoria = (code) => {
    setCatInsert(code);
    setCatFilter(code);      // pre-filtra la libreria sulla categoria scelta
    setCatPickerOpen(false);
    setView("edit");
  };

  // ── Nuova voce (non in libreria) ─────────────────────────────────────────────
  // Apre il form precompilando titolo dalla ricerca e categoria dalla mega voce.
  const openNuovaVoce = () => {
    setNuova({ titolo: query.trim(), descrizione: "", categoria_code: catInsert || "", unita: "mq", tipo: "singolo", salvaLibreria: true });
    setNuovaOpen(true);
  };
  const confermaNuovaVoce = async () => {
    const titolo = nuova.titolo.trim();
    if (!titolo) { showToast?.("Inserisci un titolo per la voce", "error"); return; }
    if (!nuova.categoria_code) { showToast?.("Scegli la categoria (mega voce)", "error"); return; }
    setBusy(true);
    try {
      const cat = CAPITOLATO_CATEGORIE.find((c) => c.code === nuova.categoria_code);
      let voce = {
        id: null, categoria_code: nuova.categoria_code, categoria_nome: cat?.nome || "",
        codice: "", titolo, descrizione: nuova.descrizione.trim(), unita: nuova.unita, tipo: nuova.tipo,
        sommano_labels: defaultSommanoLabels(nuova.unita, nuova.tipo),
      };
      // Salvataggio in libreria (opzionale): dà un id per collegare la riga e la
      // rende ricercabile nei prossimi capitolati. Codice univoco per non collidere
      // con altre voci custom nella stessa categoria (dedup per categoria+codice).
      if (nuova.salvaLibreria && studioId) {
        try {
          voce = { ...voce, codice: "PERS-" + Math.random().toString(36).slice(2, 7).toUpperCase() };
          const saved = await saveVoceLibreria(voce, studioId);
          voce = { ...voce, id: saved.id };
          setLibreria((p) => [...p.filter((v) => v.id !== saved.id), saved]);
        } catch (e) { console.error(e); showToast?.("Voce aggiunta al capitolato, ma non salvata in libreria", "warning"); }
      }
      // Aggiunge la riga al capitolato nella categoria scelta.
      const riga = { ...rigaFromVoce(voce), categoria_code: nuova.categoria_code, categoria_nome: cat?.nome || "" };
      setRighe((p) => [...p, riga]); touch();
      if (catInsert !== nuova.categoria_code) setCatInsert(nuova.categoria_code);
      setNuovaOpen(false); setView("edit");
      showToast?.("Voce aggiunta al capitolato", "success");
    } finally { setBusy(false); }
  };

  // ── Auto-save bozza ──────────────────────────────────────────────────────────
  // Ogni modifica alle righe/meta persiste la bozza nel DB (senza creare versioni);
  // il tasto "Salva" resta per lo snapshot di versione. Debounce per non salvare
  // ad ogni tasto. Al primo inserimento crea la riga capitolato.
  useEffect(() => {
    if (!open || loading) return;
    if (skipAutosave.current) { skipAutosave.current = false; return; }
    if (!capIdRef.current && righe.length === 0) return; // niente da persistere, niente righe fantasma
    setAutoState("saving");
    clearTimeout(autosaveTimer.current);
    const run = async () => {
      if (creatingRow.current) { autosaveTimer.current = setTimeout(run, 200); return; } // create in corso: riprova
      try {
        let id = capIdRef.current;
        if (!id) {
          creatingRow.current = true;
          const c = await createCapitolato(projectId, metaDb());
          id = c.id;
          capIdRef.current = id;
          setMeta((m) => ({ ...m, id }));
          creatingRow.current = false;
        }
        await saveCapitolato(id, metaDb(), righe); // solo bozza, nessuna versione
        setAutoState("saved");
      } catch (e) {
        creatingRow.current = false;
        console.error("auto-save capitolato", e);
        setAutoState("idle");
      }
    };
    autosaveTimer.current = setTimeout(run, 900);
    return () => clearTimeout(autosaveTimer.current);
    // deps: le righe e i campi meta (non meta.id, per non ri-scattare dopo la create)
  }, [righe, meta.nome, meta.committente, meta.localita, meta.data, meta.revisione]); // eslint-disable-line react-hooks/exhaustive-deps

  // Alla chiusura del pannello annulla eventuali auto-save ancora in coda.
  useEffect(() => { if (!open) clearTimeout(autosaveTimer.current); }, [open]);

  const handleSave = async () => {
    setSaving(true);
    let ok = true;
    try {
      let id = meta.id || capIdRef.current;
      if (!id) { const c = await createCapitolato(projectId, metaDb()); id = c.id; capIdRef.current = id; setMeta((m) => ({ ...m, id })); }
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
      ok = false;
      console.error(e); showToast?.("Errore nel salvataggio: " + (e?.message || e?.details || e?.hint || ""), "error");
    } finally { setSaving(false); }
    return ok;
  };

  // "Salva ed esci": crea/aggiorna la VERSIONE e chiude il pannello. La versione
  // si crea solo qui (non durante la compilazione, che usa l'auto-save bozza),
  // così non si accumulano decine di versioni in pochi minuti.
  const handleSaveExit = async () => {
    clearTimeout(autosaveTimer.current); // annulla un eventuale auto-save in coda
    const ok = await handleSave();
    if (ok) setOpen(false);
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

  // Azzera lo stato in memoria a "capitolato nuovo, vuoto" (dopo un'eliminazione).
  const resetCapitolatoLocale = () => {
    skipAutosave.current = true; // il reset non deve ri-creare una riga vuota
    clearTimeout(autosaveTimer.current);
    capIdRef.current = null;
    setMeta({ id: null, nome: "Capitolato", committente: project?.committente || project?.cliente || "", localita: "", data: oggi(), revisione: "" });
    setRighe([]);
    setVersioni([]);
    setVersioneAttiva(null);
    setCatInsert(null);
    setAutoState("idle");
    setDirty(false);
    setView("versioni");
  };

  // "+ Nuovo capitolato": riparte da una bozza vuota mantenendo lo storico
  // versioni; al "Salva ed esci" diventa la versione successiva.
  const nuovoCapitolato = () => {
    const snapStr = JSON.stringify(snapshotCapitolato(metaDb(), righe));
    const bozzaNonSalvata = righe.length > 0 && !versioni.some((v) => JSON.stringify(v.snapshot) === snapStr);
    if (bozzaNonSalvata && !window.confirm("La bozza attuale non è salvata in nessuna versione e verrà svuotata. Continuare?")) return;
    setMenuVer(null);
    setRighe([]);
    setMeta((m) => ({ ...m, revisione: "", data: oggi() }));
    setVersioneAttiva(null);
    setCatInsert(null); setCatFilter(""); setQuery("");
    setDirty(true);
    setView("edit");
    openCatPicker();
  };

  const eliminaVersione = async (v) => {
    setMenuVer(null);
    const nuove = versioni.filter((x) => x.n !== v.n);
    const ultima = nuove.length === 0; // era l'unica versione rimasta
    const msg = ultima
      ? `Eliminare la Versione ${v.n}? È l'unica versione: verrà eliminato l'intero capitolato e si ripartirà da zero.`
      : `Eliminare la Versione ${v.n}? L'operazione non è reversibile.`;
    if (!window.confirm(msg)) return;
    try {
      if (ultima) {
        // Ultima versione → elimina l'intero capitolato e azzera lo stato, così
        // il prossimo capitolato del progetto parte davvero da zero.
        if (meta.id) await deleteCapitolato(meta.id);
        resetCapitolatoLocale();
        showToast?.("Capitolato eliminato", "success");
        return;
      }
      if (meta.id) await saveVersioni(meta.id, nuove);
      setVersioni(nuove);
      if (versioneAttiva === v.n) setVersioneAttiva(null);
      showToast?.(`Versione ${v.n} eliminata`, "success");
    } catch (e) { console.error(e); showToast?.("Errore eliminazione versione", "error"); }
  };

  // Elimina l'intero capitolato (righe + versioni), anche quando non ci sono
  // versioni salvate: rimuove la bozza residua nel DB e riparte da zero.
  const eliminaCapitolato = async () => {
    if (!window.confirm("Eliminare l'intero capitolato? Tutte le voci verranno rimosse e si ripartirà da zero. L'operazione non è reversibile.")) return;
    try {
      if (meta.id) await deleteCapitolato(meta.id);
      resetCapitolatoLocale();
      showToast?.("Capitolato eliminato", "success");
    } catch (e) { console.error(e); showToast?.("Errore eliminazione capitolato", "error"); }
  };

  // ── Importa "usa come base" da un altro progetto ─────────────────────────────
  const openImport = async () => {
    setImportOpen(true); setImportLoading(true);
    try { setImportList(await loadCapitolatiImportabili(studioId, projectId)); }
    catch (e) { console.error(e); showToast?.("Errore nel caricamento dei progetti", "error"); }
    finally { setImportLoading(false); }
  };
  const doImport = async (item) => {
    setBusy(true);
    try {
      const nuove = await loadRigheImport(item.capitolato_id);
      setRighe((p) => [...p, ...nuove]); touch();
      setImportOpen(false); setView("edit");
      showToast?.(`Importate ${nuove.length} ${nuove.length === 1 ? "voce" : "voci"} da ${item.project_name}`, "success");
    } catch (e) { console.error(e); showToast?.("Errore nell'import", "error"); }
    finally { setBusy(false); }
  };

  const exportSnapshot = () => ({ capitolato: metaDb(), righe, project, studio });

  const handlePdf = async () => {
    if (!righe.length) { showToast?.("Aggiungi almeno una voce", "error"); return; }
    setBusy(true);
    try { await generaCapitolatoPdf(exportSnapshot()); }
    catch (e) { console.error(e); showToast?.("Errore nella generazione del PDF", "error"); }
    finally { setBusy(false); }
  };
  const handleXlsx = async () => {
    if (!righe.length) { showToast?.("Aggiungi almeno una voce", "error"); return; }
    setBusy(true);
    try { await generaCapitolatoXlsx(exportSnapshot()); }
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
        border: `0.5px solid ${versCount > 0 ? T.navy : T.borderMd}`, borderRadius: T.radiusSm,
        background: versCount > 0 ? T.navyLight : "transparent",
        cursor: "pointer", fontFamily: mono, fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase",
      }}>
        <span style={{ color: versCount > 0 ? T.navy : T.ink, fontWeight: versCount > 0 ? 600 : 400 }}>▤ Capitolato</span>
        {versCount > 0
          ? <span style={{ fontFamily: mono, fontSize: 9, color: T.navy, border: `0.5px solid ${T.navy}`, borderRadius: T.radiusSm, padding: "1px 6px" }}>{versCount}</span>
          : <span style={{ fontFamily: mono, fontSize: 9, color: T.muted }}>+ Apri</span>}
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
                      : ` · ${nVoci} ${nVoci === 1 ? "voce" : "voci"}${versioneAttiva ? ` · v${versioneAttiva}` : ""}${autoState === "saving" ? " · salvataggio…" : autoState === "saved" ? " · bozza salvata" : ""}`}
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
                    <div style={{ marginBottom: 14 }}>
                      {nVoci > 0
                        ? `Nessuna versione salvata · bozza con ${nVoci} ${nVoci === 1 ? "voce" : "voci"}`
                        : "Nessuna versione salvata."}
                    </div>
                    <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
                      {nVoci > 0
                        ? <button onClick={() => setView("recap")} style={btnPrimary}>Apri capitolato</button>
                        : <button onClick={openCatPicker} style={btnPrimary}>+ Aggiungi voce</button>}
                      <button onClick={openImport} style={btnGhost}>Importa da un altro progetto</button>
                      {(meta.id || nVoci > 0) && (
                        <button onClick={eliminaCapitolato} style={{ ...btnGhost, color: T.red, borderColor: T.red }}>Elimina capitolato</button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, maxWidth: 720, margin: "0 auto" }}>
                    <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 4 }}>
                      <button onClick={nuovoCapitolato} style={btnPrimary} title="Parti da zero: lo storico versioni resta, al salvataggio diventa una nuova versione">+ Nuovo capitolato</button>
                    </div>
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
                      <button onClick={openCatPicker} style={btnPrimary}>+ Aggiungi voce</button>
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
                              <span style={{ fontFamily: mono, fontSize: 10, color: T.muted }}>{r.assistenza ? `${r.assistenza.perc === "" || r.assistenza.perc == null ? "%" : r.assistenza.perc + "%"} ${assistenzaBasi(r.assistenza).join("+") || "—"}` : `${fmtNum(totaleRigaEff(r))} ${r.unita}`}</span>
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
                  {/* Banner: macro-categoria ("mega voce") in cui finiscono le voci aggiunte */}
                  <div style={{ padding: "9px 14px", borderBottom: `1px solid ${T.border}`, background: catInsert ? T.navyLight : "transparent", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={labelSt}>Inserisci in</div>
                      <div style={{ fontFamily: mono, fontSize: 11, fontWeight: 700, color: catInsert ? T.navy : T.muted, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {catInsert ? (CAPITOLATO_CATEGORIE.find((c) => c.code === catInsert)?.titoloPagina || catInsert) : "categoria della voce"}
                      </div>
                    </div>
                    <button onClick={openCatPicker} style={{ ...btnGhost, padding: "5px 10px", flexShrink: 0 }}>{catInsert ? "Cambia" : "Scegli"}</button>
                  </div>
                  <div style={{ padding: "12px 14px", borderBottom: `1px solid ${T.border}` }}>
                    <input autoFocus placeholder="Cerca voci (es. cartongessi)…" value={query} onChange={(e) => setQuery(e.target.value)} style={{ ...inputSt, width: "100%" }} />
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 8 }}>
                      <button onClick={() => setCatFilter("")} style={{ ...chip(T, catFilter === "") }}>Tutte</button>
                      {catConVoci.map((c) => (
                        <button key={c.code} onClick={() => setCatFilter(catFilter === c.code ? "" : c.code)} title={c.nome} style={{ ...chip(T, catFilter === c.code) }}>{c.code}</button>
                      ))}
                    </div>
                    <button onClick={openNuovaVoce} style={{ ...btnGhost, width: "100%", marginTop: 8, padding: "7px 10px", borderStyle: "dashed" }}>+ Nuova voce (non in libreria)</button>
                  </div>
                  <div style={{ flex: 1, overflowY: "auto", padding: 8 }}>
                    {risultati.length === 0 ? (
                      <div style={{ color: T.muted, fontFamily: mono, fontSize: 11, padding: 12, textAlign: "center" }}>
                        <div style={{ marginBottom: 10 }}>Nessuna voce{query.trim() ? ` per "${query.trim()}"` : ""}</div>
                        <button onClick={openNuovaVoce} style={{ ...btnGhost, padding: "6px 12px" }}>+ Crea nuova voce</button>
                      </div>
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
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ fontFamily: mono, fontSize: 10, color: T.muted }}>
                    {nVoci} voci in {gruppi.length} {gruppi.length === 1 ? "categoria" : "categorie"}
                  </div>
                  <button onClick={openImport} disabled={busy} style={{ ...btnGhost, padding: "6px 12px", opacity: busy ? 0.5 : 1 }}>⤵ Importa da progetto</button>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={handleXlsx} disabled={busy || !nVoci} style={{ ...btnGhost, opacity: busy || !nVoci ? 0.5 : 1 }}>Export Excel</button>
                  <button onClick={handlePdf} disabled={busy || !nVoci} style={{ ...btnGhost, opacity: busy || !nVoci ? 0.5 : 1 }}>{busy ? "…" : "Stampa PDF"}</button>
                  {view === "recap"
                    ? <button onClick={() => setView("edit")} style={btnPrimary}>Modifica</button>
                    : <button onClick={handleSaveExit} disabled={saving || !nVoci} style={{ ...btnPrimary, opacity: saving || !nVoci ? 0.6 : 1 }} title="Salva una versione (snapshot) e chiudi. Durante la compilazione la bozza si salva da sola.">{saving ? "Salvo…" : "Salva ed esci"}</button>}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Selettore "Importa da un altro progetto" */}
      {importOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 80, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.55)", padding: 16 }}
          onClick={() => setImportOpen(false)}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 520, maxHeight: "80vh", display: "flex", flexDirection: "column", background: T.glassBg, backdropFilter: T.blur, WebkitBackdropFilter: T.blur, border: `1px solid ${T.glassBorder}`, borderRadius: T.radiusLg, overflow: "hidden", boxShadow: "0 24px 80px rgba(0,0,0,0.35)" }}>
            <div style={{ padding: "14px 18px", borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: T.ink }}>Importa da un altro progetto</div>
                <div style={{ fontFamily: mono, fontSize: 10, color: T.muted, marginTop: 2 }}>Le voci vengono aggiunte al capitolato corrente</div>
              </div>
              <button onClick={() => setImportOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", color: T.muted, fontSize: 20, lineHeight: 1 }}>×</button>
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: 12, minHeight: 0 }}>
              {importLoading ? (
                <div style={{ textAlign: "center", padding: 30, color: T.muted, fontFamily: mono, fontSize: 12 }}>Carico…</div>
              ) : importList.length === 0 ? (
                <div style={{ textAlign: "center", padding: 30, color: T.muted, fontFamily: mono, fontSize: 12 }}>Nessun altro progetto con un capitolato.</div>
              ) : importList.map((it) => (
                <button key={it.capitolato_id} onClick={() => doImport(it)} disabled={busy}
                  style={{ display: "flex", width: "100%", alignItems: "center", justifyContent: "space-between", gap: 12, textAlign: "left", padding: "11px 13px", marginBottom: 6, background: T.surface, border: `0.5px solid ${T.border}`, borderRadius: T.radiusSm, cursor: busy ? "default" : "pointer", opacity: busy ? 0.6 : 1 }}
                  onMouseEnter={(e) => { if (!busy) e.currentTarget.style.borderColor = T.navy; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = T.border; }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 600, color: T.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{it.project_name}</div>
                    <div style={{ fontFamily: mono, fontSize: 10, color: T.muted, marginTop: 2 }}>
                      {it.nVoci} {it.nVoci === 1 ? "voce" : "voci"}{it.aggiornato ? ` · ${formattaData(it.aggiornato)}` : ""}
                    </div>
                  </div>
                  <span style={{ fontFamily: mono, fontSize: 9, letterSpacing: "0.06em", textTransform: "uppercase", color: T.navy, flexShrink: 0 }}>Importa →</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Selettore "mega voce": in quale macro-categoria inserire le voci */}
      {catPickerOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 80, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.55)", padding: 16 }}
          onClick={() => setCatPickerOpen(false)}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 520, maxHeight: "80vh", display: "flex", flexDirection: "column", background: T.glassBg, backdropFilter: T.blur, WebkitBackdropFilter: T.blur, border: `1px solid ${T.glassBorder}`, borderRadius: T.radiusLg, overflow: "hidden", boxShadow: "0 24px 80px rgba(0,0,0,0.35)" }}>
            <div style={{ padding: "14px 18px", borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: T.ink }}>Scegli la categoria</div>
                <div style={{ fontFamily: mono, fontSize: 10, color: T.muted, marginTop: 2 }}>Le voci che aggiungi finiranno in questa macro-categoria</div>
              </div>
              <button onClick={() => setCatPickerOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", color: T.muted, fontSize: 20, lineHeight: 1 }}>×</button>
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: 12, minHeight: 0 }}>
              {CAPITOLATO_CATEGORIE.map((c) => (
                <button key={c.code} onClick={() => scegliCategoria(c.code)}
                  style={{ display: "flex", width: "100%", alignItems: "center", gap: 10, textAlign: "left", padding: "10px 13px", marginBottom: 6, background: catInsert === c.code ? T.navyLight : T.surface, border: `0.5px solid ${catInsert === c.code ? T.navy : T.border}`, borderRadius: T.radiusSm, cursor: "pointer" }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = T.navy; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = catInsert === c.code ? T.navy : T.border; }}>
                  <span style={{ fontFamily: mono, fontSize: 12, fontWeight: 700, color: T.navy, width: 20, flexShrink: 0 }}>{c.code}</span>
                  <span style={{ fontSize: 12.5, fontWeight: 600, color: T.ink }}>{c.nomeIndice || c.nome}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Form "Nuova voce" (non presente in libreria) */}
      {nuovaOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 85, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.55)", padding: 16 }}
          onClick={() => setNuovaOpen(false)}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 520, maxHeight: "88vh", display: "flex", flexDirection: "column", background: T.glassBg, backdropFilter: T.blur, WebkitBackdropFilter: T.blur, border: `1px solid ${T.glassBorder}`, borderRadius: T.radiusLg, overflow: "hidden", boxShadow: "0 24px 80px rgba(0,0,0,0.35)" }}>
            <div style={{ padding: "14px 18px", borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: T.ink }}>Nuova voce</div>
                <div style={{ fontFamily: mono, fontSize: 10, color: T.muted, marginTop: 2 }}>Voce personalizzata, aggiunta al capitolato corrente</div>
              </div>
              <button onClick={() => setNuovaOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", color: T.muted, fontSize: 20, lineHeight: 1 }}>×</button>
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: 16, minHeight: 0, display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <div style={labelSt}>Titolo *</div>
                <input autoFocus value={nuova.titolo} onChange={(e) => setNuova((n) => ({ ...n, titolo: e.target.value }))} placeholder="es. Rasatura pareti esistenti" style={{ ...inputSt, width: "100%" }} />
              </div>
              <div>
                <div style={labelSt}>Descrizione</div>
                <textarea value={nuova.descrizione} onChange={(e) => setNuova((n) => ({ ...n, descrizione: e.target.value }))} rows={3}
                  style={{ ...inputSt, width: "100%", resize: "vertical", lineHeight: 1.35 }} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <div style={labelSt}>Categoria (mega voce) *</div>
                  <select value={nuova.categoria_code} onChange={(e) => setNuova((n) => ({ ...n, categoria_code: e.target.value }))} style={{ ...inputSt, width: "100%", cursor: "pointer" }}>
                    <option value="">— scegli —</option>
                    {CAPITOLATO_CATEGORIE.map((c) => <option key={c.code} value={c.code}>{c.code}) {c.nomeIndice || c.nome}</option>)}
                  </select>
                </div>
                <div>
                  <div style={labelSt}>Tipo di sommano</div>
                  <select value={nuova.tipo === "fornitura_posa" ? "fp" : (SOMMANO_PRESETS.find((p) => p.key !== "fp" && p.unita === nuova.unita)?.key || "mq")}
                    onChange={(e) => { const p = SOMMANO_PRESETS.find((x) => x.key === e.target.value); if (p) setNuova((n) => ({ ...n, tipo: p.tipo, unita: p.tipo === "fornitura_posa" ? (n.unita || "mq") : p.unita })); }}
                    style={{ ...inputSt, width: "100%", cursor: "pointer" }}>
                    {SOMMANO_PRESETS.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
                  </select>
                </div>
              </div>
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: mono, fontSize: 11, color: T.ink, cursor: studioId ? "pointer" : "not-allowed", opacity: studioId ? 1 : 0.5 }}>
                <input type="checkbox" checked={nuova.salvaLibreria && !!studioId} disabled={!studioId} onChange={(e) => setNuova((n) => ({ ...n, salvaLibreria: e.target.checked }))} />
                Salva anche in libreria (riutilizzabile nei prossimi capitolati)
              </label>
            </div>
            <div style={{ padding: "12px 16px", borderTop: `1px solid ${T.border}`, display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button onClick={() => setNuovaOpen(false)} style={btnGhost}>Annulla</button>
              <button onClick={confermaNuovaVoce} disabled={busy || !nuova.titolo.trim() || !nuova.categoria_code} style={{ ...btnPrimary, opacity: busy || !nuova.titolo.trim() || !nuova.categoria_code ? 0.5 : 1 }}>{busy ? "…" : "Aggiungi al capitolato"}</button>
            </div>
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
  const tot = totaleRigaEff(r);
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
            {/* Selettore "sommano": unità o Fornitura + Posa */}
            <select value={presetKeyOf(r)} title="Tipo di sommano"
              onChange={(e) => { const p = presetPatch(r, e.target.value); if (p) onPatch(p); }}
              style={{ flexShrink: 0, fontFamily: mono, fontSize: 9, color: r.tipo === "fornitura_posa" ? "#b45309" : T.navy, background: T.surface, border: `0.5px solid ${T.borderMd}`, borderRadius: 3, padding: "2px 4px", cursor: "pointer", outline: "none" }}>
              {presetKeyOf(r) === "" && <option value="">{r.unita || "unità…"}</option>}
              {SOMMANO_PRESETS.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
            </select>
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

      {r.assistenza ? (
        <AssistenzaEditor r={r} T={T} mono={mono} onPatch={onPatch} />
      ) : (<>
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
      </>)}

      {/* Nota */}
      <input placeholder="NOTE (opzionale)" value={r.note || ""} onChange={(e) => onPatch({ note: e.target.value })}
        style={{ marginTop: 6, width: "100%", boxSizing: "border-box", padding: "4px 8px", border: `1px solid ${T.border}`, borderRadius: T.radiusSm, background: "transparent", color: T.muted, fontSize: 10.5, fontFamily: "'Space Grotesk', sans-serif", outline: "none" }} />
    </div>
  );
}

function iconBtn(T) {
  return { width: 24, height: 24, borderRadius: T.radiusSm, border: `0.5px solid ${T.border}`, background: "transparent", color: T.ink, cursor: "pointer", fontSize: 13, lineHeight: 1, display: "flex", alignItems: "center", justifyContent: "center" };
}

// ── Editor assistenza muraria a % ───────────────────────────────────────────────
// La voce non ha misurazioni: si scelgono uno o più impianti base (E/F/G) e,
// facoltativa, la percentuale (di norma la mette l'impresa nell'Excel). Nell'Excel
// l'importo = % × somma dei TOTALI degli impianti scelti (formula viva).
function AssistenzaEditor({ r, T, mono, onPatch }) {
  const a = r.assistenza || { basi: [], perc: "" };
  const basi = assistenzaBasi(a);
  const set = (patch) => onPatch({ assistenza: { basi, perc: a.perc ?? "", ...patch } });
  const toggle = (code) => set({ basi: basi.includes(code) ? basi.filter((c) => c !== code) : [...basi, code] });
  const inSt = { padding: "5px 8px", boxSizing: "border-box", border: `1px solid ${T.borderMd}`, borderRadius: T.radiusSm, background: T.surface, color: T.ink, fontSize: 12, fontFamily: mono, outline: "none" };
  const lab = { fontFamily: mono, fontSize: 8, letterSpacing: "0.14em", textTransform: "uppercase", color: T.muted, marginBottom: 3 };
  return (
    <div style={{ marginTop: 8, padding: "10px 12px", border: `0.5px solid ${T.navy}`, borderRadius: T.radiusSm, background: T.navyLight }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 90px", gap: 10, alignItems: "start" }}>
        <div>
          <div style={lab}>Impianti base (% sul totale)</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            {IMPIANTI_ASSISTENZA.map((imp) => {
              const self = imp.code === r.categoria_code; // evita riferimento circolare
              const on = basi.includes(imp.code);
              return (
                <label key={imp.code} title={self ? "Stessa categoria della voce: non selezionabile" : ""}
                  style={{ display: "flex", alignItems: "center", gap: 7, fontFamily: mono, fontSize: 11, color: self ? T.muted : T.ink, cursor: self ? "not-allowed" : "pointer", opacity: self ? 0.5 : 1 }}>
                  <input type="checkbox" checked={on && !self} disabled={self} onChange={() => toggle(imp.code)} />
                  <span style={{ color: on && !self ? T.navy : "inherit", fontWeight: on && !self ? 700 : 400 }}>{imp.code}) {imp.nome}</span>
                </label>
              );
            })}
          </div>
        </div>
        <div>
          <div style={lab}>Percentuale</div>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <input type="number" min="0" step="0.5" value={a.perc ?? ""} placeholder="—"
              onChange={(e) => set({ perc: e.target.value === "" ? "" : Number(e.target.value) })}
              style={{ ...inSt, width: "100%", textAlign: "right" }} />
            <span style={{ fontFamily: mono, fontSize: 12, color: T.navy }}>%</span>
          </div>
          <div style={{ fontFamily: mono, fontSize: 8, color: T.muted, marginTop: 3 }}>vuota = la mette l'impresa</div>
        </div>
      </div>
      <div style={{ marginTop: 8, fontFamily: mono, fontSize: 10, color: T.navy, fontWeight: 700 }}>{assistenzaLabel(a)}</div>
      <div style={{ marginTop: 2, fontFamily: mono, fontSize: 9, color: T.muted }}>
        {basi.length === 0
          ? "Seleziona almeno un impianto."
          : `L'importo si calcola nell'Excel: ${a.perc === "" || a.perc == null ? "percentuale dell'impresa" : a.perc + "%"} × somma totali di ${basi.length} ${basi.length === 1 ? "impianto" : "impianti"} (si aggiorna quando l'impresa compila i prezzi).`}
      </div>
    </div>
  );
}
