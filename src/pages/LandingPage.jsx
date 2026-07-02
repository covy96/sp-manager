import React, { useState, useEffect, useRef } from 'react';
import AsmSeal from '../components/AsmSeal';

/* ─── brand colors (landing) ─────────────────────────────────── */
const C = {
  ink:   '#0E0E0D',
  navy:  '#13315C',
  brass: '#D9C98A',
  paper: '#EEF1F6',
  muted: '#8a847b',
};
const mono    = { fontFamily: "'IBM Plex Mono', monospace" };
const eyebrow = { ...mono, fontSize: 10, letterSpacing: '0.3em', textTransform: 'uppercase' };

/* ─── Replica esatta del design system dell'app ─────────────────
   bg:      #e8eaf0
   surface: rgba(255,255,255,0.72)  — card/panel
   glassBg: rgba(248,249,252,0.98)  — modal
   sidebar: #0E0E0D
   radius:  14px  (sm: 10px)
   shadow:  0 4px 24px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.05)
   border:  rgba(0,0,0,0.10) (borderMd)
   ink:     #1a1a1e
   muted:   #7a7a8a
   navy:    #13315C
   brass:   #D9C98A
─────────────────────────────────────────────────────────────── */

const APP = {
  bg:       '#e8eaf0',
  surface:  'rgba(255,255,255,0.72)',
  ink:      '#1a1a1e',
  muted:    '#7a7a8a',
  navy:     '#13315C',
  brass:    '#D9C98A',
  border:   'rgba(0,0,0,0.10)',
  shadow:   '0 4px 24px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.05)',
  radius:   '14px',
  radiusSm: '10px',
  green:    '#1a6b3c',
  red:      '#b91c1c',
};

/* ─── AppShell: riproduce l'interfaccia reale dell'app ──────────
   Sidebar nera a sinistra + area contenuto su sfondo #e8eaf0      */
function AppShell({ activeLabel, children, w = 520, h = 340 }) {
  const MENU = [
    { n:'01', l:'Dashboard' },
    { n:'02', l:'Scrivania' },
    { n:'03', l:'Timesheet' },
    null,
    { n:'04', l:'Progetti' },
    { n:'05', l:'Offerte' },
    { n:'06', l:'Commesse' },
    null,
    { n:'10', l:'Team' },
    { n:'11', l:'Report' },
    { n:'13', l:'Gantt' },
  ];
  return (
    <div style={{
      width: w, height: h, borderRadius: 14,
      overflow: 'hidden',
      boxShadow: '0 32px 80px rgba(0,0,0,0.22), 0 4px 16px rgba(0,0,0,0.10)',
      border: '0.5px solid rgba(0,0,0,0.12)',
      display: 'flex',
      background: APP.bg,
    }}>
      {/* Sidebar */}
      <div style={{ width: 126, background: '#0E0E0D', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        {/* Logo area */}
        <div style={{ padding: '12px 12px 8px', borderBottom: '0.5px solid rgba(255,255,255,0.07)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <div style={{ width: 24, height: 24, borderRadius: 6, background: APP.navy, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: 10, fontWeight: 800, color: APP.brass, letterSpacing: '-0.05em' }}>ASM</span>
            </div>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.85)', letterSpacing: '-0.01em' }}>Studio</div>
          </div>
        </div>
        {/* Menu items */}
        <div style={{ padding: '6px 0', flex: 1, overflow: 'hidden' }}>
          {MENU.map((item, i) =>
            item === null
              ? <div key={i} style={{ height: '0.5px', background: 'rgba(255,255,255,0.07)', margin: '4px 0' }}/>
              : (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '5px 10px',
                  background: item.l === activeLabel ? 'rgba(255,255,255,0.12)' : 'transparent',
                  borderRadius: 7, margin: '1px 6px',
                  cursor: 'pointer',
                }}>
                  <span style={{ ...mono, fontSize: 7, color: item.l === activeLabel ? 'rgba(217,201,138,0.7)' : 'rgba(255,255,255,0.3)', width: 14, flexShrink: 0 }}>{item.n}</span>
                  <span style={{ fontSize: 9, fontWeight: item.l === activeLabel ? 600 : 400, color: item.l === activeLabel ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.6)', letterSpacing: '-0.01em' }}>{item.l}</span>
                </div>
              )
          )}
        </div>
        {/* Bottom user */}
        <div style={{ padding: '8px 10px', borderTop: '0.5px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 20, height: 20, borderRadius: '50%', background: APP.navy, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 7, fontWeight: 700, color: '#fff', flexShrink: 0 }}>AR</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 8, fontWeight: 600, color: 'rgba(255,255,255,0.8)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>A. Rossi</div>
            <div style={{ ...mono, fontSize: 6.5, color: 'rgba(255,255,255,0.35)' }}>Titolare</div>
          </div>
        </div>
      </div>
      {/* Content area */}
      <div style={{ flex: 1, background: APP.bg, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {/* Top header */}
        <div style={{ height: 36, background: 'rgba(232,234,240,0.75)', backdropFilter: 'blur(12px)', borderBottom: '0.5px solid rgba(255,255,255,0.55)', display: 'flex', alignItems: 'center', padding: '0 14px', justifyContent: 'space-between', flexShrink: 0 }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: APP.ink, letterSpacing: '-0.01em' }}>{activeLabel}</span>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <div style={{ width: 24, height: 16, background: 'rgba(0,0,0,0.07)', borderRadius: 4 }}/>
            <div style={{ width: 16, height: 16, background: 'rgba(0,0,0,0.07)', borderRadius: '50%' }}/>
          </div>
        </div>
        {/* Page content */}
        <div style={{ flex: 1, padding: 12, overflow: 'hidden' }}>
          {children}
        </div>
      </div>
    </div>
  );
}

/* ─── card come nell'app reale ─────────────────────────────────── */
function Card({ children, style = {} }) {
  return (
    <div style={{
      background: APP.surface,
      border: `1px solid ${APP.border}`,
      borderRadius: APP.radius,
      boxShadow: APP.shadow,
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      ...style,
    }}>
      {children}
    </div>
  );
}

/* stat box come nelle pagine reali */
function Stat({ label, value, color = APP.navy, bg }) {
  return (
    <div style={{ background: bg || APP.surface, border: `1px solid ${APP.border}`, borderRadius: APP.radiusSm, padding: '8px 12px', boxShadow: APP.shadow }}>
      <div style={{ ...mono, fontSize: 7.5, color: APP.muted, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 15, fontWeight: 700, color, letterSpacing: '-0.02em' }}>{value}</div>
    </div>
  );
}

/* ─── MOCK SCRIVANIA ─────────────────────────────────────────── */
function MockScrivania() {
  const tasks = [
    { t: 'Consegna tavole esecutive',    p: 'Blocco A — Milano',   d: 'Oggi',     sc: APP.red  },
    { t: 'Verifica progetto strutturale',p: 'Villa Lario',         d: 'Domani',   sc: APP.navy },
    { t: 'Invio preventivo',             p: 'Showroom Navigli',    d: 'Ven 20',   sc: APP.muted},
    { t: 'Sopralluogo cantiere',         p: 'Residenza Privata',   d: 'Lun 23',   sc: APP.muted},
  ];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, marginBottom: 4 }}>
        <Stat label="Progetti" value="8"   color={APP.navy}/>
        <Stat label="Task oggi" value="5"  color={APP.red}/>
        <Stat label="Ore sett." value="32h" color={APP.green}/>
      </div>
      <Card style={{ padding: '10px 12px' }}>
        <div style={{ ...mono, fontSize: 7.5, color: APP.muted, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 8 }}>Prossime scadenze</div>
        {tasks.map((r, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0', borderBottom: i < tasks.length-1 ? `0.5px solid ${APP.border}` : 'none' }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 600, color: APP.ink }}>{r.t}</div>
              <div style={{ ...mono, fontSize: 8, color: APP.muted }}>{r.p}</div>
            </div>
            <div style={{ ...mono, fontSize: 8.5, color: r.sc, flexShrink: 0, marginLeft: 8, fontWeight: r.sc !== APP.muted ? 600 : 400 }}>{r.d}</div>
          </div>
        ))}
      </Card>
    </div>
  );
}

/* ─── MOCK GANTT ─────────────────────────────────────────────── */
function MockGantt() {
  const bars = [
    { label: 'Concept design',       w: 22, x: 0,  color: '#13315C' },
    { label: 'Prog. definitivo',     w: 34, x: 12, color: '#1d4ed8' },
    { label: 'Autorizzazioni',       w: 18, x: 36, color: '#7c3aed' },
    { label: 'Direzione lavori',     w: 30, x: 52, color: '#b45309' },
    { label: 'Collaudo',             w: 13, x: 84, color: '#1a6b3c' },
  ];
  const months = ['Gen','Feb','Mar','Apr','Mag','Giu','Lug','Ago','Set','Ott','Nov','Dic'];
  return (
    <Card style={{ padding: '10px 12px' }}>
      {/* header mesi */}
      <div style={{ display: 'flex', marginBottom: 8, paddingBottom: 6, borderBottom: `0.5px solid ${APP.border}` }}>
        <div style={{ width: 108, flexShrink: 0 }}/>
        <div style={{ flex: 1, display: 'flex', justifyContent: 'space-between' }}>
          {months.map(m => <span key={m} style={{ ...mono, fontSize: 7, color: APP.muted }}>{m}</span>)}
        </div>
      </div>
      {bars.map(b => (
        <div key={b.label} style={{ display: 'flex', alignItems: 'center', marginBottom: 5 }}>
          <div style={{ width: 108, flexShrink: 0, fontSize: 8.5, fontWeight: 500, color: APP.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: 6 }}>{b.label}</div>
          <div style={{ flex: 1, height: 18, position: 'relative' }}>
            <div style={{ position: 'absolute', left: `${b.x}%`, width: `${b.w}%`, height: '100%', background: b.color, borderRadius: 4, display: 'flex', alignItems: 'center', paddingLeft: 6 }}>
              <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 7.5, fontWeight: 600, color: 'rgba(255,255,255,0.92)', whiteSpace: 'nowrap', overflow: 'hidden' }}>{b.label}</span>
            </div>
          </div>
        </div>
      ))}
    </Card>
  );
}

