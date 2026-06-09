import React, { useState, useEffect, useRef } from 'react';
import AsmSeal from '../components/AsmSeal';

const C = {
  ink:   '#0E0E0D',
  navy:  '#13315C',
  brass: '#D9C98A',
  paper: '#EEF1F6',
  muted: '#8a847b',
  white: '#ffffff',
};

const mono = { fontFamily: "'IBM Plex Mono', monospace" };
const eyebrow = { ...mono, fontSize: 10, letterSpacing: '0.3em', textTransform: 'uppercase' };

/* ─── MOCK UI COMPONENTS ─────────────────────────────────────────── */

function MockChip({ label, color = '#13315C' }) {
  return (
    <span style={{ display:'inline-block', padding:'2px 8px', background:`${color}18`, color, ...mono, fontSize:8, letterSpacing:'0.1em', textTransform:'uppercase', borderRadius:2 }}>
      {label}
    </span>
  );
}

/* Gantt mock */
function MockGantt() {
  const bars = [
    { label:'Concept',             w:28, x:0,  color:'#13315C' },
    { label:'Progetto definitivo', w:40, x:10, color:'#1a5276' },
    { label:'Pratica edilizia',    w:20, x:38, color:'#7c3aed' },
    { label:'Cantiere',            w:35, x:52, color:'#b45309' },
    { label:'Collaudo',            w:12, x:82, color:'#1a6b3c' },
  ];
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:0 }}>
      <div style={{ display:'flex', gap:0, paddingBottom:6, borderBottom:'0.5px solid rgba(14,14,13,0.08)', marginBottom:6 }}>
        <div style={{ width:110, flexShrink:0, ...mono, fontSize:7, letterSpacing:'0.15em', textTransform:'uppercase', color:'#8a847b' }}>Fase</div>
        <div style={{ flex:1, ...mono, fontSize:7, color:'#8a847b', display:'flex', justifyContent:'space-between' }}>
          {['Gen','Feb','Mar','Apr','Mag','Giu','Lug','Ago','Set','Ott'].map(m=><span key={m}>{m}</span>)}
        </div>
      </div>
      {bars.map(b=>(
        <div key={b.label} style={{ display:'flex', alignItems:'center', gap:0, marginBottom:4 }}>
          <div style={{ width:110, flexShrink:0, fontSize:9, color:'#0E0E0D', fontWeight:500, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{b.label}</div>
          <div style={{ flex:1, height:16, position:'relative' }}>
            <div style={{ position:'absolute', left:`${b.x}%`, width:`${b.w}%`, height:'100%', background:b.color, borderRadius:2, display:'flex', alignItems:'center', paddingLeft:5 }}>
              <span style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:7, color:'rgba(255,255,255,0.9)', fontWeight:600, whiteSpace:'nowrap', overflow:'hidden' }}>{b.label}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* Timesheet mock */
function MockTimesheet() {
  const rows = [
    { user:'GC', name:'G. Coviello', days:[8,8,0,7,8], color:'#13315C' },
    { user:'MR', name:'M. Rossi',    days:[6,8,8,0,7], color:'#1a6b3c' },
    { user:'LB', name:'L. Bianchi',  days:[0,4,8,8,6], color:'#7c3aed' },
  ];
  const days = ['Lun','Mar','Mer','Gio','Ven'];
  return (
    <div>
      <div style={{ display:'flex', gap:0, marginBottom:4 }}>
        <div style={{ width:90, flexShrink:0 }}/>
        {days.map(d=><div key={d} style={{ flex:1, textAlign:'center', fontFamily:"'IBM Plex Mono',monospace", fontSize:7, color:'#8a847b', letterSpacing:'0.1em' }}>{d}</div>)}
        <div style={{ width:28, fontFamily:"'IBM Plex Mono',monospace", fontSize:7, color:'#8a847b', textAlign:'right' }}>Tot</div>
      </div>
      {rows.map(r=>(
        <div key={r.user} style={{ display:'flex', alignItems:'center', gap:0, marginBottom:5, paddingBottom:5, borderBottom:'0.5px solid rgba(14,14,13,0.06)' }}>
          <div style={{ width:90, flexShrink:0, display:'flex', alignItems:'center', gap:6 }}>
            <div style={{ width:20, height:20, borderRadius:'50%', background:r.color, display:'flex', alignItems:'center', justifyContent:'center', fontSize:7, fontWeight:700, color:'#fff', flexShrink:0 }}>{r.user}</div>
            <span style={{ fontSize:9, fontWeight:500, color:'#0E0E0D' }}>{r.name}</span>
          </div>
          {r.days.map((h,i)=>(
            <div key={i} style={{ flex:1, textAlign:'center' }}>
              {h > 0
                ? <span style={{ display:'inline-block', width:22, height:16, background:`${r.color}22`, borderRadius:2, fontFamily:"'IBM Plex Mono',monospace", fontSize:8, color:r.color, fontWeight:600, lineHeight:'16px', textAlign:'center' }}>{h}h</span>
                : <span style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:8, color:'rgba(14,14,13,0.2)' }}>—</span>
              }
            </div>
          ))}
          <div style={{ width:28, textAlign:'right', fontFamily:"'IBM Plex Mono',monospace", fontSize:9, fontWeight:700, color:'#13315C' }}>{r.days.reduce((s,v)=>s+v,0)}h</div>
        </div>
      ))}
    </div>
  );
}

/* Dashboard mock */
function MockDashboard() {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', paddingBottom:8, borderBottom:'0.5px solid rgba(14,14,13,0.08)' }}>
        <div>
          <div style={{ fontSize:13, fontWeight:700, color:'#0E0E0D' }}>Studio Prini</div>
          <div style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:8, color:'#8a847b' }}>Scrivania</div>
        </div>
        <div style={{ display:'flex', gap:4 }}>
          {[['SP','#13315C'],['MR','#1a6b3c'],['GF','#7c3aed']].map(([i,bg],idx)=>(
            <div key={idx} style={{ width:22, height:22, borderRadius:'50%', background:bg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:7, fontWeight:700, color:'#fff' }}>{i}</div>
          ))}
        </div>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:6 }}>
        {[['Progetti attivi','12','#13315C'],['Ore mese','248h','#1a6b3c'],['Da incassare','€43.200','#b45309']].map(([l,v,c])=>(
          <div key={l} style={{ background:'#EEF1F6', padding:'8px 10px', borderRadius:4 }}>
            <div style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:7, color:'#8a847b', marginBottom:3 }}>{l}</div>
            <div style={{ fontSize:13, fontWeight:700, color:c }}>{v}</div>
          </div>
        ))}
      </div>
      <div style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:7, letterSpacing:'0.2em', textTransform:'uppercase', color:'#8a847b', marginBottom:2 }}>Task in scadenza</div>
      {[
        { t:'Consegna tavole esecutive',   p:'Uffici IF Group',      s:'Oggi',   sc:'#b91c1c' },
        { t:'Verifica progetto strutturale', p:'Casa Vacanze Cortina', s:'Domani', sc:'#13315C' },
        { t:'Sopralluogo cantiere',         p:'Showroom Milano',      s:'15 giu', sc:'#8a847b' },
      ].map((r,i)=>(
        <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'7px 0', borderBottom:'0.5px solid rgba(14,14,13,0.06)' }}>
          <div>
            <div style={{ fontSize:10, fontWeight:600, color:'#0E0E0D' }}>{r.t}</div>
            <div style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:8, color:'#8a847b' }}>{r.p}</div>
          </div>
          <div style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:8, color:r.sc, flexShrink:0, marginLeft:8 }}>{r.s}</div>
        </div>
      ))}
    </div>
  );
}

