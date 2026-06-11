import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';
import { useEscKey } from '../hooks/useEscKey';

function currency(v) {
  return new Intl.NumberFormat('it-IT',{style:'currency',currency:'EUR',maximumFractionDigits:2}).format(Number(v)||0);
}

export default function CommessePanel({ commesse = [] }) {
  const { T } = useTheme();
  const navigate = useNavigate();
  const [modalOpen, setModalOpen] = useState(false);
  useBodyScrollLock(modalOpen);
  useEscKey(() => setModalOpen(false), modalOpen);

  if (commesse.length === 0) return null;

  const totale    = commesse.reduce((s,c)=>s+Number(c.importo_offerta_base||0),0);
  const incassato = commesse.reduce((s,c)=>s+Number(c.importo_incassato||0),0);

  return (
    <>
      <button onClick={()=>setModalOpen(true)} style={{
        display:'flex', alignItems:'center', gap:8, height:34, padding:'0 14px',
        border:`0.5px solid ${T.borderMd}`, borderRadius: T.radiusSm, background:'transparent',
        cursor:'pointer', color:T.ink,
        fontFamily:"'IBM Plex Mono', monospace", fontSize:10,
        letterSpacing:'0.08em', textTransform:'uppercase',
      }}>
        € Commesse
        <span style={{ background:T.navy, color:T.bg, borderRadius:10, padding:'1px 7px', fontSize:9, fontWeight:600 }}>
          {commesse.length}
        </span>
      </button>

      {modalOpen && (
        <div style={{ position:'fixed', inset:0, zIndex:60, display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(0,0,0,0.5)', padding:16 }}>
          <div style={{ width:'100%', maxWidth:560, background:T.glassBg, backdropFilter:T.blur, WebkitBackdropFilter:T.blur, border:`1px solid ${T.glassBorder}`, borderRadius:T.radiusLg, padding:24, maxHeight:'85vh', overflowY:'auto' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:18 }}>
              <div>
                <div style={{ fontSize:16, fontWeight:600, color:T.ink }}>Commesse collegate</div>
                <div style={{ fontFamily:"'IBM Plex Mono', monospace", fontSize:10, color:T.muted, marginTop:2 }}>
                  {commesse.length} commesse · {currency(totale)} totale · {currency(incassato)} incassato
                </div>
              </div>
              <button onClick={()=>setModalOpen(false)} style={{ background:'none', border:'none', cursor:'pointer', color:T.muted, fontSize:20 }}>×</button>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {commesse.map(c => {
                const val  = Number(c.importo_offerta_base||0);
                const inc  = Number(c.importo_incassato||0);
                const perc = val > 0 ? (inc/val)*100 : 0;
                return (
                  <button key={c.id}
                    onClick={()=>{ setModalOpen(false); navigate(`/commesse/${c.id}`); }}
                    style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 16px', background:T.surface2, border:`0.5px solid ${T.border}`, cursor:'pointer', textAlign:'left', width:'100%' }}
                    onMouseEnter={e=>e.currentTarget.style.borderColor=T.navy}
                    onMouseLeave={e=>e.currentTarget.style.borderColor=T.border}
                  >
                    <div>
                      <div style={{ fontSize:13, fontWeight:600, color:T.ink }}>{c.nome_commessa}</div>
                      <div style={{ fontFamily:"'IBM Plex Mono', monospace", fontSize:9, color:T.muted, marginTop:2 }}>{c.cliente}</div>
                    </div>
                    <div style={{ textAlign:'right' }}>
                      <div style={{ fontFamily:"'IBM Plex Mono', monospace", fontSize:13, fontWeight:600, color:T.navy }}>{currency(val)}</div>
                      {perc > 0
                        ? <div style={{ fontFamily:"'IBM Plex Mono', monospace", fontSize:9, color:T.green, marginTop:2 }}>{perc.toFixed(0)}% incassato</div>
                        : <div style={{ fontFamily:"'IBM Plex Mono', monospace", fontSize:9, color:T.muted, marginTop:2 }}>non incassato</div>
                      }
                    </div>
                  </button>
                );
              })}
            </div>
            <div style={{ marginTop:16, paddingTop:14, borderTop:`0.5px solid ${T.border}`, display:'flex', justifyContent:'flex-end' }}>
              <button onClick={()=>setModalOpen(false)} style={{ border:`0.5px solid ${T.borderMd}`, borderRadius: T.radiusSm, background:'transparent', color:T.ink, fontFamily:"'IBM Plex Mono', monospace", fontSize:11, letterSpacing:'0.08em', textTransform:'uppercase', padding:'8px 18px', cursor:'pointer' }}>
                Chiudi
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
