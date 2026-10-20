// ─────────────────────────────────────────────────────────────────────────────
// Modello dati del documento d'offerta: costruzione della configurazione di
// default, calcolo dei totali e helper di formattazione.
// Condiviso da OffertaDocumentPanel, offertaPdf e offertaDocx.
// ─────────────────────────────────────────────────────────────────────────────
import { estraiCampi, lettera, DEFAULT_TEMPLATE } from "./offertaTemplate";

// ── Formattazione ────────────────────────────────────────────────────────────
// Formatta un importo con separatore delle migliaia "." e decimali "," (it-IT),
// in modo deterministico: non dipende dal supporto Intl/locale del runtime, così
// le cifre sopra 1.000 hanno sempre il punto di separazione (es. 18.400,00).
export function formattaImporto(v) {
  const n = Number(v) || 0;
  const segno = n < 0 ? "-" : "";
  const [intero, dec] = Math.abs(n).toFixed(2).split(".");
  const conMigliaia = intero.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${segno}${conMigliaia},${dec}`;
}

export const euro = (v) => formattaImporto(v) + " €";

export const numero2 = (v) => formattaImporto(v);

export const euroSimbolo = (v) => "€ " + formattaImporto(v);

export const dataEstesa = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d)) return "";
  const p = (n) => String(n).padStart(2, "0");
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}`;
};

// ── Numero in lettere (italiano) ─────────────────────────────────────────────
const UNITA = ["zero","uno","due","tre","quattro","cinque","sei","sette","otto","nove","dieci",
  "undici","dodici","tredici","quattordici","quindici","sedici","diciassette","diciotto","diciannove"];
const DECINE = ["","","venti","trenta","quaranta","cinquanta","sessanta","settanta","ottanta","novanta"];

function sottoCento(n) {
  if (n < 20) return UNITA[n];
  const d = Math.floor(n / 10), u = n % 10;
  let base = DECINE[d];
  if (u === 1 || u === 8) base = base.slice(0, -1);   // venti+uno → ventuno
  return base + (u ? (u === 3 ? "tré" : UNITA[u]) : "");
}

function sottoMille(n) {
  if (n < 100) return sottoCento(n);
  const c = Math.floor(n / 100), r = n % 100;
  const pref = c === 1 ? "cento" : UNITA[c] + "cento";
  return pref + (r ? sottoCento(r) : "");
}

export function numeroInLettere(num) {
  const n = Math.floor(Math.abs(Number(num) || 0));
  if (n === 0) return "zero";
  if (n < 1000) return sottoMille(n);

  const parti = [];
  const milioni = Math.floor(n / 1000000);
  const migliaia = Math.floor((n % 1000000) / 1000);
  const resto = n % 1000;

  if (milioni) parti.push(milioni === 1 ? "unmilione" : sottoMille(milioni) + "milioni");
  if (migliaia) parti.push(migliaia === 1 ? "mille" : sottoMille(migliaia) + "mila");
  if (resto) parti.push(sottoMille(resto));
  return parti.join("");
}

// "18.400,00" → "diciottomilaquattrocento/00"
export function importoInLettere(v) {
  const n = Number(v) || 0;
  const intero = Math.floor(n);
  const cent = Math.round((n - intero) * 100);
  return `${numeroInLettere(intero)}/${String(cent).padStart(2, "0")}`;
}

// ── Configurazione di default ────────────────────────────────────────────────
function campiVuoti(testo) {
  const out = {};
  estraiCampi(testo).forEach(c => { out[c.key] = ""; });
  return out;
}