/* Commessa mock */
function MockCommessa() {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
        <div>
          <div style={{ fontSize:12, fontWeight:700, color:'#0E0E0D' }}>Uffici IF Group</div>
          <div style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:8, color:'#8a847b' }}>Commessa #2026-04</div>
        </div>
        <MockChip label="In corso" color="#13315C"/>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:6 }}>
        {[['Contratto','€45.000','#0E0E0D'],['Incassato','€18.000','#1a6b3c'],['Residuo','€27.000','#b45309']].map(([l,v,c])=>(
          <div key={l} style={{ background:'#EEF1F6', padding:'8px 10px', borderRadius:4 }}>
            <div style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:7, color:'#8a847b', marginBottom:3 }}>{l}</div>
            <div style={{ fontSize:12, fontWeight:700, color:c }}>{v}</div>
          </div>
        ))}
      </div>
      {[['Rata 1','40%','€18.000','✓ Pagata','#1a6b3c'],['Rata 2','35%','€15.750','In attesa','#8a847b'],['Rata 3','25%','€11.250','In attesa','#8a847b']].map(([r,p,v,s,sc])=>(
        <div key={r} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'7px 10px', background:'#EEF1F6', borderRadius:4 }}>
          <div style={{ fontSize:10, fontWeight:600, color:'#0E0E0D' }}>{r}</div>
          <div style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:8, color:'#8a847b' }}>{p}</div>
          <div style={{ fontSize:11, fontWeight:700, color:'#13315C' }}>{v}</div>
          <div style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:8, color:sc }}>{s}</div>
        </div>
      ))}
    </div>
  );
}

