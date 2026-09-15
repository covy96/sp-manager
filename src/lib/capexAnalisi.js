// ─────────────────────────────────────────────────────────────────────────────
// CAPEX · Analisi preventivi (AI)
// Prepara il file caricato (PDF→base64, Excel→testo con SheetJS), lo archivia
// best-effort su Storage e chiama la Edge Function `analizza-preventivo` che
// estrae i dati con Claude. Ritorna la riga `capex_analisi` salvata.
// ─────────────────────────────────────────────────────────────────────────────
import * as XLSX from "xlsx";
import { supabase } from "./supabase";

const STORAGE_BUCKET = "capex-preventivi";

// Riconosce il tipo di file dall'estensione (fallback sul MIME).
export function riconosciTipoFile(file) {
  const name = (file?.name || "").toLowerCase();
  if (name.endsWith(".pdf") || file?.type === "application/pdf") return "pdf";
  if (name.endsWith(".xlsx") || name.endsWith(".xls") || name.endsWith(".xlsm")) return "xlsx";
  if ((file?.type || "").includes("spreadsheetml") || (file?.type || "").includes("ms-excel")) return "xlsx";
  return null;
}

// ArrayBuffer → base64 (senza prefisso data:), a blocchi per non saturare lo stack.
function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

// Excel → testo leggibile dal modello: un blocco CSV per ogni foglio.
function xlsxToText(buffer) {
  const wb = XLSX.read(buffer, { type: "array" });
  return wb.SheetNames.map((nome) => {
    const csv = XLSX.utils.sheet_to_csv(wb.Sheets[nome], { blankrows: false });
    return `=== Foglio: ${nome} ===\n${csv}`;
  }).join("\n\n").trim();
}

// Carica il file originale su Storage. Best-effort: se fallisce (bucket assente,
// permessi), l'analisi prosegue comunque senza archiviazione.
async function archiviaFile(file, projectId) {
  try {
    const safe = (file.name || "preventivo").replace(/[^\w.\-]+/g, "_");
    const path = `${projectId}/${Date.now()}-${safe}`;
    const { error } = await supabase.storage.from(STORAGE_BUCKET).upload(path, file, {
      upsert: false,
      contentType: file.type || undefined,
    });
    if (error) { console.warn("Archiviazione preventivo saltata:", error.message); return null; }
    return path;
  } catch (e) {
    console.warn("Archiviazione preventivo saltata:", e?.message || e);
    return null;
  }
}

// Legge un File come ArrayBuffer.
function readArrayBuffer(file) {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(fr.result);
    fr.onerror = () => reject(fr.error || new Error("Lettura file fallita"));
    fr.readAsArrayBuffer(file);
  });
}

// Flusso completo: prepara il contenuto, archivia, invoca la function.
// Ritorna la riga capex_analisi. Lancia Error con messaggio leggibile in caso di problema.
export async function analizzaPreventivo(file, projectId) {
  const fileKind = riconosciTipoFile(file);
  if (!fileKind) throw new Error("Formato non supportato. Carica un PDF o un Excel.");

  const buffer = await readArrayBuffer(file);
  const content = fileKind === "pdf" ? arrayBufferToBase64(buffer) : xlsxToText(buffer);
  if (!content) throw new Error("Il file sembra vuoto o illeggibile.");

  const storagePath = await archiviaFile(file, projectId);

  const { data, error } = await supabase.functions.invoke("analizza-preventivo", {
    body: { projectId, fileKind, fileName: file.name, content, storagePath },
  });
  if (error) {
    // supabase-js incapsula l'errore HTTP; prova a estrarre il messaggio della function.
    let msg = error.message || "Errore durante l'analisi";
    try {
      const ctx = await error.context?.json?.();
      if (ctx?.error) msg = ctx.error;
    } catch { /* ignore */ }
    throw new Error(msg);
  }
  if (data?.error) throw new Error(data.error);
  return data.analisi;
}

// Aggiorna una riga di analisi (es. dopo la creazione della voce CAPEX).
export async function aggiornaAnalisi(id, patch) {
  const { error } = await supabase
    .from("capex_analisi")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}
