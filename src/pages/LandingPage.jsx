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

const PLANS = [
  {
    id: 'free', name: 'Free', price: '€0', period: '/mese',
    desc: 'Per iniziare', highlight: false, cta: 'Inizia gratis',
    features: ['1 utente interno','1 collaboratore esterno','5 progetti','5 commesse','Task e timesheet','Calendario'],
  },
  {
    id: 'studio', name: 'Studio', price: '€14,99', period: '/mese',
    desc: 'Per studi in crescita', highlight: true, cta: 'Prova Studio',
    features: ['Fino a 10 utenti','25 progetti','25 commesse','Report avanzati','Monitoraggio, proforma e fatture','Gantt','Supporto prioritario'],
  },
  {
    id: 'pro', name: 'Pro', price: '€29,99', period: '/mese',
    desc: 'Per studi professionali', highlight: false, cta: 'Prova Pro',
    features: ['Utenti illimitati','Progetti illimitati','Commesse illimitate','Tutto di Studio','Gantt avanzato','Backup su richiesta','Account manager dedicato'],
  },
];

const FAQ_DATA = [
  { q: 'ASM è adatto a studi piccoli?', a: 'Sì, è pensato per studi da 1 a 20 persone. Scala con te.' },
  { q: 'I miei dati sono al sicuro?', a: 'Sì. I dati sono archiviati su infrastruttura cloud europea con backup automatici. Puoi esportare tutto in qualsiasi momento in formato Excel o CSV — i tuoi dati sono sempre tuoi.' },
  { q: 'È necessario installare qualcosa?', a: 'No, ASM è interamente web-based. Funziona su qualsiasi browser e smartphone.' },
  { q: 'Posso cambiare piano in qualsiasi momento?', a: 'Sì, puoi fare upgrade o downgrade in qualsiasi momento. Il cambio è immediato.' },
  { q: 'Come funziona la fatturazione?', a: 'ASM supporta entrambi i flussi: Proforma → Pagamento → Fattura per privati e studi associati, oppure Fattura diretta → Pagamento per le società.' },
];

function MockProjectCard({ name, client, progress, color }) {
  return (
    <div style={{ background:'#fff', border:'0.5px solid rgba(14,14,13,0.1)', padding:'12px 14px', borderRadius:2 }}>
      <div style={{ fontSize:12, fontWeight:600, color:C.ink, marginBottom:3 }}>{name}</div>
      <div style={{ fontFamily:"'IBM Plex Mono', monospace", fontSize:9, color:C.muted, marginBottom:8 }}>{client}</div>
      <div style={{ height:2, background:'rgba(14,14,13,0.08)', marginBottom:4 }}>
        <div style={{ height:2, background:color||C.navy, width:`${progress}%` }}/>
      </div>
      <div style={{ fontFamily:"'IBM Plex Mono', monospace", fontSize:9, color:C.muted }}>{progress}%</div>
    </div>
  );
}

function MockScreen({ children, dark }) {
  return (
    <div style={{
      width:'100%', maxWidth:480, borderRadius:10,
      background: dark ? '#1a1a18' : C.paper,
      border:`1px solid ${dark ? 'rgba(255,255,255,0.08)' : 'rgba(14,14,13,0.12)'}`,
      overflow:'hidden',
      boxShadow:'0 24px 60px rgba(0,0,0,0.2)',
    }}>
      <div style={{ height:32, background:dark?'#111':'#e8eaed', display:'flex', alignItems:'center', padding:'0 12px', gap:6 }}>
        {['#ff5f57','#febc2e','#28c840'].map((c,i)=>(
          <div key={i} style={{ width:10, height:10, borderRadius:'50%', background:c }}/>
        ))}
        <div style={{ flex:1, marginLeft:8, height:16, background:dark?'rgba(255,255,255,0.06)':'rgba(0,0,0,0.06)', borderRadius:4 }}/>
      </div>
      <div style={{ padding:16 }}>{children}</div>
    </div>
  );
}

// Feature row usato nelle sezioni desktop
function FeatureList({ items, color }) {
  const mono = { fontFamily:"'IBM Plex Mono', monospace" };
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
      {items.map(f=>(
        <div key={f} style={{ display:'flex', alignItems:'flex-start', gap:10 }}>
          <span style={{ color, fontSize:13, marginTop:1, flexShrink:0 }}>→</span>
          <span style={{ ...mono, fontSize:11, color:'inherit', lineHeight:1.6 }}>{f}</span>
        </div>
      ))}
    </div>
  );
}

