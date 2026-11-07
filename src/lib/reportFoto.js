import { supabase } from "./supabase";

// Rimuove da Storage le foto dei report che non hanno più un report collegato
// (report eliminati definitivamente dal Cestino, dalla pulizia automatica dei
// 30 giorni o insieme al progetto). Best-effort: se la funzione SQL
// report_foto_orfane non è ancora installata, o qualcosa fallisce, non fa nulla.
// Ritorna il numero di file rimossi.
export async function pulisciFotoOrfane(studioId) {
  if (!studioId) return 0;
  try {
    const { data, error } = await supabase.rpc("report_foto_orfane", { p_studio_id: studioId });
    if (error || !data?.length) return 0;
    const paths = data.map(r => r.path).filter(Boolean);
    let rimossi = 0;
    for (let i = 0; i < paths.length; i += 100) {
      const chunk = paths.slice(i, i + 100);
      const { error: rmErr } = await supabase.storage.from("report-foto").remove(chunk);
      if (rmErr) { console.warn("Pulizia foto orfane:", rmErr.message); break; }
      rimossi += chunk.length;
    }
    return rimossi;
  } catch (e) {
    console.warn("Pulizia foto orfane saltata:", e?.message || e);
    return 0;
  }
}
