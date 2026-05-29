import { useEffect, useState } from 'react';
import { useStudio } from '../../hooks/useStudio';
import { useTheme } from '../../contexts/ThemeContext';
import { usePageTitleOnMount } from '../../hooks/usePageTitle';
import { supabase } from '../../lib/supabase';

const CATEGORIE = [
  { id: 'projects',      label: 'Progetti',          icon: '📁', rpc: 'cestino_projects',
    getNome: r => r.name || '—',                      getContext: () => null },
  { id: 'commesse',      label: 'Commesse',           icon: '📋', rpc: 'cestino_commesse',
    getNome: r => r.nome_commessa || '—',             getContext: r => r.project_name || null },
  { id: 'offerte',       label: 'Offerte',            icon: '📄', rpc: 'cestino_offerte',
    getNome: r => r.nome_offerta || '—',              getContext: () => null },
  { id: 'proforma',      label: 'Proforma',           icon: '🧾', rpc: 'cestino_proforma',
    getNome: r => r.numero_proforma || '—',           getContext: r => [r.commessa_nome, r.project_name].filter(Boolean).join(' · ') || null },
  { id: 'rate',          label: 'Rate',               icon: '💳', rpc: 'cestino_rate',
    getNome: r => r.numero_rata != null ? `Rata ${r.numero_rata}` : '—', getContext: r => [r.commessa_nome, r.project_name].filter(Boolean).join(' · ') || null },
  { id: 'costi',         label: 'Costi extra',        icon: '💰', rpc: 'cestino_costi_extra',
    getNome: r => r.description || '—',              getContext: r => [r.commessa_nome, r.project_name].filter(Boolean).join(' · ') || null },
  { id: 'costi_interni', label: 'Costi interni',      icon: '🏷️', rpc: 'cestino_costi_interni',
    getNome: r => r.descrizione || '—',              getContext: r => r.commessa_nome || null },
  { id: 'collaboratori', label: 'Collaboratori',      icon: '🤝', rpc: 'cestino_collaboratori',
    getNome: r => r.nome || '—',                     getContext: r => r.commessa_nome || null },
  { id: 'gantt',         label: 'Gantt',              icon: '📊', rpc: 'cestino_gantt',
    getNome: r => r.descrizione || '—',              getContext: r => r.project_name || null },
  { id: 'tasks',         label: 'Task',               icon: '✅', rpc: 'cestino_tasks',
    getNome: r => r.title || '—',                    getContext: r => r.project_name || null },
  { id: 'timesheet',     label: 'Timesheet',          icon: '⏱️', rpc: 'cestino_timesheet',
    getNome: r => r.notes || `${r.hours}h`,          getContext: () => null },
  { id: 'fatture',       label: 'Fatture',            icon: '🧮', rpc: 'cestino_fatture',
    getNome: r => r.numero_fattura || '—',           getContext: () => null },
  { id: 'contatti',      label: 'Contatti',           icon: '👤', rpc: 'cestino_contatti',
    getNome: r => r.full_name || '—',                getContext: () => null },
  { id: 'note',          label: 'Note',               icon: '📝', rpc: 'cestino_note',
    getNome: r => (r.content || '').slice(0, 60) || '—', getContext: () => null },
];

const TABELLA_REALE = {
  projects:      'projects',
  commesse:      'commesse',
  offerte:       'offerte',
  proforma:      'proforma',
  rate:          'suddivisione_pagamenti',
  costi:         'costi_extra',
  costi_interni: 'costi_interni',
  collaboratori: 'collaboratori_esterni',
  gantt:         'lavorazioni_gantt',
  tasks:         'tasks',
  timesheet:     'timesheet',
  fatture:       'fatture',
  contatti:      'global_contacts',
  note:          'notes',
};