/* ─── MOCK COMMESSA ──────────────────────────────────────────── */
function MockCommessa() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
        <Stat label="Contratto"   value="€52.000" color={APP.ink}/>
        <Stat label="Incassato"   value="€21.000" color={APP.green}/>
        <Stat label="Residuo"     value="€31.000" color="#b45309"/>
      </div>
      <Card style={{ padding: '10px 12px' }}>
        <div style={{ ...mono, fontSize: 7.5, color: APP.muted, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 8 }}>Rate — Torre Uffici Centro</div>
        {[
          ['Acconto', '30%', '€15.600', '✓ Pagato', APP.green],
          ['SAL 1',   '40%', '€20.800', 'In attesa', APP.muted],
          ['Saldo',   '30%', '€15.600', 'In attesa', APP.muted],
        ].map(([r, p, v, s, sc]) => (
          <div key={r} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0', borderBottom: `0.5px solid ${APP.border}` }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: APP.ink }}>{r}</div>
            <div style={{ ...mono, fontSize: 8, color: APP.muted }}>{p}</div>
            <div style={{ fontSize: 10, fontWeight: 700, color: APP.navy }}>{v}</div>
            <div style={{ ...mono, fontSize: 8.5, color: sc, fontWeight: sc === APP.green ? 600 : 400 }}>{s}</div>
          </div>
        ))}
      </Card>
    </div>
  );
}

