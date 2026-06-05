import { useState } from 'react';
import * as XLSX from 'xlsx';
import { usePageTitleOnMount } from '../../hooks/usePageTitle';
import { useStudio } from '../../hooks/useStudio';
import { useTheme } from '../../contexts/ThemeContext';
import { supabase } from '../../lib/supabase';

function currency(v) {
  return Number(v || 0).toFixed(2);
}

function fmtDate(d) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('it-IT');
}

// ── CSV per foglio ────────────────────────────────────────────────
function toCSV(rows) {
  return rows.map(r =>
    r.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')
  ).join('\n');
}

// ── DOWNLOAD FILE ─────────────────────────────────────────────────
function downloadCSV(filename, content) {
  const blob = new Blob(['\uFEFF' + content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

// ── EXCEL MULTI-FOGLIO via SheetJS ───────────────────────────────
function downloadExcel(sheets) {
  const wb = XLSX.utils.book_new();
  sheets.forEach(({ name, rows }) => {
    const ws = XLSX.utils.aoa_to_sheet(rows);
    // Larghezza colonne automatica
    const colWidths = rows[0]?.map((_, ci) =>
      Math.min(40, Math.max(10, ...rows.map(r => String(r[ci] ?? '').length)))
    );
    ws['!cols'] = colWidths?.map(w => ({ wch: w }));
    XLSX.utils.book_append_sheet(wb, ws, name.slice(0, 31));
  });
  const oggi = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `ASM-export-${oggi}.xlsx`);
}

// ── SEZIONI DISPONIBILI ───────────────────────────────────────────
const SEZIONI = [
  { id:'progetti',  label:'Progetti',  emoji:'📁', desc:'Nome, cliente, indirizzo, stato, ore' },
  { id:'offerte',   label:'Offerte',   emoji:'📋', desc:'Numero, nome, cliente, importo, stato' },
  { id:'commesse',  label:'Commesse',  emoji:'💼', desc:'Numero, nome, cliente, importo, incassato, residuo' },
  { id:'proforma',  label:'Proforma',  emoji:'🧾', desc:'Numero, commessa, importo, stato pagamento' },
  { id:'fatture',   label:'Fatture',   emoji:'📄', desc:'Numero, commessa, importo, scadenza, stato' },
  { id:'timesheet', label:'Timesheet', emoji:'⏱', desc:'Progetto, membro, data, ore' },
  { id:'report',    label:'Report ore',emoji:'📊', desc:'Totale ore per progetto e per membro' },
];

export default function EsportaDatiPage() {
  usePageTitleOnMount('Esporta dati');
  const { studioId } = useStudio();
  const { T } = useTheme();

  const [selected, setSelected] = useState(new Set(['progetti','offerte','commesse','proforma','fatture']));
  const [loading, setLoading]   = useState(false);
  const [progress, setProgress] = useState('');

  const mono = { fontFamily:"'IBM Plex Mono', monospace" };

  const toggle = (id) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleExport = async () => {
    setLoading(true);
    setProgress('Caricamento dati...');
    const sheets = [];
    const oggi = new Date().toISOString().slice(0, 10);

    try {
      // ── PROGETTI ──────────────────────────────────────────────
      if (selected.has('progetti')) {
        setProgress('Esportazione progetti...');
        const { data: proj } = await supabase.from('projects')
          .select('id, name, client, address, status, created_at')
          .eq('studio', studioId).is('deleted_at', null).order('name');

        const { data: ts } = await supabase.from('timesheet')
          .select('project_id, hours').eq('studio', studioId);

        const orePerProg = {};
        (ts ?? []).forEach(t => {
          if (!t.project_id) return;
          orePerProg[t.project_id] = (orePerProg[t.project_id] || 0) + Number(t.hours || 0);
        });

        sheets.push({
          name: 'Progetti',
          rows: [
            ['Nome', 'Cliente', 'Indirizzo', 'Stato', 'Ore totali', 'Data creazione'],
            ...(proj ?? []).map(p => [
              p.name,
              p.client || '',
              p.address || '',
              p.status || '',
              Number(orePerProg[p.id] || 0).toFixed(2),
              fmtDate(p.created_at),
            ]),
          ],
        });
      }

      // ── OFFERTE ───────────────────────────────────────────────
      if (selected.has('offerte')) {
        setProgress('Esportazione offerte...');
        const { data: off } = await supabase.from('offerte')
          .select('numero_offerta, nome_offerta, cliente, importo_offerta_base, importo_totale, stato, data_offerta, created_at')
          .eq('studio', studioId).is('deleted_at', null).order('created_at', { ascending: false });

        sheets.push({
          name: 'Offerte',
          rows: [
            ['N° Offerta', 'Nome', 'Cliente', 'Importo base', 'Importo totale', 'Stato', 'Data offerta', 'Data creazione'],
            ...(off ?? []).map(o => [
              o.numero_offerta, o.nome_offerta, o.cliente,
              currency(o.importo_offerta_base), currency(o.importo_totale),
              o.stato, fmtDate(o.data_offerta), fmtDate(o.created_at),
            ]),
          ],
        });
      }

      // ── COMMESSE ──────────────────────────────────────────────
      if (selected.has('commesse')) {
        setProgress('Esportazione commesse...');
        const { data: comm } = await supabase.from('commesse')
          .select('numero_offerta, nome_commessa, cliente, project_name, importo_offerta_base, importo_totale, importo_incassato, stato_pagamento, data_commessa, created_at')
          .eq('studio', studioId).is('deleted_at', null).order('created_at', { ascending: false });

        sheets.push({
          name: 'Commesse',
          rows: [
            ['N° Offerta', 'Nome commessa', 'Cliente', 'Progetto', 'Importo base', 'Importo totale', 'Incassato', 'Residuo', 'Stato pagamento', 'Data commessa'],
            ...(comm ?? []).map(c => {
              const tot = Number(c.importo_totale || c.importo_offerta_base || 0);
              const inc = Number(c.importo_incassato || 0);
              return [
                c.numero_offerta, c.nome_commessa, c.cliente, c.project_name || '',
                currency(c.importo_offerta_base), currency(tot),
                currency(inc), currency(tot - inc),
                c.stato_pagamento || '', fmtDate(c.data_commessa),
              ];
            }),
          ],
        });
      }

      // ── PROFORMA ──────────────────────────────────────────────
      if (selected.has('proforma')) {
        setProgress('Esportazione proforma...');
        const { data: prof } = await supabase.from('proforma')
          .select('numero_proforma, commessa_id, importo_totale, pagato, data_creazione, data_scadenza, data_pagamento, numero_fattura, note')
          .eq('studio', studioId).is('deleted_at', null).order('created_at', { ascending: false });

        const { data: comm } = await supabase.from('commesse')
          .select('id, nome_commessa').eq('studio', studioId);
        const commMap = {};
        (comm ?? []).forEach(c => commMap[c.id] = c.nome_commessa);

        sheets.push({
          name: 'Proforma',
          rows: [
            ['N° Proforma', 'Commessa', 'Importo', 'Pagata', 'Data creazione', 'Data scadenza', 'Data pagamento', 'N° Fattura', 'Note'],
            ...(prof ?? []).map(p => [
              p.numero_proforma, commMap[p.commessa_id] || '',
              currency(p.importo_totale), p.pagato ? 'Sì' : 'No',
              fmtDate(p.data_creazione), fmtDate(p.data_scadenza),
              fmtDate(p.data_pagamento), p.numero_fattura || '', p.note || '',
            ]),
          ],
        });
      }

      // ── FATTURE ───────────────────────────────────────────────
      if (selected.has('fatture')) {
        setProgress('Esportazione fatture...');
        const { data: fatt } = await supabase.from('fatture')
          .select('numero_fattura, numero_fattura_fiscale, commessa_id, importo_totale, pagato, data_emissione, data_scadenza, data_pagamento, termini_pagamento, note')
          .eq('studio', studioId).order('data_emissione', { ascending: false });

        const { data: comm } = await supabase.from('commesse')
          .select('id, nome_commessa').eq('studio', studioId);
        const commMap = {};
        (comm ?? []).forEach(c => commMap[c.id] = c.nome_commessa);

        sheets.push({
          name: 'Fatture',
          rows: [
            ['N° Fattura', 'N° Fiscale', 'Commessa', 'Importo', 'Pagata', 'Data emissione', 'Scadenza', 'Data pagamento', 'Termini (gg)', 'Note'],
            ...(fatt ?? []).map(f => [
              f.numero_fattura, f.numero_fattura_fiscale || '',
              commMap[f.commessa_id] || '',
              currency(f.importo_totale), f.pagato ? 'Sì' : 'No',
              fmtDate(f.data_emissione), fmtDate(f.data_scadenza),
              fmtDate(f.data_pagamento), f.termini_pagamento || '',
              f.note || '',
            ]),
          ],
        });
      }

      // ── TIMESHEET ─────────────────────────────────────────────
      if (selected.has('timesheet')) {
        setProgress('Esportazione timesheet...');
        const { data: ts } = await supabase.from('timesheet')
          .select('project_name, user_name, date, hours, notes')
          .eq('studio', studioId).is('deleted_at', null)
          .order('date', { ascending: false });

        sheets.push({
          name: 'Timesheet',
          rows: [
            ['Progetto', 'Membro', 'Data', 'Ore', 'Note'],
            ...(ts ?? []).map(t => [
              t.project_name || '', t.user_name || '',
              fmtDate(t.date), currency(t.hours), t.notes || '',
            ]),
          ],
        });
      }

      // ── REPORT ORE ────────────────────────────────────────────
      if (selected.has('report')) {
        setProgress('Calcolo report...');
        const { data: ts } = await supabase.from('timesheet')
          .select('project_name, user_name, hours').eq('studio', studioId).is('deleted_at', null);

        // Aggrega per progetto
        const perProg = {};
        const perMembro = {};
        (ts ?? []).forEach(t => {
          perProg[t.project_name || '—'] = (perProg[t.project_name || '—'] || 0) + Number(t.hours || 0);
          perMembro[t.user_name || '—']  = (perMembro[t.user_name || '—']  || 0) + Number(t.hours || 0);
        });

        sheets.push({
          name: 'Report ore per progetto',
          rows: [
            ['Progetto', 'Ore totali'],
            ...Object.entries(perProg).sort((a,b)=>b[1]-a[1]).map(([k,v]) => [k, currency(v)]),
          ],
        });
        sheets.push({
          name: 'Report ore per membro',
          rows: [
            ['Membro', 'Ore totali'],
            ...Object.entries(perMembro).sort((a,b)=>b[1]-a[1]).map(([k,v]) => [k, currency(v)]),
          ],
        });
      }

      setProgress('Generazione file...');
      downloadExcel(sheets);
      setProgress(`✓ Export completato — ${sheets.length} fogli`);

    } catch(err) {
      setProgress('Errore: ' + err.message);
    }
    setLoading(false);
  };

  return (
    <div style={{ maxWidth:560 }}>
      <div style={{ marginBottom:24 }}>
        <div style={{ fontSize:18, fontWeight:600, color:T.ink, letterSpacing:'-0.02em', marginBottom:4 }}>Esporta dati</div>
        <div style={{ ...mono, fontSize:10, color:T.muted }}>Scarica tutti i dati del tuo studio in un file Excel</div>
      </div>

      {/* Selezione sezioni */}
      <div style={{ background:T.surface, border:`1px solid ${T.border}`, padding:'20px 22px', marginBottom:14 }}>
        <div style={{ ...mono, fontSize:9, letterSpacing:'0.25em', textTransform:'uppercase', color:T.muted, marginBottom:16 }}>Seleziona cosa esportare</div>
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {SEZIONI.map(s => (
            <label key={s.id} style={{ display:'flex', alignItems:'center', gap:12, cursor:'pointer', padding:'10px 14px', background: selected.has(s.id) ? T.navyLight : T.surface2, border:`0.5px solid ${selected.has(s.id) ? T.navy : T.border}`, transition:'all 0.1s' }}>
              <input type="checkbox" checked={selected.has(s.id)} onChange={()=>toggle(s.id)} style={{ accentColor:T.navy, width:15, height:15, flexShrink:0 }}/>
              <span style={{ fontSize:18, flexShrink:0 }}>{s.emoji}</span>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:13, fontWeight:600, color:T.ink }}>{s.label}</div>
                <div style={{ ...mono, fontSize:10, color:T.muted, marginTop:2 }}>{s.desc}</div>
              </div>
            </label>
          ))}
        </div>

        <div style={{ display:'flex', alignItems:'center', gap:12, marginTop:16, paddingTop:14, borderTop:`0.5px solid ${T.border}` }}>
          <button onClick={()=>setSelected(new Set(SEZIONI.map(s=>s.id)))} style={{ ...mono, fontSize:10, color:T.navy, background:'none', border:'none', cursor:'pointer', textDecoration:'underline' }}>
            Seleziona tutto
          </button>
          <button onClick={()=>setSelected(new Set())} style={{ ...mono, fontSize:10, color:T.muted, background:'none', border:'none', cursor:'pointer', textDecoration:'underline' }}>
            Deseleziona tutto
          </button>
        </div>
      </div>

      {/* Info formato */}
      <div style={{ background:T.surface, border:`1px solid ${T.border}`, padding:'14px 18px', marginBottom:14 }}>
        <div style={{ ...mono, fontSize:9, letterSpacing:'0.15em', textTransform:'uppercase', color:T.muted, marginBottom:8 }}>Formato</div>
        <div style={{ display:'flex', gap:20 }}>
          {[
            ['📊 File', 'Excel (.xls)'],
            ['📑 Fogli', `${selected.size + (selected.has('report') ? 1 : 0)} fogli`],
            ['🔤 Encoding', 'UTF-8 con BOM'],
          ].map(([icon,val])=>(
            <div key={icon}>
              <div style={{ ...mono, fontSize:9, color:T.muted }}>{icon}</div>
              <div style={{ fontSize:12, fontWeight:600, color:T.ink, marginTop:2 }}>{val}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottone export */}
      <button onClick={handleExport} disabled={loading || selected.size === 0}
        style={{ width:'100%', padding:'14px 0', background: selected.size===0 ? T.borderMd : T.navy, border:'none', color:'#EEF1F6', ...mono, fontSize:12, letterSpacing:'0.1em', textTransform:'uppercase', cursor: selected.size===0||loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, transition:'all 0.1s' }}>
        {loading ? '⏳ Esportazione in corso...' : '⬇ Scarica Excel'}
      </button>

      {progress && (
        <div style={{ ...mono, fontSize:11, color: progress.startsWith('✓') ? T.green : progress.startsWith('Errore') ? T.red : T.muted, marginTop:12, textAlign:'center' }}>
          {progress}
        </div>
      )}
    </div>
  );
}
