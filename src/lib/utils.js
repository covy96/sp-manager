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