/* ─── MOCK TIMESHEET ─────────────────────────────────────────── */
function MockTimesheet() {
  const rows = [
    { i: 'AR', days: [8,8,0,7,8], color: '#13315C' },
    { i: 'MB', days: [6,8,8,0,7], color: '#1a6b3c' },
    { i: 'LC', days: [0,5,8,8,6], color: '#7c3aed' },
    { i: 'SP', days: [4,0,6,8,0], color: '#b45309' },
  ];
  const days = ['Lun','Mar','Mer','Gio','Ven'];
  return (
    <Card style={{ padding: '10px 12px' }}>
      <div style={{ ...mono, fontSize: 7.5, color: APP.muted, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 8 }}>Settimana 22 — Blocco A Milano</div>
      <div style={{ display: 'flex', marginBottom: 5 }}>
        <div style={{ width: 32, flexShrink: 0 }}/>
        {days.map(d => <div key={d} style={{ flex: 1, textAlign: 'center', ...mono, fontSize: 7.5, color: APP.muted }}>{d}</div>)}
        <div style={{ width: 28, ...mono, fontSize: 7.5, color: APP.muted, textAlign: 'right' }}>Tot</div>
      </div>
      {rows.map(r => (
        <div key={r.i} style={{ display: 'flex', alignItems: 'center', marginBottom: 5, paddingBottom: 5, borderBottom: `0.5px solid ${APP.border}` }}>
          <div style={{ width: 32, flexShrink: 0 }}>
            <div style={{ width: 22, height: 22, borderRadius: '50%', background: r.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 7.5, fontWeight: 700, color: '#fff' }}>{r.i}</div>
          </div>
          {r.days.map((h, i) => (
            <div key={i} style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
              {h > 0
                ? <span style={{ display: 'inline-flex', width: 24, height: 19, background: `${r.color}22`, borderRadius: 4, ...mono, fontSize: 8, color: r.color, fontWeight: 700, alignItems: 'center', justifyContent: 'center' }}>{h}h</span>
                : <span style={{ ...mono, fontSize: 9, color: 'rgba(14,14,13,0.2)' }}>—</span>
              }
            </div>
          ))}
          <div style={{ width: 28, textAlign: 'right', ...mono, fontSize: 9, fontWeight: 700, color: APP.navy }}>{r.days.reduce((s, v) => s + v, 0)}h</div>
        </div>
      ))}
    </Card>
  );
}

/* ─── MOCK MONITORAGGIO ──────────────────────────────────────── */
function MockMonitoraggio() {
  const items = [
    { name: 'Blocco A — Milano',    valore: 52000, incassato: 21000 },
    { name: 'Villa Lario',          valore: 38000, incassato: 38000 },
    { name: 'Showroom Navigli',     valore: 29500, incassato: 12000 },
    { name: 'Residenza Privata',    valore: 44000, incassato: 0     },
  ];
  const totV = items.reduce((s, i) => s + i.valore, 0);
  const totI = items.reduce((s, i) => s + i.incassato, 0);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
        <Stat label="Contratti"     value={`€${(totV/1000).toFixed(0)}k`} color={APP.ink}/>
        <Stat label="Incassato"     value={`€${(totI/1000).toFixed(0)}k`} color={APP.green}/>
        <Stat label="Da incassare"  value={`€${((totV-totI)/1000).toFixed(0)}k`} color="#b45309"/>
      </div>
      <Card style={{ padding: '10px 12px' }}>
        {items.map((item, idx) => {
          const pct = Math.round((item.incassato / item.valore) * 100);
          const saldato = pct === 100;
          return (
            <div key={item.name} style={{ marginBottom: idx < items.length - 1 ? 8 : 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                <div style={{ fontSize: 9.5, fontWeight: 600, color: APP.ink }}>{item.name}</div>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <span style={{ ...mono, fontSize: 9, fontWeight: 700, color: APP.navy }}>€{(item.valore/1000).toFixed(0)}k</span>
                  <span style={{ ...mono, fontSize: 8, color: saldato ? APP.green : '#b45309' }}>{saldato ? '✓ Saldato' : `res. €${((item.valore-item.incassato)/1000).toFixed(0)}k`}</span>
                </div>
              </div>
              <div style={{ height: 4, background: 'rgba(0,0,0,0.07)', borderRadius: 2 }}>
                <div style={{ height: 4, width: `${pct}%`, background: saldato ? APP.green : APP.navy, borderRadius: 2 }}/>
              </div>
            </div>
          );
        })}
      </Card>
    </div>
  );
}

/* ─── MOCK REPORT ────────────────────────────────────────────── */
function MockReport() {
  const rows = [
    { name: 'Blocco A — Milano',  ore: 54, color: '#13315C' },
    { name: 'Villa Lario',        ore: 41, color: '#1d4ed8' },
    { name: 'Showroom Navigli',   ore: 28, color: '#7c3aed' },
    { name: 'Residenza Privata',  ore: 16, color: '#b45309' },
  ];
  const max = 54;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
        <Stat label="Ore totali"   value="139h"  color="#1a6b3c"/>
        <Stat label="Progetti"     value="4"     color={APP.navy}/>
        <Stat label="Ore / sett."  value="34h"   color={APP.ink}/>
        <Stat label="Ore anno"     value="487h"  color={APP.ink}/>
      </div>
      <Card style={{ padding: '10px 12px' }}>
        <div style={{ ...mono, fontSize: 7.5, color: APP.muted, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 8 }}>Distribuzione — Maggio 2026</div>
        {rows.map(r => (
          <div key={r.name} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <div style={{ ...mono, fontSize: 8.5, color: APP.muted, width: 110, flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</div>
            <div style={{ flex: 1, height: 6, background: 'rgba(0,0,0,0.07)', borderRadius: 3 }}>
              <div style={{ height: 6, width: `${(r.ore/max)*100}%`, background: r.color, borderRadius: 3 }}/>
            </div>
            <div style={{ ...mono, fontSize: 8.5, color: APP.muted, width: 28, textAlign: 'right' }}>{r.ore}h</div>
          </div>
        ))}
      </Card>
    </div>
  );
}

/* ─── MOCK ANALISI HUB ───────────────────────────────────────── */
function MockAnalisiHub() {
  const offerte = [
    { n: 'Blocco A — Milano',   v: '€52.000', s: 'In corso',  sc: APP.navy },
    { n: 'Villa Lario',          v: '€38.000', s: 'Accettata', sc: APP.green },
    { n: 'Showroom Navigli',     v: '€29.500', s: 'In attesa', sc: APP.muted },
  ];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
        <Stat label="Offerte tot."  value="12"      color={APP.ink}/>
        <Stat label="Valore"        value="€214k"   color={APP.navy}/>
        <Stat label="Conversione"   value="68%"     color={APP.green}/>
      </div>
      <Card style={{ padding: '10px 12px' }}>
        <div style={{ ...mono, fontSize: 7.5, color: APP.muted, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 8 }}>Offerte recenti</div>
        {offerte.map((o, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0', borderBottom: i < offerte.length-1 ? `0.5px solid ${APP.border}` : 'none' }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: APP.ink }}>{o.n}</div>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <span style={{ ...mono, fontSize: 9, fontWeight: 700, color: APP.navy }}>{o.v}</span>
              <span style={{ ...mono, fontSize: 8.5, color: o.sc, fontWeight: o.sc !== APP.muted ? 600 : 400 }}>{o.s}</span>
            </div>
          </div>
        ))}
      </Card>
    </div>
  );
}

/* ─── MOCK PREVENTIVO CAPEX ──────────────────────────────────── */
function MockPreventivo() {
  const voci = [
    { cat: 'Progettazione',  desc: 'Onorario professionale',   v: '€18.000', tipo: 'Opex' },
    { cat: 'Strutture',      desc: 'Calcolo strutturale',      v: '€4.500',  tipo: 'Opex' },
    { cat: 'Arredi',         desc: 'Cucina e living',          v: '€32.000', tipo: 'Capex' },
    { cat: 'Impianti',       desc: 'Elettrico + termico',      v: '€9.800',  tipo: 'Capex' },
  ];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
        <Stat label="Totale Opex"  value="€22.500" color={APP.navy}/>
        <Stat label="Totale Capex" value="€41.800" color="#b45309"/>
      </div>
      <Card style={{ padding: '10px 12px' }}>
        <div style={{ ...mono, fontSize: 7.5, color: APP.muted, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 8 }}>Voci preventivo — Residenza Privata</div>
        {voci.map((v, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0', borderBottom: i < voci.length-1 ? `0.5px solid ${APP.border}` : 'none' }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 600, color: APP.ink }}>{v.desc}</div>
              <div style={{ ...mono, fontSize: 8, color: APP.muted }}>{v.cat}</div>
            </div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <span style={{ ...mono, fontSize: 9, fontWeight: 700, color: APP.navy }}>{v.v}</span>
              <span style={{ ...mono, fontSize: 8, color: v.tipo === 'Capex' ? '#b45309' : APP.green, background: v.tipo === 'Capex' ? 'rgba(180,83,9,0.1)' : 'rgba(26,107,60,0.1)', padding: '2px 5px', borderRadius: 3 }}>{v.tipo}</span>
            </div>
          </div>
        ))}
      </Card>
    </div>
  );
}

