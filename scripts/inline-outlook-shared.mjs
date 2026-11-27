// Copia src/lib/mailDates.js e src/lib/mailMatch.js dentro la edge function
// outlook (tra i marcatori <shared>), così la funzione resta un file unico da
// incollare nell'editor di Supabase. Uso: node scripts/inline-outlook-shared.mjs
// Il test src/lib/outlookShared.test.js controlla che la copia sia aggiornata.
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const FN = `${root}supabase/functions/outlook/index.ts`;
const START = "// <shared> — generato da scripts/inline-outlook-shared.mjs, non modificare a mano";
const END = "// </shared>";

export function sharedBlock() {
  const parts = ["mailDates.js", "mailMatch.js"].map(f => {
    const src = readFileSync(`${root}src/lib/${f}`, "utf8").replace(/^export /gm, "");
    return `// ── src/lib/${f} ──\n${src.trim()}`;
  });
  return `${START}\n${parts.join("\n\n")}\n${END}`;
}

export function currentBlock() {
  const s = readFileSync(FN, "utf8");
  const a = s.indexOf(START), b = s.indexOf(END);
  return a < 0 || b < 0 ? null : s.slice(a, b + END.length);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const s = readFileSync(FN, "utf8");
  const cur = currentBlock();
  if (!cur) throw new Error("Marcatori <shared> non trovati in " + FN);
  writeFileSync(FN, s.replace(cur, sharedBlock()));
  console.log("Aggiornato", FN);
}
