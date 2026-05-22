import { useEffect, useState } from 'react';
import { useStudio } from '../../hooks/useStudio';
import { useTheme } from '../../contexts/ThemeContext';
import { usePageTitleOnMount } from '../../hooks/usePageTitle';
import { supabase } from '../../lib/supabase';

const TABELLE = [
  { id:'projects',              label:'Progetti',     nome:'name'          },
  { id:'commesse',              label:'Commesse',     nome:'nome_commessa' },
  { id:'offerte',               label:'Offerte',      nome:'nome_offerta'  },
  { id:'proforma',              label:'Proforma',     nome:'numero_proforma'},
  { id:'suddivisione_pagamenti',label:'Rate',         nome:'numero_rata'   },
  { id:'costi_extra',           label:'Costi extra',  nome:'descrizione'   },
  { id:'lavorazioni_gantt',     label:'Lavorazioni',  nome:'descrizione'   },
];

export default function CestinoPage() {
  usePageTitleOnMount('Cestino');
  const { studioId } = useStudio();
  const { T } = useTheme();
  const [items, setItems]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [restoring, setRestoring] = useState(null);

  const mono = { fontFamily:"'IBM Plex Mono', monospace" };

  const loadAll = async () => {
    setLoading(true);
    const all = [];
    for (const t of TABELLE) {
      const q = supabase.from(t.id).select('id, '+t.nome+', deleted_at').not('deleted_at','is',null);
      if (t.id !== 'tasks') q.eq('studio', studioId);
      const { data } = await q.order('deleted_at', { ascending:false }).limit(50);
      (data??[]).forEach(r => all.push({ ...r, _tabella:t.id, _label:t.label, _nome:r[t.nome]||'—' }));
    }
    all.sort((a,b) => new Date(b.deleted_at)-new Date(a.deleted_at));
    setItems(all);
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

  return (
    <div style={{ maxWidth:680 }}>
      <div style={{ marginBottom:24 }}>
        <div style={{ fontSize:18, fontWeight:600, color:T.ink, letterSpacing:'-0.02em', marginBottom:4 }}>Cestino</div>
        <div style={{ ...mono, fontSize:10, color:T.muted }}>Elementi eliminati di recente — puoi ripristinarli entro 30 giorni</div>
      </div>

      {loading ? (
        <div style={{ ...mono, fontSize:11, color:T.muted }}>Caricamento...</div>
      ) : items.length === 0 ? (
        <div style={{ background:T.surface, border:`0.5px solid ${T.border}`, padding:'48px 0', textAlign:'center' }}>
          <div style={{ fontSize:32, marginBottom:12 }}>🗑</div>
          <div style={{ ...mono, fontSize:11, color:T.muted }}>Il cestino è vuoto</div>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {items.map(item => (
            <div key={item.id+'_'+item._tabella} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 16px', background:T.surface, border:`0.5px solid ${T.border}` }}>
              <div>
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:2 }}>
                  <span style={{ ...mono, fontSize:8, letterSpacing:'0.15em', textTransform:'uppercase', color:T.muted, background:T.surface2, padding:'2px 6px', border:`0.5px solid ${T.border}` }}>{item._label}</span>
                  <span style={{ fontSize:13, fontWeight:600, color:T.ink }}>{item._nome}</span>
                </div>
                <div style={{ ...mono, fontSize:9, color:T.muted }}>
                  Eliminato il {new Date(item.deleted_at).toLocaleDateString('it-IT',{day:'numeric',month:'long',year:'numeric'})}
                </div>
              </div>
              <div style={{ display:'flex', gap:8 }}>
                <button onClick={()=>handleRestore(item)} disabled={restoring===item.id} style={{ border:`0.5px solid ${T.green}`, background:'transparent', color:T.green, ...mono, fontSize:10, letterSpacing:'0.08em', textTransform:'uppercase', padding:'6px 14px', cursor:'pointer' }}>
                  Ripristina
                </button>
                <button onClick={()=>handleDeleteForever(item)} disabled={restoring===item.id} style={{ border:`0.5px solid ${T.red}`, background:'transparent', color:T.red, ...mono, fontSize:10, letterSpacing:'0.08em', textTransform:'uppercase', padding:'6px 14px', cursor:'pointer' }}>
                  Elimina
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
