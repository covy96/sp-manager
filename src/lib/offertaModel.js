// ─────────────────────────────────────────────────────────────────────────────
// Modello dati del documento d'offerta: costruzione della configurazione di
// default, calcolo dei totali e helper di formattazione.
// Condiviso da OffertaDocumentPanel, offertaPdf e offertaDocx.
// ─────────────────────────────────────────────────────────────────────────────
import { SEZIONI, BLOCCHI_FISSI, INQUADRAMENTO, estraiCampi, lettera, RATE_C_DEFAULT } from "./offertaTemplate";

// ── Formattazione ────────────────────────────────────────────────────────────
export const euro = (v) =>
  (Number(v) || 0).toLocaleString("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";

export const numero2 = (v) =>
  (Number(v) || 0).toLocaleString("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const euroSimbolo = (v) =>
  "€ " + (Number(v) || 0).toLocaleString("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

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

export function documentoDefault(offerta = {}) {
  const sezioni = {};
  SEZIONI.forEach(s => {
    const voci = {};
    s.gruppi.forEach(g => g.voci.forEach(v => {
      voci[v.id] = { attiva: true, prezzo: "", campi: campiVuoti(v.testo) };
    }));
    sezioni[s.id] = { attiva: false, prezzo: "", voci };
  });

  const blocchi = {};
  BLOCCHI_FISSI.forEach(b => { blocchi[b.id] = true; });

  return {
    copertina: true,
    firma: true,
    luogo: "Milano",
    data: new Date().toISOString().slice(0, 10),
    destinatario: { nome: offerta.cliente || "", indirizzo: "", sede: "", cf: "", piva: "" },
    oggettoIncarico: "",
    necessita: "della sua attività",
    inquadramento: { attivo: false, campi: campiVuoti(INQUADRAMENTO.testo) },
    sezioni,
    blocchi,
    pagamento: { opzioni: [], testoLibero: "", rateC: RATE_C_DEFAULT.map(r => ({ ...r })) },
    sconto: Number(offerta.sconto) || 0,
    scontoFisso: Number(offerta.sconto_fisso) || 0,
  };
}

// Fonde la configurazione salvata con quella di default, così l'aggiunta di
// nuove voci al template non rompe le offerte già create.
export function normalizzaDocumento(salvato, offerta = {}) {
  const base = documentoDefault(offerta);
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
export function sezioniAttive(doc) {
  return SEZIONI.filter(s => doc.sezioni?.[s.id]?.attiva).map((s, i) => ({ ...s, lettera: lettera(i) }));
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

export function calcolaTotali(doc) {
  const attive = sezioniAttive(doc);
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