export default function CestinoPage() {
  usePageTitleOnMount('Cestino');
  const { studioId } = useStudio();
  const { T } = useTheme();
  const [byCategory, setByCategory] = useState({});
  const [loading, setLoading]       = useState(true);
  const [restoring, setRestoring]   = useState(null);
  const [collapsed, setCollapsed]   = useState({});

  const mono = { fontFamily:"'IBM Plex Mono', monospace" };

  const loadAll = async () => {
    setLoading(true);
    const result = {};
    await Promise.all(CATEGORIE.map(async cat => {
      const { data, error } = await supabase.rpc(cat.rpc, { p_studio_id: studioId });
      if (error) { console.error(`Cestino ${cat.id}:`, error.message); return; }
      const rows = (data ?? []).map(r => ({
        ...r,
        _cat: cat.id,
        _tabella: TABELLA_REALE[cat.id],
        _nome: cat.getNome(r),
        _context: cat.getContext(r),
      }));
      if (rows.length > 0) result[cat.id] = { cat, items: rows };
    }));
    setByCategory(result);
    setLoading(false);
  };

  useEffect(() => { if (studioId) loadAll(); }, [studioId]);

  const handleRestore = async (item) => {
    setRestoring(item.id);
    const { error } = await supabase.rpc('ripristina_item', { p_tabella: item._tabella, p_id: item.id, p_studio_id: studioId });
    if (error) alert('Errore ripristino: ' + error.message);
    setRestoring(null);
    await loadAll();
  };

  const handleDeleteForever = async (item) => {
    if (!confirm(`Eliminare definitivamente "${item._nome}"? Questa azione è irreversibile.`)) return;
    setRestoring(item.id);
    const { error } = await supabase.rpc('elimina_definitivo', { p_tabella: item._tabella, p_id: item.id, p_studio_id: studioId });
    if (error) alert('Errore eliminazione: ' + error.message);
    setRestoring(null);
    await loadAll();
  };

  const toggleCollapse = (id) => setCollapsed(p => ({ ...p, [id]: !p[id] }));

  const totalItems = Object.values(byCategory).reduce((s, c) => s + c.items.length, 0);

  return (
    <div style={{ maxWidth: 700 }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 18, fontWeight: 600, color: T.ink, letterSpacing: '-0.02em', marginBottom: 4 }}>Cestino</div>
        <div style={{ ...mono, fontSize: 10, color: T.muted }}>Elementi eliminati di recente — puoi ripristinarli entro 30 giorni</div>
      </div>

      {loading ? (
        <div style={{ ...mono, fontSize: 11, color: T.muted }}>Caricamento...</div>
      ) : totalItems === 0 ? (
        <div style={{ background: T.surface, border: `0.5px solid ${T.border}`, padding: '48px 0', textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>🗑</div>
          <div style={{ ...mono, fontSize: 11, color: T.muted }}>Il cestino è vuoto</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {CATEGORIE.filter(cat => byCategory[cat.id]).map(cat => {
            const { items } = byCategory[cat.id];
            const isOpen = !collapsed[cat.id];
            return (
              <div key={cat.id} style={{ border: `0.5px solid ${T.border}`, background: T.surface, overflow: 'hidden' }}>
                <button
                  onClick={() => toggleCollapse(cat.id)}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: T.bg, border: 'none', cursor: 'pointer', borderBottom: isOpen ? `0.5px solid ${T.border}` : 'none' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 16 }}>{cat.icon}</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: T.ink }}>{cat.label}</span>
                    <span style={{ ...mono, fontSize: 9, color: T.muted, background: T.surface2, border: `0.5px solid ${T.border}`, padding: '2px 7px' }}>
                      {items.length}
                    </span>
                  </div>
                  <span style={{ ...mono, fontSize: 11, color: T.muted }}>{isOpen ? '▲' : '▼'}</span>
                </button>

                {isOpen && (
                  <div>
                    {items.map((item, idx) => (
                      <div key={item.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', borderTop: idx > 0 ? `0.5px solid ${T.border}` : 'none', background: idx % 2 === 0 ? T.surface : T.surface2 }}>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: T.ink, marginBottom: 2 }}>{item._nome}</div>
                          {item._context && (
                            <div style={{ ...mono, fontSize: 9, color: T.ink60, marginBottom: 2, letterSpacing: '0.04em' }}>{item._context}</div>
                          )}
                          <div style={{ ...mono, fontSize: 9, color: T.muted }}>
                            Eliminato il {new Date(item.deleted_at).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })}
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                          <button onClick={() => handleRestore(item)} disabled={restoring === item.id}
                            style={{ border: `0.5px solid ${T.green}`, background: 'transparent', color: T.green, ...mono, fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '6px 14px', cursor: 'pointer', opacity: restoring === item.id ? 0.5 : 1 }}>
                            Ripristina
                          </button>
                          <button onClick={() => handleDeleteForever(item)} disabled={restoring === item.id}
                            style={{ border: `0.5px solid ${T.red}`, background: 'transparent', color: T.red, ...mono, fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '6px 14px', cursor: 'pointer', opacity: restoring === item.id ? 0.5 : 1 }}>
                            Elimina
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
