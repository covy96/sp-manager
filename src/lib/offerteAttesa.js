// Avvisi per le offerte rimaste "In attesa" (stato = "offerta") troppo a lungo.
// Soglie: 30 e 60 giorni dalla data dell'offerta (o dalla creazione se manca).
// Chi riceve gli avvisi si sceglie in Team (colonna team_members.alert_offerte).

export const SOGLIE_ATTESA = [30, 60];

/** "YYYY-MM-DD" di una data nel fuso locale. */
function isoLocale(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const g = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${g}`;
}

/** Giorno (YYYY-MM-DD) da cui conta l'attesa: data_offerta, altrimenti created_at. */
export function dataInizioAttesa(o) {
  if (o?.data_offerta) return String(o.data_offerta).slice(0, 10);
  if (o?.created_at) return isoLocale(new Date(o.created_at));
  return null;
}

/** Giorni interi trascorsi dalla data dell'offerta a oggi (null se senza data). */
export function giorniInAttesa(o, oggi = new Date()) {
  const inizio = dataInizioAttesa(o);
  if (!inizio) return null;
  const [y, m, g] = inizio.split("-").map(Number);
  const a = Date.UTC(y, m - 1, g);
  const b = Date.UTC(oggi.getFullYear(), oggi.getMonth(), oggi.getDate());
  return Math.floor((b - a) / 86400000);
}

/** Soglia raggiunta (60, 30) oppure 0. */
export function sogliaAttesa(giorni) {
  if (giorni == null) return 0;
  if (giorni >= 60) return 60;
  if (giorni >= 30) return 30;
  return 0;
}

/**
 * Offerte in attesa da almeno 30 giorni, dalla più vecchia.
 * Ritorna [{ ...offerta, giorni, soglia }].
 */
export function offerteDaSollecitare(offerte = [], oggi = new Date()) {
  return offerte
    .filter(o => o && o.stato === "offerta" && !o.deleted_at && !o.archived)
    .map(o => {
      const giorni = giorniInAttesa(o, oggi);
      return { ...o, giorni, soglia: sogliaAttesa(giorni) };
    })
    .filter(o => o.soglia > 0)
    .sort((a, b) => b.giorni - a.giorni);
}