/* ─── MOCK ANALISI FATTURE ───────────────────────────────────── */
function MockFatture() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
        <Stat label="Emesse"    value="€73.400" color={APP.ink}/>
        <Stat label="Pagate"    value="€42.200" color={APP.green}/>
        <Stat label="In attesa" value="€31.200" color="#b45309"/>
      </div>
      <Card style={{ padding: '10px 12px' }}>
        {[
          { n: 'FT 2026/001', p: 'Blocco A — Milano',  v: '€15.600', s: 'PAGATA',    sc: APP.green },
          { n: 'FT 2026/002', p: 'Villa Lario',         v: '€20.800', s: 'PAGATA',    sc: APP.green },
          { n: 'FT 2026/003', p: 'Showroom Navigli',    v: '€11.800', s: 'IN ATTESA', sc: APP.muted },
          { n: 'FT 2026/004', p: 'Residenza Privata',   v: '€19.200', s: 'IN ATTESA', sc: APP.muted },
        ].map(f => (
          <div key={f.n} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0', borderBottom: `0.5px solid ${APP.border}` }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 600, color: APP.ink }}>{f.n}</div>
              <div style={{ ...mono, fontSize: 8, color: APP.muted }}>{f.p}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ ...mono, fontSize: 10, fontWeight: 700, color: APP.navy }}>{f.v}</div>
              <div style={{ ...mono, fontSize: 8, color: f.sc, fontWeight: f.sc === APP.green ? 600 : 400 }}>{f.s}</div>
            </div>
          </div>
        ))}
      </Card>
    </div>
  );
}

/* ─── PIANI ──────────────────────────────────────────────────── */
const PLANS = [
  { id: 'free',   name: 'Free',   price: '€0',     period: '/mese', desc: 'Per iniziare',           highlight: false, cta: 'Inizia gratis', trial: false,
    features: ['1 utente interno','1 collaboratore esterno','5 progetti','5 commesse','Task e timesheet','Calendario'] },
  { id: 'studio', name: 'Studio', price: '€19,99', period: '/mese', desc: 'Per studi in crescita',  highlight: false, cta: '1 mese gratis', trial: true,
    features: ['Fino a 5 utenti','15 progetti','15 commesse','Analisi Hub e report avanzati','Proforma, fatture e CAPEX'] },
  { id: 'pro',    name: 'Pro',    price: '€29,99', period: '/mese', desc: 'Per studi professionali', highlight: true,  cta: '1 mese gratis', trial: true,
    features: ['Tutto di Studio','Utenti illimitati','Progetti illimitati','Commesse illimitate','Gantt','Report di cantiere'] },
];

/* ─── FAQ ────────────────────────────────────────────────────── */
const FAQ_DATA = [
  { q: 'Come funziona il mese gratuito?',           a: 'I piani Studio e Pro includono 30 giorni di prova gratuita. Al momento dell\'iscrizione inserisci i dati della carta su Stripe — non viene addebitato nulla per i primi 30 giorni. Dal secondo mese l\'abbonamento si rinnova automaticamente. Puoi disdire in qualsiasi momento prima della scadenza.' },
  { q: 'ASM è adatto a studi piccoli?',             a: 'Sì, è pensato per studi da 1 a 20 persone. Scala con te — inizia gratis e passa a un piano superiore solo quando cresci.' },
  { q: 'I miei dati sono al sicuro?',               a: 'I dati sono archiviati su infrastruttura cloud europea con backup automatici. Puoi esportare tutto in qualsiasi momento — i tuoi dati sono sempre tuoi.' },
  { q: 'È necessario installare qualcosa?',         a: 'No, ASM è interamente web-based. Funziona su qualsiasi browser. Su smartphone si installa come app in un tap (PWA), senza passare dall\'App Store.' },
  { q: 'Posso cambiare piano in qualsiasi momento?',a: 'Sì, upgrade o downgrade in qualsiasi momento. Il cambio è immediato.' },
  { q: 'Come funziona la fatturazione?',            a: 'ASM supporta due flussi: Proforma → Pagamento → Fattura per privati e studi associati, oppure Fattura diretta → Pagamento per le società.' },
];

