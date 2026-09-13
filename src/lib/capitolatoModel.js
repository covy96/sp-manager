// ─────────────────────────────────────────────────────────────────────────────
// Modello dati del capitolato (computo metrico non estimativo): calcolo delle
// quantità dalle misurazioni, formattazione e I/O su Supabase.
// Condiviso da CapitolatoPanel, capitolatoPdf e capitolatoXlsx.
// ─────────────────────────────────────────────────────────────────────────────
import { supabase } from "./supabase";

// ── Formattazione numeri (it-IT, virgola decimale) ───────────────────────────
// Fino a `dec` decimali, zeri finali rimossi (es. 6.9225 → "6,9225", 12 → "12").
export function fmtNum(v, dec = 4) {
  const n = Number(v);
  if (!Number.isFinite(n) || n === 0) return "";
  const [intero, frac = ""] = Math.abs(n).toFixed(dec).split(".");
  const conMigliaia = intero.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  const fracTrim = frac.replace(/0+$/, "");
  return (n < 0 ? "-" : "") + conMigliaia + (fracTrim ? "," + fracTrim : "");
}

// Accetta "2,13" o "2.13"; ritorna Number o NaN.
export function parseNum(x) {
  if (x === null || x === undefined || x === "") return NaN;
  if (typeof x === "number") return x;
  return Number(String(x).replace(",", "."));
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
    .map((k) => parseNum(m?.[k]))
    .filter((n) => Number.isFinite(n));
  if (fattori.length > 0) return fattori.reduce((a, b) => a * b, 1);
  const q = parseNum(m?.qta);
  return Number.isFinite(q) ? q : 0;
}

// Totale (SOMMANO) di una voce = somma delle quantità delle misurazioni.
export function totaleRiga(riga) {
  return (riga?.misurazioni || []).reduce((s, m) => s + qtaMisurazione(m), 0);
}

// ── Costruzione riga da voce di libreria ──────────────────────────────────────
export function rigaFromVoce(voce) {
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
    misurazioni: [emptyMisurazione()],
    note: "",
  };
}

// ── I/O Supabase ───────────────────────────────────────────────────────────────
// Libreria voci: template globale (studio null) + voci custom dello studio.
export async function loadLibreria(studioId) {
  let q = supabase
    .from("capitolato_voci")
    .select("*")
    .eq("attiva", true)
    .order("categoria_code", { ascending: true })
    .order("ordine", { ascending: true });
  // studio null OR studio = studioId
  if (studioId) q = q.or(`studio.is.null,studio.eq.${studioId}`);
  else q = q.is("studio", null);
  const { data, error } = await q;
  if (error) throw error;
  return data || [];
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
export async function saveCapitolato(capitolatoId, meta, righe) {
  const { error: eMeta } = await supabase
    .from("capitolati")
    .update({ ...meta, updated_at: new Date().toISOString() })
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
      ordine: i,
    }));
    const { error: eIns } = await supabase.from("capitolato_righe").insert(payload);
    if (eIns) throw eIns;
  }
}
