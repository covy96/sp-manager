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
const mono    = { fontFamily: "'IBM Plex Mono', monospace" };
const eyebrow = { ...mono, fontSize: 10, letterSpacing: '0.3em', textTransform: 'uppercase' };

/* ─── shared mock wrapper ─────────────────────────────────────── */
function AppFrame({ children, dark }) {
  return (
    <div style={{
      width:'100%', maxWidth:500, borderRadius:12,
      background: dark ? '#18181b' : '#fff',
      border:`0.5px solid ${dark?'rgba(255,255,255,0.07)':'rgba(14,14,13,0.1)'}`,
      overflow:'hidden',
      boxShadow: dark
        ? '0 32px 80px rgba(0,0,0,0.6), 0 4px 20px rgba(0,0,0,0.4)'
        : '0 24px 64px rgba(0,0,0,0.14), 0 4px 16px rgba(0,0,0,0.07)',
    }}>
      {/* browser bar */}
      <div style={{ height:34, background:dark?'#111':'#e8eaed', display:'flex', alignItems:'center', padding:'0 12px', gap:6, borderBottom:`0.5px solid ${dark?'rgba(255,255,255,0.05)':'rgba(0,0,0,0.06)'}` }}>
        {['#ff5f57','#febc2e','#28c840'].map((c,i)=>(
          <div key={i} style={{ width:9,height:9,borderRadius:'50%',background:c }}/>
        ))}
        <div style={{ flex:1, marginLeft:8, height:16, background:dark?'rgba(255,255,255,0.05)':'rgba(0,0,0,0.05)', borderRadius:4 }}/>
      </div>
      <div style={{ padding:18 }}>{children}</div>
    </div>
  );
}

