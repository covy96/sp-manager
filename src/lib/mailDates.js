// Riconosce date e orari nel testo di una mail (italiano), senza servizi
// esterni: serve a precompilare un'attività in calendario. È solo un aiuto,
// l'utente rivede sempre data e ora prima di salvare.

const MESI = ["gennaio","febbraio","marzo","aprile","maggio","giugno","luglio","agosto","settembre","ottobre","novembre","dicembre"];
const MESI_RE = MESI.map(m => m.slice(0, 3) + `(?:${m.slice(3)})?`).join("|");
const GIORNI = ["domenica","lunedì","martedì","mercoledì","giovedì","venerdì","sabato"];

const pad = n => String(n).padStart(2, "0");
const iso = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const strip = s => s.normalize("NFD").replace(/[̀-ͯ]/g, "");

function validDate(y, m, d) {
  const dt = new Date(y, m - 1, d);
  return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d ? dt : null;
}

// Anno mancante: la prossima occorrenza a partire dal giorno di riferimento
function withYear(m, d, ref) {
  let dt = validDate(ref.getFullYear(), m, d);
  if (dt && dt < new Date(ref.getFullYear(), ref.getMonth(), ref.getDate())) dt = validDate(ref.getFullYear() + 1, m, d);
  return dt;
}

const fullYear = y => (y < 100 ? 2000 + y : y);

// Orario subito dopo la data (entro pochi caratteri): "alle 10:30", "ore 9", "h 15.00"
const TIME_AFTER = /^[^\n\d]{0,20}?(?:ore|alle|h\.?|dalle)?\s*([01]?\d|2[0-3])(?:[:.]([0-5]\d))?\b/i;
const TIME_ANY = /\b(?:ore|alle|dalle|h\.?)\s*([01]?\d|2[0-3])(?:[:.]([0-5]\d))?\b|\b([01]?\d|2[0-3])[:.]([0-5]\d)\b/gi;

function timeNear(text, from) {
  const m = TIME_AFTER.exec(text.slice(from, from + 30));
  if (!m) return null;
  // Senza "ore/alle" un numero nudo (es. "12 2026") non è un orario
  const hasKeyword = /ore|alle|dalle|h/i.test(m[0].replace(/\d.*/, ""));
  if (!m[2] && !hasKeyword) return null;
  return `${pad(m[1])}:${m[2] ?? "00"}`;
}

/**
 * @param {string} text testo della mail (oggetto + corpo)
 * @param {Date} ref data di ricezione, per "domani", giorni della settimana e anno mancante
 * @returns {{date: string, time: string|null, match: string}[]} senza duplicati, in ordine di apparizione
 */
export function findMailDates(text, ref = new Date()) {
  if (!text) return [];
  const src = strip(text);
  const found = [];
  const add = (dt, index, len) => {
    if (!dt) return;
    found.push({ date: iso(dt), time: timeNear(src, index + len), match: text.slice(index, index + len), index });
  };

  // 12/11/2026, 12-11-26, 12.11.2026, 12/11
  for (const m of src.matchAll(/\b(\d{1,2})[/.-](\d{1,2})(?:[/.-](\d{2,4}))?\b/g)) {
    const d = +m[1], mo = +m[2];
    if (!m[3] && m[0].includes(".")) continue; // "10.30" è un orario
    add(m[3] ? validDate(fullYear(+m[3]), mo, d) : withYear(mo, d, ref), m.index, m[0].length);
  }
  // 12 novembre (2026), 3 nov
  for (const m of src.matchAll(new RegExp(`\\b(\\d{1,2})\\s+(${MESI_RE})\\.?(?:\\s+(\\d{4}))?\\b`, "gi"))) {
    const mo = MESI.findIndex(x => x.startsWith(m[2].toLowerCase().slice(0, 3))) + 1;
    add(m[3] ? validDate(+m[3], mo, +m[1]) : withYear(mo, +m[1], ref), m.index, m[0].length);
  }
  // oggi, domani, dopodomani
  for (const m of src.matchAll(/\b(oggi|dopodomani|domani)\b/gi)) {
    const off = { oggi: 0, domani: 1, dopodomani: 2 }[m[1].toLowerCase()];
    add(new Date(ref.getFullYear(), ref.getMonth(), ref.getDate() + off), m.index, m[0].length);
  }
  // lunedì / martedi prossimo… (se non è già seguito da una data esplicita)
  for (const m of src.matchAll(new RegExp(`\\b(${GIORNI.map(strip).join("|")})(?!\\s+\\d)`, "gi"))) {
    const wd = GIORNI.map(strip).indexOf(m[1].toLowerCase());
    const diff = ((wd - ref.getDay() + 7) % 7) || 7;
    add(new Date(ref.getFullYear(), ref.getMonth(), ref.getDate() + diff), m.index, m[0].length);
  }

  found.sort((a, b) => a.index - b.index);
  const seen = new Set();
  return found.filter(f => {
    const k = `${f.date}|${f.time}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  }).map(({ index, ...f }) => f); // eslint-disable-line no-unused-vars
}

// Primo orario citato nel testo, se non ce n'è uno vicino alla data
export function firstTime(text) {
  TIME_ANY.lastIndex = 0;
  const m = TIME_ANY.exec(strip(text || ""));
  if (!m) return null;
  return m[1] ? `${pad(m[1])}:${m[2] ?? "00"}` : `${pad(m[3])}:${m[4]}`;
}
