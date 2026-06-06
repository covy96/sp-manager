/**
 * handleListKeyDown — comportamento tipo Word/Notion per liste nei textarea.
 *
 * Supporta:
 *   - `- ` / `* ` / `• `  → lista non ordinata
 *   - `1. ` / `2. ` …     → lista ordinata (incrementa il numero)
 *
 * Al secondo Invio su riga vuota (solo marcatore) esce dalla lista.
 *
 * Uso:
 *   <textarea
 *     value={val}
 *     onChange={e => setVal(e.target.value)}
 *     onKeyDown={e => handleListKeyDown(e, val, setVal)}
 *   />
 */
export function handleListKeyDown(e, value, onChange) {
  if (e.key !== 'Enter') return;

  const ta    = e.target;
  const start = ta.selectionStart;
  const end   = ta.selectionEnd;

  // Riga corrente
  const before    = value.substring(0, start);
  const lineStart = before.lastIndexOf('\n') + 1;
  const curLine   = before.substring(lineStart);

  const unordered = curLine.match(/^(\s*)([-*•])\s/);
  const ordered   = curLine.match(/^(\s*)(\d+)\.\s/);

  if (!unordered && !ordered) return; // comportamento default

  e.preventDefault();

  const lineContent = curLine.substring((unordered || ordered)[0].length);

  // Riga vuota (solo marcatore) → esci dalla lista
  if (!lineContent.trim()) {
    const newVal = value.substring(0, lineStart) + '\n' + value.substring(start);
    onChange(newVal);
    requestAnimationFrame(() => {
      ta.selectionStart = ta.selectionEnd = lineStart + 1;
    });
    return;
  }

  // Continua la lista
  let insert;
  if (unordered) {
    const [, indent, marker] = unordered;
    insert = '\n' + indent + marker + ' ';
  } else {
    const [, indent, numStr] = ordered;
    insert = '\n' + indent + (parseInt(numStr) + 1) + '. ';
  }

  const newVal = value.substring(0, start) + insert + value.substring(end);
  onChange(newVal);
  requestAnimationFrame(() => {
    ta.selectionStart = ta.selectionEnd = start + insert.length;
  });
}
