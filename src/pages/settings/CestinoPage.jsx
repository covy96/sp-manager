import { useEffect, useState } from 'react';
import { useStudio } from '../../hooks/useStudio';
import { useTheme } from '../../contexts/ThemeContext';
import { usePageTitleOnMount } from '../../hooks/usePageTitle';
import { supabase } from '../../lib/supabase';

const mkCtx = (commesse, projects) => {
  const p = projects?.name;
  const c = commesse?.nome_commessa;
  return [p, c].filter(Boolean).join(' · ') || null;
};

// Tabelle che usano query diretta
const TABELLE = [
  { id:'offerte',                label:'Offerte',     icon:'📄',
    select:'id, nome_offerta, deleted_at',
    getNome: r => r.nome_offerta || '—',
    getContext: () => null },
  { id:'proforma',               label:'Proforma',    icon:'🧾',
    select:'id, numero_proforma, deleted_at, commesse(nome_commessa, projects!project_id(name))',
    getNome: r => r.numero_proforma || '—',
    getContext: r => mkCtx(r.commesse, r.commesse?.projects) },
  { id:'suddivisione_pagamenti', label:'Rate',        icon:'💳',
    select:'id, numero_rata, deleted_at, commesse(nome_commessa, projects!project_id(name))',
    getNome: r => r.numero_rata != null ? `Rata ${r.numero_rata}` : '—',
    getContext: r => mkCtx(r.commesse, r.commesse?.projects) },
  { id:'costi_extra',            label:'Costi extra', icon:'💰',
    select:'id, description, deleted_at, commesse(nome_commessa, projects!project_id(name))',
    getNome: r => r.description || '—',
    getContext: r => mkCtx(r.commesse, r.commesse?.projects) },
  { id:'lavorazioni_gantt',      label:'Gantt',       icon:'📊',
    select:'id, descrizione, deleted_at, projects(name)',
    getNome: r => r.descrizione || '—',
    getContext: r => r.projects?.name || null },
  { id:'tasks',                  label:'Task',        icon:'✅',
    select:'id, title, deleted_at, projects(name)',
    getNome: r => r.title || '—',
    getContext: r => r.projects?.name || null },
];

