// ─────────────────────────────────────────────────────────────────────────────
// Modello dati del capitolato (computo metrico non estimativo): calcolo delle
// quantità dalle misurazioni, formattazione e I/O su Supabase.
// Condiviso da CapitolatoPanel, capitolatoPdf e capitolatoXlsx.
// ─────────────────────────────────────────────────────────────────────────────
import { supabase } from "./supabase";
import { CAPITOLATO_CATEGORIE } from "./capitolatoTemplate";

// Alfabeto italiano (senza J, K, W, X, Y): la numerazione di categoria salta
// quelle lettere, come nel file base (… H, I, L, M …).
export const ALFABETO_IT = "ABCDEFGHILMNOPQRSTUVZ".split("");

// ── Formattazione numeri (it-IT, virgola decimale, sempre 2 decimali) ─────────
// Es. 15 → "15,00", 2.13 → "2,13", vuoto/NaN → "".
export function fmtNum(v, dec = 2) {
  if (v === null || v === undefined || v === "") return ""; // vuoto → "" (lo 0 numerico resta "0,00")
  const n = Number(v);
  if (!Number.isFinite(n)) return "";
  const [intero, frac = ""] = Math.abs(n).toFixed(dec).split(".");
  const conMigliaia = intero.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return (n < 0 ? "-" : "") + conMigliaia + (dec > 0 ? "," + frac : "");
}

// Accetta "2,13" o "2.13"; ritorna Number o NaN.
export function parseNum(x) {
  if (x === null || x === undefined || x === "") return NaN;
  if (typeof x === "number") return x;
  return Number(String(x).replace(",", "."));
}

// ── Espressioni nei campi misura ("=3,45+2,40" → 5,85) ────────────────────────
// I campi delle misurazioni (Lung./Larg./H/Quantità) accettano piccole espressioni
// aritmetiche in stile foglio di calcolo: si può scrivere "=3,45+2,4" o "3.45+2.4"
// e ottenere la somma, oltre a "-", "*", "/" e le parentesi. Virgola o punto come
// separatore decimale. Non è mai un eval: un parser dedicato consuma SOLO numeri e
// operatori, e su input non valido ricade su parseNum (numero singolo).
function evalExpr(src) {
  const s = src;
  let i = 0;
  const skip = () => { while (i < s.length && (s[i] === " " || s[i] === "\t")) i++; };
  function expr() {
    let v = term(); skip();
    while (s[i] === "+" || s[i] === "-") { const op = s[i++]; const rhs = term(); v = op === "+" ? v + rhs : v - rhs; skip(); }
    return v;
  }
  function term() {
    let v = factor(); skip();
    while (s[i] === "*" || s[i] === "/") { const op = s[i++]; const rhs = factor(); v = op === "*" ? v * rhs : v / rhs; skip(); }
    return v;
  }
  function factor() {
    skip();
    if (s[i] === "+") { i++; return factor(); }
    if (s[i] === "-") { i++; return -factor(); }
    if (s[i] === "(") { i++; const v = expr(); skip(); if (s[i] === ")") i++; else throw new Error("paren"); return v; }
    const start = i;
    while (i < s.length && ((s[i] >= "0" && s[i] <= "9") || s[i] === ".")) i++;
    const num = s.slice(start, i);
    if (num === "" || num === ".") throw new Error("num");
    return Number(num);
  }
  const v = expr(); skip();
  if (i < s.length) throw new Error("trailing"); // caratteri non consumati → input non valido
  return v;
}

export function parseMisura(x) {
  if (x === null || x === undefined || x === "") return NaN;
  if (typeof x === "number") return x;
  let s = String(x).trim();
  if (s === "") return NaN;
  if (s[0] === "=") s = s.slice(1);      // stile foglio di calcolo: "=..."
  s = s.replace(/,/g, ".");              // virgola decimale → punto
  if (!/^[0-9.+\-*/()\s]+$/.test(s)) return parseNum(x); // caratteri non ammessi → numero singolo
  try {
    const v = evalExpr(s);
    return Number.isFinite(v) ? v : parseNum(x);
  } catch { return parseNum(x); }
}

// ── Misurazioni ──────────────────────────────────────────────────────────────
export function emptyMisurazione() {
  return { descrizione: "", lung: "", larg: "", hpeso: "", qta: "" };
}

// Quantità di una riga di misurazione: prodotto delle dimensioni compilate
// (Lung × Larg × H/peso). Se nessuna dimensione è compilata, usa la quantità
// digitata a mano nel campo `qta`.
export function qtaMisurazione(m) {
  const fattori = ["lung", "larg", "hpeso"]
    .map((k) => parseMisura(m?.[k]))
    .filter((n) => Number.isFinite(n));
  if (fattori.length > 0) return fattori.reduce((a, b) => a * b, 1);
  const q = parseMisura(m?.qta);
  return Number.isFinite(q) ? q : 0;
}

