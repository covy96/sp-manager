export interface DlScaglione {
  soglia_max: number | null;
  tariffa_settimanale: number;
}

export interface VoceFissa {
  importo: number;
}

export interface PreventivoInput {
  mq: number;
  tariffa_mq: number;
  importo_lavori: number;
  durata_settimane: number;
  dl_scaglioni: DlScaglione[];
  voci_fisse: VoceFissa[];
  rivalsa_inarcassa_pct: number;
}

export interface PreventivoOutput {
  tariffa_settimanale: number;
  tot_progettazione: number;
  tot_dl: number;
  tot_fisse: number;
  imponibile: number;
  rivalsa_inarcassa: number;
  totale: number;
}

/**
 * Restituisce la tariffa settimanale DL applicabile per l'importo lavori dato.
 * Scorre gli scaglioni in ordine crescente di soglia_max; il primo con
 * soglia_max >= importo_lavori (o soglia_max === null) viene applicato.
 */
export function tariffaSettimanale(
  importo_lavori: number,
  scaglioni: DlScaglione[],
): number {
  const sorted = [...scaglioni].sort((a, b) => {
    if (a.soglia_max === null) return 1;
    if (b.soglia_max === null) return -1;
    return a.soglia_max - b.soglia_max;
  });
  for (const s of sorted) {
    if (s.soglia_max === null || importo_lavori <= s.soglia_max) {
      return s.tariffa_settimanale;
    }
  }
  return 0;
}

/** Calcola tutti i totali del preventivo partendo dagli input grezzi. */
export function calcPreventivo(input: PreventivoInput): PreventivoOutput {
  const ts = tariffaSettimanale(input.importo_lavori, input.dl_scaglioni);
  const tot_progettazione = input.mq * input.tariffa_mq;
  const tot_dl = input.durata_settimane * ts;
  const tot_fisse = input.voci_fisse.reduce((s, v) => s + v.importo, 0);
  const imponibile = tot_progettazione + tot_dl + tot_fisse;
  const rivalsa_inarcassa = (imponibile * input.rivalsa_inarcassa_pct) / 100;
  const totale = imponibile + rivalsa_inarcassa;
  return { tariffa_settimanale: ts, tot_progettazione, tot_dl, tot_fisse, imponibile, rivalsa_inarcassa, totale };
}