export default function CestinoPage() {
  usePageTitleOnMount('Cestino');
  const { studioId } = useStudio();
  const { T } = useTheme();
  const [byCategory, setByCategory] = useState({});
  const [loading, setLoading]        = useState(true);
  const [restoring, setRestoring]    = useState(null);
  const [collapsed, setCollapsed]    = useState({});

  const mono = { fontFamily:"'IBM Plex Mono', monospace" };

  const loadAll = async () => {
    setLoading(true);
    const result = {};

    // Progetti (RPC per bypassare RLS su deleted_at)
    const { data: projData, error: projErr } = await supabase.rpc('cestino_projects', { p_studio_id: studioId });
    if (projErr) console.error('Cestino projects:', projErr.message);
    const projRows = (projData ?? []).map(r => ({ ...r, _tabella:'projects', _label:'Progetti', _icon:'📁', _nome:r.name||'—', _context:null }));
    if (projRows.length > 0) result['projects'] = { meta:{ id:'projects', label:'Progetti', icon:'📁' }, items: projRows };

    // Commesse (RPC per bypassare RLS su deleted_at + join ambiguo)
    const { data: commData, error: commErr } = await supabase.rpc('cestino_commesse', { p_studio_id: studioId });
    if (commErr) console.error('Cestino commesse:', commErr.message);
    const commRows = (commData ?? []).map(r => ({ ...r, _tabella:'commesse', _label:'Commesse', _icon:'📋', _nome:r.nome_commessa||'—', _context:r.project_name||null }));
    if (commRows.length > 0) result['commesse'] = { meta:{ id:'commesse', label:'Commesse', icon:'📋' }, items: commRows };

    // Tutte le altre tabelle via query diretta
    for (const t of TABELLE) {
      let q = supabase.from(t.id).select(t.select).not('deleted_at','is',null);
      if (t.id !== 'tasks') q = q.eq('studio', studioId);
      const { data, error } = await q.order('deleted_at', { ascending:false }).limit(50);
      if (error) console.error(`Cestino ${t.id}:`, error.message);
      const rows = (data ?? []).map(r => ({ ...r, _tabella:t.id, _label:t.label, _icon:t.icon, _nome:t.getNome(r), _context:t.getContext(r) }));
      if (rows.length > 0) result[t.id] = { meta: t, items: rows };
    }
    setByCategory(result);
    setLoading(false);
  };

  useEffect(()=>{ if(studioId) loadAll(); },[studioId]);

  const handleRestore = async (item) => {
    setRestoring(item.id);
    await supabase.from(item._tabella).update({ deleted_at: null }).eq('id', item.id);
    setRestoring(null);
    await loadAll();
  };

  const handleDeleteForever = async (item) => {
    if (!confirm(`Eliminare definitivamente "${item._nome}"? Questa azione è irreversibile.`)) return;
    setRestoring(item.id);
    await supabase.from(item._tabella).delete().eq('id', item.id);
    setRestoring(null);
    await loadAll();
  };

  const toggleCollapse = (id) => setCollapsed(p => ({ ...p, [id]: !p[id] }));

  const totalItems = Object.values(byCategory).reduce((s, c) => s + c.items.length, 0);

  return (
    <div style={{ maxWidth:700 }}>
      <div style={{ marginBottom:24 }}>
        <div style={{ fontSize:18, fontWeight:600, color:T.ink, letterSpacing:'-0.02em', marginBottom:4 }}>Cestino</div>
        <div style={{ ...mono, fontSize:10, color:T.muted }}>Elementi eliminati di recente — puoi ripristinarli entro 30 giorni</div>
      </div>

      {loading ? (
        <div style={{ ...mono, fontSize:11, color:T.muted }}>Caricamento...</div>
      ) : totalItems === 0 ? (
        <div style={{ background:T.surface, border:`0.5px solid ${T.border}`, padding:'48px 0', textAlign:'center' }}>
          <div style={{ fontSize:32, marginBottom:12 }}>🗑</div>
          <div style={{ ...mono, fontSize:11, color:T.muted }}>Il cestino è vuoto</div>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          {['projects','commesse',...TABELLE.map(t=>t.id)].filter((id,i,a)=>a.indexOf(id)===i&&byCategory[id]).map(id => {
            const cat = byCategory[id];
            const t = cat.meta;
            const isOpen = !collapsed[id];
            return (
              <div key={id} style={{ border:`0.5px solid ${T.border}`, background:T.surface, overflow:'hidden' }}>

                {/* Header categoria */}
                <button
                  onClick={() => toggleCollapse(id)}
                  style={{ width:'100%', display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 16px', background:T.bg, border:'none', cursor:'pointer', borderBottom: isOpen ? `0.5px solid ${T.border}` : 'none' }}
                >
                  <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                    <span style={{ fontSize:16 }}>{t.icon}</span>
                    <span style={{ fontSize:13, fontWeight:600, color:T.ink }}>{t.label}</span>
                    <span style={{ ...mono, fontSize:9, color:T.muted, background:T.surface2, border:`0.5px solid ${T.border}`, padding:'2px 7px' }}>
                      {cat.items.length}
                    </span>
                  </div>
                  <span style={{ ...mono, fontSize:11, color:T.muted }}>{isOpen ? '▲' : '▼'}</span>
                </button>

                {/* Righe elementi */}
                {isOpen && (
                  <div>
                    {cat.items.map((item, idx) => (
                      <div key={item.id} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 16px', borderTop: idx > 0 ? `0.5px solid ${T.border}` : 'none', background: idx % 2 === 0 ? T.surface : T.surface2 }}>
                        <div>
                          <div style={{ fontSize:13, fontWeight:600, color:T.ink, marginBottom:2 }}>{item._nome}</div>
                          {item._context && (
                            <div style={{ ...mono, fontSize:9, color:T.ink60, marginBottom:2, letterSpacing:'0.04em' }}>{item._context}</div>
                          )}
                          <div style={{ ...mono, fontSize:9, color:T.muted }}>
                            Eliminato il {new Date(item.deleted_at).toLocaleDateString('it-IT',{day:'numeric',month:'long',year:'numeric'})}
                          </div>
                        </div>
                        <div style={{ display:'flex', gap:8, flexShrink:0 }}>
                          <button onClick={()=>handleRestore(item)} disabled={restoring===item.id}
                            style={{ border:`0.5px solid ${T.green}`, background:'transparent', color:T.green, ...mono, fontSize:10, letterSpacing:'0.08em', textTransform:'uppercase', padding:'6px 14px', cursor:'pointer', opacity: restoring===item.id ? 0.5 : 1 }}>
                            Ripristina
                          </button>
                          <button onClick={()=>handleDeleteForever(item)} disabled={restoring===item.id}
                            style={{ border:`0.5px solid ${T.red}`, background:'transparent', color:T.red, ...mono, fontSize:10, letterSpacing:'0.08em', textTransform:'uppercase', padding:'6px 14px', cursor:'pointer', opacity: restoring===item.id ? 0.5 : 1 }}>
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