function FeatureList({ items, color }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {items.map(f => (
        <div key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          <span style={{ color, fontSize: 12, marginTop: 1, flexShrink: 0 }}>→</span>
          <span style={{ ...mono, fontSize: 11, lineHeight: 1.6 }}>{f}</span>
        </div>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════ */
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
      const sections = el.querySelectorAll('section');
      let idx = 0;
      sections.forEach((s, i) => { if (s.offsetTop <= el.scrollTop + 10) idx = i; });
      setActive(idx);
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  const scrollTo = (idx) => {
    setMenuOpen(false);
    const section = containerRef.current?.querySelectorAll('section')[idx];
    section?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const SECTIONS = ['hero','scrivania','gantt','commesse','timesheet','monitoraggio','report','fatture','analisi-hub','preventivo','pricing','faq','cta'];
  const gridCols = isMobile ? '1fr' : '1fr 1fr';
  const h2 = isMobile ? 28 : 48;
  const pad = isMobile ? '80px 22px 40px' : '0 64px';

  return (
    <div style={{ position: 'fixed', inset: 0, overflow: 'hidden', fontFamily: "'Space Grotesk', sans-serif" }}>

      {/* ── NAV ── */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 200,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: isMobile ? '0 16px' : '0 48px', height: 52,
        background: activeSection === 0 ? 'transparent' : 'rgba(238,241,246,0.94)',
        backdropFilter: activeSection > 0 ? 'blur(12px)' : 'none',
        borderBottom: activeSection > 0 ? '0.5px solid rgba(14,14,13,0.1)' : 'none',
        transition: 'all 0.3s',
      }}>
        <AsmSeal size={isMobile ? 'xs' : 'sm'} showBorder={false} showBottom={false} showTop={!isMobile} theme={activeSection === 0 ? 'dark' : 'light'}/>
        {isMobile ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button onClick={onLogin} style={{ background: 'transparent', border: `1px solid ${activeSection===0?'rgba(238,241,246,0.45)':'rgba(14,14,13,0.25)'}`, color: activeSection===0?'#EEF1F6':C.ink, padding: '7px 14px', ...mono, fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer' }}>Accedi</button>
            <button onClick={onRegister} style={{ background: C.brass, border: 'none', color: C.ink, padding: '7px 14px', ...mono, fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer', fontWeight: 700 }}>Registrati</button>
            <button onClick={() => setMenuOpen(!menuOpen)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 4, padding: 4 }}>
              {[0,1,2].map(i => <div key={i} style={{ width: 20, height: 1.5, background: activeSection===0?'#EEF1F6':C.ink, borderRadius: 1 }}/>)}
            </button>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', gap: 28 }}>
              {[['Funzionalità',1],['Pricing',10],['FAQ',11]].map(([label,idx]) => (
                <button key={label} onClick={() => scrollTo(idx)} style={{ ...mono, fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', background: 'none', border: 'none', cursor: 'pointer', color: activeSection===0?'rgba(238,241,246,0.75)':C.muted }}>{label}</button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={onLogin} style={{ border: `0.5px solid ${activeSection===0?'rgba(238,241,246,0.4)':'rgba(14,14,13,0.25)'}`, background: 'transparent', color: activeSection===0?'#EEF1F6':C.ink, padding: '7px 18px', ...mono, fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer' }}>Accedi</button>
              <button onClick={onJoin} style={{ border: `0.5px solid ${activeSection===0?'rgba(238,241,246,0.3)':'rgba(14,14,13,0.2)'}`, background: 'transparent', color: activeSection===0?'rgba(238,241,246,0.8)':C.ink, padding: '7px 18px', ...mono, fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer' }}>Entra</button>
              <button onClick={onRegister} style={{ border: 'none', background: C.brass, color: C.ink, padding: '7px 22px', ...mono, fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer', fontWeight: 700 }}>Crea Studio →</button>
            </div>
          </>
        )}
      </nav>

      {/* Mobile menu */}
      {isMobile && menuOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 190, background: 'rgba(238,241,246,0.97)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 28 }}>
          {[['Funzionalità',1],['Pricing',10],['FAQ',11]].map(([label,idx]) => (
            <button key={label} onClick={() => scrollTo(idx)} style={{ ...mono, fontSize: 14, letterSpacing: '0.15em', textTransform: 'uppercase', background: 'none', border: 'none', cursor: 'pointer', color: C.ink }}>{label}</button>
          ))}
          <div style={{ width: 40, height: '0.5px', background: 'rgba(14,14,13,0.15)' }}/>
          <button onClick={() => { setMenuOpen(false); onLogin(); }} style={{ ...mono, fontSize: 13, letterSpacing: '0.1em', textTransform: 'uppercase', background: 'none', border: `0.5px solid ${C.ink}`, color: C.ink, padding: '10px 28px', cursor: 'pointer' }}>Accedi</button>
          <button onClick={() => { setMenuOpen(false); onJoin(); }} style={{ ...mono, fontSize: 13, letterSpacing: '0.1em', textTransform: 'uppercase', background: 'none', border: `0.5px solid ${C.ink}`, color: C.ink, padding: '10px 28px', cursor: 'pointer' }}>Entra in uno studio</button>
          <button onClick={() => setMenuOpen(false)} style={{ position: 'absolute', top: 16, right: 20, background: 'none', border: 'none', fontSize: 24, cursor: 'pointer', color: C.muted }}>×</button>
        </div>
      )}

      {/* Dot navigator */}
      {!isMobile && (
        <div style={{ position: 'fixed', right: 24, top: '50%', transform: 'translateY(-50%)', zIndex: 200, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {SECTIONS.map((s, i) => (
            <button key={s} onClick={() => scrollTo(i)} style={{ width: 6, height: 6, borderRadius: '50%', border: 'none', cursor: 'pointer', padding: 0, background: activeSection===i ? C.navy : 'rgba(14,14,13,0.18)', transform: activeSection===i ? 'scale(1.5)' : 'scale(1)', transition: 'all 0.2s' }}/>
          ))}
        </div>
      )}

      {/* ── SCROLL CONTAINER ── */}
      <div ref={containerRef} style={{ height: '100vh', overflowY: 'scroll', scrollSnapType: isMobile ? 'none' : 'y mandatory' }}>

        {/* 0 · HERO */}
        <section style={{ height: '100vh', scrollSnapAlign: 'start', background: C.ink, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 58% 38%, #13315C 0%, #0E0E0D 68%)', opacity: 0.95 }}/>
          <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(238,241,246,0.022) 1px, transparent 1px), linear-gradient(90deg, rgba(238,241,246,0.022) 1px, transparent 1px)', backgroundSize: '52px 52px' }}/>
          {!isMobile && <div style={{ position: 'absolute', top: '10%', right: '7%', opacity: 0.05 }}><AsmSeal size="hero" theme="dark"/></div>}
          <div style={{ position: 'relative', zIndex: 2, textAlign: 'center', maxWidth: 780, padding: '0 20px' }}>
            <div style={{ ...eyebrow, color: 'rgba(217,201,138,0.6)', marginBottom: isMobile?14:26 }}>Gestionale per studi di architettura</div>
            <h1 style={{ fontSize: isMobile?38:76, fontWeight: 600, lineHeight: 1.02, letterSpacing: '-0.045em', color: '#EEF1F6', marginBottom: isMobile?16:22 }}>
              Tutto il tuo studio.<br/><span style={{ color: C.brass }}>Un solo posto.</span>
            </h1>
            <p style={{ ...mono, fontSize: isMobile?12:13, lineHeight: 1.85, color: 'rgba(238,241,246,0.45)', margin: `0 auto ${isMobile?28:40}px`, maxWidth: 440 }}>
              Progetti, Gantt, commesse, timesheet e analisi.<br/>Fatto per architetti — non per contabili.<br/><span style={{ color: 'rgba(217,201,138,0.55)' }}>1 mese gratuito su tutti i piani a pagamento.</span>
            </p>
            <div style={{ display: 'flex', flexDirection: isMobile?'column':'row', gap: 12, justifyContent: 'center', alignItems: 'center' }}>
              {isMobile && <button onClick={onLogin} style={{ background: '#EEF1F6', border: 'none', color: C.ink, padding: '13px 28px', ...mono, fontSize: 12, letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer', fontWeight: 700, width: '100%' }}>Accedi all'app →</button>}
              <button onClick={onRegister} style={{ background: C.brass, border: 'none', color: C.ink, padding: isMobile?'12px 28px':'14px 40px', ...mono, fontSize: isMobile?11:12, letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer', fontWeight: 700, width: isMobile?'100%':'auto' }}>
                {isMobile ? 'Crea un nuovo studio →' : 'Crea il tuo studio →'}
              </button>
              {!isMobile && <button onClick={() => scrollTo(1)} style={{ background: 'transparent', border: '0.5px solid rgba(238,241,246,0.25)', color: 'rgba(238,241,246,0.65)', padding: '14px 36px', ...mono, fontSize: 12, letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer' }}>Scopri di più ↓</button>}
            </div>
            <div style={{ marginTop: 14 }}>
              <button onClick={onJoin} style={{ background: 'none', border: 'none', color: 'rgba(238,241,246,0.3)', ...mono, fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: 3 }}>Hai un codice invito? Entra in uno studio</button>
            </div>
          </div>
          {!isMobile && (
            <div style={{ position: 'absolute', bottom: 30, left: '50%', transform: 'translateX(-50%)', ...mono, fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(238,241,246,0.22)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
              <span>Scorri</span><div style={{ width: 1, height: 30, background: 'rgba(238,241,246,0.15)' }}/>
            </div>
          )}
        </section>

        {/* ── helper per le sezioni feature ── */}
        {[
          { idx:1, label:'Scrivania', num:'01', bg:C.paper,      dark:false, textColor:'rgba(14,14,13,0.7)', accent:C.navy, mockLabel:'Scrivania', mock:<MockScrivania/>,    flip:false,
            title:'Il punto di partenza\ndi ogni giornata.',
            desc:'Un pannello personale con le task di oggi, i progetti attivi e le prossime scadenze. Tutto in un colpo d’occhio.',
            features:['Task assegnate in evidenza','Prossime scadenze del team','Statistiche settimanali','Vista personalizzata per ruolo'] },
          { idx:2, label:'Gantt', num:'02', bg:C.ink,         dark:true,  textColor:'rgba(238,241,246,0.6)', accent:C.brass, mockLabel:'Gantt', mock:<MockGantt/>,         flip:true,
            title:'La timeline di\nogni progetto.',
            desc:'Pianifica le fasi su una timeline drag & drop. Vedi chi fa cosa e quando. Esporta come immagine ad alta risoluzione.',
            features:['Drag & drop su ogni fase','Colori e etichette personalizzabili','Dipendenze tra fasi','Export SVG in un click'] },
          { idx:3, label:'Commesse', num:'03', bg:'#fff',          dark:false, textColor:'rgba(14,14,13,0.7)', accent:C.navy, mockLabel:'Commesse', mock:<MockCommessa/>,    flip:false,
            title:'Incassi e scadenze\nsempre visibili.',
            desc:'Crea offerte, suddividi in rate, emetti proforma e tieni traccia di ogni pagamento ricevuto.',
            features:['Proforma → Pagamento → Fattura','Fattura diretta per Srl e Spa','Costi extra e collaboratori','Monitoraggio residuo in tempo reale'] },
          { idx:4, label:'Timesheet', num:'04', bg:'#13315C',      dark:true,  textColor:'rgba(238,241,246,0.6)', accent:C.brass, mockLabel:'Timesheet', mock:<MockTimesheet/>,  flip:true,
            title:'Sai esattamente dove\nva il tuo tempo.',
            desc:'Ogni membro registra le ore per progetto. Dal desktop o dallo smartphone, sempre aggiornato.',
            features:['Registrazione giornaliera per progetto','Note per ogni voce','Vista settimanale del team','Export Excel e CSV'] },
          { idx:5, label:'Monitoraggio', num:'05', bg:C.paper,      dark:false, textColor:'rgba(14,14,13,0.7)', accent:C.navy, mockLabel:'Monitoraggio', mock:<MockMonitoraggio/>, flip:false,
            title:'Tutte le commesse,\nuna vista.',
            desc:'Contratti totali, incassato e residuo su tutte le commesse attive. Zero fogli Excel.',
            features:['Credito totale da incassare','Commesse con residuo scaduto','Barra di avanzamento per commessa','Tabella ordinabile ed esportabile'] },
          { idx:6, label:'Report', num:'06', bg:C.ink,         dark:true,  textColor:'rgba(238,241,246,0.6)', accent:C.brass, mockLabel:'Report', mock:<MockReport/>,       flip:true,
            title:'Dati chiari,\ndecisioni migliori.',
            desc:'Report settimanali e mensili per progetto, cliente e membro del team. Sempre aggiornati.',
            features:['Vista settimanale e mensile','Ore per progetto, cliente e utente','Andamento con grafici','Export Excel e CSV'] },
          { idx:7, label:'Analisi fatture', num:'07', bg:'#fff',          dark:false, textColor:'rgba(14,14,13,0.7)', accent:C.navy, mockLabel:'Fatture', mock:<MockFatture/>,     flip:false,
            title:'Hai sempre chiaro\ncosa è stato pagato.',
            desc:'Tieni traccia di ogni proforma e fattura emessa, con stato pagamento in tempo reale e storico completo.',
            features:['Collegate alle commesse','Proforma e fattura diretta','Scadenze evidenziate automaticamente','Storico completo esportabile'] },
          { idx:8, label:'Analisi Hub', num:'08', bg:C.ink,         dark:true,  textColor:'rgba(238,241,246,0.6)', accent:C.brass, mockLabel:'Analisi', mock:<MockAnalisiHub/>,  flip:true,
            title:"Tutte le offerte,\nun colpo d’occhio.",
            desc:'Un hub centralizzato per analizzare lo stato delle offerte, il valore prodotto e il tasso di conversione. Tieni il polso della crescita commerciale dello studio.',
            features:['Stato e valore di ogni offerta','Tasso di conversione','Analisi per cliente e periodo','Confronto offerte → commesse'] },
          { idx:9, label:'Preventivi CAPEX', num:'09', bg:C.paper,    dark:false, textColor:'rgba(14,14,13,0.7)', accent:C.navy, mockLabel:'Offerte', mock:<MockPreventivo/>,   flip:false,
            title:'Separa CAPEX e OPEX\nnello stesso preventivo.',
            desc:'Distingui automaticamente le voci di spesa corrente (OPEX) da quelle in conto capitale (CAPEX). Utile per clienti privati e società.',
            features:['Voci CAPEX e OPEX nello stesso preventivo','Totali separati per categoria','Esportazione PDF differenziata','Collegate alle commesse'] },
        ].map(({ idx, label, num, bg, dark, textColor, accent, mockLabel, mock, flip, title, desc, features }) => (
          <section key={idx} style={{ height: isMobile ? 'auto' : '100vh', minHeight: isMobile ? undefined : '100vh', scrollSnapAlign: isMobile ? undefined : 'start', background: bg, display: 'grid', gridTemplateColumns: gridCols, overflowY: isMobile ? 'visible' : 'hidden' }}>
            {/* testo — se flip e non mobile va a destra */}
            {(!flip || isMobile) && (
              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: pad, color: textColor, order: flip && !isMobile ? 2 : 1 }}>
                <div style={{ ...eyebrow, color: accent, marginBottom: 16 }}>{num} — {label}</div>
                <h2 style={{ fontSize: h2, fontWeight: 600, letterSpacing: '-0.03em', color: dark ? '#EEF1F6' : C.ink, lineHeight: 1.1, marginBottom: 16, whiteSpace: 'pre-line' }}>{title}</h2>
                <p style={{ ...mono, fontSize: 12, lineHeight: 1.8, marginBottom: 24 }}>{desc}</p>
                <FeatureList color={accent} items={features}/>
              </div>
            )}
            {!isMobile && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 32, background: dark ? 'rgba(0,0,0,0.15)' : 'rgba(19,49,92,0.04)', order: flip ? 1 : 2 }}>
                <AppShell activeLabel={mockLabel} w={500} h={330}>{mock}</AppShell>
              </div>
            )}
            {isMobile && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 22px 32px', order: 3 }}>
                <div style={{ width: 320, height: 211, position: 'relative' }}>
                  <div style={{ position: 'absolute', top: 0, left: 0, transform: 'scale(0.64)', transformOrigin: 'top left' }}>
                    <AppShell activeLabel={mockLabel} w={500} h={330}>{mock}</AppShell>
                  </div>
                </div>
              </div>
            )}
            {flip && !isMobile && (
              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: pad, color: textColor, order: 2 }}>
                <div style={{ ...eyebrow, color: accent, marginBottom: 16 }}>{num} — {label}</div>
                <h2 style={{ fontSize: h2, fontWeight: 600, letterSpacing: '-0.03em', color: dark ? '#EEF1F6' : C.ink, lineHeight: 1.1, marginBottom: 16, whiteSpace: 'pre-line' }}>{title}</h2>
                <p style={{ ...mono, fontSize: 12, lineHeight: 1.8, marginBottom: 24 }}>{desc}</p>
                <FeatureList color={accent} items={features}/>
              </div>
            )}
          </section>
        ))}

        {/* 8 · PRICING */}
        <section style={{ height: isMobile ? 'auto' : '100vh', minHeight: isMobile ? undefined : '100vh', scrollSnapAlign: isMobile ? undefined : 'start', background: C.paper, overflowY: isMobile ? 'visible' : 'auto', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: isMobile?'72px 20px 24px':'56px 48px 0', flexShrink: 0 }}>
            <div style={{ ...eyebrow, color: C.navy, marginBottom: 12 }}>Pricing</div>
            <div style={{ fontSize: isMobile?28:40, fontWeight: 600, letterSpacing: '-0.03em', color: C.ink, marginBottom: isMobile?24:36 }}>Semplice e trasparente.</div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile?'1fr':'repeat(3,1fr)', gap: isMobile?12:0, flex: 1, borderTop: isMobile?'none':'0.5px solid rgba(14,14,13,0.1)', padding: isMobile?'0 20px 40px':0 }}>
            {PLANS.map((plan, i) => (
              <div key={plan.id} style={{ padding: isMobile?'24px 20px':'36px 32px', display: 'flex', flexDirection: 'column', borderRight: (!isMobile&&i<2)?'0.5px solid rgba(14,14,13,0.1)':'none', border: isMobile?`0.5px solid ${plan.highlight?C.navy:'rgba(14,14,13,0.1)'}`:undefined, background: plan.highlight ? C.navy : '#fff', position: 'relative' }}>
                {plan.highlight && <div style={{ position: 'absolute', top: 12, right: 12, ...mono, fontSize: 8, letterSpacing: '0.15em', textTransform: 'uppercase', background: C.brass, color: C.ink, padding: '3px 8px' }}>Consigliato</div>}
                {plan.trial && !plan.highlight && <div style={{ position: 'absolute', top: 12, right: 12, ...mono, fontSize: 8, letterSpacing: '0.15em', textTransform: 'uppercase', background: 'rgba(26,107,60,0.12)', color: '#1a6b3c', padding: '3px 8px', border: '0.5px solid rgba(26,107,60,0.25)' }}>30 giorni gratis</div>}
                <div style={{ ...mono, fontSize: 9, letterSpacing: '0.25em', textTransform: 'uppercase', color: plan.highlight?C.brass:C.muted, marginBottom: 4 }}>{plan.name}</div>
                <div style={{ ...mono, fontSize: 10, color: plan.highlight?'rgba(238,241,246,0.45)':C.muted, marginBottom: 16 }}>{plan.desc}</div>
                <div style={{ marginBottom: plan.trial ? 6 : 20 }}>
                  <span style={{ fontSize: 32, fontWeight: 600, letterSpacing: '-0.03em', color: plan.highlight?'#EEF1F6':C.ink }}>{plan.price}</span>
                  <span style={{ ...mono, fontSize: 10, color: plan.highlight?'rgba(238,241,246,0.45)':C.muted }}>{plan.period}</span>
                </div>
                {plan.trial && (
                  <div style={{ ...mono, fontSize: 9, color: plan.highlight ? 'rgba(217,201,138,0.7)' : '#1a6b3c', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 5 }}>
                    <span>✓</span><span>1° mese gratuito — poi {plan.price}{plan.period}</span>
                  </div>
                )}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 7, flex: 1, marginBottom: 20 }}>
                  {plan.features.map((f, fi) => (
                    <div key={fi} style={{ display: 'flex', gap: 8 }}>
                      <span style={{ color: plan.highlight?C.brass:'#1a6b3c', fontSize: 11, flexShrink: 0 }}>✓</span>
                      <span style={{ ...mono, fontSize: 10, color: plan.highlight?'rgba(238,241,246,0.7)':'rgba(14,14,13,0.65)', lineHeight: 1.5 }}>{f}</span>
                    </div>
                  ))}
                </div>
                <button onClick={onRegister} style={{ border: plan.highlight?'none':'0.5px solid rgba(14,14,13,0.25)', background: plan.highlight?C.brass:'transparent', color: C.ink, padding: '10px 0', width: '100%', ...mono, fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer', fontWeight: plan.highlight?600:400 }}>{plan.cta} →</button>
              </div>
            ))}
          </div>
        </section>

        {/* 9 · FAQ */}
        <section style={{ height: isMobile ? 'auto' : '100vh', minHeight: isMobile ? undefined : '100vh', scrollSnapAlign: isMobile ? undefined : 'start', background: '#fff', display: 'flex', flexDirection: 'column', justifyContent: isMobile?'flex-start':'center', padding: isMobile?'72px 20px 40px':'0 10vw', overflowY: isMobile ? 'visible' : 'auto' }}>
          <div style={{ ...eyebrow, color: C.navy, marginBottom: isMobile?24:40 }}>Domande frequenti</div>
          <div style={{ maxWidth: 720 }}>
            {FAQ_DATA.map((item, i) => (
              <div key={i} style={{ borderTop: '0.5px solid rgba(14,14,13,0.1)', padding: '16px 0', cursor: 'pointer' }} onClick={() => setOpenFaq(openFaq===i?null:i)}>
                <div style={{ fontSize: isMobile?14:16, fontWeight: 600, color: C.ink, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ paddingRight: 16 }}>{item.q}</span>
                  <span style={{ color: C.navy, fontSize: 20, flexShrink: 0 }}>{openFaq===i?'−':'+'}</span>
                </div>
                {openFaq===i && <div style={{ ...mono, fontSize: 11, lineHeight: 1.85, color: 'rgba(14,14,13,0.6)', marginTop: 12 }}>{item.a}</div>}
              </div>
            ))}
            <div style={{ borderTop: '0.5px solid rgba(14,14,13,0.1)' }}/>
          </div>
        </section>

        {/* 10 · CTA */}
        <section style={{ height: isMobile ? 'auto' : '100vh', minHeight: '100vh', scrollSnapAlign: isMobile ? undefined : 'start', background: C.ink, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: isMobile?'60px 20px 90px':'0 32px', position: 'relative', overflow: isMobile ? 'visible' : 'hidden' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 40% 60%, #13315C 0%, #0E0E0D 65%)', opacity: 0.85 }}/>
          <div style={{ position: 'relative', zIndex: 2, width: '100%' }}>
            <div style={{ ...eyebrow, color: 'rgba(217,201,138,0.45)', marginBottom: isMobile?16:24 }}>Pronto a iniziare?</div>
            <h2 style={{ fontSize: isMobile?30:62, fontWeight: 600, letterSpacing: '-0.04em', color: '#EEF1F6', lineHeight: 1.06, marginBottom: 16 }}>
              Il tuo studio merita<br/><span style={{ color: C.brass }}>uno strumento su misura.</span>
            </h2>
            <p style={{ ...mono, fontSize: 12, lineHeight: 1.85, color: 'rgba(238,241,246,0.4)', maxWidth: 420, margin: '0 auto 36px' }}>1 mese di prova gratuita su Studio e Pro. Inserisci i dati su Stripe — nessun addebito per 30 giorni. Disdici quando vuoi.</p>
            <button onClick={onRegister} style={{ background: C.brass, border: 'none', color: C.ink, padding: isMobile?'13px 28px':'16px 48px', ...mono, fontSize: isMobile?11:13, letterSpacing: '0.12em', textTransform: 'uppercase', cursor: 'pointer', fontWeight: 700, width: isMobile?'100%':'auto' }}>
              Inizia il mese gratuito →
            </button>
            <div style={{ marginTop: 14 }}>
              <button onClick={onJoin} style={{ background: 'none', border: 'none', color: 'rgba(238,241,246,0.3)', ...mono, fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: 3 }}>Hai un codice invito? Entra in uno studio</button>
            </div>
          </div>
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: isMobile?'16px 20px':'20px 48px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '0.5px solid rgba(238,241,246,0.06)', flexWrap: 'wrap', gap: 8 }}>
            <AsmSeal size="sm" showBorder={false} showBottom={false} theme="dark"/>
            <span style={{ ...mono, fontSize: 9, letterSpacing: '0.15em', color: 'rgba(238,241,246,0.2)', textTransform: 'uppercase' }}>© 2026 ASM</span>
          </div>
        </section>

      </div>
    </div>
  );
}
