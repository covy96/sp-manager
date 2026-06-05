import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { usePageTitleOnMount } from "../../hooks/usePageTitle";
import { useStudio } from "../../hooks/useStudio";
import { supabase } from "../../lib/supabase";
import { calcolaIncassato } from "../../lib/utils";
import { useTheme } from '../../contexts/ThemeContext';
import { useIsMobile } from "../../hooks/useIsMobile";

function currency(v) {
  return new Intl.NumberFormat("it-IT",{style:"currency",currency:"EUR",maximumFractionDigits:2}).format(Number(v)||0);
}

function CommessaArchiviataCard({ commessa, incassato, onClick }) {
  const { T } = useTheme();
  const isMobile = useIsMobile();
  const base = Number(commessa.importo_offerta_base)||0;
  const pagato = incassato||0;
  const residuo = base - pagato;
  const pct = base>0 ? Math.min(100,Math.round((pagato/base)*100)) : 0;
  const [hover, setHover] = useState(false);

  return (
    <div
      onMouseEnter={()=>setHover(true)} onMouseLeave={()=>setHover(false)}
      onClick={onClick}
      className="asm-card"
      style={{
        background: hover ? T.surface2 : T.surface,
        border:`1px solid ${T.border}`, padding:'18px 20px',
        cursor:'pointer', transition:'background 0.12s',
        display:'flex', flexDirection:'column', height:'100%',
        borderRadius:T.radius, backdropFilter:T.blurSm, WebkitBackdropFilter:T.blurSm, boxShadow:T.shadow,
        opacity: 0.85,
      }}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:10}}>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontFamily:"'IBM Plex Mono', monospace",fontSize:9,color:T.muted,letterSpacing:'0.2em',textTransform:'uppercase',marginBottom:4}}>
            {commessa.numero_offerta||"—"}
          </div>
          <div style={{fontSize:14,fontWeight:600,color:T.ink,letterSpacing:'-0.01em'}}>{commessa.nome_commessa||"Commessa senza nome"}</div>
          <div style={{fontFamily:"'IBM Plex Mono', monospace",fontSize:10,color:T.muted,marginTop:2}}>{commessa.cliente||"—"}</div>
        </div>
        <div style={{textAlign:'right',flexShrink:0,marginLeft:12}}>
          <div style={{fontSize:18,fontWeight:600,color:T.ink,letterSpacing:'-0.03em'}}>{currency(base)}</div>
          <div style={{fontFamily:"'IBM Plex Mono', monospace",fontSize:9,color:T.muted,marginTop:2}}>offerta base</div>
        </div>
      </div>
      <div style={{height:2,background:T.border,marginBottom:10}}>
        <div style={{height:2,background:T.muted,width:`${pct}%`,transition:'width 0.3s'}}/>
      </div>
      <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr 1fr':'1fr 1fr 1fr',gap:8,marginTop:'auto'}}>
        {[
          {label:'Pagato',  value:currency(pagato),  color:T.green},
          {label:'Residuo', value:currency(residuo), color:residuo>0?T.navy:T.muted},
          {label:'Data',    value:commessa.data_commessa?new Date(commessa.data_commessa).toLocaleDateString('it-IT'):'—', color:T.muted},
        ].map(({label,value,color})=>(
          <div key={label}>
            <div style={{fontFamily:"'IBM Plex Mono', monospace",fontSize:8,letterSpacing:'0.2em',textTransform:'uppercase',color:T.muted,marginBottom:2}}>{label}</div>
            <div style={{fontFamily:"'IBM Plex Mono', monospace",fontSize:11,fontWeight:500,color}}>{value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function CommesseArchiviatePage() {
  const { T } = useTheme();
  usePageTitleOnMount("Commesse Archiviate");
  const navigate = useNavigate();
  const { studioId } = useStudio();

  const [commesse, setCommesse]         = useState([]);
  const [incassatoMap, setIncassatoMap] = useState({});
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState("");
  const [searchQuery, setSearchQuery]   = useState("");

  useEffect(() => { if (studioId) loadData(); }, [studioId]);

  const loadData = async () => {
    setLoading(true); setError("");
    try {
      const { data, error: e } = await supabase
        .from("commesse").select("*")
        .eq("studio", studioId).eq("archived", true)
        .order("created_at", { ascending: false });
      if (e) throw e;
      setCommesse(data || []);
      const ids = (data||[]).map(c=>c.id);
      if (ids.length > 0) { const map = await calcolaIncassato(ids, studioId, supabase); setIncassatoMap(map); }
    } catch(e) { setError(e.message); }
    finally { setLoading(false); }
  };

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return commesse;
    return commesse.filter(c =>
      (c.nome_commessa||"").toLowerCase().includes(q) ||
      (c.cliente||"").toLowerCase().includes(q) ||
      (c.numero_offerta||"").toLowerCase().includes(q)
    );
  }, [commesse, searchQuery]);

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:200, fontFamily:"'IBM Plex Mono', monospace", fontSize:11, color:T.muted }}>Caricamento...</div>
  );

  return (
    <div>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:24, flexWrap:'wrap', gap:12 }}>
        <div>
          <div style={{ fontSize:22, fontWeight:600, letterSpacing:'-0.03em', color:T.ink }}>Commesse Archiviate</div>
          <div style={{ fontFamily:"'IBM Plex Mono', monospace", fontSize:10, color:T.muted, marginTop:2 }}>
            {filtered.length} commesse archiviate
          </div>
        </div>
        {commesse.length > 0 && (
          <input
            type="text"
            placeholder="Cerca commessa, cliente..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{ padding:'8px 12px', border:`1px solid ${T.borderMd}`, borderRadius:T.radiusSm, background:T.surface, color:T.ink, fontFamily:"'IBM Plex Mono', monospace", fontSize:11, outline:'none', width:220 }}
          />
        )}
      </div>

      {error && <div style={{ fontFamily:"'IBM Plex Mono', monospace", fontSize:11, color:T.red, marginBottom:14 }}>{error}</div>}

      {commesse.length === 0 ? (
        <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:T.radius, backdropFilter:T.blurSm, WebkitBackdropFilter:T.blurSm, boxShadow:T.shadow, padding:'48px 0', textAlign:'center' }}>
          <div style={{ fontFamily:"'IBM Plex Mono', monospace", fontSize:11, color:T.muted, marginBottom:16 }}>Nessuna commessa archiviata.</div>
          <button onClick={()=>navigate("/commesse")} style={{ background:T.navy, color:T.bg, border:'none', fontFamily:"'IBM Plex Mono', monospace", fontSize:11, letterSpacing:'0.08em', textTransform:'uppercase', padding:'8px 18px', cursor:'pointer' }}>
            Vai alle Commesse
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:T.radius, backdropFilter:T.blurSm, WebkitBackdropFilter:T.blurSm, boxShadow:T.shadow, padding:'32px 0', textAlign:'center', fontFamily:"'IBM Plex Mono', monospace", fontSize:11, color:T.muted }}>
          Nessun risultato per "{searchQuery}"
        </div>
      ) : (
        <div className="asm-list asm-fade-in" style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(320px, 1fr))', gap:10 }}>
          {filtered.map(c => (
            <CommessaArchiviataCard
              key={c.id}
              commessa={c}
              incassato={incassatoMap[c.id]||0}
              onClick={()=>navigate(`/impostazioni/commesse-archiviate/${c.id}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