export function documentoDefault(offerta = {}, tpl = DEFAULT_TEMPLATE) {
  const { SEZIONI, BLOCCHI_FISSI, INQUADRAMENTO, RATE_C_DEFAULT, DEFAULTS } = tpl;
  const sezioni = {};
  SEZIONI.forEach(s => {
    const voci = {};
    // Le sezioni "prezzo per voce" nascono con le voci spente: è l'utente a
    // scegliere quali attivare. Le forfettarie mantengono le righe descrittive
    // attive (il prezzo è unico per la sezione).
    const vociAttiveDefault = s.modoPrezzo !== "voci";
    s.gruppi.forEach(g => g.voci.forEach(v => {
      voci[v.id] = { attiva: vociAttiveDefault, prezzo: v.prezzoDefault != null ? v.prezzoDefault : "", campi: campiVuoti(v.testo) };
    }));
    sezioni[s.id] = { attiva: DEFAULTS.sezioniAttive.includes(s.id), prezzo: s.prezzoDefault != null ? s.prezzoDefault : "", voci };
  });

  const blocchi = {};
  BLOCCHI_FISSI.forEach(b => { blocchi[b.id] = DEFAULTS.blocchiAttivi.includes(b.id); });

  return {
    copertina: DEFAULTS.copertina,
    firma: DEFAULTS.firma,
    luogo: DEFAULTS.luogo,
    data: new Date().toISOString().slice(0, 10),
    destinatario: { appellativo: "Spettabile", nome: offerta.cliente || "", indirizzo: "", sede: "", cf: "", piva: "" },
    oggettoIncarico: "",
    necessita: "della sua attività",
    inquadramento: { attivo: !!DEFAULTS.inquadramentoAttivo, campi: campiVuoti(INQUADRAMENTO.testo), testoLibero: "" },
    sezioni,
    blocchi,
    pagamento: { opzioni: [...(DEFAULTS.opzioniPagamento || [])], testoLibero: "", rateC: RATE_C_DEFAULT.map(r => ({ ...r })) },
    sconto: Number(offerta.sconto) || 0,
    scontoFisso: Number(offerta.sconto_fisso) || 0,
  };
}

// Fonde la configurazione salvata con quella di default, così l'aggiunta di
// nuove voci al template non rompe le offerte già create.
export function normalizzaDocumento(salvato, offerta = {}, tpl = DEFAULT_TEMPLATE) {
  const base = documentoDefault(offerta, tpl);
  if (!salvato || typeof salvato !== "object") return base;

  const out = { ...base, ...salvato };
  out.destinatario = { ...base.destinatario, ...(salvato.destinatario || {}) };
  out.inquadramento = {
    ...base.inquadramento,
    ...(salvato.inquadramento || {}),
    campi: { ...base.inquadramento.campi, ...(salvato.inquadramento?.campi || {}) },
  };
  out.pagamento = { ...base.pagamento, ...(salvato.pagamento || {}) };
  out.blocchi = { ...base.blocchi, ...(salvato.blocchi || {}) };

  out.sezioni = {};
  Object.keys(base.sezioni).forEach(sid => {
    const bs = base.sezioni[sid], ss = salvato.sezioni?.[sid] || {};
    const voci = {};
    Object.keys(bs.voci).forEach(vid => {
      voci[vid] = {
        ...bs.voci[vid],
        ...(ss.voci?.[vid] || {}),
        campi: { ...bs.voci[vid].campi, ...(ss.voci?.[vid]?.campi || {}) },
      };
    });
    out.sezioni[sid] = { ...bs, ...ss, voci };
  });

  return out;
}

// ── Calcoli ──────────────────────────────────────────────────────────────────
export function sezioniAttive(doc, tpl = DEFAULT_TEMPLATE) {
  return tpl.SEZIONI.filter(s => doc.sezioni?.[s.id]?.attiva).map((s, i) => ({ ...s, lettera: lettera(i) }));
}

