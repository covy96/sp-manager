import { useTheme } from "../contexts/ThemeContext";

function commessaLabel(c) {
  return c ? `${c.numero_offerta ? `${c.numero_offerta} — ` : ""}${c.nome_commessa}` : "";
}

// Campo che mostra le commesse collegate a un progetto come tag affiancati,
// con possibilità di rimuoverle singolarmente e di aggiungerne altre.
export default function LinkedCommesseField({ selectedIds, commesseList, onChange }) {
  const { T } = useTheme();
  const ids = selectedIds ?? [];
  const byId = id => commesseList.find(c => c.id === id);
  const available = commesseList.filter(c => !ids.includes(c.id));

  const remove = id => onChange(ids.filter(x => x !== id));
  const add = id => { if (id && !ids.includes(id)) onChange([...ids, id]); };

  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: ids.length ? 8 : 0 }}>
        {ids.map(id => {
          const c = byId(id);
          return (
            <span key={id} style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '4px 8px', borderRadius: 999, border: `1px solid ${T.borderMd}`,
              background: T.surface, color: T.ink, fontSize: 12, fontFamily: "'Space Grotesk', sans-serif",
            }}>
              {c ? commessaLabel(c) : "Commessa"}
              <button type="button" onClick={() => remove(id)} aria-label="Rimuovi commessa" style={{
                border: 'none', background: 'transparent', color: T.muted, cursor: 'pointer',
                fontSize: 13, lineHeight: 1, padding: 0,
              }}>×</button>
            </span>
          );
        })}
      </div>
      <select value="" onChange={e => add(e.target.value)} disabled={!available.length}
        style={{ width: '100%', padding: '8px 12px', border: `1px solid ${T.borderMd}`, borderRadius: T.radiusSm, background: T.surface, color: T.ink, fontSize: 12, fontFamily: "'Space Grotesk', sans-serif", outline: 'none' }}>
        <option value="">{available.length ? "+ Collega una commessa…" : "Nessuna altra commessa disponibile"}</option>
        {available.map(c => <option key={c.id} value={c.id}>{commessaLabel(c)}</option>)}
      </select>
    </div>
  );
}
