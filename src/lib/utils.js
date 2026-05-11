// Formatta ore decimali in formato HH:MM
// Esempi: 2.75 → '2:45', 1.5 → '1:30', 0.25 → '0:15', 3 → '3:00'
export function formatOre(decimale) {
  if (!decimale && decimale !== 0) return "0:00";
  const ore = Math.floor(decimale);
  const minuti = Math.round((decimale - ore) * 60);
  return `${ore}:${minuti.toString().padStart(2, "0")}`;
}

export async function calcolaIncassato(commesseIds, studioId, supabase) {
  // Carica tutte le proforma pagate dello studio
  const { data: proformePagate } = await supabase
    .from("proforma")
    .select("commessa_id, importo_totale, costo_extra_ids")
    .eq("studio", studioId)
    .eq("pagato", true);

  // Per ogni proforma pagata, calcola importo senza costi extra
  const incassatoPerCommessa = {};

  for (const pf of proformePagate || []) {
    let importoCostiExtra = 0;
    if (pf.costo_extra_ids?.length > 0) {
      const { data: costi } = await supabase
        .from("costi_extra")
        .select("importo")
        .in("id", pf.costo_extra_ids);
      importoCostiExtra = costi?.reduce((sum, c) => sum + (c.importo || 0), 0) || 0;
    }
    const importoRate = (pf.importo_totale || 0) - importoCostiExtra;
    incassatoPerCommessa[pf.commessa_id] = (incassatoPerCommessa[pf.commessa_id] || 0) + importoRate;
  }

  return incassatoPerCommessa;
}
