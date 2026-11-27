/**
 * statisticheModel — calcoli puri per le nuove sezioni della pagina Statistiche
 * (Commesse e incassi, Ore per progetto, Cantieri). Nessuna chiamata a Supabase:
 * i dati arrivano già caricati, così la logica è testabile.
 *
 * Date: le colonne "YYYY-MM-DD" vengono lette come giorno LOCALE (mai via
 * toISOString / new Date("YYYY-MM-DD") che è UTC e sposta il giorno).
 */

export const MESI = ["Gen","Feb","Mar","Apr","Mag","Giu","Lug","Ago","Set","Ott","Nov","Dic"];
const DAY = 86400000;

// ── Date ─────────────────────────────────────────────────────────
export function parseDay(v) {
  if (!v) return null;
  if (v instanceof Date) return isNaN(v) ? null : new Date(v.getFullYear(), v.getMonth(), v.getDate());
  const m = String(v).match(/^(\d{4})-(\d{2})-(\d{2})(?:$|T00:00:00(?:\.0+)?(?:Z|[+-]00:?00)?$)/);
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  const d = new Date(v); // timestamp completo: giorno nel fuso locale
  return isNaN(d) ? null : new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
export function oggiLocale(now = new Date()) { return new Date(now.getFullYear(), now.getMonth(), now.getDate()); }
export function giorniTra(a, b) { return Math.round((b - a) / DAY); }
const meseKey = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
const media = arr => (arr.length ? arr.reduce((s, x) => s + x, 0) / arr.length : null);
const mediana = arr => {
  if (!arr.length) return null;
  const s = [...arr].sort((a, b) => a - b);
  return s[Math.floor((s.length - 1) / 2)];
};
const norm = s => String(s || "").trim();

// ── Commesse / rate / proforma ───────────────────────────────────
export function valoreCommessa(c) { return Number(c?.importo_offerta_base) || Number(c?.importo_totale) || 0; }
export function importoRata(r, commessa) {
  return Number(r?.importo_fisso) || (Number(commessa?.importo_offerta_base) || 0) * (Number(r?.percentuale) || 0) / 100;
}
const dataEmissione = p => parseDay(p.data_creazione) || parseDay(p.created_at);
const commessaPrincipale = p => p.commessa_id || (Array.isArray(p.commessa_ids) ? p.commessa_ids[0] : null) || null;

/** Voci attive di un'offerta con prezzo normalizzato (annulla lo sconto già applicato), come in Statistiche offerte. */
export function vociNormalizzate(o) {
  if (!o) return [];
  const sconto = Number(o.sconto) || 0;
  const voci = Array.isArray(o.voci) && o.voci.length > 0
    ? o.voci : [{ nome: o.nome_offerta || "Prestazione", prezzo: Number(o.importo_offerta_base) || 0, attiva: true }];
  const attive = voci.filter(v => v.attiva !== false);
  const lordi = attive.reduce((s, v) => s + Number(v.prezzo || 0), 0);
  const giaScontate = sconto > 0 && Math.abs(lordi - Number(o.importo_offerta_base)) < 0.5;
  return attive.map(v => ({
    nome: norm(v.nome) || "—",
    prezzo: giaScontate ? Number(v.prezzo || 0) / (1 - sconto / 100) : Number(v.prezzo || 0),
  }));
}

/**
 * Divide l'importo di una proforma tra le commesse che copre: in proporzione
 * alle rate incluse; l'eventuale resto (costi extra) va alla commessa principale.
 * Ritorna { [commessaId]: importo }.
 */
export function ripartisciProforma(p, rateById, commById) {
  const tot = Number(p.importo_totale) || 0;
  const perC = {};
  let sommaRate = 0;
  for (const rid of (p.suddivisione_pagamento_ids || [])) {
    const r = rateById[rid];
    if (!r) continue;
    const v = importoRata(r, commById[r.commessa_id]);
    perC[r.commessa_id] = (perC[r.commessa_id] || 0) + v;
    sommaRate += v;
  }
  const principale = commessaPrincipale(p);
  if (tot <= 0) return sommaRate > 0 ? perC : {};
  if (sommaRate <= 0) return principale ? { [principale]: tot } : {};
  if (sommaRate > tot) { // dati incoerenti: scala alle rate
    for (const k of Object.keys(perC)) perC[k] = perC[k] * tot / sommaRate;
    return perC;
  }
  const resto = tot - sommaRate;
  if (resto > 0.005 && principale) perC[principale] = (perC[principale] || 0) + resto;
  return perC;
}

export function importoProforma(p, rateById, commById) {
  const tot = Number(p.importo_totale) || 0;
  if (tot > 0) return tot;
  return Object.values(ripartisciProforma(p, rateById, commById)).reduce((s, x) => s + x, 0);
}

/**
 * Incassi previsti: proforma emesse non pagate per mese di scadenza (prossimi
 * 12 mesi, + scadute + oltre), più le rate non ancora in proforma (senza data).
 */
export function calcolaIncassiPrevisti({ commesse, rate, proforma, oggi = oggiLocale(), mesi = 12 }) {
  const commById = Object.fromEntries(commesse.map(c => [c.id, c]));
  const rateById = Object.fromEntries(rate.map(r => [r.id, r]));
  const start = new Date(oggi.getFullYear(), oggi.getMonth(), 1);
  const buckets = Array.from({ length: mesi }, (_, i) => {
    const d = new Date(start.getFullYear(), start.getMonth() + i, 1);
    return { key: meseKey(d), label: `${MESI[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`, importo: 0, n: 0 };
  });
  const byKey = Object.fromEntries(buckets.map(b => [b.key, b]));
  const scadute = []; // proforma oltre la scadenza
  let oltre = 0, nOltre = 0, senzaScad = 0, nSenzaScad = 0;
  const inProforma = new Set();

  for (const p of proforma) {
    (p.suddivisione_pagamento_ids || []).forEach(id => inProforma.add(id));
    if (p.pagato) continue;
    const imp = importoProforma(p, rateById, commById);
    if (imp <= 0) continue;
    const sc = parseDay(p.data_scadenza);
    const c = commById[commessaPrincipale(p)];
    if (!sc) { senzaScad += imp; nSenzaScad++; continue; }
    if (sc < oggi) {
      scadute.push({ id: p.id, numero: p.numero_proforma || "—", cliente: norm(c?.cliente) || "—", commessa: c?.nome_commessa || "—", commessaId: c?.id || null, importo: imp, scadenza: sc, giorni: giorniTra(sc, oggi) });
      continue;
    }
    const b = byKey[meseKey(sc)];
    if (b) { b.importo += imp; b.n++; } else { oltre += imp; nOltre++; }
  }
  scadute.sort((a, b) => b.giorni - a.giorni);

  // Rate ancora da fatturare (non pagate e in nessuna proforma) delle commesse attive
  const daFattMap = {};
  for (const r of rate) {
    if (r.pagato || inProforma.has(r.id)) continue;
    const c = commById[r.commessa_id];
    if (!c || c.archived) continue;
    const v = importoRata(r, c);
    if (v <= 0) continue;
    const e = daFattMap[c.id] || (daFattMap[c.id] = { commessaId: c.id, commessa: c.nome_commessa || "—", cliente: norm(c.cliente) || "—", importo: 0, n: 0 });
    e.importo += v; e.n++;
  }
  const daFatturare = Object.values(daFattMap).sort((a, b) => b.importo - a.importo);

  const totScaduto = scadute.reduce((s, x) => s + x.importo, 0);
  const totMesi = buckets.reduce((s, b) => s + b.importo, 0);
  return {
    mesi: buckets,
    scadute, totScaduto,
    totMesi,
    prossimi3: buckets.slice(0, 3).reduce((s, b) => s + b.importo, 0),
    oltre, nOltre, senzaScad, nSenzaScad,
    daFatturare, totDaFatturare: daFatturare.reduce((s, x) => s + x.importo, 0),
    nRateDaFatturare: daFatturare.reduce((s, x) => s + x.n, 0),
  };
}

/** Tempi di incasso delle proforma pagate (anno = anno del pagamento, 0 = tutti). */
export function calcolaTempiIncasso({ commesse, proforma, anno = 0 }) {
  const commById = Object.fromEntries(commesse.map(c => [c.id, c]));
  const incasso = [], ritardi = [];
  let nInRitardo = 0;
  const perCli = {};
  for (const p of proforma) {
    if (!p.pagato) continue;
    const dp = parseDay(p.data_pagamento);
    if (!dp) continue;
    if (anno && dp.getFullYear() !== anno) continue;
    const de = dataEmissione(p);
    const sc = parseDay(p.data_scadenza);
    const cli = norm(commById[commessaPrincipale(p)]?.cliente) || "—";
    const e = perCli[cli] || (perCli[cli] = { cliente: cli, n: 0, incasso: [], ritardi: [] });
    e.n++;
    if (de) { const g = giorniTra(de, dp); if (g >= 0) { incasso.push(g); e.incasso.push(g); } }
    if (sc) { const r = giorniTra(sc, dp); ritardi.push(Math.max(0, r)); e.ritardi.push(Math.max(0, r)); if (r > 0) nInRitardo++; }
  }
  const perCliente = Object.values(perCli)
    .map(e => ({ cliente: e.cliente, n: e.n, mediaIncasso: media(e.incasso), mediaRitardo: media(e.ritardi) }))
    .sort((a, b) => (b.mediaRitardo ?? -1) - (a.mediaRitardo ?? -1) || (b.mediaIncasso ?? -1) - (a.mediaIncasso ?? -1));
  return {
    n: incasso.length || ritardi.length ? Math.max(incasso.length, ritardi.length) : 0,
    mediaIncasso: media(incasso), medianaIncasso: mediana(incasso),
    mediaRitardo: media(ritardi), nConScadenza: ritardi.length,
    pctInRitardo: ritardi.length ? Math.round((nInRitardo / ritardi.length) * 100) : null,
    perCliente,
  };
}

/**
 * Fatturato (proforma emesse nell'anno) per cliente e per prestazione, con
 * incassato. La prestazione viene dalle voci dell'offerta collegata alla
 * commessa: la quota della proforma si divide in proporzione ai prezzi delle voci.
 */
export function calcolaFatturato({ commesse, rate, proforma, offerte, anno = 0 }) {
  const commById = Object.fromEntries(commesse.map(c => [c.id, c]));
  const rateById = Object.fromEntries(rate.map(r => [r.id, r]));
  const offByComm = {};
  for (const o of offerte || []) if (o.commessa_id && o.stato === "accettata") offByComm[o.commessa_id] = o;
  const pesiCache = {};
  const pesi = cid => {
    if (pesiCache[cid]) return pesiCache[cid];
    const voci = vociNormalizzate(offByComm[cid]);
    const tot = voci.reduce((s, v) => s + v.prezzo, 0);
    return (pesiCache[cid] = tot > 0 ? voci.map(v => ({ nome: v.nome, w: v.prezzo / tot })) : null);
  };

  const perCli = {}, perPrest = {};
  let totFatt = 0, totInc = 0, nProforma = 0;
  const andamento = anno
    ? MESI.map(m => ({ label: m, fatturato: 0, incassato: 0 }))
    : [];
  const perAnno = {};
  const addAnd = (d, campo, v) => {
    if (!d) return;
    if (anno) { if (d.getFullYear() === anno) andamento[d.getMonth()][campo] += v; }
    else { const y = d.getFullYear(); (perAnno[y] || (perAnno[y] = { label: String(y), fatturato: 0, incassato: 0 }))[campo] += v; }
  };

  for (const p of proforma) {
    const de = dataEmissione(p);
    const dp = p.pagato ? parseDay(p.data_pagamento) : null;
    const imp = importoProforma(p, rateById, commById);
    if (imp <= 0) continue;
    addAnd(de, "fatturato", imp);
    if (p.pagato) addAnd(dp || de, "incassato", imp);
    if (anno && (!de || de.getFullYear() !== anno)) continue;
    nProforma++; totFatt += imp; if (p.pagato) totInc += imp;
    for (const [cid, quota] of Object.entries(ripartisciProforma(p, rateById, commById))) {
      const c = commById[cid];
      const cli = norm(c?.cliente) || "—";
      const ec = perCli[cli] || (perCli[cli] = { cliente: cli, fatturato: 0, incassato: 0, commesse: new Set() });
      ec.fatturato += quota; if (p.pagato) ec.incassato += quota; ec.commesse.add(cid);
      const w = pesi(cid);
      const parti = w || [{ nome: "Senza offerta collegata", w: 1 }];
      for (const { nome, w: peso } of parti) {
        const k = nome.toLowerCase();
        const ep = perPrest[k] || (perPrest[k] = { nome, fatturato: 0, incassato: 0 });
        ep.fatturato += quota * peso; if (p.pagato) ep.incassato += quota * peso;
      }
    }
  }
  return {
    totFatt, totInc, nProforma,
    perCliente: Object.values(perCli).map(e => ({ ...e, commesse: e.commesse.size })).sort((a, b) => b.fatturato - a.fatturato),
    perPrestazione: Object.values(perPrest).sort((a, b) => b.fatturato - a.fatturato),
    andamento: anno ? andamento : Object.values(perAnno).sort((a, b) => Number(a.label) - Number(b.label)),
  };
}

// ── Ore per progetto ─────────────────────────────────────────────
/**
 * Per ogni progetto con commesse o ore: valore commesse, ore, €/ora effettivi,
 * budget ore. Sfora = ore oltre il budget, oppure €/ora sotto la soglia.
 */
export function calcolaOreProgetti({ projects, commesse, orePerProgetto, soglia = 0 }) {
  const valPerProj = {}, nCommPerProj = {};
  for (const c of commesse) {
    if (!c.project_id) continue;
    valPerProj[c.project_id] = (valPerProj[c.project_id] || 0) + valoreCommessa(c);
    nCommPerProj[c.project_id] = (nCommPerProj[c.project_id] || 0) + 1;
  }
  const righe = [];
  for (const p of projects) {
    const ore = Number(orePerProgetto[p.id]) || 0;
    const importo = valPerProj[p.id] || 0;
    if (ore <= 0 && importo <= 0) continue;
    const budget = Number(p.budget_ore) || 0;
    const euroOra = ore > 0 && importo > 0 ? importo / ore : null;
    const oltreBudget = budget > 0 && ore > budget;
    const sottoSoglia = euroOra != null && soglia > 0 && euroOra < soglia;
    righe.push({
      id: p.id, nome: p.name || "—", cliente: norm(p.client) || "—", archiviato: !!p.archived,
      ore, importo, budget, euroOra,
      pctBudget: budget > 0 ? ore / budget : null,
      oltreBudget, sottoSoglia, sfora: oltreBudget || sottoSoglia,
      senzaImporto: ore > 0 && importo <= 0,
      nCommesse: nCommPerProj[p.id] || 0,
    });
  }
  righe.sort((a, b) => (b.sfora - a.sfora) || ((a.euroOra ?? Infinity) - (b.euroOra ?? Infinity)) || b.ore - a.ore);
  const conDati = righe.filter(r => r.euroOra != null);
  const oreTot = conDati.reduce((s, r) => s + r.ore, 0);
  const impTot = conDati.reduce((s, r) => s + r.importo, 0);
  return {
    righe,
    oreTotali: righe.reduce((s, r) => s + r.ore, 0),
    euroOraMedio: oreTot > 0 ? impTot / oreTot : null,
    nOltreBudget: righe.filter(r => r.oltreBudget).length,
    nSottoSoglia: righe.filter(r => r.sottoSoglia).length,
    nConBudget: righe.filter(r => r.budget > 0).length,
  };
}

// ── Cantieri ─────────────────────────────────────────────────────
export function parseNotePratica(raw) {
  const base = { scadenza: null, stato: "in_istruttoria" };
  if (!raw) return base;
  try {
    const p = JSON.parse(raw);
    if (p && typeof p === "object") return { scadenza: p.scadenza || null, stato: p.stato || "in_istruttoria" };
  } catch { /* nota in testo libero */ }
  return base;
}

export const STATI_PRATICA = [
  { id: "in_istruttoria", label: "In istruttoria" },
  { id: "approvata",      label: "Approvata" },
  { id: "sospesa",        label: "Sospesa" },
  { id: "respinta",       label: "Respinta" },
  { id: "ritirata",       label: "Ritirata" },
];

/**
 * Riepilogo cantieri: Gantt (ultima versione di ogni progetto), report di
 * cantiere (sopralluoghi) e pratiche edilizie con scadenza.
 */
export function calcolaCantieri({ projects, versions, lavorazioni, reports, pratiche, oggi = oggiLocale(), giorniSenzaReport = 14 }) {
  const projById = Object.fromEntries(projects.map(p => [p.id, p]));
  // ultima versione per progetto (come "copia l'ultima" nel Gantt: la più recente)
  const ultimaVers = {};
  for (const v of [...versions].sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)))) ultimaVers[v.project_id] = v.id;
  const lavPerProj = {};
  for (const l of lavorazioni) {
    const vid = ultimaVers[l.project_id];
    if (vid ? l.version_id !== vid : l.version_id) continue;
    const s = parseDay(l.data_inizio), e = parseDay(l.data_fine);
    if (!s || !e) continue;
    (lavPerProj[l.project_id] || (lavPerProj[l.project_id] = [])).push({ ...l, s, e });
  }
  const repPerProj = {};
  for (const r of reports) {
    const d = parseDay(r.data_ora);
    const e = repPerProj[r.project_id] || (repPerProj[r.project_id] = { n: 0, ultimo: null, ult30: 0 });
    e.n++;
    if (d && (!e.ultimo || d > e.ultimo)) e.ultimo = d;
    if (d && giorniTra(d, oggi) <= 30 && d <= oggi) e.ult30++;
  }

  const fra14 = new Date(oggi.getFullYear(), oggi.getMonth(), oggi.getDate() + 14);
  const imprese = {};
  const cantieri = [];
  const ids = new Set([...Object.keys(lavPerProj), ...Object.keys(repPerProj)]);
  for (const pid of ids) {
    const p = projById[pid];
    if (!p) continue;
    const lav = lavPerProj[pid] || [];
    const rep = repPerProj[pid] || { n: 0, ultimo: null, ult30: 0 };
    const inizio = lav.length ? new Date(Math.min(...lav.map(l => l.s))) : null;
    const fine = lav.length ? new Date(Math.max(...lav.map(l => l.e))) : null;
    let stato = "senza_gantt";
    if (inizio && fine) stato = oggi < inizio ? "da_iniziare" : oggi > fine ? "concluso" : "in_corso";
    const durata = inizio && fine ? giorniTra(inizio, fine) + 1 : null;
    const pctTempo = stato === "in_corso" && durata ? Math.min(1, (giorniTra(inizio, oggi) + 1) / durata) : stato === "concluso" ? 1 : stato === "da_iniziare" ? 0 : null;
    const inCorsoOggi = lav.filter(l => l.s <= oggi && l.e >= oggi);
    const inPartenza = lav.filter(l => l.s > oggi && l.s <= fra14);
    const giorniDaReport = rep.ultimo ? giorniTra(rep.ultimo, oggi) : null;
    const senzaReport = stato === "in_corso" && (giorniDaReport == null || giorniDaReport > giorniSenzaReport);
    for (const [lista, campo] of [[inCorsoOggi, "oggi"], [inPartenza, "prossimi"]]) {
      for (const l of lista) {
        const nome = norm(l.operatore);
        if (!nome) continue;
        const k = nome.toLowerCase();
        const e = imprese[k] || (imprese[k] = { impresa: nome, oggi: 0, prossimi: 0, cantieri: new Set() });
        e[campo]++; e.cantieri.add(p.name || "—");
      }
    }
    cantieri.push({
      id: pid, nome: p.name || "—", cliente: norm(p.client) || "—", archiviato: !!p.archived,
      inizio, fine, stato, pctTempo,
      giorniAllaFine: fine && stato !== "concluso" ? giorniTra(oggi, fine) : null,
      nLavorazioni: lav.length,
      lavOggi: inCorsoOggi.map(l => ({ descrizione: l.descrizione || "—", impresa: norm(l.operatore) })),
      nInPartenza: inPartenza.length,
      nReport: rep.n, ultimoReport: rep.ultimo, giorniDaReport, report30: rep.ult30, senzaReport,
    });
  }
  const ordine = { in_corso: 0, da_iniziare: 1, senza_gantt: 2, concluso: 3 };
  cantieri.sort((a, b) => ordine[a.stato] - ordine[b.stato] || (a.fine && b.fine ? a.fine - b.fine : 0) || a.nome.localeCompare(b.nome));

  // Pratiche
  const perStato = Object.fromEntries(STATI_PRATICA.map(s => [s.id, 0]));
  const scadenze = [];
  const fra60 = new Date(oggi.getFullYear(), oggi.getMonth(), oggi.getDate() + 60);
  for (const pr of pratiche) {
    const { scadenza, stato } = parseNotePratica(pr.note);
    perStato[stato] = (perStato[stato] || 0) + 1;
    const d = parseDay(scadenza?.data);
    if (!d || ["approvata", "respinta", "ritirata"].includes(stato)) continue;
    if (d > fra60) continue;
    scadenze.push({
      id: pr.id, progetto: projById[pr.project_id]?.name || "—", projectId: pr.project_id,
      pratica: pr.tipo_pratica || "—", label: scadenza?.label || "", data: d, giorni: giorniTra(oggi, d),
    });
  }
  scadenze.sort((a, b) => a.data - b.data);

  const inCorso = cantieri.filter(c => c.stato === "in_corso");
  return {
    cantieri,
    nInCorso: inCorso.length,
    nFineEntro30: inCorso.filter(c => c.giorniAllaFine != null && c.giorniAllaFine <= 30).length
      + cantieri.filter(c => c.stato === "da_iniziare" && c.giorniAllaFine != null && c.giorniAllaFine <= 30).length,
    nSenzaReport: cantieri.filter(c => c.senzaReport).length,
    report30: cantieri.reduce((s, c) => s + c.report30, 0),
    imprese: Object.values(imprese).map(e => ({ ...e, cantieri: [...e.cantieri] })).sort((a, b) => b.oggi - a.oggi || b.prossimi - a.prossimi),
    praticheStato: STATI_PRATICA.map(s => ({ ...s, n: perStato[s.id] || 0 })),
    nPratiche: pratiche.length,
    scadenze,
    nScadute: scadenze.filter(s => s.giorni < 0).length,
    nScadenze30: scadenze.filter(s => s.giorni >= 0 && s.giorni <= 30).length,
  };
}
