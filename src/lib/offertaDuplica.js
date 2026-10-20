import { supabase } from "./supabase";
import { datiDuplicaOfferta } from "./offertaModel";

// Crea una copia modificabile dell'offerta e la restituisce ({ data } o { error }).
// I numeri già usati nello studio (anche nel cestino) servono a proporre il
// numero successivo senza doppioni.
export async function duplicaOfferta(offerta, studioId) {
  const { data: righe, error: nErr } = await supabase
    .from("offerte").select("numero_offerta").eq("studio", studioId);
  if (nErr) return { error: nErr.message };
  const riga = datiDuplicaOfferta({ ...offerta, studio: studioId }, (righe || []).map((r) => r.numero_offerta));
  const { data, error } = await supabase.from("offerte").insert(riga).select().single();
  if (error) return { error: error.message };
  return { data };
}