/* ─── GANTT mock ──────────────────────────────────────────────── */
function MockGantt() {
  const bars = [
    { label:'Concept design',      w:22, x:0,  color:'#13315C' },
    { label:'Progetto definitivo', w:35, x:12, color:'#1d4ed8' },
    { label:'Autorizzazioni',      w:18, x:36, color:'#7c3aed' },
    { label:'Direzione lavori',    w:30, x:52, color:'#b45309' },
    { label:'Collaudo finale',     w:14, x:82, color:'#1a6b3c' },
  ];
  const months = ['Gen','Feb','Mar','Apr','Mag','Giu','Lug','Ago','Set','Ott','Nov','Dic'];
  return (
    <div>
      <div style={{ display:'flex', alignItems:'center', marginBottom:10, paddingBottom:8, borderBottom:'0.5px solid rgba(14,14,13,0.08)' }}>
        <div style={{ width:120, flexShrink:0 }}/>
        <div style={{ flex:1, display:'flex', justifyContent:'space-between' }}>
          {months.map(m=><span key={m} style={{ ...mono, fontSize:7, color:C.muted }}>{m}</span>)}
        </div>
      </div>
      {bars.map(b=>(
        <div key={b.label} style={{ display:'flex', alignItems:'center', marginBottom:6 }}>
          <div style={{ width:120, flexShrink:0, fontSize:9, fontWeight:500, color:C.ink, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', paddingRight:8 }}>{b.label}</div>
          <div style={{ flex:1, height:18, position:'relative' }}>
            <div style={{ position:'absolute', left:`${b.x}%`, width:`${b.w}%`, height:'100%', background:b.color, borderRadius:3, display:'flex', alignItems:'center', paddingLeft:6 }}>
              <span style={{ ...mono, fontSize:7, color:'rgba(255,255,255,0.9)', fontWeight:600, whiteSpace:'nowrap', overflow:'hidden' }}>{b.label}</span>
            </div>
          </div>
        </div>
      ))}
      <div style={{ marginTop:10, paddingTop:8, borderTop:'0.5px solid rgba(14,14,13,0.06)', display:'flex', gap:12 }}>
        {[['5 fasi','pianificate'],['8 mesi','durata stimata'],['3','milestone']].map(([v,l])=>(
          <div key={l}>
            <div style={{ fontSize:12, fontWeight:700, color:C.navy }}>{v}</div>
            <div style={{ ...mono, fontSize:8, color:C.muted, textTransform:'uppercase', letterSpacing:'0.08em' }}>{l}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── COMMESSA mock ───────────────────────────────────────────── */
function MockCommessa() {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
        <div>
          <div style={{ fontSize:13, fontWeight:700, color:C.ink }}>Torre Uffici Centro</div>
          <div style={{ ...mono, fontSize:8, color:C.muted }}>Commessa · 2026/07</div>
        </div>
        <span style={{ ...mono, fontSize:8, color:C.navy, background:`${C.navy}12`, padding:'3px 8px', borderRadius:2 }}>IN CORSO</span>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:6 }}>
        {[['Contratto','€52.000',C.ink],['Incassato','€21.000','#1a6b3c'],['Residuo','€31.000','#b45309']].map(([l,v,c])=>(
          <div key={l} style={{ background:C.paper, padding:'8px 10px', borderRadius:6 }}>
            <div style={{ ...mono, fontSize:7, color:C.muted, marginBottom:3 }}>{l}</div>
            <div style={{ fontSize:12, fontWeight:700, color:c }}>{v}</div>
          </div>
        ))}
      </div>
      {[
        ['Acconto','30%','€15.600','✓ Pagato','#1a6b3c'],
        ['SAL 1',  '40%','€20.800','In attesa', C.muted ],
        ['Saldo',  '30%','€15.600','In attesa', C.muted ],
      ].map(([r,p,v,s,sc])=>(
        <div key={r} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'7px 10px', background:C.paper, borderRadius:6 }}>
          <div style={{ fontSize:10, fontWeight:600, color:C.ink }}>{r}</div>
          <div style={{ ...mono, fontSize:8, color:C.muted }}>{p}</div>
          <div style={{ fontSize:11, fontWeight:700, color:C.navy }}>{v}</div>
          <div style={{ ...mono, fontSize:8, color:sc }}>{s}</div>
        </div>
      ))}
    </div>
  );
}

/* ─── TIMESHEET mock ──────────────────────────────────────────── */
function MockTimesheet() {
  const rows = [
    { i:'AR', days:[8,8,0,7,8], color:'#13315C' },
    { i:'MB', days:[6,8,8,0,7], color:'#1a6b3c' },
    { i:'LC', days:[0,5,8,8,6], color:'#7c3aed' },
    { i:'SP', days:[4,0,6,8,0], color:'#b45309' },
  ];
  const days = ['Lun','Mar','Mer','Gio','Ven'];
  return (
    <div>
      <div style={{ display:'flex', marginBottom:6 }}>
        <div style={{ width:36, flexShrink:0 }}/>
        {days.map(d=><div key={d} style={{ flex:1, textAlign:'center', ...mono, fontSize:8, color:C.muted }}>{d}</div>)}
        <div style={{ width:32, ...mono, fontSize:8, color:C.muted, textAlign:'right' }}>Tot</div>
      </div>
      {rows.map(r=>(
        <div key={r.i} style={{ display:'flex', alignItems:'center', marginBottom:6 }}>
          <div style={{ width:36, flexShrink:0 }}>
            <div style={{ width:24, height:24, borderRadius:'50%', background:r.color, display:'flex', alignItems:'center', justifyContent:'center', fontSize:8, fontWeight:700, color:'#fff' }}>{r.i}</div>
          </div>
          {r.days.map((h,i)=>(
            <div key={i} style={{ flex:1, display:'flex', justifyContent:'center' }}>
              {h>0
                ? <span style={{ display:'inline-flex', width:24, height:20, background:`${r.color}20`, borderRadius:3, ...mono, fontSize:8, color:r.color, fontWeight:700, alignItems:'center', justifyContent:'center' }}>{h}h</span>
                : <span style={{ ...mono, fontSize:9, color:'rgba(14,14,13,0.18)' }}>—</span>
              }
            </div>
          ))}
          <div style={{ width:32, textAlign:'right', ...mono, fontSize:9, fontWeight:700, color:C.navy }}>{r.days.reduce((s,v)=>s+v,0)}h</div>
        </div>
      ))}
      <div style={{ marginTop:8, paddingTop:8, borderTop:'0.5px solid rgba(14,14,13,0.07)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <div style={{ ...mono, fontSize:8, color:C.muted }}>Settimana 22 — Residenza Privata</div>
        <div style={{ fontSize:12, fontWeight:700, color:C.navy }}>107h totali</div>
      </div>
    </div>
  );
}

/* ─── MONITORAGGIO mock ───────────────────────────────────────── */
function MockMonitoraggio() {
  const items = [
    { name:'Residenza Privata',  valore:38000, incassato:38000 },
    { name:'Torre Uffici Centro',valore:52000, incassato:21000 },
    { name:'Showroom Periferia', valore:29500, incassato:12000 },
    { name:'Villa Lago',         valore:44000, incassato:0     },
  ];
  const totV = items.reduce((s,i)=>s+i.valore,0);
  const totI = items.reduce((s,i)=>s+i.incassato,0);
  return (
    <div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:6, marginBottom:12 }}>
        {[['Contratti',`€${(totV/1000).toFixed(0)}k`,C.ink],['Incassato',`€${(totI/1000).toFixed(0)}k`,'#1a6b3c'],['Da incassare',`€${((totV-totI)/1000).toFixed(0)}k`,'#b45309']].map(([l,v,c])=>(
          <div key={l} style={{ background:C.paper, padding:'8px 10px', borderRadius:6 }}>
            <div style={{ ...mono, fontSize:7, color:C.muted, marginBottom:3 }}>{l}</div>
            <div style={{ fontSize:13, fontWeight:700, color:c }}>{v}</div>
          </div>
        ))}
      </div>
      {items.map(item=>{
        const pct = Math.round((item.incassato/item.valore)*100);
        const saldato = item.incassato===item.valore;
        return (
          <div key={item.name} style={{ marginBottom:8 }}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:3 }}>
              <div style={{ fontSize:10, fontWeight:600, color:C.ink }}>{item.name}</div>
              <div style={{ display:'flex', gap:10 }}>
                <span style={{ ...mono, fontSize:9, fontWeight:700, color:C.navy }}>€{(item.valore/1000).toFixed(0)}k</span>
                <span style={{ ...mono, fontSize:8, color: saldato?'#1a6b3c':'#b45309' }}>{saldato?'✓ Saldato':`res. €${((item.valore-item.incassato)/1000).toFixed(0)}k`}</span>
              </div>
            </div>
            <div style={{ height:4, background:'rgba(14,14,13,0.07)', borderRadius:2 }}>
              <div style={{ height:4, width:`${pct}%`, background:saldato?'#1a6b3c':C.navy, borderRadius:2 }}/>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ─── REPORT mock ─────────────────────────────────────────────── */
function MockReport({ dark }) {
  const col = dark ? 'rgba(238,241,246,0.85)' : C.ink;
  const sub = dark ? 'rgba(238,241,246,0.35)' : C.muted;
  const bg  = dark ? 'rgba(255,255,255,0.05)' : C.paper;
  const rows = [
    { name:'Residenza Privata',  ore:54, c:'#13315C' },
    { name:'Torre Uffici',       ore:41, c:'#1d4ed8' },
    { name:'Showroom Periferia', ore:28, c:'#7c3aed' },
    { name:'Villa Lago',         ore:16, c:'#b45309' },
  ];
  const max = 54;
  return (
    <div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6, marginBottom:14 }}>
        {[['Ore totali','139h','#4ade80'],['Progetti','4',col],['Settimane','4',col],['Media/sett','34h','#D9C98A']].map(([l,v,c])=>(
          <div key={l} style={{ background:bg, padding:'8px 12px', borderRadius:6 }}>
            <div style={{ ...mono, fontSize:7, color:sub, marginBottom:3 }}>{l}</div>
            <div style={{ fontSize:15, fontWeight:700, color:c }}>{v}</div>
          </div>
        ))}
      </div>
      {rows.map(r=>(
        <div key={r.name} style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
          <div style={{ ...mono, fontSize:9, color:sub, width:110, flexShrink:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{r.name}</div>
          <div style={{ flex:1, height:6, background:dark?'rgba(255,255,255,0.07)':'rgba(14,14,13,0.07)', borderRadius:3 }}>
            <div style={{ height:6, width:`${(r.ore/max)*100}%`, background:r.c, borderRadius:3 }}/>
          </div>
          <div style={{ ...mono, fontSize:9, color:sub, width:28, textAlign:'right' }}>{r.ore}h</div>
        </div>
      ))}
    </div>
  );
}

/* ─── SCRIVANIA mock ──────────────────────────────────────────── */
function MockScrivania() {
  return (
    <div style={{ display:'flex', height:240, gap:0 }}>
      {/* sidebar */}
      <div style={{ width:42, background:C.ink, display:'flex', flexDirection:'column', alignItems:'center', paddingTop:12, gap:8, flexShrink:0 }}>
        {['🏠','📁','⏱','📅','📊','💶','⚙️'].map((ic,i)=>(
          <div key={i} style={{ width:28, height:28, borderRadius:5, background:i===0?'rgba(255,255,255,0.14)':'transparent', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11 }}>{ic}</div>
        ))}
      </div>
      {/* content */}
      <div style={{ flex:1, padding:'12px 14px', overflow:'hidden' }}>
        <div style={{ ...mono, fontSize:8, color:C.muted, marginBottom:8, letterSpacing:'0.15em', textTransform:'uppercase' }}>Scrivania — oggi</div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:5, marginBottom:10 }}>
          {[['Progetti','8',C.navy],['Task oggi','5','#b45309'],['Ore sett.','32h','#1a6b3c']].map(([l,v,c])=>(
            <div key={l} style={{ background:C.paper, padding:'6px 8px', borderRadius:4 }}>
              <div style={{ ...mono, fontSize:7, color:C.muted }}>{l}</div>
              <div style={{ fontSize:12, fontWeight:700, color:c, marginTop:1 }}>{v}</div>
            </div>
          ))}
        </div>
        <div style={{ ...mono, fontSize:8, color:C.muted, marginBottom:6, letterSpacing:'0.12em', textTransform:'uppercase' }}>Prossime scadenze</div>
        {[
          { t:'Consegna tavole esecutive', d:'Oggi',   sc:'#b91c1c' },
          { t:'Verifica strutturale',      d:'Domani', sc:C.navy },
          { t:'Sopralluogo cantiere',      d:'Ven 20', sc:C.muted },
          { t:'Invio preventivo cliente',  d:'Lun 23', sc:C.muted },
        ].map((r,i)=>(
          <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'5px 0', borderBottom:'0.5px solid rgba(14,14,13,0.05)' }}>
            <div style={{ fontSize:9, fontWeight:600, color:C.ink, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:170 }}>{r.t}</div>
            <div style={{ ...mono, fontSize:8, color:r.sc, flexShrink:0, marginLeft:6 }}>{r.d}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── FATTURE mock ────────────────────────────────────────────── */
function MockFatture() {
  return (
    <div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:6, marginBottom:12 }}>
        {[['Emesse','€73.400',C.ink],['Pagate','€42.200','#1a6b3c'],['In attesa','€31.200','#b45309']].map(([l,v,c])=>(
          <div key={l} style={{ background:C.paper, padding:'8px 10px', borderRadius:6 }}>
            <div style={{ ...mono, fontSize:7, color:C.muted, marginBottom:3 }}>{l}</div>
            <div style={{ fontSize:12, fontWeight:700, color:c }}>{v}</div>
          </div>
        ))}
      </div>
      {[
        { n:'FT 2026/001', p:'Residenza Privata',   v:'€15.600', s:'PAGATA',    sc:'#1a6b3c' },
        { n:'FT 2026/002', p:'Torre Uffici Centro', v:'€20.800', s:'PAGATA',    sc:'#1a6b3c' },
        { n:'FT 2026/003', p:'Showroom Periferia',  v:'€11.800', s:'IN ATTESA', sc:C.muted   },
        { n:'FT 2026/004', p:'Villa Lago',          v:'€19.200', s:'IN ATTESA', sc:C.muted   },
      ].map(f=>(
        <div key={f.n} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'7px 0', borderBottom:'0.5px solid rgba(14,14,13,0.06)' }}>
          <div>
            <div style={{ fontSize:10, fontWeight:600, color:C.ink }}>{f.n}</div>
            <div style={{ ...mono, fontSize:8, color:C.muted }}>{f.p}</div>
          </div>
          <div style={{ textAlign:'right' }}>
            <div style={{ ...mono, fontSize:10, fontWeight:700, color:C.navy }}>{f.v}</div>
            <div style={{ ...mono, fontSize:8, color:f.sc }}>{f.s}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─── PIANI ───────────────────────────────────────────────────── */
const PLANS = [
  { id:'free',   name:'Free',   price:'€0',     period:'/mese', desc:'Per iniziare',          highlight:false, cta:'Inizia gratis',
    features:['1 utente interno','1 collaboratore esterno','5 progetti','5 commesse','Task e timesheet','Calendario'] },
  { id:'studio', name:'Studio', price:'€14,99', period:'/mese', desc:'Per studi in crescita', highlight:true,  cta:'Prova Studio',
    features:['Fino a 10 utenti','25 progetti','25 commesse','Report avanzati','Proforma e fatture','Gantt','Supporto prioritario'] },
  { id:'pro',    name:'Pro',    price:'€29,99', period:'/mese', desc:'Per studi professionali',highlight:false, cta:'Prova Pro',
    features:['Utenti illimitati','Progetti illimitati','Commesse illimitate','Tutto di Studio','Gantt avanzato','Backup su richiesta','Account manager'] },
];

/* ─── FAQ ─────────────────────────────────────────────────────── */
const FAQ_DATA = [
  { q:'ASM è adatto a studi piccoli?',       a:'Sì, è pensato per studi da 1 a 20 persone. Scala con te — inizia gratis e passa a un piano superiore solo quando cresci.' },
  { q:'I miei dati sono al sicuro?',         a:'I dati sono archiviati su infrastruttura cloud europea con backup automatici. Puoi esportare tutto in qualsiasi momento — i tuoi dati sono sempre tuoi.' },
  { q:'È necessario installare qualcosa?',   a:'No, ASM è interamente web-based. Funziona su qualsiasi browser. Su smartphone si installa come app dal browser in un tap (PWA).' },
  { q:'Posso cambiare piano in qualsiasi momento?', a:'Sì, puoi fare upgrade o downgrade in qualsiasi momento. Il cambio è immediato.' },
  { q:'Come funziona la fatturazione?',      a:'ASM supporta entrambi i flussi: Proforma → Pagamento → Fattura per privati e studi associati, oppure Fattura diretta → Pagamento per le società.' },
];

/* ─── FEATURE LIST (usata nelle slide testo) ──────────────────── */
function FeatureList({ items, color }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
      {items.map(f=>(
        <div key={f} style={{ display:'flex', alignItems:'flex-start', gap:10 }}>
          <span style={{ color, fontSize:12, marginTop:1, flexShrink:0 }}>→</span>
          <span style={{ ...mono, fontSize:11, lineHeight:1.6 }}>{f}</span>
        </div>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════ */
export default function LandingPage({ onLogin, onRegister, onJoin }) {
  const [openFaq, setOpenFaq]   = useState(null);
  const [activeSection, setActive] = useState(0);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [menuOpen, setMenuOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onScroll = () => {
      const idx = Math.round(el.scrollTop / window.innerHeight);
      setActive(idx);
    };
    el.addEventListener('scroll', onScroll, { passive:true });
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  const scrollTo = (idx) => {
    setMenuOpen(false);
    containerRef.current?.scrollTo({ top: idx * window.innerHeight, behavior:'smooth' });
  };

  /* sezioni per i dot */
  const SECTIONS = ['hero','scrivania','gantt','commesse','timesheet','monitoraggio','report','fatture','pricing','faq','cta'];
  const sectionCount = SECTIONS.length;

  const gridCols = isMobile ? '1fr' : '1fr 1fr';
  const h2  = isMobile ? 28 : 48;
  const pad = isMobile ? '80px 22px 40px' : '0 64px';

  return (
    <div style={{ position:'fixed', inset:0, overflow:'hidden', fontFamily:"'Space Grotesk', sans-serif" }}>

      {/* ── NAV ── */}
      <nav style={{
        position:'fixed', top:0, left:0, right:0, zIndex:200,
        display:'flex', alignItems:'center', justifyContent:'space-between',
        padding: isMobile ? '0 16px' : '0 48px', height:52,
        background: activeSection===0 ? 'transparent' : 'rgba(238,241,246,0.94)',
        backdropFilter: activeSection>0 ? 'blur(12px)' : 'none',
        borderBottom: activeSection>0 ? '0.5px solid rgba(14,14,13,0.1)' : 'none',
        transition:'all 0.3s',
      }}>
        <AsmSeal size="sm" showBorder={false} showBottom={false} theme={activeSection===0?'dark':'light'}/>

        {isMobile ? (
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <button onClick={onLogin} style={{ background:'transparent', border:`1px solid ${activeSection===0?'rgba(238,241,246,0.45)':'rgba(14,14,13,0.25)'}`, color:activeSection===0?'#EEF1F6':C.ink, padding:'7px 14px', ...mono, fontSize:10, letterSpacing:'0.08em', textTransform:'uppercase', cursor:'pointer' }}>
              Accedi
            </button>
            <button onClick={onRegister} style={{ background:C.brass, border:'none', color:C.ink, padding:'7px 14px', ...mono, fontSize:10, letterSpacing:'0.08em', textTransform:'uppercase', cursor:'pointer', fontWeight:700 }}>
              Registrati
            </button>
            <button onClick={()=>setMenuOpen(!menuOpen)} style={{ background:'none', border:'none', cursor:'pointer', display:'flex', flexDirection:'column', gap:4, padding:4 }}>
              {[0,1,2].map(i=><div key={i} style={{ width:20, height:1.5, background:activeSection===0?'#EEF1F6':C.ink, borderRadius:1 }}/>)}
            </button>
          </div>
        ) : (
          <>
            <div style={{ display:'flex', gap:28 }}>
              {[['Funzionalità',1],['Pricing',8],['FAQ',9]].map(([label,idx])=>(
                <button key={label} onClick={()=>scrollTo(idx)} style={{ ...mono, fontSize:11, letterSpacing:'0.08em', textTransform:'uppercase', background:'none', border:'none', cursor:'pointer', color:activeSection===0?'rgba(238,241,246,0.75)':C.muted }}>
                  {label}
                </button>
              ))}
            </div>
            <div style={{ display:'flex', gap:10 }}>
              <button onClick={onLogin} style={{ border:`0.5px solid ${activeSection===0?'rgba(238,241,246,0.4)':'rgba(14,14,13,0.25)'}`, background:'transparent', color:activeSection===0?'#EEF1F6':C.ink, padding:'7px 18px', ...mono, fontSize:11, letterSpacing:'0.08em', textTransform:'uppercase', cursor:'pointer' }}>
                Accedi
              </button>
              <button onClick={onJoin} style={{ border:`0.5px solid ${activeSection===0?'rgba(238,241,246,0.3)':'rgba(14,14,13,0.2)'}`, background:'transparent', color:activeSection===0?'rgba(238,241,246,0.8)':C.ink, padding:'7px 18px', ...mono, fontSize:11, letterSpacing:'0.08em', textTransform:'uppercase', cursor:'pointer' }}>
                Entra
              </button>
              <button onClick={onRegister} style={{ border:'none', background:C.brass, color:C.ink, padding:'7px 22px', ...mono, fontSize:11, letterSpacing:'0.08em', textTransform:'uppercase', cursor:'pointer', fontWeight:700 }}>
                Crea Studio →
              </button>
            </div>
          </>
        )}
      </nav>

      {/* Mobile menu */}
      {isMobile && menuOpen && (
        <div style={{ position:'fixed', inset:0, zIndex:190, background:'rgba(238,241,246,0.97)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:28 }}>
          {[['Funzionalità',1],['Pricing',8],['FAQ',9]].map(([label,idx])=>(
            <button key={label} onClick={()=>scrollTo(idx)} style={{ ...mono, fontSize:14, letterSpacing:'0.15em', textTransform:'uppercase', background:'none', border:'none', cursor:'pointer', color:C.ink }}>{label}</button>
          ))}
          <div style={{ width:40, height:'0.5px', background:'rgba(14,14,13,0.15)' }}/>
          <button onClick={()=>{setMenuOpen(false);onLogin();}} style={{ ...mono, fontSize:13, letterSpacing:'0.1em', textTransform:'uppercase', background:'none', border:`0.5px solid ${C.ink}`, color:C.ink, padding:'10px 28px', cursor:'pointer' }}>Accedi</button>
          <button onClick={()=>{setMenuOpen(false);onJoin();}} style={{ ...mono, fontSize:13, letterSpacing:'0.1em', textTransform:'uppercase', background:'none', border:`0.5px solid ${C.ink}`, color:C.ink, padding:'10px 28px', cursor:'pointer' }}>Entra in uno studio</button>
          <button onClick={()=>setMenuOpen(false)} style={{ position:'absolute', top:16, right:20, background:'none', border:'none', fontSize:24, cursor:'pointer', color:C.muted }}>×</button>
        </div>
      )}

      {/* Dot navigator */}
      {!isMobile && (
        <div style={{ position:'fixed', right:24, top:'50%', transform:'translateY(-50%)', zIndex:200, display:'flex', flexDirection:'column', gap:8 }}>
          {SECTIONS.map((s,i)=>(
            <button key={s} onClick={()=>scrollTo(i)} style={{ width:6, height:6, borderRadius:'50%', border:'none', cursor:'pointer', padding:0, background:activeSection===i?C.navy:'rgba(14,14,13,0.18)', transform:activeSection===i?'scale(1.5)':'scale(1)', transition:'all 0.2s' }}/>
          ))}
        </div>
      )}

      {/* ── SCROLL CONTAINER ── */}
      <div ref={containerRef} style={{ height:'100vh', overflowY:'scroll', scrollSnapType:'y mandatory' }}>

        {/* 0 · HERO */}
        <section style={{ height:'100vh', scrollSnapAlign:'start', background:C.ink, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', position:'relative', overflow:'hidden' }}>
          <div style={{ position:'absolute', inset:0, background:'radial-gradient(ellipse at 58% 38%, #13315C 0%, #0E0E0D 68%)', opacity:0.95 }}/>
          <div style={{ position:'absolute', inset:0, backgroundImage:'linear-gradient(rgba(238,241,246,0.022) 1px, transparent 1px), linear-gradient(90deg, rgba(238,241,246,0.022) 1px, transparent 1px)', backgroundSize:'52px 52px' }}/>
          {!isMobile && (
            <div style={{ position:'absolute', top:'10%', right:'7%', opacity:0.05 }}>
              <AsmSeal size="hero" theme="dark"/>
            </div>
          )}
          <div style={{ position:'relative', zIndex:2, textAlign:'center', maxWidth:780, padding:'0 20px' }}>
            <div style={{ ...eyebrow, color:'rgba(217,201,138,0.6)', marginBottom: isMobile?14:26 }}>Gestionale per studi di architettura</div>
            <h1 style={{ fontSize: isMobile?38:76, fontWeight:600, lineHeight:1.02, letterSpacing:'-0.045em', color:'#EEF1F6', marginBottom: isMobile?16:22 }}>
              Tutto il tuo studio.<br/>
              <span style={{ color:C.brass }}>Un solo posto.</span>
            </h1>
            <p style={{ ...mono, fontSize: isMobile?12:13, lineHeight:1.85, color:'rgba(238,241,246,0.45)', marginBottom: isMobile?28:40, maxWidth:440, margin:`0 auto ${isMobile?28:40}px` }}>
              Progetti, Gantt, commesse, timesheet e fatturazione.<br/>
              Fatto per architetti — non per contabili.
            </p>
            <div style={{ display:'flex', flexDirection:isMobile?'column':'row', gap:12, justifyContent:'center', alignItems:'center' }}>
              {isMobile && (
                <button onClick={onLogin} style={{ background:'#EEF1F6', border:'none', color:C.ink, padding:'13px 28px', ...mono, fontSize:12, letterSpacing:'0.1em', textTransform:'uppercase', cursor:'pointer', fontWeight:700, width:'100%' }}>
                  Accedi all'app →
                </button>
              )}
              <button onClick={onRegister} style={{ background:C.brass, border:'none', color:C.ink, padding: isMobile?'12px 28px':'14px 40px', ...mono, fontSize: isMobile?11:12, letterSpacing:'0.1em', textTransform:'uppercase', cursor:'pointer', fontWeight:700, width:isMobile?'100%':'auto' }}>
                {isMobile ? 'Crea un nuovo studio →' : 'Crea il tuo studio →'}
              </button>
              {!isMobile && (
                <button onClick={()=>scrollTo(1)} style={{ background:'transparent', border:'0.5px solid rgba(238,241,246,0.25)', color:'rgba(238,241,246,0.65)', padding:'14px 36px', ...mono, fontSize:12, letterSpacing:'0.1em', textTransform:'uppercase', cursor:'pointer' }}>
                  Scopri di più ↓
                </button>
              )}
            </div>
            <div style={{ marginTop:14 }}>
              <button onClick={onJoin} style={{ background:'none', border:'none', color:'rgba(238,241,246,0.3)', ...mono, fontSize:10, letterSpacing:'0.08em', textTransform:'uppercase', cursor:'pointer', textDecoration:'underline', textUnderlineOffset:3 }}>
                Hai un codice invito? Entra in uno studio
              </button>
            </div>
          </div>
          {!isMobile && (
            <div style={{ position:'absolute', bottom:30, left:'50%', transform:'translateX(-50%)', ...mono, fontSize:9, letterSpacing:'0.2em', textTransform:'uppercase', color:'rgba(238,241,246,0.22)', display:'flex', flexDirection:'column', alignItems:'center', gap:8 }}>
              <span>Scorri</span>
              <div style={{ width:1, height:30, background:'rgba(238,241,246,0.15)' }}/>
            </div>
          )}
        </section>

        {/* 1 · SCRIVANIA */}
        <section style={{ height:'100vh', scrollSnapAlign:'start', background:C.paper, display:'grid', gridTemplateColumns:gridCols, overflowY:isMobile?'auto':'hidden' }}>
          <div style={{ display:'flex', flexDirection:'column', justifyContent:'center', padding:pad, color:'rgba(14,14,13,0.7)' }}>
            <div style={{ ...eyebrow, color:C.navy, marginBottom:16 }}>01 — Scrivania</div>
            <h2 style={{ fontSize:h2, fontWeight:600, letterSpacing:'-0.03em', color:C.ink, lineHeight:1.1, marginBottom:16 }}>
              Il punto di partenza<br/>di ogni giornata.
            </h2>
            <p style={{ ...mono, fontSize:12, lineHeight:1.8, marginBottom:24 }}>
              Un pannello personale con le task di oggi, i progetti attivi e le prossime scadenze. Tutto a colpo d'occhio.
            </p>
            <FeatureList color={C.navy} items={['Task assegnate in evidenza','Prossime scadenze del team','Accesso rapido a ogni sezione','Vista personalizzata per ruolo']}/>
          </div>
          {!isMobile && (
            <div style={{ display:'flex', alignItems:'center', justifyContent:'center', padding:48, background:'rgba(19,49,92,0.04)' }}>
              <AppFrame>
                <MockScrivania/>
              </AppFrame>
            </div>
          )}
        </section>

        {/* 2 · GANTT */}
        <section style={{ height:'100vh', scrollSnapAlign:'start', background:C.ink, display:'grid', gridTemplateColumns:gridCols, overflowY:isMobile?'auto':'hidden' }}>
          {!isMobile && (
            <div style={{ display:'flex', alignItems:'center', justifyContent:'center', padding:48 }}>
              <AppFrame dark>
                <MockGantt/>
              </AppFrame>
            </div>
          )}
          <div style={{ display:'flex', flexDirection:'column', justifyContent:'center', padding:pad, color:'rgba(238,241,246,0.6)' }}>
            <div style={{ ...eyebrow, color:C.brass, marginBottom:16 }}>02 — Gantt</div>
            <h2 style={{ fontSize:h2, fontWeight:600, letterSpacing:'-0.03em', color:'#EEF1F6', lineHeight:1.1, marginBottom:16 }}>
              La timeline di<br/>ogni progetto.
            </h2>
            <p style={{ ...mono, fontSize:12, lineHeight:1.8, marginBottom:24 }}>
              Pianifica le fasi su una timeline drag & drop. Vedi chi fa cosa e quando. Esporta come immagine in un click.
            </p>
            <FeatureList color={C.brass} items={['Drag & drop su ogni fase','Colori e etichette personalizzabili','Dipendenze tra fasi','Export SVG ad alta risoluzione']}/>
          </div>
        </section>

        {/* 3 · COMMESSE */}
        <section style={{ height:'100vh', scrollSnapAlign:'start', background:'#fff', display:'grid', gridTemplateColumns:gridCols, overflowY:isMobile?'auto':'hidden' }}>
          <div style={{ display:'flex', flexDirection:'column', justifyContent:'center', padding:pad, color:'rgba(14,14,13,0.7)' }}>
            <div style={{ ...eyebrow, color:C.navy, marginBottom:16 }}>03 — Commesse</div>
            <h2 style={{ fontSize:h2, fontWeight:600, letterSpacing:'-0.03em', color:C.ink, lineHeight:1.1, marginBottom:16 }}>
              Incassi e scadenze<br/>sempre visibili.
            </h2>
            <p style={{ ...mono, fontSize:12, lineHeight:1.8, marginBottom:24 }}>
              Crea offerte, suddividi in rate, emetti proforma e tieni traccia di ogni pagamento ricevuto.
            </p>
            <FeatureList color={C.navy} items={['Proforma → Pagamento → Fattura','Fattura diretta per Srl e Spa','Costi extra e collaboratori esterni','Monitoraggio residuo in tempo reale']}/>
          </div>
          {!isMobile && (
            <div style={{ display:'flex', alignItems:'center', justifyContent:'center', padding:48, background:'rgba(19,49,92,0.03)' }}>
              <AppFrame>
                <MockCommessa/>
              </AppFrame>
            </div>
          )}
        </section>

        {/* 4 · TIMESHEET */}
        <section style={{ height:'100vh', scrollSnapAlign:'start', background:'#13315C', display:'grid', gridTemplateColumns:gridCols, overflowY:isMobile?'auto':'hidden' }}>
          {!isMobile && (
            <div style={{ display:'flex', alignItems:'center', justifyContent:'center', padding:48 }}>
              <AppFrame dark>
                <MockTimesheet/>
              </AppFrame>
            </div>
          )}
          <div style={{ display:'flex', flexDirection:'column', justifyContent:'center', padding:pad, color:'rgba(238,241,246,0.6)' }}>
            <div style={{ ...eyebrow, color:C.brass, marginBottom:16 }}>04 — Timesheet</div>
            <h2 style={{ fontSize:h2, fontWeight:600, letterSpacing:'-0.03em', color:'#EEF1F6', lineHeight:1.1, marginBottom:16 }}>
              Sai esattamente dove<br/>va il tuo tempo.
            </h2>
            <p style={{ ...mono, fontSize:12, lineHeight:1.8, marginBottom:24 }}>
              Ogni membro registra le ore per progetto. Dal desktop o dallo smartphone, anche offline.
            </p>
            <FeatureList color={C.brass} items={['Registrazione giornaliera per progetto','Note e descrizione per ogni voce','Vista settimanale del team','Export Excel e CSV']}/>
          </div>
        </section>

        {/* 5 · MONITORAGGIO */}
        <section style={{ height:'100vh', scrollSnapAlign:'start', background:C.paper, display:'grid', gridTemplateColumns:gridCols, overflowY:isMobile?'auto':'hidden' }}>
          <div style={{ display:'flex', flexDirection:'column', justifyContent:'center', padding:pad, color:'rgba(14,14,13,0.7)' }}>
            <div style={{ ...eyebrow, color:C.navy, marginBottom:16 }}>05 — Monitoraggio</div>
            <h2 style={{ fontSize:h2, fontWeight:600, letterSpacing:'-0.03em', color:C.ink, lineHeight:1.1, marginBottom:16 }}>
              Tutte le commesse,<br/>una vista.
            </h2>
            <p style={{ ...mono, fontSize:12, lineHeight:1.8, marginBottom:24 }}>
              Contratti totali, incassato e residuo su tutte le commesse attive. Zero fogli Excel.
            </p>
            <FeatureList color={C.navy} items={['Credito totale da incassare','Commesse con residuo scaduto','Barra di avanzamento per commessa','Tabella ordinabile ed esportabile']}/>
          </div>
          {!isMobile && (
            <div style={{ display:'flex', alignItems:'center', justifyContent:'center', padding:48, background:'rgba(19,49,92,0.04)' }}>
              <AppFrame>
                <MockMonitoraggio/>
              </AppFrame>
            </div>
          )}
        </section>

        {/* 6 · REPORT */}
        <section style={{ height:'100vh', scrollSnapAlign:'start', background:C.ink, display:'grid', gridTemplateColumns:gridCols, overflowY:isMobile?'auto':'hidden' }}>
          {!isMobile && (
            <div style={{ display:'flex', alignItems:'center', justifyContent:'center', padding:48 }}>
              <AppFrame dark>
                <MockReport dark/>
              </AppFrame>
            </div>
          )}
          <div style={{ display:'flex', flexDirection:'column', justifyContent:'center', padding:pad, color:'rgba(238,241,246,0.6)' }}>
            <div style={{ ...eyebrow, color:C.brass, marginBottom:16 }}>06 — Report</div>
            <h2 style={{ fontSize:h2, fontWeight:600, letterSpacing:'-0.03em', color:'#EEF1F6', lineHeight:1.1, marginBottom:16 }}>
              Dati chiari,<br/>decisioni migliori.
            </h2>
            <p style={{ ...mono, fontSize:12, lineHeight:1.8, marginBottom:24 }}>
              Report settimanali e mensili per progetto, cliente e membro del team. Sempre aggiornati.
            </p>
            <FeatureList color={C.brass} items={['Vista settimanale e mensile','Ore per progetto, cliente e utente','Andamento con grafici a barre','Export Excel e CSV']}/>
          </div>
        </section>

        {/* 7 · FATTURE */}
        <section style={{ height:'100vh', scrollSnapAlign:'start', background:'#fff', display:'grid', gridTemplateColumns:gridCols, overflowY:isMobile?'auto':'hidden' }}>
          <div style={{ display:'flex', flexDirection:'column', justifyContent:'center', padding:pad, color:'rgba(14,14,13,0.7)' }}>
            <div style={{ ...eyebrow, color:C.navy, marginBottom:16 }}>07 — Fatture</div>
            <h2 style={{ fontSize:h2, fontWeight:600, letterSpacing:'-0.03em', color:C.ink, lineHeight:1.1, marginBottom:16 }}>
              Fatturazione<br/>senza pensieri.
            </h2>
            <p style={{ ...mono, fontSize:12, lineHeight:1.8, marginBottom:24 }}>
              Tieni traccia di ogni proforma e fattura emessa, con stato pagamento in tempo reale.
            </p>
            <FeatureList color={C.navy} items={['Collegate alle commesse','Proforma e fattura diretta','Scadenze evidenziate automaticamente','Storico completo esportabile']}/>
          </div>
          {!isMobile && (
            <div style={{ display:'flex', alignItems:'center', justifyContent:'center', padding:48, background:'rgba(19,49,92,0.03)' }}>
              <AppFrame>
                <MockFatture/>
              </AppFrame>
            </div>
          )}
        </section>

        {/* 8 · PRICING */}
        <section style={{ height:'100vh', scrollSnapAlign:'start', background:C.paper, overflowY:'auto', display:'flex', flexDirection:'column' }}>
          <div style={{ padding: isMobile?'72px 20px 24px':'56px 48px 0', flexShrink:0 }}>
            <div style={{ ...eyebrow, color:C.navy, marginBottom:12 }}>Pricing</div>
            <div style={{ fontSize: isMobile?28:40, fontWeight:600, letterSpacing:'-0.03em', color:C.ink, marginBottom: isMobile?24:36 }}>
              Semplice e trasparente.
            </div>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:isMobile?'1fr':'repeat(3,1fr)', gap:isMobile?12:0, flex:1, borderTop:isMobile?'none':'0.5px solid rgba(14,14,13,0.1)', padding:isMobile?'0 20px 40px':0 }}>
            {PLANS.map((plan,i)=>(
              <div key={plan.id} style={{ padding:isMobile?'24px 20px':'36px 32px', display:'flex', flexDirection:'column', borderRight:(!isMobile&&i<2)?'0.5px solid rgba(14,14,13,0.1)':'none', border:isMobile?`0.5px solid ${plan.highlight?C.navy:'rgba(14,14,13,0.1)'}`:undefined, background:plan.highlight?C.navy:'#fff', position:'relative' }}>
                {plan.highlight && <div style={{ position:'absolute', top:12, right:12, ...mono, fontSize:8, letterSpacing:'0.15em', textTransform:'uppercase', background:C.brass, color:C.ink, padding:'3px 8px' }}>Consigliato</div>}
                <div style={{ ...mono, fontSize:9, letterSpacing:'0.25em', textTransform:'uppercase', color:plan.highlight?C.brass:C.muted, marginBottom:4 }}>{plan.name}</div>
                <div style={{ ...mono, fontSize:10, color:plan.highlight?'rgba(238,241,246,0.45)':C.muted, marginBottom:16 }}>{plan.desc}</div>
                <div style={{ marginBottom:20 }}>
                  <span style={{ fontSize:32, fontWeight:600, letterSpacing:'-0.03em', color:plan.highlight?'#EEF1F6':C.ink }}>{plan.price}</span>
                  <span style={{ ...mono, fontSize:10, color:plan.highlight?'rgba(238,241,246,0.45)':C.muted }}>{plan.period}</span>
                </div>
                <div style={{ display:'flex', flexDirection:'column', gap:7, flex:1, marginBottom:20 }}>
                  {plan.features.map((f,fi)=>(
                    <div key={fi} style={{ display:'flex', gap:8 }}>
                      <span style={{ color:plan.highlight?C.brass:'#1a6b3c', fontSize:11, flexShrink:0 }}>✓</span>
                      <span style={{ ...mono, fontSize:10, color:plan.highlight?'rgba(238,241,246,0.7)':'rgba(14,14,13,0.65)', lineHeight:1.5 }}>{f}</span>
                    </div>
                  ))}
                </div>
                <button onClick={onRegister} style={{ border:plan.highlight?'none':'0.5px solid rgba(14,14,13,0.25)', background:plan.highlight?C.brass:'transparent', color:C.ink, padding:'10px 0', width:'100%', ...mono, fontSize:11, letterSpacing:'0.08em', textTransform:'uppercase', cursor:'pointer', fontWeight:plan.highlight?600:400 }}>
                  {plan.cta} →
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* 9 · FAQ */}
        <section style={{ height:'100vh', scrollSnapAlign:'start', background:'#fff', display:'flex', flexDirection:'column', justifyContent:isMobile?'flex-start':'center', padding:isMobile?'72px 20px 40px':'0 10vw', overflowY:'auto' }}>
          <div style={{ ...eyebrow, color:C.navy, marginBottom: isMobile?24:40 }}>Domande frequenti</div>
          <div style={{ maxWidth:720 }}>
            {FAQ_DATA.map((item,i)=>(
              <div key={i} style={{ borderTop:'0.5px solid rgba(14,14,13,0.1)', padding:'16px 0', cursor:'pointer' }} onClick={()=>setOpenFaq(openFaq===i?null:i)}>
                <div style={{ fontSize: isMobile?14:16, fontWeight:600, color:C.ink, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <span style={{ paddingRight:16 }}>{item.q}</span>
                  <span style={{ color:C.navy, fontSize:20, flexShrink:0 }}>{openFaq===i?'−':'+'}</span>
                </div>
                {openFaq===i && (
                  <div style={{ ...mono, fontSize:11, lineHeight:1.85, color:'rgba(14,14,13,0.6)', marginTop:12 }}>{item.a}</div>
                )}
              </div>
            ))}
            <div style={{ borderTop:'0.5px solid rgba(14,14,13,0.1)' }}/>
          </div>
        </section>

        {/* 10 · CTA */}
        <section style={{ height:'100vh', scrollSnapAlign:'start', background:C.ink, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', textAlign:'center', padding: isMobile?'60px 20px':'0 32px', position:'relative', overflow:'hidden' }}>
          <div style={{ position:'absolute', inset:0, background:'radial-gradient(ellipse at 40% 60%, #13315C 0%, #0E0E0D 65%)', opacity:0.85 }}/>
          <div style={{ position:'relative', zIndex:2, width:'100%' }}>
            <div style={{ ...eyebrow, color:'rgba(217,201,138,0.45)', marginBottom: isMobile?16:24 }}>Pronto a iniziare?</div>
            <h2 style={{ fontSize: isMobile?30:62, fontWeight:600, letterSpacing:'-0.04em', color:'#EEF1F6', lineHeight:1.06, marginBottom:16 }}>
              Il tuo studio merita<br/>
              <span style={{ color:C.brass }}>uno strumento su misura.</span>
            </h2>
            <p style={{ ...mono, fontSize:12, lineHeight:1.85, color:'rgba(238,241,246,0.4)', maxWidth:380, margin:'0 auto 36px' }}>
              Inizia gratuitamente. Nessuna carta di credito richiesta.
            </p>
            <button onClick={onRegister} style={{ background:C.brass, border:'none', color:C.ink, padding: isMobile?'13px 28px':'16px 48px', ...mono, fontSize: isMobile?11:13, letterSpacing:'0.12em', textTransform:'uppercase', cursor:'pointer', fontWeight:700, width:isMobile?'100%':'auto' }}>
              Crea il tuo studio gratuitamente →
            </button>
            <div style={{ marginTop:14 }}>
              <button onClick={onJoin} style={{ background:'none', border:'none', color:'rgba(238,241,246,0.3)', ...mono, fontSize:10, letterSpacing:'0.08em', textTransform:'uppercase', cursor:'pointer', textDecoration:'underline', textUnderlineOffset:3 }}>
                Hai un codice invito? Entra in uno studio
              </button>
            </div>
          </div>
          <div style={{ position:'absolute', bottom:0, left:0, right:0, padding: isMobile?'16px 20px':'20px 48px', display:'flex', alignItems:'center', justifyContent:'space-between', borderTop:'0.5px solid rgba(238,241,246,0.06)', flexWrap:'wrap', gap:8 }}>
            <AsmSeal size="sm" showBorder={false} showBottom={false} theme="dark"/>
            <span style={{ ...mono, fontSize:9, letterSpacing:'0.15em', color:'rgba(238,241,246,0.2)', textTransform:'uppercase' }}>© 2026 ASM</span>
          </div>
        </section>

      </div>
    </div>
  );
}