// Quantità di una voce a prezzo unitario ("cad."): intero estratto dal primo
// campo «…» compilato con un valore numerico. Le voci non "cad." valgono 1.
export function quantitaVoce(v, vc) {
  if (!/cad/i.test(v?.prezzoLabel || "")) return 1;
  const campi = vc?.campi || {};
  for (const k of Object.keys(campi)) {
    const n = parseInt(String(campi[k] ?? "").replace(/[^\d]/g, ""), 10);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return 1;
}

// Importo di una singola voce: per le voci "cad." è prezzo unitario × quantità.
export function importoVoce(v, vc) {
  return (Number(vc?.prezzo) || 0) * quantitaVoce(v, vc);
}

export function importoSezione(s, doc) {
  const cfg = doc.sezioni?.[s.id];
  if (!cfg) return 0;
  if (s.modoPrezzo === "voci") {
    let tot = 0;
    s.gruppi.forEach(g => g.voci.forEach(v => {
      const vc = cfg.voci?.[v.id];
      if (v.prezzo && vc?.attiva) tot += importoVoce(v, vc);
    }));
    return tot;
  }
  return Number(cfg.prezzo) || 0;
}

export function calcolaTotali(doc, tpl = DEFAULT_TEMPLATE) {
  const attive = sezioniAttive(doc, tpl);
  const righe = attive.map(s => ({
    lettera: s.lettera,
    titolo: s.titoloTabella,
    importo: importoSezione(s, doc),
  }));
  const lordo = righe.reduce((a, r) => a + r.importo, 0);
  const sconto = Number(doc.sconto) || 0;
  const scontoFisso = Number(doc.scontoFisso) || 0;
  const dopoPerc = sconto > 0 ? lordo * (1 - sconto / 100) : lordo;
  const totale = Math.max(0, Math.round((dopoPerc - scontoFisso) * 100) / 100);
  return { righe, lordo, sconto, scontoFisso, totale, scontato: sconto > 0 || scontoFisso > 0 };
}

// Voci attive di una sezione, raggruppate, con i campi già compilati a valle.
export function vociAttive(s, doc) {
  const cfg = doc.sezioni?.[s.id];
  return s.gruppi
    .map(g => ({
      label: g.label,
      voci: g.voci.filter(v => cfg?.voci?.[v.id]?.attiva !== false),
    }))
    .filter(g => g.voci.length > 0);
}

// ── Duplicazione offerta ─────────────────────────────────────────────────────
// Propone il numero successivo partendo da quello dell'offerta originale:
// incrementa l'ultimo gruppo di cifre che non sia un anno (es. "2026/014" →
// "2026/015", "15/2026" → "16/2026"), mantenendo gli zeri iniziali e saltando
// i numeri già usati nello studio.
export function prossimoNumeroOfferta(numero, esistenti = []) {
  const base = String(numero || "").trim();
  const usati = new Set(esistenti.map((n) => String(n || "").trim().toLowerCase()));
  const gruppi = [...base.matchAll(/\d+/g)];
  if (gruppi.length === 0) {
    let k = 2, cand = base ? `${base}-2` : "OFF.1";
    while (usati.has(cand.toLowerCase())) cand = `${base}-${++k}`;
    return cand;
  }
  const nonAnni = gruppi.filter((g) => !/^(19|20)\d\d$/.test(g[0]));
  const g = (nonAnni.length ? nonAnni : gruppi).at(-1);
  const prima = base.slice(0, g.index), dopo = base.slice(g.index + g[0].length);
  let n = Number(g[0]);
  let cand;
  do {
    n += 1;
    cand = prima + String(n).padStart(g[0].length, "0") + dopo;
  } while (usati.has(cand.toLowerCase()));
  return cand;
}

// Campi che identificano la singola offerta o il suo esito: non si copiano.
const CAMPI_NON_DUPLICABILI = [
  "id", "created_at", "updated_at", "created_date", "updated_date",
  "created_by", "deleted_at", "commessa_id",
];

// Costruisce la riga da inserire per la copia di un'offerta: stesse voci,
// sconti, cliente, progetto e documento; nuovo numero, data di oggi e stato
// "offerta" (da decidere), con lo storico documento ripartito da una versione.
export function datiDuplicaOfferta(offerta, numeriEsistenti = [], oggi = new Date().toISOString().slice(0, 10)) {
  const copia = { ...offerta };
  CAMPI_NON_DUPLICABILI.forEach((k) => { delete copia[k]; });
  copia.numero_offerta = prossimoNumeroOfferta(offerta.numero_offerta, numeriEsistenti);
  copia.nome_offerta = `${(offerta.nome_offerta || "").trim()} (copia)`.trim();
  copia.data_offerta = oggi;
  copia.stato = "offerta";
  copia.archived = false;
  copia.voci = Array.isArray(offerta.voci) ? offerta.voci.map((v) => ({ ...v })) : [];
  const doc = offerta.documento && typeof offerta.documento === "object" ? offerta.documento : null;
  if (doc && Object.keys(doc).length > 0) {
    copia.documento = JSON.parse(JSON.stringify(doc));
    if ("data" in copia.documento) copia.documento.data = oggi;
    copia.documento_versioni = [{ n: 1, ts: new Date().toISOString(), doc: copia.documento }];
  } else {
    copia.documento_versioni = [];
  }
  return copia;
}