// Totale (SOMMANO) di una voce = somma delle quantità delle misurazioni.
export function totaleRiga(riga) {
  return (riga?.misurazioni || []).reduce((s, m) => s + qtaMisurazione(m), 0);
}

// Totale effettivo per l'output: le voci "a corpo" valgono sempre almeno 1
// (mai 0 o vuoto).
export function totaleRigaEff(riga) {
  const t = totaleRiga(riga);
  if (t) return t;
  return String(riga?.unita || "").toLowerCase() === "a corpo" ? 1 : t;
}

// ── Composizione documento: categorie usate + re-letterazione ─────────────────
// Raggruppa le righe nelle categorie usate (ordine ufficiale) e riassegna le
// lettere in sequenza (A, B, C…) saltando eventuali categorie mancanti; le voci
// prendono un codice progressivo <lettera><nn>. Usato da UI, PDF ed Excel.
export function componiGruppi(righe) {
  const presenti = CAPITOLATO_CATEGORIE
    .map((cat) => ({ cat, items: righe.filter((r) => r.categoria_code === cat.code) }))
    .filter((g) => g.items.length > 0);
  return presenti.map((g, gi) => {
    const letter = ALFABETO_IT[gi] || g.cat.code;
    const namePart = (g.cat.titoloPagina || "").split(") ").slice(1).join(") ")
      || (g.cat.nomeIndice || "").toUpperCase();
    return {
      code: letter,
      nomeIndice: g.cat.nomeIndice,
      titoloPagina: `${letter}) ${namePart}`,
      originalCode: g.cat.code,
      items: g.items.map((r, ri) => ({ ...r, _code: `${letter}${String(ri + 1).padStart(2, "0")}` })),
    };
  });
}

// ── Costruzione riga da voce di libreria ──────────────────────────────────────
export function rigaFromVoce(voce) {
  // le voci "a corpo" partono sempre da quantità 1
  const mis0 = emptyMisurazione();
  if ((voce.unita || "").toLowerCase() === "a corpo") mis0.qta = "1";
  return {
    _key: (typeof crypto !== "undefined" && crypto.randomUUID) ? crypto.randomUUID() : String(Math.random()),
    voce_id: voce.id,
    categoria_code: voce.categoria_code,
    categoria_nome: voce.categoria_nome || "",
    codice: voce.codice || "",
    titolo: voce.titolo || "",
    descrizione: voce.descrizione || "",
    unita: voce.unita || "",
    tipo: voce.tipo || "singolo",
    sommano_labels: Array.isArray(voce.sommano_labels) ? voce.sommano_labels : [],
    misurazioni: [mis0],
    note: "",
    assistenza: voce.assistenza || null,
  };
}

// Etichette SOMMANO di default a partire da unità e tipo.
export function defaultSommanoLabels(unita, tipo) {
  const u = (unita || "").trim();
  if (tipo === "fornitura_posa") {
    return [`FORNITURA - sommano ${u}`.trim(), `POSA - sommano ${u}`.trim()];
  }
  return [`SOMMANO ${u}`.trim()];
}

// ── Assistenze murarie a percentuale ──────────────────────────────────────────
// Voce speciale: nessuna misurazione, ma una % applicata al TOTALE di uno o più
// impianti (E idrico, F elettrico, G meccanico). Nell'Excel diventa una formula
// viva (% × somma totali impianti); nel PDF è testo. La percentuale può restare
// vuota: la sceglie l'impresa nell'Excel. { basi: ["E","F"], perc: "" }
// Retrocompatibile con il vecchio { base: "F", perc: 10 }.
export const IMPIANTI_ASSISTENZA = [
  { code: "E", nome: "Impianto idrico-sanitario" },
  { code: "F", nome: "Impianto elettrico" },
  { code: "G", nome: "Impianto meccanico" },
];
export function assistenzaBasi(a) {
  if (!a) return [];
  if (Array.isArray(a.basi)) return a.basi.filter(Boolean);
  return a.base ? [a.base] : [];
}
// Percentuale di UN impianto. Ogni impianto può avere la sua % (a.percs[code]);
// in mancanza ricade sul vecchio valore unico a.perc (retrocompatibile) e infine
// su "" (vuota = la mette l'impresa nell'Excel).
export function assistenzaPerc(a, code) {
  if (!a) return "";
  if (a.percs && Object.prototype.hasOwnProperty.call(a.percs, code)) {
    const v = a.percs[code];
    return v == null ? "" : v;
  }
  return a.perc == null ? "" : a.perc;
}
export function assistenzaLabel(a) {
  if (!a) return "";
  const basi = assistenzaBasi(a);
  if (!basi.length) return "Assistenza muraria — impianti";
  const parts = basi.map((c) => {
    const nome = IMPIANTI_ASSISTENZA.find((x) => x.code === c)?.nome || c;
    const p = assistenzaPerc(a, c);
    const ptxt = (p === "" || p == null) ? "" : ` ${String(p).replace(".", ",")}%`;
    return `${nome}${ptxt}`;
  });
  return `Assistenza muraria — ${parts.join(", ")}`;
}

