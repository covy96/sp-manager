// ─────────────────────────────────────────────────────────────────────────────
// Testo formattato delle voci di capitolato (grassetto, corsivo, colore).
// La descrizione resta una colonna di testo: se non ha formattazione si salva
// come testo semplice (come sempre), altrimenti come un piccolo HTML ripulito
// che usa solo <b>, <i>, <span style="color:#rrggbb"> e <br>. Le voci vecchie in
// testo semplice continuano a funzionare così come sono.
// Tutto passa per i "run" ({ text, b, i, color }), condivisi da editor, anteprime,
// PDF ed Excel. Il parser è scritto a mano (niente DOM): gira anche nei test node
// e funge da sanitizzatore, perché in uscita si ricostruisce solo ciò che è ammesso.
// ─────────────────────────────────────────────────────────────────────────────

// Colori proposti nell'editor: leggibili sia su chiaro sia su scuro.
export const RICH_COLORI = [
  { nome: "Rosso", hex: "#d0312d" },
  { nome: "Arancio", hex: "#e07b00" },
  { nome: "Verde", hex: "#2e9e44" },
  { nome: "Blu", hex: "#1f6fd1" },
];
// Colore "automatico" usato dall'editor per togliere il colore: in uscita sparisce.
export const RICH_AUTO = "#010101";

const TAG_RICH = /<\/?(b|strong|i|em|span|font|br|div|p)\b[^>]*>/i;
export const isRich = (s) => typeof s === "string" && TAG_RICH.test(s);