/* Monitoraggio mock */
function MockMonitoraggio() {
  const items = [
    { name:'Casa Vacanze Cortina', client:'Famiglia Bianchi', valore:32000, incassato:14000 },
    { name:'Uffici IF Group',      client:'IF Group Srl',     valore:45000, incassato:18000 },
    { name:'Showroom Milano',      client:'Arredo Italia Srl',valore:28500, incassato:28500 },
    { name:'Residenza Lago Como',  client:'Studio Ferretti',  valore:19000, incassato:0 },
  ];
  const totV = items.reduce((s,i)=>s+i.valore,0);
  const totI = items.reduce((s,i)=>s+i.incassato,0);
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:6 }}>
        {[['Contratti',`€${(totV/1000).toFixed(0)}k`,'#0E0E0D'],['Incassato',`€${(totI/1000).toFixed(0)}k`,'#1a6b3c'],['Da incassare',`€${((totV-totI)/1000).toFixed(0)}k`,'#b45309']].map(([l,v,c])=>(
          <div key={l} style={{ background:'#EEF1F6', padding:'8px 10px', borderRadius:4 }}>
            <div style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:7, color:'#8a847b', marginBottom:3 }}>{l}</div>
            <div style={{ fontSize:13, fontWeight:700, color:c }}>{v}</div>
          </div>
        ))}
      </div>
      {items.map(item=>{
        const pct = Math.round((item.incassato/item.valore)*100);
        return (
          <div key={item.name} style={{ padding:'7px 0', borderBottom:'0.5px solid rgba(14,14,13,0.07)' }}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
              <div>
                <div style={{ fontSize:10, fontWeight:600, color:'#0E0E0D' }}>{item.name}</div>
                <div style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:8, color:'#8a847b' }}>{item.client}</div>
              </div>
              <div style={{ textAlign:'right' }}>
                <div style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:9, fontWeight:700, color:'#13315C' }}>€{(item.valore/1000).toFixed(0)}k</div>
                <div style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:8, color: item.incassato===item.valore ? '#1a6b3c' : '#b45309' }}>
                  {item.incassato===item.valore ? '✓ Saldato' : `res. €${((item.valore-item.incassato)/1000).toFixed(0)}k`}
                </div>
              </div>
            </div>
            <div style={{ height:3, background:'rgba(14,14,13,0.08)', borderRadius:2 }}>
              <div style={{ height:3, width:`${pct}%`, background: pct===100 ? '#1a6b3c' : '#13315C', borderRadius:2 }}/>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ─── PLAN DATA ──────────────────────────────────────────────────── */
const PLANS = [
  {
    id:'free', name:'Free', price:'€0', period:'/mese',
    desc:'Per iniziare', highlight:false, cta:'Inizia gratis',
    features:['1 utente interno','1 collaboratore esterno','5 progetti','5 commesse','Task e timesheet','Calendario'],
  },
  {
    id:'studio', name:'Studio', price:'€14,99', period:'/mese',
    desc:'Per studi in crescita', highlight:true, cta:'Prova Studio',
    features:['Fino a 10 utenti','25 progetti','25 commesse','Report avanzati','Proforma e fatture','Gantt','Supporto prioritario'],
  },
  {
    id:'pro', name:'Pro', price:'€29,99', period:'/mese',
    desc:'Per studi professionali', highlight:false, cta:'Prova Pro',
    features:['Utenti illimitati','Progetti illimitati','Commesse illimitate','Tutto di Studio','Gantt avanzato','Backup su richiesta','Account manager'],
  },
];

/* ─── FEATURES ───────────────────────────────────────────────────── */
const FEATURES = [
  {
    n:'01', label:'Gantt interattivo',
    desc:'Pianifica le fasi di ogni progetto su una timeline drag & drop. Esporta come immagine in un click.',
    mock: <MockGantt/>,
  },
  {
    n:'02', label:'Commesse e incassi',
    desc:'Crea offerte, dividi in rate, emetti proforma. Tieni traccia di ogni euro in entrata.',
    mock: <MockCommessa/>,
  },
  {
    n:'03', label:'Timesheet del team',
    desc:'Ogni membro registra le ore per progetto. I report mostrano chi ha fatto cosa, quando.',
    mock: <MockTimesheet/>,
  },
  {
    n:'04', label:'Monitoraggio commesse',
    desc:'Vista aggregata di tutti i contratti: incassato, residuo, scadenze. Zero fogli Excel.',
    mock: <MockMonitoraggio/>,
  },
];