// ── I/O Supabase ───────────────────────────────────────────────────────────────
// Libreria voci: template globale (studio null) + voci custom dello studio.
// Una voce dello studio con stessa (categoria_code, codice) "oscura" quella globale
// (pattern override: lo studio personalizza il testo base senza toccare il template).
export async function loadLibreria(studioId, { includiInattive = false } = {}) {
  let q = supabase
    .from("capitolato_voci")
    .select("*")
    .order("categoria_code", { ascending: true })
    .order("ordine", { ascending: true });
  if (!includiInattive) q = q.eq("attiva", true);
  if (studioId) q = q.or(`studio.is.null,studio.eq.${studioId}`);
  else q = q.is("studio", null);
  const { data, error } = await q;
  if (error) throw error;

  const byKey = new Map();
  for (const v of data || []) {
    const key = `${v.categoria_code}||${v.codice}`;
    const ex = byKey.get(key);
    if (!ex || (v.studio && !ex.studio)) byKey.set(key, v); // la voce studio vince sulla globale
  }
  return [...byKey.values()].sort((a, b) =>
    a.categoria_code.localeCompare(b.categoria_code) || (a.ordine || 0) - (b.ordine || 0));
}

// Salva una voce nella libreria: se è già dello studio la aggiorna, altrimenti
// (voce globale o nuova) crea/aggiorna un override dello studio.
export async function saveVoceLibreria(voce, studioId) {
  const payload = {
    studio: studioId,
    categoria_code: voce.categoria_code,
    categoria_nome: voce.categoria_nome || "",
    codice: voce.codice || "",
    titolo: voce.titolo || "",
    descrizione: voce.descrizione || "",
    unita: voce.unita || "",
    tipo: voce.tipo || "singolo",
    sommano_labels: (voce.sommano_labels && voce.sommano_labels.length)
      ? voce.sommano_labels : defaultSommanoLabels(voce.unita, voce.tipo),
    ordine: voce.ordine || 0,
    attiva: voce.attiva !== false,
  };
  if (voce.id && voce.studio === studioId) {
    const { data, error } = await supabase.from("capitolato_voci")
      .update(payload).eq("id", voce.id).select("*").single();
    if (error) throw error; return data;
  }
  const { data, error } = await supabase.from("capitolato_voci")
    .insert(payload).select("*").single();
  if (error) throw error; return data;
}

// Elimina una voce dello studio (le globali non sono eliminabili via RLS).
export async function deleteVoceLibreria(id) {
  const { error } = await supabase.from("capitolato_voci").delete().eq("id", id);
  if (error) throw error;
}

