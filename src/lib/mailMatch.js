// Abbina una mail a un progetto con regole semplici (nessun servizio esterno):
// indirizzi email dei contatti del progetto, nome, indirizzo e cliente citati
// nell'oggetto o nel testo. Se il risultato non è netto, restituisce null e
// la mail va nella lista "Da rivedere".

export function normText(s) {
  return ` ${String(s ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim()} `;
}

const has = (hay, needle) => needle.trim().length >= 4 && hay.includes(needle);

// Parole che da sole non identificano un progetto
const STOP = new Set(["via", "viale", "piazza", "corso", "largo", "del", "della", "dei", "delle", "di", "da", "per", "the", "and", "srl", "spa", "snc", "progetto", "lavori", "nuovo", "nuova"]);
const nameWords = (name) => normText(name).trim().split(" ").filter(w => w.length >= 2 && !STOP.has(w) && !(w.length < 3 && !/\d/.test(w)));

// Prima parte dell'indirizzo ("Via Roma 12, Milano" → "via roma 12")
const street = (addr) => normText(String(addr ?? "").split(",")[0]);

// Toglie RE:/R:/FW:/I:/Fwd: dall'oggetto
export function cleanSubject(s) {
  return String(s ?? "").replace(/^(\s*(re|r|fw|fwd|i|inoltra)\s*:\s*)+/i, "").trim();
}

/**
 * @param {{subject?: string, body?: string, participants?: string[]}} mail
 * @param {{id: string, name?: string, client?: string, address?: string}[]} projects
 * @param {{project_id: string, email?: string}[]} contacts
 * @returns {{projectId: string|null, reason: string, candidates: {id: string, score: number, why: string[]}[]}}
 */
export function matchProject(mail, projects, contacts = []) {
  const subject = normText(cleanSubject(mail.subject));
  const body = normText(mail.body);
  const people = new Set((mail.participants ?? []).map(e => String(e).trim().toLowerCase()).filter(Boolean));

  const emailsByProject = {};
  for (const c of contacts) {
    const e = String(c.email ?? "").trim().toLowerCase();
    if (e) (emailsByProject[c.project_id] ??= new Set()).add(e);
  }

  // Il nome del progetto vale se tutte le sue parole significative compaiono
  // (in qualsiasi ordine): "Woolrich Milano" riconosce "WOOLRICH - Milano".
  const nameHits = {};
  for (const p of projects) {
    const words = nameWords(p.name);
    if (!words.length) continue;
    if (words.every(w => subject.includes(` ${w} `))) nameHits[p.id] = { where: "subject", words };
    else if (words.every(w => body.includes(` ${w} `))) nameHits[p.id] = { where: "body", words };
  }
  // Se "Woolrich" e "Woolrich Milano" corrispondono entrambi, vale il più specifico
  for (const [id, hit] of Object.entries(nameHits)) {
    const moreSpecific = Object.entries(nameHits).some(([other, h]) =>
      other !== id && h.where === hit.where && h.words.length > hit.words.length && hit.words.every(w => h.words.includes(w)));
    if (moreSpecific) delete nameHits[id];
  }

  const candidates = [];
  for (const p of projects) {
    let score = 0;
    const why = [];
    const hit = nameHits[p.id];
    if (hit?.where === "subject") { score += 12; why.push("nome nell'oggetto"); }
    else if (hit?.where === "body") { score += 5; why.push("nome nel testo"); }
    const emails = emailsByProject[p.id];
    if (emails && [...people].some(e => emails.has(e))) { score += 8; why.push("contatto del progetto"); }
    const st = street(p.address);
    if (/\d/.test(st) || st.trim().split(" ").length >= 3) {
      if (has(subject, st) || has(body, st)) { score += 6; why.push("indirizzo"); }
    }
    const client = normText(p.client);
    if (has(subject, client) || has(body, client)) { score += 3; why.push("cliente"); }
    if (score > 0) candidates.push({ id: p.id, score, why });
  }
  candidates.sort((a, b) => b.score - a.score);

  const [best, second] = candidates;
  if (!best) return { projectId: null, reason: "nessun progetto riconosciuto", candidates };
  if (best.score < 8) return { projectId: null, reason: "progetto incerto", candidates };
  if (second && best.score - second.score < 4) return { projectId: null, reason: "più progetti possibili", candidates };
  return { projectId: best.id, reason: best.why.join(", "), candidates };
}