export default function LandingPage({ onLogin, onRegister, onJoin }) {
  const [openFaq, setOpenFaq]      = useState(null);
  const [activeSection, setActive] = useState(0);
  const [isMobile, setIsMobile]    = useState(window.innerWidth < 768);
  const [menuOpen, setMenuOpen]    = useState(false);
  const containerRef               = useRef(null);

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

  const mono    = { fontFamily:"'IBM Plex Mono', monospace" };
  const eyebrow = { ...mono, fontSize:10, letterSpacing:'0.3em', textTransform:'uppercase' };

  // ── SEZIONI (stesse di prima, usate per i dot) ──────────────────
  const SECTIONS = ['hero','progetti','commesse','timesheet','mobile','report','team','monitoraggio','fatture','pricing','faq','cta'];

  // ── STILI RESPONSIVE ──────────────────────────────────────────
  const sectionPad  = isMobile ? '80px 20px 40px' : '0 64px';
  const h1Size      = isMobile ? 38 : 72;
  const h2Size      = isMobile ? 28 : 48;
  const h2BigSize   = isMobile ? 32 : 64;
  const pSize       = isMobile ? 13 : 13;
  const gridCols    = isMobile ? '1fr' : '1fr 1fr';

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
          /* Mobile: hamburger + Crea Studio */
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <button onClick={onRegister} style={{ background:C.brass, border:'none', color:C.ink, padding:'7px 14px', ...mono, fontSize:10, letterSpacing:'0.08em', textTransform:'uppercase', cursor:'pointer', fontWeight:700 }}>
              Crea Studio →
            </button>
            <button onClick={()=>setMenuOpen(!menuOpen)} style={{ background:'none', border:'none', cursor:'pointer', display:'flex', flexDirection:'column', gap:4, padding:4 }}>
              {[0,1,2].map(i=>(
                <div key={i} style={{ width:20, height:1.5, background:activeSection===0?'#EEF1F6':C.ink, borderRadius:1 }}/>
              ))}
            </button>
          </div>
        ) : (
          /* Desktop: links + bottoni */
          <>
            <div style={{ display:'flex', gap:28 }}>
              {[['Funzionalità',1],['Pricing',9],['FAQ',10]].map(([label,idx])=>(
                <button key={label} onClick={()=>scrollTo(idx)} style={{ ...mono, fontSize:11, letterSpacing:'0.08em', textTransform:'uppercase', background:'none', border:'none', cursor:'pointer', color:activeSection===0?'rgba(238,241,246,0.8)':C.muted }}>
                  {label}
                </button>
              ))}
            </div>
            <div style={{ display:'flex', gap:10 }}>
              <button onClick={onLogin} style={{ border:`0.5px solid ${activeSection===0?'rgba(238,241,246,0.5)':C.ink}`, background:'transparent', color:activeSection===0?'#EEF1F6':C.ink, padding:'7px 18px', ...mono, fontSize:11, letterSpacing:'0.08em', textTransform:'uppercase', cursor:'pointer' }}>
                Accedi
              </button>
              <button onClick={onJoin} style={{ border:`0.5px solid ${activeSection===0?'rgba(238,241,246,0.4)':'rgba(14,14,13,0.4)'}`, background:'transparent', color:activeSection===0?'rgba(238,241,246,0.85)':C.ink, padding:'7px 18px', ...mono, fontSize:11, letterSpacing:'0.08em', textTransform:'uppercase', cursor:'pointer' }}>
                Entra
              </button>
              <button onClick={onRegister} style={{ border:'none', background:C.brass, color:C.ink, padding:'7px 22px', ...mono, fontSize:11, letterSpacing:'0.08em', textTransform:'uppercase', cursor:'pointer', fontWeight:700 }}>
                Crea Studio →
              </button>
            </div>
          </>
        )}
      </nav>

      {/* Mobile menu overlay */}
      {isMobile && menuOpen && (
        <div style={{ position:'fixed', inset:0, zIndex:190, background:'rgba(238,241,246,0.97)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:28 }}>
          {[['Funzionalità',1],['Pricing',9],['FAQ',10]].map(([label,idx])=>(
            <button key={label} onClick={()=>scrollTo(idx)} style={{ ...mono, fontSize:14, letterSpacing:'0.15em', textTransform:'uppercase', background:'none', border:'none', cursor:'pointer', color:C.ink }}>
              {label}
            </button>
          ))}
          <div style={{ width:40, height:'0.5px', background:'rgba(14,14,13,0.15)' }}/>
          <button onClick={()=>{setMenuOpen(false);onLogin();}} style={{ ...mono, fontSize:13, letterSpacing:'0.1em', textTransform:'uppercase', background:'none', border:`0.5px solid ${C.ink}`, color:C.ink, padding:'10px 28px', cursor:'pointer' }}>Accedi</button>
          <button onClick={()=>{setMenuOpen(false);onJoin();}} style={{ ...mono, fontSize:13, letterSpacing:'0.1em', textTransform:'uppercase', background:'none', border:`0.5px solid ${C.ink}`, color:C.ink, padding:'10px 28px', cursor:'pointer' }}>Entra in uno studio</button>
          <button onClick={()=>setMenuOpen(false)} style={{ position:'absolute', top:16, right:20, background:'none', border:'none', fontSize:24, cursor:'pointer', color:C.muted }}>×</button>
        </div>
      )}

      {/* Dot navigator — solo desktop */}
      {!isMobile && (
        <div style={{ position:'fixed', right:24, top:'50%', transform:'translateY(-50%)', zIndex:200, display:'flex', flexDirection:'column', gap:8 }}>
          {SECTIONS.map((s,i)=>(
            <button key={s} onClick={()=>scrollTo(i)} style={{
              width:6, height:6, borderRadius:'50%', border:'none', cursor:'pointer', padding:0,
              background:activeSection===i?C.navy:'rgba(14,14,13,0.2)',
              transform:activeSection===i?'scale(1.4)':'scale(1)',
              transition:'all 0.2s',
            }}/>
          ))}
        </div>
      )}

      {/* ── SCROLL CONTAINER ── */}
      <div ref={containerRef} style={{ height:'100vh', overflowY:'scroll', scrollSnapType:'y mandatory', scrollBehavior:'smooth' }}>

        {/* 0. HERO */}
        <section style={{ height:'100vh', scrollSnapAlign:'start', background:C.ink, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', position:'relative', overflow:'hidden' }}>
          <div style={{ position:'absolute', inset:0, background:'radial-gradient(ellipse at 60% 40%, #13315C 0%, #0E0E0D 70%)', opacity:0.9 }}/>
          {!isMobile && (
            <div style={{ position:'absolute', top:'10%', right:'8%', opacity:0.06 }}>
              <AsmSeal size="hero" theme="dark"/>
            </div>
          )}
          <div style={{ position:'relative', zIndex:2, textAlign:'center', maxWidth:760, padding:'0 20px' }}>
            <div style={{ ...eyebrow, color:'rgba(217,201,138,0.7)', marginBottom:isMobile?16:28 }}>
              Gestionale per studi di architettura
            </div>
            <h1 style={{ fontSize:h1Size, fontWeight:600, lineHeight:1.05, letterSpacing:'-0.04em', color:'#EEF1F6', marginBottom:isMobile?16:24 }}>
              Tutto il tuo studio.<br/>
              <span style={{ color:C.brass }}>Un solo posto.</span>
            </h1>
            <p style={{ ...mono, fontSize:isMobile?12:13, lineHeight:1.8, color:'rgba(238,241,246,0.55)', marginBottom:isMobile?28:40, maxWidth:480, margin:`0 auto ${isMobile?28:40}px` }}>
              Progetti, commesse, timesheet, Gantt e fatturazione.<br/>
              Progettato per architetti, non per contabili.
            </p>
            <div style={{ display:'flex', flexDirection:isMobile?'column':'row', gap:12, justifyContent:'center', alignItems:'center' }}>
              <button onClick={onRegister} style={{ background:C.brass, border:'none', color:C.ink, padding:isMobile?'12px 28px':'14px 36px', ...mono, fontSize:isMobile?11:12, letterSpacing:'0.1em', textTransform:'uppercase', cursor:'pointer', fontWeight:700, width:isMobile?'100%':'auto' }}>
                Crea il tuo studio →
              </button>
              <button onClick={()=>scrollTo(1)} style={{ background:'transparent', border:'0.5px solid rgba(238,241,246,0.3)', color:'rgba(238,241,246,0.7)', padding:isMobile?'12px 28px':'14px 36px', ...mono, fontSize:isMobile?11:12, letterSpacing:'0.1em', textTransform:'uppercase', cursor:'pointer', width:isMobile?'100%':'auto' }}>
                Scopri di più ↓
              </button>
            </div>
            <div style={{ marginTop:14 }}>
              <button onClick={onJoin} style={{ background:'none', border:'none', color:'rgba(238,241,246,0.4)', ...mono, fontSize:10, letterSpacing:'0.08em', textTransform:'uppercase', cursor:'pointer', textDecoration:'underline', textUnderlineOffset:3 }}>
                Hai un codice invito? Entra in uno studio
              </button>
            </div>
          </div>
          {!isMobile && (
            <div style={{ position:'absolute', bottom:32, left:'50%', transform:'translateX(-50%)', ...mono, fontSize:9, letterSpacing:'0.2em', textTransform:'uppercase', color:'rgba(238,241,246,0.3)', display:'flex', flexDirection:'column', alignItems:'center', gap:8 }}>
              <span>Scorri</span>
              <div style={{ width:1, height:32, background:'rgba(238,241,246,0.2)' }}/>
            </div>
          )}
        </section>

        {/* 1. PROGETTI */}
        <section style={{ height:'100vh', scrollSnapAlign:'start', background:C.paper, display:'grid', gridTemplateColumns:gridCols, overflowY:isMobile?'auto':'hidden' }}>
          <div style={{ display:'flex', flexDirection:'column', justifyContent:'center', padding:isMobile?'72px 24px 32px':'0 64px', color:'rgba(14,14,13,0.7)' }}>
            <div style={{ ...eyebrow, color:C.navy, marginBottom:16 }}>01 — Progetti</div>
            <h2 style={{ fontSize:h2Size, fontWeight:600, letterSpacing:'-0.03em', color:C.ink, lineHeight:1.1, marginBottom:16 }}>
              Ogni progetto<br/>sotto controllo.
            </h2>
            <p style={{ ...mono, fontSize:12, lineHeight:1.8, marginBottom:24 }}>
              Crea progetti, assegna task al team, monitora il progresso in tempo reale.
            </p>
            <FeatureList color={C.navy} items={['Kanban per servizio','Task con assegnazione e subtask','Pratica edilizia integrata','Gantt con drag & drop']}/>
          </div>
          {!isMobile && (
            <div style={{ display:'flex', alignItems:'center', justifyContent:'center', padding:48, background:'rgba(19,49,92,0.04)' }}>
              <MockScreen>
                <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                  <div style={{ ...mono, fontSize:8, letterSpacing:'0.2em', textTransform:'uppercase', color:C.muted, marginBottom:4 }}>Progetti attivi</div>
                  <MockProjectCard name="Casa Vacanze Cortina" client="Famiglia Bianchi" progress={65} color="#13315C"/>
                  <MockProjectCard name="Uffici IF Group" client="IF Group Srl" progress={100} color="#1a6b3c"/>
                  <MockProjectCard name="Residenza Lago Como" client="Studio Ferretti" progress={30} color="#7c3aed"/>
                  <MockProjectCard name="Showroom Milano" client="Arredo Italia" progress={10} color="#b45309"/>
                </div>
              </MockScreen>
            </div>
          )}
        </section>

        {/* 2. COMMESSE */}
        <section style={{ height:'100vh', scrollSnapAlign:'start', background:C.ink, display:'grid', gridTemplateColumns:gridCols, overflowY:isMobile?'auto':'hidden' }}>
          {!isMobile && (
            <div style={{ display:'flex', alignItems:'center', justifyContent:'center', padding:48 }}>
              <MockScreen dark>
                <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                  <div style={{ ...mono, fontSize:8, letterSpacing:'0.2em', textTransform:'uppercase', color:'rgba(238,241,246,0.4)', marginBottom:4 }}>Commessa — Uffici IF Group</div>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8 }}>
                    {[['Offerta','2.000 €','rgba(238,241,246,0.9)'],['Pagato','600 €','#4ade80'],['Residuo','1.400 €','#f87171']].map(([l,v,c])=>(
                      <div key={l} style={{ background:'rgba(255,255,255,0.05)', padding:'10px 10px', borderRadius:2 }}>
                        <div style={{ ...mono, fontSize:8, color:'rgba(238,241,246,0.3)', marginBottom:4 }}>{l}</div>
                        <div style={{ fontSize:14, fontWeight:600, color:c }}>{v}</div>
                      </div>
                    ))}
                  </div>
                  {[['Rata 1','30%','600 €','✓ PAGATA','#4ade80'],['Rata 2','40%','800 €','IN ATTESA','rgba(238,241,246,0.4)'],['Rata 3','30%','600 €','IN ATTESA','rgba(238,241,246,0.4)']].map(([r,p,v,s,sc])=>(
                    <div key={r} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 10px', background:'rgba(255,255,255,0.04)', borderRadius:2 }}>
                      <div><div style={{ fontSize:11, fontWeight:600, color:'rgba(238,241,246,0.9)' }}>{r}</div><div style={{ ...mono, fontSize:8, color:'rgba(238,241,246,0.3)' }}>{p}</div></div>
                      <div style={{ fontSize:12, fontWeight:600, color:'rgba(238,241,246,0.8)' }}>{v}</div>
                      <div style={{ ...mono, fontSize:8, color:sc }}>{s}</div>
                    </div>
                  ))}
                </div>
              </MockScreen>
            </div>
          )}
          <div style={{ display:'flex', flexDirection:'column', justifyContent:'center', padding:isMobile?'72px 24px 32px':'0 64px', color:'rgba(238,241,246,0.6)' }}>
            <div style={{ ...eyebrow, color:C.brass, marginBottom:16 }}>02 — Commesse</div>
            <h2 style={{ fontSize:h2Size, fontWeight:600, letterSpacing:'-0.03em', color:'#EEF1F6', lineHeight:1.1, marginBottom:16 }}>
              Incassi e scadenze<br/>sempre visibili.
            </h2>
            <p style={{ ...mono, fontSize:12, lineHeight:1.8, marginBottom:24 }}>
              Crea offerte, suddividi i pagamenti in rate, emetti proforma e traccia gli incassi.
            </p>
            <FeatureList color={C.brass} items={['Proforma → Pagamento → Fattura','Fattura diretta per Srl e Spa','Costi extra e collaboratori esterni','Monitoraggio residuo e credito']}/>
          </div>
        </section>

        {/* 3. TIMESHEET */}
        <section style={{ height:'100vh', scrollSnapAlign:'start', background:'#13315C', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:isMobile?'60px 24px 40px':'0 48px', textAlign:'center', overflowY:isMobile?'auto':'hidden' }}>
          <div style={{ ...eyebrow, color:C.brass, marginBottom:isMobile?16:24 }}>03 — Timesheet & Report</div>
          <h2 style={{ fontSize:isMobile?30:64, fontWeight:600, letterSpacing:'-0.04em', color:'#EEF1F6', lineHeight:1.05, marginBottom:isMobile?16:24, maxWidth:700 }}>
            Sai esattamente<br/>dove va il tuo tempo.
          </h2>
          <p style={{ ...mono, fontSize:isMobile?12:13, lineHeight:1.8, color:'rgba(238,241,246,0.5)', maxWidth:520, marginBottom:isMobile?32:56 }}>
            Ogni membro registra le ore per progetto. I report mostrano distribuzione per progetto, cliente e utente.
          </p>
          <div style={{ display:'grid', gridTemplateColumns:isMobile?'1fr':'repeat(3,1fr)', gap:1, width:'100%', maxWidth:800, background:'rgba(238,241,246,0.08)' }}>
            {[['Ore tracciate','in tempo reale'],['Per progetto','cliente o utente'],['Export','Excel e CSV']].map(([big,small],i)=>(
              <div key={i} style={{ padding:isMobile?'20px 16px':'36px 28px', textAlign:'center', background:'rgba(19,49,92,0.6)' }}>
                <div style={{ fontSize:isMobile?16:22, fontWeight:600, color:'#EEF1F6', marginBottom:6, letterSpacing:'-0.02em' }}>{big}</div>
                <div style={{ ...mono, fontSize:9, color:'rgba(238,241,246,0.4)', letterSpacing:'0.15em', textTransform:'uppercase' }}>{small}</div>
              </div>
            ))}
          </div>
        </section>

        {/* 4. MOBILE */}
        <section style={{ height:'100vh', scrollSnapAlign:'start', background:C.paper, display:'grid', gridTemplateColumns:gridCols, overflowY:isMobile?'auto':'hidden' }}>
          <div style={{ display:'flex', flexDirection:'column', justifyContent:'center', padding:isMobile?'72px 24px 32px':'0 64px', color:'rgba(14,14,13,0.7)' }}>
            <div style={{ ...eyebrow, color:C.navy, marginBottom:16 }}>04 — Mobile</div>
            <h2 style={{ fontSize:h2Size, fontWeight:600, letterSpacing:'-0.03em', color:C.ink, lineHeight:1.1, marginBottom:16 }}>
              In ufficio,<br/>in cantiere,<br/>ovunque.
            </h2>
            <p style={{ ...mono, fontSize:12, lineHeight:1.8, marginBottom:24 }}>
              ASM funziona perfettamente su iPhone e Android. Nessuna app da installare.
            </p>
            <FeatureList color={C.navy} items={['Registra le ore dal cantiere','Controlla lo stato delle task','Vedi il calendario del team','Cerca qualsiasi progetto']}/>
          </div>
          {!isMobile && (
            <div style={{ display:'flex', alignItems:'center', justifyContent:'center', padding:48, background:'rgba(19,49,92,0.04)' }}>
              <div style={{ width:240, height:480, borderRadius:36, background:C.ink, border:'6px solid #2a2a28', boxShadow:'0 32px 80px rgba(0,0,0,0.3)', overflow:'hidden', position:'relative' }}>
                <div style={{ position:'absolute', top:0, left:'50%', transform:'translateX(-50%)', width:80, height:24, background:C.ink, borderRadius:'0 0 16px 16px', zIndex:10 }}/>
                <div style={{ background:C.paper, height:'100%', paddingTop:32 }}>
                  <div style={{ background:C.ink, padding:'10px 14px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                    <div style={{ fontSize:11, fontWeight:600, color:'#EEF1F6' }}>Studio Prini</div>
                    <div style={{ width:22, height:22, borderRadius:'50%', background:C.navy, display:'flex', alignItems:'center', justifyContent:'center', fontSize:8, fontWeight:600, color:'#fff' }}>GC</div>
                  </div>
                  <div style={{ padding:'12px 10px', display:'flex', flexDirection:'column', gap:8 }}>
                    <div style={{ fontFamily:"'IBM Plex Mono', monospace", fontSize:7, letterSpacing:'0.15em', textTransform:'uppercase', color:C.muted }}>Scrivania</div>
                    {['Casa Vacanze — verifica strutturale','Uffici IF — consegna tavole','Showroom — sopralluogo'].map((t,i)=>(
                      <div key={i} style={{ background:'#fff', padding:'8px 10px', borderLeft:`3px solid ${i===0?'#b91c1c':C.navy}` }}>
                        <div style={{ fontSize:9, fontWeight:600, color:C.ink }}>{t}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ position:'absolute', bottom:0, left:0, right:0, height:52, background:'#fff', borderTop:'0.5px solid rgba(14,14,13,0.1)', display:'flex', alignItems:'center', justifyContent:'space-around' }}>
                    {['🏠','📁','⏱','📅','☰'].map((icon,i)=>(
                      <div key={i} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:2 }}>
                        <span style={{ fontSize:16 }}>{icon}</span>
                        <div style={{ width:i===0?20:0, height:2, background:C.navy, borderRadius:1 }}/>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* 5. REPORT */}
        <section style={{ height:'100vh', scrollSnapAlign:'start', background:'#13315C', display:'grid', gridTemplateColumns:gridCols, overflowY:isMobile?'auto':'hidden' }}>
          <div style={{ display:'flex', flexDirection:'column', justifyContent:'center', padding:isMobile?'72px 24px 32px':'0 64px', color:'rgba(238,241,246,0.6)' }}>
            <div style={{ ...eyebrow, color:C.brass, marginBottom:16 }}>05 — Report</div>
            <h2 style={{ fontSize:h2Size, fontWeight:600, letterSpacing:'-0.03em', color:'#EEF1F6', lineHeight:1.1, marginBottom:16 }}>
              Dati chiari,<br/>decisioni migliori.
            </h2>
            <p style={{ ...mono, fontSize:12, lineHeight:1.8, marginBottom:24 }}>
              Report settimanali e mensili per progetto, cliente e membro del team.
            </p>
            <FeatureList color={C.brass} items={['Vista settimanale e mensile','Ore per progetto, cliente e utente','Andamento temporale con grafici','Export Excel e CSV']}/>
          </div>
          {!isMobile && (
            <div style={{ display:'flex', alignItems:'center', justifyContent:'center', padding:48 }}>
              <MockScreen dark>
                <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                  <div style={{ ...mono, fontSize:8, letterSpacing:'0.2em', textTransform:'uppercase', color:'rgba(238,241,246,0.4)' }}>Report — Maggio 2026</div>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                    {[['Ore totali','124:30','#4ade80'],['Progetti attivi','6','rgba(238,241,246,0.9)'],['Membri attivi','4','rgba(238,241,246,0.9)'],['Ore anno','487:00','#D9C98A']].map(([l,v,c])=>(
                      <div key={l} style={{ background:'rgba(255,255,255,0.05)', padding:'10px 12px', borderRadius:2 }}>
                        <div style={{ ...mono, fontSize:8, color:'rgba(238,241,246,0.3)', marginBottom:4 }}>{l}</div>
                        <div style={{ fontSize:16, fontWeight:600, color:c }}>{v}</div>
                      </div>
                    ))}
                  </div>
                  {[['Casa Vacanze',52,'#13315C'],['Uffici IF',38,'#1a6b3c'],['Showroom',22,'#7c3aed'],['Residenza',12,'#b45309']].map(([name,ore,color])=>(
                    <div key={name} style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <div style={{ ...mono, fontSize:9, color:'rgba(238,241,246,0.6)', width:90, flexShrink:0 }}>{name}</div>
                      <div style={{ flex:1, height:6, background:'rgba(255,255,255,0.06)', borderRadius:3 }}>
                        <div style={{ height:6, background:color, borderRadius:3, width:`${(ore/52)*100}%` }}/>
                      </div>
                      <div style={{ ...mono, fontSize:9, color:'rgba(238,241,246,0.5)', width:28, textAlign:'right' }}>{ore}h</div>
                    </div>
                  ))}
                </div>
              </MockScreen>
            </div>
          )}
        </section>

        {/* 6. TEAM */}
        <section style={{ height:'100vh', scrollSnapAlign:'start', background:C.paper, display:'grid', gridTemplateColumns:gridCols, overflowY:isMobile?'auto':'hidden' }}>
          {!isMobile && (
            <div style={{ display:'flex', alignItems:'center', justifyContent:'center', padding:48, background:'rgba(19,49,92,0.04)' }}>
              <MockScreen>
                <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                  <div style={{ ...mono, fontSize:8, letterSpacing:'0.2em', textTransform:'uppercase', color:C.muted, marginBottom:4 }}>Team</div>
                  {[{ name:'Marco Rossi', role:'Project Manager', ore:'42h', color:'#13315C', initials:'MR' },{ name:'Giulia Ferrari', role:'Architetto', ore:'38h', color:'#1a6b3c', initials:'GF' },{ name:'Luca Bianchi', role:'Ingegnere', ore:'29h', color:'#7c3aed', initials:'LB' },{ name:'Sara Conti', role:'Collaboratore', ore:'18h', color:'#b45309', initials:'SC' }].map(m=>(
                    <div key={m.name} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 0', borderBottom:'0.5px solid rgba(14,14,13,0.06)' }}>
                      <div style={{ width:32, height:32, borderRadius:'50%', background:m.color, display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:600, color:'#fff', flexShrink:0 }}>{m.initials}</div>
                      <div style={{ flex:1 }}><div style={{ fontSize:12, fontWeight:600, color:C.ink }}>{m.name}</div><div style={{ ...mono, fontSize:9, color:C.muted }}>{m.role}</div></div>
                      <div style={{ ...mono, fontSize:11, color:C.navy, fontWeight:600 }}>{m.ore}</div>
                    </div>
                  ))}
                </div>
              </MockScreen>
            </div>
          )}
          <div style={{ display:'flex', flexDirection:'column', justifyContent:'center', padding:isMobile?'72px 24px 32px':'0 64px', color:'rgba(14,14,13,0.7)' }}>
            <div style={{ ...eyebrow, color:C.navy, marginBottom:16 }}>06 — Team</div>
            <h2 style={{ fontSize:h2Size, fontWeight:600, letterSpacing:'-0.03em', color:C.ink, lineHeight:1.1, marginBottom:16 }}>
              Il team sempre<br/>allineato.
            </h2>
            <p style={{ ...mono, fontSize:12, lineHeight:1.8, marginBottom:24 }}>
              Gestisci ruoli e permessi, assegna task, monitora le ore per membro.
            </p>
            <FeatureList color={C.navy} items={['7 ruoli: da Titolare a Collaboratore','Invito via codice','Permessi granulari per sezione','Ore e task per ogni membro']}/>
          </div>
        </section>

        {/* 7. MONITORAGGIO */}
        <section style={{ height:'100vh', scrollSnapAlign:'start', background:C.ink, display:'grid', gridTemplateColumns:gridCols, overflowY:isMobile?'auto':'hidden' }}>
          <div style={{ display:'flex', flexDirection:'column', justifyContent:'center', padding:isMobile?'72px 24px 32px':'0 64px', color:'rgba(238,241,246,0.6)' }}>
            <div style={{ ...eyebrow, color:C.brass, marginBottom:16 }}>07 — Monitoraggio</div>
            <h2 style={{ fontSize:h2Size, fontWeight:600, letterSpacing:'-0.03em', color:'#EEF1F6', lineHeight:1.1, marginBottom:16 }}>
              Tutte le commesse,<br/>una vista.
            </h2>
            <p style={{ ...mono, fontSize:12, lineHeight:1.8, marginBottom:24 }}>
              Monitora credito da incassare, residui e scadenze su tutte le commesse attive.
            </p>
            <FeatureList color={C.brass} items={['Credito totale da incassare','Commesse con residuo scaduto','Grafico valore per mese','Tabella ordinabile']}/>
          </div>
          {!isMobile && (
            <div style={{ display:'flex', alignItems:'center', justifyContent:'center', padding:48 }}>
              <MockScreen dark>
                <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                  <div style={{ ...mono, fontSize:8, letterSpacing:'0.2em', textTransform:'uppercase', color:'rgba(238,241,246,0.4)' }}>Monitoraggio commesse</div>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:6 }}>
                    {[['Contratti','€128.500','rgba(238,241,246,0.9)'],['Incassato','€47.200','#4ade80'],['Da incassare','€81.300','#f87171']].map(([l,v,c])=>(
                      <div key={l} style={{ background:'rgba(255,255,255,0.05)', padding:'8px 8px', borderRadius:2 }}>
                        <div style={{ ...mono, fontSize:7, color:'rgba(238,241,246,0.3)', marginBottom:4 }}>{l}</div>
                        <div style={{ fontSize:12, fontWeight:600, color:c }}>{v}</div>
                      </div>
                    ))}
                  </div>
                  {[['Casa Vacanze','Famiglia Bianchi','€32.000','€18.000'],['Uffici IF Group','IF Group Srl','€45.000','€12.000'],['Showroom Milano','Arredo Italia','€28.500','€28.500']].map(([nome,cliente,valore,residuo])=>(
                    <div key={nome} style={{ padding:'7px 8px', background:'rgba(255,255,255,0.03)', borderRadius:2 }}>
                      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:2 }}>
                        <div style={{ fontSize:10, fontWeight:600, color:'rgba(238,241,246,0.85)' }}>{nome}</div>
                        <div style={{ ...mono, fontSize:9, color:'#4ade80' }}>{valore}</div>
                      </div>
                      <div style={{ display:'flex', justifyContent:'space-between' }}>
                        <div style={{ ...mono, fontSize:8, color:'rgba(238,241,246,0.3)' }}>{cliente}</div>
                        <div style={{ ...mono, fontSize:8, color:'#f87171' }}>res. {residuo}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </MockScreen>
            </div>
          )}
        </section>

        {/* 8. FATTURE */}
        <section style={{ height:'100vh', scrollSnapAlign:'start', background:C.paper, display:'grid', gridTemplateColumns:gridCols, overflowY:isMobile?'auto':'hidden' }}>
          {!isMobile && (
            <div style={{ display:'flex', alignItems:'center', justifyContent:'center', padding:48, background:'rgba(19,49,92,0.04)' }}>
              <MockScreen>
                <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                  <div style={{ ...mono, fontSize:8, letterSpacing:'0.2em', textTransform:'uppercase', color:C.muted, marginBottom:4 }}>Fatture — 2026</div>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:6 }}>
                    {[['Emesse','€47.200',C.ink],['Pagate','€31.400','#1a6b3c'],['In attesa','€15.800','#b91c1c']].map(([l,v,c])=>(
                      <div key={l} style={{ background:C.paper, padding:'8px 8px' }}>
                        <div style={{ ...mono, fontSize:7, color:C.muted, marginBottom:3 }}>{l}</div>
                        <div style={{ fontSize:12, fontWeight:600, color:c }}>{v}</div>
                      </div>
                    ))}
                  </div>
                  {[{ n:'FT 2026/001', comm:'Uffici IF Group', imp:'€12.000', stato:'PAGATA', sc:'#1a6b3c' },{ n:'FT 2026/002', comm:'Casa Vacanze', imp:'€8.500', stato:'PAGATA', sc:'#1a6b3c' },{ n:'FT 2026/003', comm:'Showroom', imp:'€10.900', stato:'IN ATTESA', sc:'#8a847b' }].map(f=>(
                    <div key={f.n} style={{ padding:'7px 0', borderBottom:'0.5px solid rgba(14,14,13,0.06)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                      <div><div style={{ fontSize:11, fontWeight:600, color:C.ink }}>{f.n}</div><div style={{ ...mono, fontSize:8, color:C.muted }}>{f.comm}</div></div>
                      <div style={{ textAlign:'right' }}><div style={{ ...mono, fontSize:11, color:C.navy, fontWeight:600 }}>{f.imp}</div><div style={{ ...mono, fontSize:8, color:f.sc }}>{f.stato}</div></div>
                    </div>
                  ))}
                </div>
              </MockScreen>
            </div>
          )}
          <div style={{ display:'flex', flexDirection:'column', justifyContent:'center', padding:isMobile?'72px 24px 32px':'0 64px', color:'rgba(14,14,13,0.7)' }}>
            <div style={{ ...eyebrow, color:C.navy, marginBottom:16 }}>08 — Fatture</div>
            <h2 style={{ fontSize:h2Size, fontWeight:600, letterSpacing:'-0.03em', color:C.ink, lineHeight:1.1, marginBottom:16 }}>
              Monitoraggio fatture,<br/>senza pensieri.
            </h2>
            <p style={{ ...mono, fontSize:12, lineHeight:1.8, marginBottom:24 }}>
              Tieni traccia di ogni fattura emessa, pagata o in scadenza.
            </p>
            <FeatureList color={C.navy} items={['Fatture collegate alle commesse','Stato pagamento in tempo reale','Scadenze evidenziate','Storico completo esportabile']}/>
          </div>
        </section>

        {/* 9. PRICING */}
        <section style={{ height:'100vh', scrollSnapAlign:'start', background:C.paper, overflowY:'auto', display:'flex', flexDirection:'column' }}>
          <div style={{ padding:isMobile?'72px 20px 24px':'56px 48px 0', flexShrink:0 }}>
            <div style={{ ...eyebrow, color:C.navy, marginBottom:12 }}>Pricing</div>
            <div style={{ fontSize:isMobile?28:40, fontWeight:600, letterSpacing:'-0.03em', color:C.ink, marginBottom:isMobile?24:40 }}>
              Semplice e trasparente.
            </div>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:isMobile?'1fr':'repeat(3,1fr)', gap:isMobile?12:0, flex:1, borderTop:isMobile?'none':'0.5px solid rgba(14,14,13,0.1)', padding:isMobile?'0 20px 40px':0 }}>
            {PLANS.map((plan,i)=>(
              <div key={plan.id} style={{
                padding:isMobile?'24px 20px':'36px 32px', display:'flex', flexDirection:'column',
                borderRight:(!isMobile&&i<2)?'0.5px solid rgba(14,14,13,0.1)':'none',
                border:isMobile?`0.5px solid ${plan.highlight?C.navy:'rgba(14,14,13,0.1)'}`:undefined,
                background:plan.highlight?C.navy:'#fff',
                position:'relative',
              }}>
                {plan.highlight&&<div style={{ position:'absolute', top:12, right:12, ...mono, fontSize:8, letterSpacing:'0.15em', textTransform:'uppercase', background:C.brass, color:C.ink, padding:'3px 8px' }}>Consigliato</div>}
                <div style={{ ...mono, fontSize:9, letterSpacing:'0.25em', textTransform:'uppercase', color:plan.highlight?C.brass:C.muted, marginBottom:4 }}>{plan.name}</div>
                <div style={{ ...mono, fontSize:10, color:plan.highlight?'rgba(238,241,246,0.5)':C.muted, marginBottom:16 }}>{plan.desc}</div>
                <div style={{ marginBottom:20 }}>
                  <span style={{ fontSize:32, fontWeight:600, letterSpacing:'-0.03em', color:plan.highlight?'#EEF1F6':C.ink }}>{plan.price}</span>
                  <span style={{ ...mono, fontSize:10, color:plan.highlight?'rgba(238,241,246,0.5)':C.muted }}>{plan.period}</span>
                </div>
                <div style={{ display:'flex', flexDirection:'column', gap:7, flex:1, marginBottom:20 }}>
                  {plan.features.map((f,fi)=>(
                    <div key={fi} style={{ display:'flex', gap:8 }}>
                      <span style={{ color:plan.highlight?C.brass:'#1a6b3c', fontSize:11, flexShrink:0 }}>✓</span>
                      <span style={{ ...mono, fontSize:10, color:plan.highlight?'rgba(238,241,246,0.7)':'rgba(14,14,13,0.7)', lineHeight:1.5 }}>{f}</span>
                    </div>
                  ))}
                </div>
                <button onClick={onRegister} style={{ border:plan.highlight?'none':'0.5px solid rgba(14,14,13,0.3)', background:plan.highlight?C.brass:'transparent', color:C.ink, padding:'10px 0', width:'100%', ...mono, fontSize:11, letterSpacing:'0.08em', textTransform:'uppercase', cursor:'pointer', fontWeight:plan.highlight?600:400 }}>
                  {plan.cta} →
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* 10. FAQ */}
        <section style={{ height:'100vh', scrollSnapAlign:'start', background:'#fff', display:'flex', flexDirection:'column', justifyContent:isMobile?'flex-start':'center', padding:isMobile?'72px 20px 40px':'0 10vw', overflowY:'auto' }}>
          <div style={{ ...eyebrow, color:C.navy, marginBottom:isMobile?24:40 }}>Domande frequenti</div>
          <div style={{ maxWidth:720 }}>
            {FAQ_DATA.map((item,i)=>(
              <div key={i} style={{ borderTop:'0.5px solid rgba(14,14,13,0.12)', padding:'16px 0', cursor:'pointer' }}
                onClick={()=>setOpenFaq(openFaq===i?null:i)}>
                <div style={{ fontSize:isMobile?14:17, fontWeight:600, color:C.ink, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <span style={{ paddingRight:16 }}>{item.q}</span>
                  <span style={{ color:C.navy, fontSize:20, flexShrink:0 }}>{openFaq===i?'−':'+'}</span>
                </div>
                {openFaq===i&&(
                  <div style={{ ...mono, fontSize:11, lineHeight:1.8, color:'rgba(14,14,13,0.6)', marginTop:12 }}>{item.a}</div>
                )}
              </div>
            ))}
            <div style={{ borderTop:'0.5px solid rgba(14,14,13,0.12)' }}/>
          </div>
        </section>

        {/* 11. CTA */}
        <section style={{ height:'100vh', scrollSnapAlign:'start', background:C.ink, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', textAlign:'center', padding:isMobile?'60px 20px':'0 32px', position:'relative', overflow:'hidden' }}>
          <div style={{ position:'absolute', inset:0, background:'radial-gradient(ellipse at 40% 60%, #13315C 0%, #0E0E0D 65%)', opacity:0.8 }}/>
          <div style={{ position:'relative', zIndex:2, width:'100%' }}>
            <div style={{ ...eyebrow, color:'rgba(217,201,138,0.5)', marginBottom:isMobile?16:24 }}>Pronto a iniziare?</div>
            <h2 style={{ fontSize:isMobile?32:64, fontWeight:600, letterSpacing:'-0.04em', color:'#EEF1F6', lineHeight:1.05, marginBottom:16 }}>
              Il tuo studio merita<br/>
              <span style={{ color:C.brass }}>uno strumento su misura.</span>
            </h2>
            <p style={{ ...mono, fontSize:isMobile?12:12, lineHeight:1.8, color:'rgba(238,241,246,0.45)', maxWidth:400, margin:'0 auto 36px' }}>
              Inizia gratuitamente. Nessuna carta di credito richiesta.
            </p>
            <button onClick={onRegister} style={{ background:C.brass, border:'none', color:C.ink, padding:isMobile?'13px 28px':'16px 48px', ...mono, fontSize:isMobile?11:13, letterSpacing:'0.12em', textTransform:'uppercase', cursor:'pointer', fontWeight:700, width:isMobile?'100%':'auto' }}>
              Crea il tuo studio gratuitamente →
            </button>
          </div>
          <div style={{ position:'absolute', bottom:0, left:0, right:0, padding:isMobile?'16px 20px':'20px 48px', display:'flex', alignItems:'center', justifyContent:'space-between', borderTop:'0.5px solid rgba(238,241,246,0.06)', flexWrap:'wrap', gap:8 }}>
            <AsmSeal size="sm" showBorder={false} showBottom={false} theme="dark"/>
            <span style={{ ...mono, fontSize:9, letterSpacing:'0.15em', color:'rgba(238,241,246,0.25)', textTransform:'uppercase' }}>
              © 2026 ASM
            </span>
          </div>
        </section>

      </div>
    </div>
  );
}