/* ─── MAIN COMPONENT ─────────────────────────────────────────────── */
export default function LandingPage({ onLogin, onRegister, onJoin }) {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const containerRef            = useRef(null);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onScroll = () => setScrolled(el.scrollTop > 60);
    el.addEventListener('scroll', onScroll, { passive:true });
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  const scrollToId = (id) => {
    setMenuOpen(false);
    containerRef.current?.querySelector(`#${id}`)
      ? containerRef.current.querySelector(`#${id}`).scrollIntoView({ behavior:'smooth' })
      : document.getElementById(id)?.scrollIntoView({ behavior:'smooth' });
  };

  const maxW = 1100;

  return (
    <div style={{ position:'fixed', inset:0, overflow:'hidden', fontFamily:"'Space Grotesk', sans-serif", background:'#fff' }}>

      {/* ── NAV ── */}
      <nav style={{
        position:'fixed', top:0, left:0, right:0, zIndex:200,
        display:'flex', alignItems:'center', justifyContent:'space-between',
        padding: isMobile ? '0 16px' : '0 40px', height:52,
        background: scrolled ? 'rgba(255,255,255,0.95)' : 'transparent',
        backdropFilter: scrolled ? 'blur(12px)' : 'none',
        borderBottom: scrolled ? '0.5px solid rgba(14,14,13,0.08)' : 'none',
        transition:'all 0.25s',
      }}>
        <AsmSeal size="sm" showBorder={false} showBottom={false} theme={scrolled ? 'light' : 'dark'}/>

        {isMobile ? (
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <button onClick={onLogin} style={{ background:'transparent', border:`1px solid ${scrolled?'rgba(14,14,13,0.25)':'rgba(238,241,246,0.45)'}`, color:scrolled?'#0E0E0D':'#EEF1F6', padding:'7px 14px', fontFamily:"'IBM Plex Mono',monospace", fontSize:10, letterSpacing:'0.08em', textTransform:'uppercase', cursor:'pointer' }}>
              Accedi
            </button>
            <button onClick={onRegister} style={{ background:'#D9C98A', border:'none', color:'#0E0E0D', padding:'7px 14px', fontFamily:"'IBM Plex Mono',monospace", fontSize:10, letterSpacing:'0.08em', textTransform:'uppercase', cursor:'pointer', fontWeight:700 }}>
              Registrati
            </button>
            <button onClick={()=>setMenuOpen(!menuOpen)} style={{ background:'none', border:'none', cursor:'pointer', display:'flex', flexDirection:'column', gap:4, padding:4 }}>
              {[0,1,2].map(i=><div key={i} style={{ width:20, height:1.5, background:scrolled?'#0E0E0D':'#EEF1F6', borderRadius:1 }}/>)}
            </button>
          </div>
        ) : (
          <>
            <div style={{ display:'flex', gap:24 }}>
              {[['Funzionalità','features'],['Pricing','pricing']].map(([l,id])=>(
                <button key={l} onClick={()=>scrollToId(id)} style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:11, letterSpacing:'0.08em', textTransform:'uppercase', background:'none', border:'none', cursor:'pointer', color: scrolled ? '#8a847b' : 'rgba(238,241,246,0.7)' }}>
                  {l}
                </button>
              ))}
            </div>
            <div style={{ display:'flex', gap:8 }}>
              <button onClick={onLogin} style={{ border:`0.5px solid ${scrolled?'rgba(14,14,13,0.25)':'rgba(238,241,246,0.4)'}`, background:'transparent', color:scrolled?'#0E0E0D':'#EEF1F6', padding:'7px 18px', fontFamily:"'IBM Plex Mono',monospace", fontSize:11, letterSpacing:'0.08em', textTransform:'uppercase', cursor:'pointer' }}>
                Accedi
              </button>
              <button onClick={onRegister} style={{ border:'none', background:'#D9C98A', color:'#0E0E0D', padding:'7px 22px', fontFamily:"'IBM Plex Mono',monospace", fontSize:11, letterSpacing:'0.08em', textTransform:'uppercase', cursor:'pointer', fontWeight:700 }}>
                Crea Studio →
              </button>
            </div>
          </>
        )}
      </nav>

      {/* Mobile menu */}
      {isMobile && menuOpen && (
        <div style={{ position:'fixed', inset:0, zIndex:190, background:'rgba(255,255,255,0.98)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:28 }}>
          {[['Funzionalità','features'],['Pricing','pricing']].map(([l,id])=>(
            <button key={l} onClick={()=>scrollToId(id)} style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:14, letterSpacing:'0.15em', textTransform:'uppercase', background:'none', border:'none', cursor:'pointer', color:'#0E0E0D' }}>{l}</button>
          ))}
          <div style={{ width:40, height:'0.5px', background:'rgba(14,14,13,0.12)' }}/>
          <button onClick={()=>{setMenuOpen(false);onLogin();}} style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:13, letterSpacing:'0.1em', textTransform:'uppercase', background:'none', border:'0.5px solid #0E0E0D', color:'#0E0E0D', padding:'10px 28px', cursor:'pointer' }}>Accedi</button>
          <button onClick={()=>{setMenuOpen(false);onJoin();}} style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:12, letterSpacing:'0.08em', textTransform:'uppercase', background:'none', border:'none', color:'#8a847b', cursor:'pointer', textDecoration:'underline', textUnderlineOffset:3 }}>Hai un codice invito?</button>
          <button onClick={()=>setMenuOpen(false)} style={{ position:'absolute', top:16, right:20, background:'none', border:'none', fontSize:24, cursor:'pointer', color:'#8a847b' }}>×</button>
        </div>
      )}

      {/* ── SCROLL CONTAINER ── */}
      <div ref={containerRef} style={{ height:'100vh', overflowY:'auto', overflowX:'hidden' }}>

        {/* ── HERO ── */}
        <section style={{
          minHeight:'100vh', background:'#0E0E0D',
          display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
          position:'relative', overflow:'hidden',
          padding: isMobile ? '80px 20px 60px' : '0 40px',
        }}>
          <div style={{ position:'absolute', inset:0, background:'radial-gradient(ellipse at 55% 35%, #13315C 0%, #0E0E0D 68%)', opacity:0.95 }}/>
          <div style={{ position:'absolute', inset:0, backgroundImage:'linear-gradient(rgba(238,241,246,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(238,241,246,0.025) 1px, transparent 1px)', backgroundSize:'48px 48px' }}/>

          <div style={{ position:'relative', zIndex:2, textAlign:'center', maxWidth:820, width:'100%' }}>
            <div style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:10, letterSpacing:'0.3em', textTransform:'uppercase', color:'rgba(217,201,138,0.6)', marginBottom: isMobile?14:22 }}>
              Gestionale per studi di architettura
            </div>
            <h1 style={{ fontSize: isMobile?38:76, fontWeight:600, lineHeight:1.02, letterSpacing:'-0.045em', color:'#EEF1F6', marginBottom: isMobile?16:22 }}>
              Tutto il tuo studio.<br/>
              <span style={{ color:'#D9C98A' }}>Un solo posto.</span>
            </h1>
            <p style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize: isMobile?12:13, lineHeight:1.9, color:'rgba(238,241,246,0.45)', marginBottom: isMobile?32:44, maxWidth:440, margin:`0 auto ${isMobile?32:44}px` }}>
              Progetti, Gantt, commesse, timesheet e fatturazione.<br/>
              Fatto per architetti — non per contabili.
            </p>
            <div style={{ display:'flex', flexDirection:isMobile?'column':'row', gap:10, justifyContent:'center', alignItems:'center' }}>
              <button onClick={onRegister} style={{ background:'#D9C98A', border:'none', color:'#0E0E0D', padding:isMobile?'13px 28px':'15px 42px', fontFamily:"'IBM Plex Mono',monospace", fontSize:isMobile?11:12, letterSpacing:'0.12em', textTransform:'uppercase', cursor:'pointer', fontWeight:700, width:isMobile?'100%':'auto' }}>
                Crea il tuo studio →
              </button>
              <button onClick={onLogin} style={{ background:'transparent', border:'0.5px solid rgba(238,241,246,0.25)', color:'rgba(238,241,246,0.7)', padding:isMobile?'13px 28px':'15px 36px', fontFamily:"'IBM Plex Mono',monospace", fontSize:isMobile?11:12, letterSpacing:'0.1em', textTransform:'uppercase', cursor:'pointer', width:isMobile?'100%':'auto' }}>
                Accedi
              </button>
            </div>
            <div style={{ marginTop:14 }}>
              <button onClick={onJoin} style={{ background:'none', border:'none', color:'rgba(238,241,246,0.3)', fontFamily:"'IBM Plex Mono',monospace", fontSize:10, letterSpacing:'0.08em', textTransform:'uppercase', cursor:'pointer', textDecoration:'underline', textUnderlineOffset:3 }}>
                Hai un codice invito? Entra in uno studio
              </button>
            </div>
          </div>

          {/* Dashboard preview */}
          {!isMobile && (
            <div style={{ position:'relative', zIndex:2, marginTop:56, width:'100%', maxWidth:maxW, display:'flex', justifyContent:'center' }}>
              <div style={{ width:'100%', maxWidth:720, background:'rgba(255,255,255,0.97)', borderRadius:'12px 12px 0 0', overflow:'hidden', boxShadow:'0 -4px 60px rgba(0,0,0,0.5), 0 0 0 0.5px rgba(255,255,255,0.1)' }}>
                <div style={{ height:36, background:'#e8eaed', display:'flex', alignItems:'center', padding:'0 14px', gap:6, borderBottom:'0.5px solid rgba(0,0,0,0.08)' }}>
                  {['#ff5f57','#febc2e','#28c840'].map((c,i)=>(
                    <div key={i} style={{ width:10, height:10, borderRadius:'50%', background:c }}/>
                  ))}
                  <div style={{ flex:1, marginLeft:10, height:18, background:'rgba(0,0,0,0.06)', borderRadius:4, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:"'IBM Plex Mono',monospace", fontSize:9, color:'rgba(0,0,0,0.3)' }}>
                    app.asm.studio
                  </div>
                </div>
                <div style={{ display:'flex', height:320 }}>
                  <div style={{ width:48, background:'#0E0E0D', display:'flex', flexDirection:'column', alignItems:'center', paddingTop:14, gap:10 }}>
                    {['🏠','📁','⏱','📅','📊','💶','⚙️'].map((ic,i)=>(
                      <div key={i} style={{ width:32, height:32, borderRadius:6, background:i===0?'rgba(255,255,255,0.12)':'transparent', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13 }}>{ic}</div>
                    ))}
                  </div>
                  <div style={{ flex:1, padding:20, overflowY:'auto' }}>
                    <MockDashboard/>
                  </div>
                </div>
              </div>
            </div>
          )}

          {!isMobile && (
            <div style={{ position:'absolute', bottom:28, left:'50%', transform:'translateX(-50%)', fontFamily:"'IBM Plex Mono',monospace", fontSize:9, letterSpacing:'0.2em', textTransform:'uppercase', color:'rgba(238,241,246,0.2)', display:'flex', flexDirection:'column', alignItems:'center', gap:8 }}>
              <div style={{ width:1, height:28, background:'rgba(238,241,246,0.12)' }}/>
              <span>Scorri</span>
            </div>
          )}
        </section>

        {/* ── FEATURES ── */}
        <section id="features" style={{ background:'#EEF1F6', padding: isMobile ? '64px 20px' : '80px 40px' }}>
          <div style={{ maxWidth:maxW, margin:'0 auto' }}>
            <div style={{ marginBottom: isMobile?40:56, maxWidth:560 }}>
              <div style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:10, letterSpacing:'0.3em', textTransform:'uppercase', color:'#13315C', marginBottom:14 }}>Funzionalità</div>
              <h2 style={{ fontSize: isMobile?28:44, fontWeight:600, letterSpacing:'-0.035em', color:'#0E0E0D', lineHeight:1.1, marginBottom:14 }}>
                Ogni cosa che serve<br/>a uno studio moderno.
              </h2>
              <p style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:12, lineHeight:1.9, color:'#8a847b', maxWidth:420, margin:0 }}>
                Dalla pianificazione al pagamento. ASM copre l'intero ciclo di vita di un progetto.
              </p>
            </div>

            <div style={{ display:'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: isMobile?20:24 }}>
              {FEATURES.map((f,i)=>(
                <div key={i} style={{ background:'#fff', border:'0.5px solid rgba(14,14,13,0.1)', borderRadius:10, overflow:'hidden', boxShadow:'0 2px 20px rgba(0,0,0,0.05)' }}>
                  <div style={{ padding:isMobile?'20px 20px 0':'24px 24px 0' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8 }}>
                      <span style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:9, color:'#8a847b' }}>{f.n}</span>
                      <h3 style={{ fontSize:15, fontWeight:700, color:'#0E0E0D', letterSpacing:'-0.02em', margin:0 }}>{f.label}</h3>
                    </div>
                    <p style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:11, lineHeight:1.8, color:'#8a847b', marginBottom:20 }}>{f.desc}</p>
                  </div>
                  <div style={{ margin:'0 20px 20px', padding:'14px 16px', background:'#EEF1F6', borderRadius:6, border:'0.5px solid rgba(14,14,13,0.06)' }}>
                    {f.mock}
                  </div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: isMobile?32:40, display:'flex', flexWrap:'wrap', gap:10 }}>
              {['Scrivania personale','Task e subtask','Kanban per servizio','Pratica edilizia','Report Excel/CSV','Calendario del team','7 ruoli e permessi','App mobile (PWA)','Storico completo'].map(f=>(
                <div key={f} style={{ padding:'8px 16px', border:'0.5px solid rgba(14,14,13,0.12)', borderRadius:4, fontFamily:"'IBM Plex Mono',monospace", fontSize:10, color:'#0E0E0D', background:'#fff' }}>
                  {f}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── MIDDLE CALLOUT ── */}
        <section style={{ background:'#13315C', padding: isMobile ? '56px 20px' : '72px 40px' }}>
          <div style={{ maxWidth:maxW, margin:'0 auto', display:'flex', flexDirection: isMobile?'column':'row', alignItems:'center', gap:40 }}>
            <div style={{ flex:1 }}>
              <p style={{ fontSize: isMobile?22:34, fontWeight:600, letterSpacing:'-0.03em', color:'#EEF1F6', lineHeight:1.25, margin:0 }}>
                "Sai esattamente dove<br/>va il tuo tempo."
              </p>
            </div>
            <div style={{ flex:1 }}>
              <p style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:12, lineHeight:1.9, color:'rgba(238,241,246,0.5)', margin:'0 0 24px' }}>
                Ogni membro del team registra le ore per progetto, dal desktop o dallo smartphone. I report mostrano la distribuzione per progetto, cliente e persona — pronti per l'export.
              </p>
              <div style={{ display:'flex', gap:28 }}>
                {[['PWA','Su iPhone e Android'],['Export','Excel e CSV'],['Real-time','Aggiornamenti live']].map(([big,small])=>(
                  <div key={big}>
                    <div style={{ fontSize:13, fontWeight:700, color:'#EEF1F6', marginBottom:2 }}>{big}</div>
                    <div style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:9, color:'rgba(238,241,246,0.35)', letterSpacing:'0.1em', textTransform:'uppercase' }}>{small}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── PRICING ── */}
        <section id="pricing" style={{ background:'#fff', padding: isMobile ? '64px 20px' : '80px 40px' }}>
          <div style={{ maxWidth:maxW, margin:'0 auto' }}>
            <div style={{ marginBottom: isMobile?40:52, maxWidth:480 }}>
              <div style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:10, letterSpacing:'0.3em', textTransform:'uppercase', color:'#13315C', marginBottom:14 }}>Pricing</div>
              <h2 style={{ fontSize: isMobile?28:44, fontWeight:600, letterSpacing:'-0.035em', color:'#0E0E0D', lineHeight:1.1, margin:'0 0 14px' }}>
                Semplice e trasparente.
              </h2>
              <p style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:12, lineHeight:1.9, color:'#8a847b', margin:0 }}>
                Inizia gratis, passa a un piano superiore quando cresci.
              </p>
            </div>

            <div style={{ display:'grid', gridTemplateColumns: isMobile?'1fr':'repeat(3,1fr)', gap: isMobile?16:0, border: isMobile?'none':'0.5px solid rgba(14,14,13,0.1)', borderRadius: isMobile?0:8, overflow:'hidden' }}>
              {PLANS.map((plan,i)=>(
                <div key={plan.id} style={{
                  padding:isMobile?'28px 22px':'36px 32px',
                  display:'flex', flexDirection:'column',
                  borderRight:(!isMobile&&i<2)?'0.5px solid rgba(14,14,13,0.1)':'none',
                  border: isMobile ? `0.5px solid ${plan.highlight?'#13315C':'rgba(14,14,13,0.1)'}` : undefined,
                  borderRadius: isMobile ? 8 : 0,
                  background: plan.highlight ? '#13315C' : '#fff',
                  position:'relative',
                }}>
                  {plan.highlight && (
                    <div style={{ position:'absolute', top:16, right:16, fontFamily:"'IBM Plex Mono',monospace", fontSize:8, letterSpacing:'0.15em', textTransform:'uppercase', background:'#D9C98A', color:'#0E0E0D', padding:'3px 8px', borderRadius:2 }}>
                      Consigliato
                    </div>
                  )}
                  <div style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:9, letterSpacing:'0.25em', textTransform:'uppercase', color:plan.highlight?'#D9C98A':'#8a847b', marginBottom:4 }}>{plan.name}</div>
                  <div style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:10, color:plan.highlight?'rgba(238,241,246,0.45)':'#8a847b', marginBottom:20 }}>{plan.desc}</div>
                  <div style={{ marginBottom:24 }}>
                    <span style={{ fontSize:36, fontWeight:700, letterSpacing:'-0.04em', color:plan.highlight?'#EEF1F6':'#0E0E0D' }}>{plan.price}</span>
                    <span style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:10, color:plan.highlight?'rgba(238,241,246,0.45)':'#8a847b' }}>{plan.period}</span>
                  </div>
                  <div style={{ display:'flex', flexDirection:'column', gap:8, flex:1, marginBottom:24 }}>
                    {plan.features.map((f,fi)=>(
                      <div key={fi} style={{ display:'flex', gap:8, alignItems:'flex-start' }}>
                        <span style={{ color:plan.highlight?'#D9C98A':'#1a6b3c', fontSize:11, flexShrink:0, marginTop:1 }}>✓</span>
                        <span style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:10, color:plan.highlight?'rgba(238,241,246,0.7)':'rgba(14,14,13,0.65)', lineHeight:1.5 }}>{f}</span>
                      </div>
                    ))}
                  </div>
                  <button onClick={onRegister} style={{ border: plan.highlight ? 'none' : '0.5px solid rgba(14,14,13,0.25)', background: plan.highlight ? '#D9C98A' : 'transparent', color:'#0E0E0D', padding:'11px 0', width:'100%', fontFamily:"'IBM Plex Mono',monospace", fontSize:11, letterSpacing:'0.08em', textTransform:'uppercase', cursor:'pointer', fontWeight: plan.highlight ? 700 : 400, borderRadius:4 }}>
                    {plan.cta} →
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA FINALE ── */}
        <section style={{ background:'#0E0E0D', padding: isMobile?'72px 20px':'96px 40px', position:'relative', overflow:'hidden' }}>
          <div style={{ position:'absolute', inset:0, background:'radial-gradient(ellipse at 40% 60%, #13315C 0%, #0E0E0D 65%)', opacity:0.85 }}/>
          <div style={{ position:'relative', zIndex:2, maxWidth:maxW, margin:'0 auto', display:'flex', flexDirection: isMobile?'column':'row', alignItems: isMobile?'flex-start':'center', justifyContent:'space-between', gap:32 }}>
            <div>
              <div style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:10, letterSpacing:'0.3em', textTransform:'uppercase', color:'rgba(217,201,138,0.5)', marginBottom:16 }}>Pronto a iniziare?</div>
              <h2 style={{ fontSize: isMobile?28:52, fontWeight:600, letterSpacing:'-0.04em', color:'#EEF1F6', lineHeight:1.08, margin:'0 0 14px' }}>
                Il tuo studio merita<br/>
                <span style={{ color:'#D9C98A' }}>uno strumento su misura.</span>
              </h2>
              <p style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:12, lineHeight:1.9, color:'rgba(238,241,246,0.4)', margin:0, maxWidth:380 }}>
                Inizia gratuitamente. Nessuna carta di credito richiesta.
              </p>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:12, flexShrink:0, width: isMobile?'100%':'auto' }}>
              <button onClick={onRegister} style={{ background:'#D9C98A', border:'none', color:'#0E0E0D', padding:isMobile?'14px 28px':'16px 48px', fontFamily:"'IBM Plex Mono',monospace", fontSize:12, letterSpacing:'0.12em', textTransform:'uppercase', cursor:'pointer', fontWeight:700, width: isMobile?'100%':'auto', whiteSpace:'nowrap' }}>
                Crea il tuo studio →
              </button>
              <button onClick={onJoin} style={{ background:'none', border:'0.5px solid rgba(238,241,246,0.18)', color:'rgba(238,241,246,0.55)', padding:'11px 28px', fontFamily:"'IBM Plex Mono',monospace", fontSize:11, letterSpacing:'0.08em', textTransform:'uppercase', cursor:'pointer', width: isMobile?'100%':'auto' }}>
                Hai un codice invito?
              </button>
            </div>
          </div>

          <div style={{ position:'relative', zIndex:2, maxWidth:maxW, margin:'56px auto 0', paddingTop:24, borderTop:'0.5px solid rgba(238,241,246,0.06)', display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:12 }}>
            <AsmSeal size="sm" showBorder={false} showBottom={false} theme="dark"/>
            <span style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:9, letterSpacing:'0.15em', color:'rgba(238,241,246,0.2)', textTransform:'uppercase' }}>
              © 2026 ASM — Architect Studio Management
            </span>
          </div>
        </section>

      </div>
    </div>
  );
}
