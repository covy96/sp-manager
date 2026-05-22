// Formatta ore decimali in formato HH:MM
// Esempi: 2.75 → '2:45', 1.5 → '1:30', 0.25 → '0:15', 3 → '3:00'
export function formatOre(decimale) {
  if (!decimale && decimale !== 0) return "0:00";
  const ore = Math.floor(decimale);
  const minuti = Math.round((decimale - ore) * 60);
  return `${ore}:${minuti.toString().padStart(2, "0")}`;
}

export async function calcolaIncassato(commesseIds, studioId, supabase) {
  // Calcola incassato dalle rate pagate — stesso metodo della pagina di dettaglio
  // Questo gestisce correttamente anche le proforma multi-commessa
  const [{ data: ratePagate }, { data: commesse }] = await Promise.all([
    supabase
      .from("suddivisione_pagamenti")
      .select("commessa_id, percentuale, importo_fisso")
      .in("commessa_id", commesseIds)
      .eq("pagato", true),
    supabase
      .from("commesse")
      .select("id, importo_offerta_base")
      .in("id", commesseIds),
  ]);

  const basePerCommessa = {};
  (commesse || []).forEach(c => { basePerCommessa[c.id] = Number(c.importo_offerta_base) || 0; });

  const incassatoPerCommessa = {};
  for (const r of (ratePagate || [])) {
    const base = basePerCommessa[r.commessa_id] || 0;
    const importoRata = Number(r.importo_fisso) || (base * (Number(r.percentuale) || 0) / 100);
    incassatoPerCommessa[r.commessa_id] = (incassatoPerCommessa[r.commessa_id] || 0) + importoRata;
  }

  return incassatoPerCommessa;
}