// Capitolato del progetto (il più recente non cancellato) + righe.
export async function loadCapitolato(projectId) {
  const { data: caps, error } = await supabase
    .from("capitolati")
    .select("*")
    .eq("project_id", projectId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(1);
  if (error) throw error;
  const cap = caps?.[0];
  if (!cap) return null;
  const { data: righe, error: e2 } = await supabase
    .from("capitolato_righe")
    .select("*")
    .eq("capitolato_id", cap.id)
    .order("ordine", { ascending: true });
  if (e2) throw e2;
  return {
    capitolato: cap,
    righe: (righe || []).map((r) => ({
      ...r,
      _key: r.id,
      misurazioni: Array.isArray(r.misurazioni) && r.misurazioni.length ? r.misurazioni : [emptyMisurazione()],
      sommano_labels: Array.isArray(r.sommano_labels) ? r.sommano_labels : [],
    })),
  };
}

// ── Import "usa come base" ────────────────────────────────────────────────────
// Elenco dei capitolati importabili: uno per progetto (il più recente), dello
// stesso studio, escluso il progetto corrente. Per il selettore "Importa da progetto".
export async function loadCapitolatiImportabili(studioId, exceptProjectId) {
  if (!studioId) return [];
  const { data, error } = await supabase
    .from("capitolati")
    .select("id, project_id, nome, updated_at, created_at, righe:capitolato_righe(count), projects!inner(name, studio)")
    .is("deleted_at", null)
    .eq("projects.studio", studioId)
    .neq("project_id", exceptProjectId)
    .order("updated_at", { ascending: false, nullsFirst: false });
  if (error) throw error;
  const perProgetto = new Map(); // un solo capitolato per progetto: il più recente
  for (const c of data || []) {
    if (perProgetto.has(c.project_id)) continue;
    perProgetto.set(c.project_id, {
      capitolato_id: c.id,
      project_id: c.project_id,
      project_name: c.projects?.name || "Progetto",
      nVoci: c.righe?.[0]?.count ?? 0,
      aggiornato: c.updated_at || c.created_at || null,
    });
  }
  return [...perProgetto.values()].filter((x) => x.nVoci > 0);
}

// Carica le righe di un capitolato come nuove righe (chiavi effimere fresche, senza
// id), pronte per essere aggiunte al capitolato corrente.
export async function loadRigheImport(capitolatoId) {
  const { data, error } = await supabase
    .from("capitolato_righe")
    .select("*")
    .eq("capitolato_id", capitolatoId)
    .order("ordine", { ascending: true });
  if (error) throw error;
  return (data || []).map((r) => ({
    _key: (typeof crypto !== "undefined" && crypto.randomUUID) ? crypto.randomUUID() : String(Math.random()),
    voce_id: r.voce_id || null,
    categoria_code: r.categoria_code,
    categoria_nome: r.categoria_nome || "",
    codice: r.codice || "",
    titolo: r.titolo || "",
    descrizione: r.descrizione || "",
    unita: r.unita || "",
    tipo: r.tipo || "singolo",
    sommano_labels: Array.isArray(r.sommano_labels) ? r.sommano_labels : [],
    misurazioni: Array.isArray(r.misurazioni) && r.misurazioni.length ? r.misurazioni : [emptyMisurazione()],
    note: r.note || "",
  }));
}

// Snapshot canonico (per confronto/versioni): meta + righe senza chiavi effimere.
export function snapshotCapitolato(meta, righe) {
  return {
    nome: meta?.nome || "", committente: meta?.committente || "", localita: meta?.localita || "",
    data: meta?.data || null, revisione: meta?.revisione || "",
    righe: (righe || []).map((r) => ({
      voce_id: r.voce_id || null, categoria_code: r.categoria_code, categoria_nome: r.categoria_nome || "",
      codice: r.codice || "", titolo: r.titolo || "", descrizione: r.descrizione || "", unita: r.unita || "",
      tipo: r.tipo || "singolo", sommano_labels: r.sommano_labels || [], misurazioni: r.misurazioni || [], note: r.note || null,
      assistenza: r.assistenza || null,
    })),
  };
}

// Aggiorna solo lo storico versioni del capitolato.
export async function saveVersioni(capitolatoId, versioni) {
  const { error } = await supabase.from("capitolati")
    .update({ versioni, updated_at: new Date().toISOString() }).eq("id", capitolatoId);
  if (error) throw error;
}

// Elimina (soft-delete) l'intero capitolato: valorizza deleted_at così che il
// prossimo loadCapitolato ritorni null e il progetto riparta da zero.
export async function deleteCapitolato(capitolatoId) {
  const { error } = await supabase.from("capitolati")
    .update({ deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("id", capitolatoId);
  if (error) throw error;
}

export async function createCapitolato(projectId, meta = {}) {
  const { data, error } = await supabase
    .from("capitolati")
    .insert({ project_id: projectId, ...meta })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

// Salva meta + righe. Le righe vengono riscritte (delete+insert): il set è piccolo
// e questo evita diff complessi mantenendo l'ordine.
export async function saveCapitolato(capitolatoId, meta, righe, versioni) {
  const patch = { ...meta, updated_at: new Date().toISOString() };
  if (versioni !== undefined) patch.versioni = versioni;
  const { error: eMeta } = await supabase
    .from("capitolati")
    .update(patch)
    .eq("id", capitolatoId);
  if (eMeta) throw eMeta;

  const { error: eDel } = await supabase
    .from("capitolato_righe")
    .delete()
    .eq("capitolato_id", capitolatoId);
  if (eDel) throw eDel;

  if (righe.length) {
    const payload = righe.map((r, i) => ({
      capitolato_id: capitolatoId,
      voce_id: r.voce_id || null,
      categoria_code: r.categoria_code,
      categoria_nome: r.categoria_nome || "",
      codice: r.codice || "",
      titolo: r.titolo || "",
      descrizione: r.descrizione || "",
      unita: r.unita || "",
      tipo: r.tipo || "singolo",
      sommano_labels: r.sommano_labels || [],
      misurazioni: r.misurazioni || [],
      note: r.note || null,
      assistenza: r.assistenza || null,
      ordine: i,
    }));
    let { error: eIns } = await supabase.from("capitolato_righe").insert(payload);
    // colonna 'assistenza' non ancora creata (migration mancante): reinserisci senza
    if (eIns && (eIns.code === "42703" || /assistenza/i.test(eIns.message || ""))) {
      const senza = payload.map(({ assistenza, ...rest }) => rest); // eslint-disable-line no-unused-vars
      ({ error: eIns } = await supabase.from("capitolato_righe").insert(senza));
    }
    if (eIns) throw eIns;
  }
}