const ENT = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };
function decode(s) {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) => {
    if (e[0] === "#") {
      const n = e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      if (!Number.isFinite(n)) return m;
      return n === 160 ? " " : String.fromCodePoint(n);
    }
    const v = ENT[e.toLowerCase()];
    return v == null ? m : v;
  }).replace(/ /g, " ");
}
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// "#abc", "#aabbcc", "rgb(1,2,3)" → "#aabbcc"; altro → null
export function normColor(c) {
  if (!c) return null;
  const s = String(c).trim().toLowerCase();
  let m = s.match(/^#([0-9a-f]{3})$/);
  if (m) return "#" + m[1].split("").map((x) => x + x).join("");
  m = s.match(/^#([0-9a-f]{6})$/);
  if (m) return "#" + m[1];
  m = s.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  if (m) return "#" + m.slice(1, 4).map((x) => Math.min(255, Number(x)).toString(16).padStart(2, "0")).join("");
  return null;
}

const attr = (a, name) => {
  const m = a.match(new RegExp(`\\b${name}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`, "i"));
  return m ? decode(m[2] ?? m[3] ?? m[4] ?? "") : null;
};
function styleOf(a) {
  const css = attr(a, "style") || "";
  const out = {};
  const fw = css.match(/font-weight\s*:\s*([^;]+)/i);
  if (fw) { const v = fw[1].trim().toLowerCase(); out.b = v === "bold" || v === "bolder" || Number(v) >= 600; }
  const fs = css.match(/font-style\s*:\s*([^;]+)/i);
  if (fs) out.i = /italic|oblique/i.test(fs[1]);
  const col = css.match(/(?:^|;)\s*color\s*:\s*([^;]+)/i);
  if (col) out.color = normColor(col[1]);
  return out;
}

// Testo (semplice o HTML) → run uniformi, con "\n" per gli a capo.
// `html`: la sorgente è sicuramente HTML (l'editor), anche senza tag: va decodificata.
export function parseRich(src, { html = false } = {}) {
  const s = src == null ? "" : String(src);
  if (!html && !isRich(s)) return s ? [{ text: s, b: false, i: false, color: null }] : [];
  const runs = [];
  let out = ""; // testo emesso finora (per sapere se serve un a capo di blocco)
  const stack = [{ tag: "", b: false, i: false, color: null }];
  const cur = () => stack[stack.length - 1];
  const push = (text) => {
    if (!text) return;
    const { b, i, color } = cur();
    const last = runs[runs.length - 1];
    if (last && last.b === b && last.i === i && last.color === color) last.text += text;
    else runs.push({ text, b, i, color });
    out += text;
  };
  const re = /<(\/?)([a-z0-9]+)([^>]*)>|<!--[\s\S]*?-->|([^<]+)|</gi;
  let m;
  while ((m = re.exec(s))) {
    if (m[4] != null || m[0] === "<") { push(m[4] != null ? decode(m[4]) : "<"); continue; }
    if (!m[2]) continue; // commento
    const tag = m[2].toLowerCase(), closing = !!m[1], a = m[3] || "";
    if (tag === "br") { push("\n"); continue; }
    const block = tag === "div" || tag === "p";
    if (closing) {
      // chiude fino al tag corrispondente (tollera HTML non annidato bene)
      const idx = stack.map((f) => f.tag).lastIndexOf(tag);
      if (idx > 0) stack.length = idx;
      continue;
    }
    if (block && out && !out.endsWith("\n")) push("\n");
    if (/\/\s*$/.test(a)) continue; // autochiuso
    const p = cur();
    const f = { tag, b: p.b, i: p.i, color: p.color };
    if (tag === "b" || tag === "strong") f.b = true;
    if (tag === "i" || tag === "em") f.i = true;
    if (tag === "font") { const c = normColor(attr(a, "color")); if (c) f.color = c; }
    const st = styleOf(a);
    if (st.b != null) f.b = st.b;
    if (st.i != null) f.i = st.i;
    if (st.color) f.color = st.color;
    if (f.color === RICH_AUTO) f.color = null;
    stack.push(f);
  }
  // un <br> finale serve solo al browser per mostrare la riga vuota: non è testo
  const last = runs[runs.length - 1];
  if (last && last.text.endsWith("\n")) { last.text = last.text.slice(0, -1); if (!last.text) runs.pop(); }
  return runs;
}

export const richToPlain = (s) => parseRich(s).map((r) => r.text).join("");

// Run → HTML ripulito. `editor`: aggiunge il <br> finale che serve al browser
// per mostrare l'ultima riga vuota.
export function runsToHtml(runs, { editor = false } = {}) {
  let h = runs.map((r) => {
    let t = esc(r.text).replace(/\n/g, "<br>");
    if (r.i) t = `<i>${t}</i>`;
    if (r.b) t = `<b>${t}</b>`;
    if (r.color) t = `<span style="color:${r.color}">${t}</span>`;
    return t;
  }).join("");
  if (editor && runs.length && runs[runs.length - 1].text.endsWith("\n")) h += "<br>";
  return h;
}
export const richToHtml = (s, opts) => runsToHtml(parseRich(s), opts);

// Valore da salvare: testo semplice se non c'è formattazione, altrimenti HTML ripulito.
export function normalizeRich(s, opts) {
  const runs = parseRich(s, opts);
  if (!runs.some((r) => r.b || r.i || r.color)) return runs.map((r) => r.text).join("");
  return runsToHtml(runs);
}

// "#d0312d" → "FFD0312D" (ARGB per ExcelJS)
export const argb = (hex) => "FF" + String(hex).replace("#", "").toUpperCase();
// "#d0312d" → [208, 49, 45]
export const rgb = (hex) => { const h = String(hex).replace("#", ""); return [0, 2, 4].map((k) => parseInt(h.slice(k, k + 2), 16)); };

// A capo per il PDF: spezza i run in parole e le dispone su righe larghe al
// massimo `maxW`. `measure(text, run)` ritorna la larghezza nel font del run.
// Ritorna righe = [[{ text, b, i, color, w }]].
export function wrapRuns(runs, maxW, measure) {
  const lines = [[]];
  let w = 0;
  const add = (tok, r) => {
    const line = lines[lines.length - 1];
    const last = line[line.length - 1];
    const tw = measure(tok, r);
    if (last && last.b === r.b && last.i === r.i && last.color === r.color) { last.text += tok; last.w += tw; }
    else line.push({ text: tok, b: r.b, i: r.i, color: r.color, w: tw });
    w += tw;
  };
  runs.forEach((r) => {
    r.text.split(/(\n)/).forEach((part) => {
      if (part === "\n") { lines.push([]); w = 0; return; }
      (part.match(/\s+|\S+/g) || []).forEach((tok) => {
        const space = /^\s+$/.test(tok);
        if (space) { if (w > 0) add(tok, r); return; } // niente spazi a inizio riga
        if (w > 0 && w + measure(tok, r) > maxW) {
          // a capo: toglie lo spazio finale della riga precedente
          const line = lines[lines.length - 1];
          const last = line[line.length - 1];
          if (last) { const t = last.text.replace(/\s+$/, ""); if (t !== last.text) { last.w -= measure(last.text.slice(t.length), last); last.text = t; } }
          lines.push([]); w = 0;
        }
        add(tok, r);
      });
    });
  });
  return lines;
}
