import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { usePageTitleOnMount } from "../hooks/usePageTitle";
import { useStudio } from "../hooks/useStudio";
import { useTheme } from '../contexts/ThemeContext';
import { supabase } from "../lib/supabase";
import * as XLSX from "xlsx";

const ROW_H       = 44;
const COL = { drag:20, attivita:160, impresa:90, dipende:90, inizio:95, fine:95, durata:55, del:30 };
const LEFT_W = Object.values(COL).reduce((s,v)=>s+v, 0); // = 635
const DAY_W_WEEK  = 28;
const DAY_W_MONTH = 12;

// Colori per impresa — assegnati automaticamente
const IMPRESA_COLORS = [
  '#13315C','#1a6b3c','#7c3aed','#b45309',
  '#be185d','#0e7490','#9f1239','#065f46',
  '#92400e','#1e40af','#6b21a8','#0f766e',
];

function colorForImpresa(impresa, map, fallback) {
  if (!impresa) return fallback || '#13315C';
  if (map[impresa]) return map[impresa];
  const idx = Object.keys(map).length % IMPRESA_COLORS.length;
  map[impresa] = IMPRESA_COLORS[idx];
  return map[impresa];
}

// ── DATE HELPERS ──────────────────────────────────────────────────
function toISO(d) {
  if (!d) return '';
  const date = d instanceof Date ? d : new Date(d);
  const y   = date.getFullYear();
  const m   = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
function parseDate(s) {
  if (!s) return null;
  const [y, m, d] = s.split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d); // ora locale, non UTC
}
function addDays(date, n) {
  const d = new Date(date); d.setDate(d.getDate()+n); return d;
}
function diffDays(a, b) {
  const da = a instanceof Date ? a : parseDate(a);
  const db = b instanceof Date ? b : parseDate(b);
  return Math.round((db - da) / 86400000);
}
function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('it-IT',{day:'numeric',month:'short'});
}
function getMondayOf(d) {
  const date = d instanceof Date ? new Date(d.getFullYear(), d.getMonth(), d.getDate()) : new Date(d);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  return date;
}

// Prossimo giorno lavorativo dopo una data (salta solo domenica)
function nextWorkingDay(dateStr) {
  let d = addDays(parseDate(dateStr), 1);
  while (d.getDay() === 0) d = addDays(d, 1);
  return toISO(d);
}

// Ricalcola le date di tutte le lavorazioni dipendenti (ricorsivo)
function ricalcolaDipendenti(lavId, lavorazioni, updates = {}) {
  const dipendenti = lavorazioni.filter(l => l.dipendenza_id === lavId);
  dipendenti.forEach(dep => {
    const parent = updates[lavId] || lavorazioni.find(l => l.id === lavId);
    if (!parent?.data_fine) return;
    const newStart = nextWorkingDay(parent.data_fine);
    const newEnd   = toISO(addDays(parseDate(newStart), Number(dep.durata_giorni)-1));
    updates[dep.id] = { ...dep, data_inizio: newStart, data_fine: newEnd };
    ricalcolaDipendenti(dep.id, lavorazioni, updates);
  });
  return updates;
}

// Raccoglie una lavorazione e tutti i suoi dipendenti (transitivi), in ordine originale
function getDependentGroup(rootId, lavorazioni) {
  const result = [];
  const visited = new Set();
  function collect(id) {
    if (visited.has(id)) return;
    visited.add(id);
    const row = lavorazioni.find(l => l.id === id);
    if (row) result.push(row);
    lavorazioni.filter(l => l.dipendenza_id === id).forEach(dep => collect(dep.id));
  }
  collect(rootId);
  result.sort((a, b) => lavorazioni.indexOf(a) - lavorazioni.indexOf(b));
  return result;
}

function buildTimeHeaders(startDate, totalDays, dayW) {
  const months=[], weeks=[];
  let curMonth=null, curMonthStart=0;
  let curWeek=null, curWeekStart=0;
  for (let i=0; i<totalDays; i++) {
    const d = addDays(startDate, i);
    const mKey = `${d.getFullYear()}-${d.getMonth()}`;
    const wKey = toISO(getMondayOf(d));
    if (mKey!==curMonth) {
      if (curMonth!==null) months.push({label:curMonth, width:(i-curMonthStart)*dayW});
      curMonth=mKey; curMonthStart=i;
    }
    if (wKey!==curWeek) {
      if (curWeek!==null) weeks.push({label:curWeek, width:(i-curWeekStart)*dayW, date:addDays(startDate,curWeekStart)});
      curWeek=wKey; curWeekStart=i;
    }
  }
  months.push({label:curMonth, width:(totalDays-curMonthStart)*dayW});
  weeks.push({label:curWeek, width:(totalDays-curWeekStart)*dayW, date:addDays(startDate,curWeekStart)});
  return {months, weeks};
}

// ── EXPORT EXCEL ──────────────────────────────────────────────────
function exportExcel(lavorazioni, projectName) {
  const data = [
    ['Attività', 'Impresa', 'Data inizio', 'Data fine', 'Durata (gg)', '% Completamento'],
    ...lavorazioni.map(l => [
      l.descrizione || '',
      l.operatore || '',
      l.data_inizio || '',
      l.data_fine || '',
      Number(l.durata_giorni) || 0,
      Number(l.percentuale_completamento) || 0,
    ]),
  ];
  const ws = XLSX.utils.aoa_to_sheet(data);
  // Larghezze colonne
  ws['!cols'] = [{ wch: 35 }, { wch: 20 }, { wch: 14 }, { wch: 14 }, { wch: 12 }, { wch: 18 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Gantt');
  XLSX.writeFile(wb, `gantt-${projectName.replace(/\s+/g, '-')}.xlsx`);
}

// ── EXPORT PDF ────────────────────────────────────────────────────
function exportPDF(lavorazioni, projectName, viewMode = 'week') {
  const valid = lavorazioni.filter(l => l.data_inizio && l.data_fine);

  // Range date
  const allISO = valid.flatMap(l => [l.data_inizio, l.data_fine]);
  const minISO = allISO.length ? allISO.reduce((a, b) => a < b ? a : b) : toISO(new Date());
  const maxISO = allISO.length ? allISO.reduce((a, b) => a > b ? a : b) : toISO(addDays(new Date(), 60));
  const chartStart = addDays(parseDate(minISO), -2);
  const chartEnd   = addDays(parseDate(maxISO), 5);
  const totalDays  = diffDays(chartStart, chartEnd) + 1;
  const todayISO   = toISO(new Date());

  // Dimensioni — ROW e HDR uguali per tabella e SVG (allineamento perfetto)
  const ROW = 30;
  // Vista mesi: solo riga mesi (HDR 26) — Vista settimane: mesi + giorni (HDR 44)
  const HDR = viewMode === 'month' ? 26 : 44;
  const H   = HDR + valid.length * ROW;

  // A3 landscape usabile ≈ 1496px totali, tabella sinistra ≈ 380px → SVG ≈ 1116px
  // dayW calcolato per far sì che W ≈ containerWidth → nessuno stretching
  const SVG_TARGET_W = 1100;
  const dayW = Math.max(viewMode === 'month' ? 6 : 10, Math.round(SVG_TARGET_W / totalDays));
  const W    = totalDays * dayW;

  // Mappa colori imprese
  const cMap = {};
  valid.forEach(l => { if (l.operatore) colorForImpresa(l.operatore, cMap, '#13315C'); });
  const getColor = l => l.colore || (l.operatore ? (cMap[l.operatore] || '#13315C') : '#13315C');
  const uniqueImprese = [...new Set(valid.map(l => l.operatore).filter(Boolean))];

  const dX = iso => diffDays(chartStart, parseDate(iso)) * dayW;

  // ── MESI ──
  const MONTH_NAMES = ['Gen','Feb','Mar','Apr','Mag','Giu','Lug','Ago','Set','Ott','Nov','Dic'];
  const mHdrH = HDR; // header mesi occupa tutto HDR in entrambe le viste
  let monthSvg = '', prevMKey = null, prevMStart = 0;
  for (let i = 0; i <= totalDays; i++) {
    const d = addDays(chartStart, i);
    const mKey = `${d.getFullYear()}-${d.getMonth()}`;
    if (mKey !== prevMKey) {
      if (prevMKey !== null) {
        const [y, m] = prevMKey.split('-');
        const mW = i * dayW - prevMStart;
        const mRowH = viewMode === 'month' ? HDR : 22;
        monthSvg += `<rect x="${prevMStart}" y="0" width="${mW}" height="${mRowH}" fill="#EEF1F6" stroke="#ccc" stroke-width="0.5"/>`;
        const fSize = viewMode === 'month' ? 13 : 11;
        const fY    = viewMode === 'month' ? HDR / 2 + 5 : 15;
        monthSvg += `<text x="${prevMStart + 8}" y="${fY}" font-family="'Space Grotesk', sans-serif" font-size="${fSize}" font-weight="700" fill="#13315C">${MONTH_NAMES[+m].toUpperCase()} ${y}</text>`;
      }
      prevMKey = mKey; prevMStart = i * dayW;
    }
  }
  if (prevMKey) {
    const [y, m] = prevMKey.split('-');
    const mW = W - prevMStart;
    const mRowH = viewMode === 'month' ? HDR : 22;
    monthSvg += `<rect x="${prevMStart}" y="0" width="${mW}" height="${mRowH}" fill="#EEF1F6" stroke="#ccc" stroke-width="0.5"/>`;
    const fSize = viewMode === 'month' ? 13 : 11;
    const fY    = viewMode === 'month' ? HDR / 2 + 5 : 15;
    monthSvg += `<text x="${prevMStart + 8}" y="${fY}" font-family="'Space Grotesk', sans-serif" font-size="${fSize}" font-weight="700" fill="#13315C">${MONTH_NAMES[+m].toUpperCase()} ${y}</text>`;
  }

  // ── NUMERI GIORNO (solo in vista settimane, ogni lunedì) ──
  let weekSvg = '';
  if (viewMode === 'week') {
    for (let i = 0; i < totalDays; i++) {
      const d = addDays(chartStart, i);
      if (d.getDay() === 1 || i === 0) {
        weekSvg += `<text x="${i * dayW + 3}" y="${HDR - 7}" font-family="'IBM Plex Mono', monospace" font-size="9" fill="#999">${d.getDate()}</text>`;
      }
    }
  }

  // ── SFONDO COLONNE ──
  let bgSvg = '';
  for (let i = 0; i < totalDays; i++) {
    const d = addDays(chartStart, i);
    const isWE    = d.getDay() === 0 || d.getDay() === 6;
    const isOdd   = Math.floor(i / 7) % 2 === 1;
    const isToday = toISO(d) === todayISO;
    if (viewMode === 'month') {
      // Vista mesi: sfondo alternato per settimana, linee solo a inizio mese
      if (i % 7 === 0) {
        const fill = isOdd ? 'rgba(19,49,92,0.04)' : 'white';
        bgSvg += `<rect x="${i * dayW}" y="${HDR}" width="${Math.min(7 * dayW, (totalDays - i) * dayW)}" height="${valid.length * ROW}" fill="${fill}"/>`;
      }
      if (d.getDate() === 1 && i > 0) bgSvg += `<line x1="${i*dayW}" y1="0" x2="${i*dayW}" y2="${H}" stroke="#bbb" stroke-width="1"/>`;
    } else {
      // Vista settimane: sfondo per giorno, linee ogni lunedì
      const fill = isToday ? 'rgba(19,49,92,0.10)' : isWE ? '#f0f0f0' : isOdd ? 'rgba(19,49,92,0.03)' : 'white';
      bgSvg += `<rect x="${i * dayW}" y="${HDR}" width="${dayW}" height="${valid.length * ROW}" fill="${fill}"/>`;
      if (d.getDay() === 1) bgSvg += `<line x1="${i*dayW}" y1="22" x2="${i*dayW}" y2="${H}" stroke="#ddd" stroke-width="0.5"/>`;
    }
  }

  // ── LINEA OGGI ──
  const tX = dX(todayISO);
  const todayLine = (tX >= 0 && tX <= W)
    ? `<line x1="${tX}" y1="${HDR}" x2="${tX}" y2="${H}" stroke="#13315C" stroke-width="1.5" opacity="0.6" stroke-dasharray="4,3"/>`
    : '';

  // ── BARRE ──
  let rowsSvg = '', barsSvg = '';
  const clipDefs = [];
  valid.forEach((lav, i) => {
    const y = HDR + i * ROW;
    rowsSvg += `<rect x="0" y="${y}" width="${W}" height="${ROW}" fill="${i % 2 ? '#fafafa' : 'white'}" opacity="0.5"/>`;
    rowsSvg += `<line x1="0" y1="${y+ROW}" x2="${W}" y2="${y+ROW}" stroke="#eee" stroke-width="0.5"/>`;
    if (!lav.data_inizio) return;
    const bX = dX(lav.data_inizio);
    const bW = Math.max(Number(lav.durata_giorni || 1) * dayW, 6);
    const bY = y + ROW * 0.18;
    const bH = ROW * 0.64;
    const color = getColor(lav);
    barsSvg += `<rect x="${bX}" y="${bY}" width="${bW}" height="${bH}" fill="${color}" rx="3"/>`;
    if (bW > 40 && lav.descrizione) {
      const cId = `c${i}`;
      clipDefs.push(`<clipPath id="${cId}"><rect x="${bX+5}" y="${bY}" width="${bW-10}" height="${bH}"/></clipPath>`);
      barsSvg += `<text x="${bX+7}" y="${bY+bH*0.69}" font-family="'IBM Plex Mono', monospace" font-size="9" fill="white" clip-path="url(#${cId})">${lav.descrizione}</text>`;
    }
  });

  // ── DIPENDENZE ──
  let arrowsSvg = '';
  valid.forEach(lav => {
    if (!lav.dipendenza_id) return;
    const dep = valid.find(d => d.id === lav.dipendenza_id);
    if (!dep?.data_inizio || !lav.data_inizio) return;
    const x1 = dX(dep.data_inizio) + Number(dep.durata_giorni||1)*dayW;
    const y1 = HDR + valid.indexOf(dep)*ROW + ROW/2;
    const x2 = dX(lav.data_inizio);
    const y2 = HDR + valid.indexOf(lav)*ROW + ROW/2;
    arrowsSvg += `<path d="M${x1} ${y1} C${x1+16} ${y1} ${x2-16} ${y2} ${x2} ${y2}" fill="none" stroke="#bbb" stroke-width="1" stroke-dasharray="3,2" marker-end="url(#arr)"/>`;
  });

  // SVG — W calcolato ≈ containerWidth → preserveAspectRatio:none non distorce
  const svgHtml = `
    <svg xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 ${W} ${H}"
      preserveAspectRatio="none"
      style="display:block; width:100%; height:${H}px;"
    >
      <defs>
        <marker id="arr" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 Z" fill="#bbb"/>
        </marker>
        ${clipDefs.join('')}
      </defs>
      ${monthSvg}
      ${weekSvg}
      <line x1="0" y1="${HDR}" x2="${W}" y2="${HDR}" stroke="#ccc" stroke-width="1"/>
      ${bgSvg}
      ${rowsSvg}
      ${todayLine}
      ${barsSvg}
      ${arrowsSvg}
    </svg>`;

  // ── TABELLA SINISTRA — senza colonna % ──
  const thSt = `style="padding:0 8px; height:${HDR}px; font-size:8px; letter-spacing:0.12em; text-transform:uppercase; color:#555; border-bottom:2px solid #ccc; background:#EEF1F6; text-align:left; white-space:nowrap; font-family:'IBM Plex Mono', monospace;"`;
  const tableHeader = `
    <tr>
      <th ${thSt}>Attività</th>
      <th ${thSt}>Impresa</th>
      <th ${thSt}>Inizio</th>
      <th ${thSt}>Fine</th>
      <th ${thSt}>Dur.</th>
    </tr>`;
  const tableRows = valid.map((lav, i) => {
    const color = getColor(lav);
    const bg = i % 2 ? '#fafafa' : 'white';
    const tdBase = `padding:0 8px; height:${ROW}px; font-size:9px; border-bottom:1px solid #eee; background:${bg}; vertical-align:middle; white-space:nowrap; font-family:'IBM Plex Mono', monospace;`;
    return `<tr>
      <td style="padding:0 8px; min-height:${ROW}px; font-size:9px; border-bottom:1px solid #eee; background:${bg}; vertical-align:middle; white-space:normal; word-break:break-word; max-width:180px; font-family:'IBM Plex Mono', monospace;">
        <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${color};margin-right:6px;vertical-align:middle;flex-shrink:0;"></span>
        <span style="font-weight:600; font-size:10px; font-family:'Space Grotesk', sans-serif;">${lav.descrizione||'—'}</span>
      </td>
      <td style="${tdBase}">${lav.operatore||'—'}</td>
      <td style="${tdBase}">${lav.data_inizio||'—'}</td>
      <td style="${tdBase}">${lav.data_fine||'—'}</td>
      <td style="${tdBase} text-align:center;">${lav.durata_giorni||'—'}gg</td>
    </tr>`;
  }).join('');

  // ── LEGENDA IMPRESE (senza "Oggi") ──
  const legendHtml = uniqueImprese.length ? `
    <div style="display:flex; flex-wrap:wrap; gap:16px; align-items:center; margin-bottom:14px; padding:8px 14px; background:#f8f8f8; border:1px solid #eee;">
      <span style="font-size:8px; letter-spacing:0.15em; text-transform:uppercase; color:#888; font-family:'IBM Plex Mono', monospace; margin-right:2px;">Imprese:</span>
      ${uniqueImprese.map(imp => `
        <span style="display:inline-flex; align-items:center; gap:6px;">
          <span style="display:inline-block; width:13px; height:13px; background:${cMap[imp]||'#13315C'}; border-radius:2px; flex-shrink:0;"></span>
          <span style="font-size:11px; font-family:'Space Grotesk', sans-serif; font-weight:600; color:#333;">${imp}</span>
        </span>`).join('')}
    </div>` : '';

  const win = window.open('', '_blank');
  win.document.write(`
    <html><head><title>Gantt — ${projectName}</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=Space+Grotesk:wght@400;600;700&display=swap" rel="stylesheet">
    <style>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { font-family: 'Space Grotesk', sans-serif; font-size: 11px; padding: 18px; color: #0E0E0D; background: white; }
      @page { size: A3 landscape; margin: 12mm; }
      @media print {
        body { padding: 0; }
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
    </style></head>
    <body>
      <!-- Header -->
      <div style="display:flex; justify-content:space-between; align-items:baseline; margin-bottom:12px; border-bottom:2px solid #13315C; padding-bottom:8px;">
        <div style="font-size:20px; font-weight:700; letter-spacing:-0.02em; color:#0E0E0D; font-family:'Space Grotesk', sans-serif;">Gantt — ${projectName}</div>
        <div style="font-family:'IBM Plex Mono', monospace; font-size:9px; color:#999;">Esportato il ${new Date().toLocaleDateString('it-IT')}</div>
      </div>

      <!-- Legenda -->
      ${legendHtml}

      <!-- Layout principale: tabella sx + calendario dx -->
      <div style="display:flex; border:1px solid #ccc;">

        <!-- Tabella attività (sinistra, larghezza fissa) -->
        <div style="flex-shrink:0; border-right:2px solid #ccc;">
          <table style="border-collapse:collapse; width:100%;">
            <thead>${tableHeader}</thead>
            <tbody>${tableRows}</tbody>
          </table>
        </div>

        <!-- Calendario SVG (destra, larghezza piena) -->
        <div style="flex:1; min-width:0; overflow:hidden;">
          ${svgHtml}
        </div>

      </div>
    </body></html>`);
  win.document.close();
  win.print();
}

// ── VERSIONI GANTT ────────────────────────────────────────────────
function GanttVersionsList({ project, studioId, onSelectVersion, onBack }) {
  const { T } = useTheme();
  const [versions, setVersions]     = useState([]);
  const [loading, setLoading]       = useState(true);
  const [creating, setCreating]     = useState(false);
  const [contextMenu, setContextMenu] = useState(null); // { id, x, y }
  const [renamingId, setRenamingId]   = useState(null);
  const [renamingName, setRenamingName] = useState('');

  const mono = { fontFamily:"'IBM Plex Mono', monospace" };

  const loadVersions = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('gantt_versions')
      .select('*, lavorazioni_gantt(count)')
      .eq('studio', studioId)
      .eq('project_id', project.id)
      .is('deleted_at', null)
      .order('created_at', { ascending: true });
    setVersions(data ?? []);

    // Auto-migrazione: se esistono lavorazioni senza version_id, le raccoglie in "Versione 1"
    if ((data ?? []).length === 0) {
      const { data: orphans } = await supabase
        .from('lavorazioni_gantt')
        .select('id')
        .eq('studio', studioId)
        .eq('project_id', project.id)
        .is('version_id', null)
        .is('deleted_at', null)
        .limit(1);
      if ((orphans ?? []).length > 0) {
        const { data: v1 } = await supabase
          .from('gantt_versions')
          .insert({ studio: studioId, project_id: project.id, name: 'Versione 1' })
          .select().single();
        if (v1) {
          await supabase.from('lavorazioni_gantt')
            .update({ version_id: v1.id })
            .eq('studio', studioId).eq('project_id', project.id).is('version_id', null);
          setVersions([v1]);
        }
      }
    }
    setLoading(false);
  }, [studioId, project.id]);

  useEffect(() => { loadVersions(); }, [loadVersions]);

  const handleNewVersion = async () => {
    setCreating(true);
    const n = versions.length + 1;
    const { data: v } = await supabase
      .from('gantt_versions')
      .insert({ studio: studioId, project_id: project.id, name: `Versione ${n}` })
      .select().single();
    setCreating(false);
    if (v) onSelectVersion(v);
  };

  const handleCopyLast = async () => {
    if (!versions.length) return;
    setCreating(true);
    const last = versions[versions.length - 1];
    const n    = versions.length + 1;

    // Crea nuova versione
    const { data: newV } = await supabase
      .from('gantt_versions')
      .insert({ studio: studioId, project_id: project.id, name: `Versione ${n}` })
      .select().single();
    if (!newV) { setCreating(false); return; }

    // Copia lavorazioni dalla versione precedente
    const { data: rows } = await supabase
      .from('lavorazioni_gantt')
      .select('*')
      .eq('version_id', last.id)
      .is('deleted_at', null)
      .order('order', { ascending: true });

    if (rows?.length) {
      // Remap IDs per mantenere dipendenze coerenti
      const idMap = {};
      const newRows = rows.map(r => {
        const { id, created_at, ...rest } = r;
        const newId = crypto.randomUUID();
        idMap[id] = newId;
        return { ...rest, id: newId, version_id: newV.id, deleted_at: null };
      });
      // Aggiorna dipendenza_id con nuovi ID
      newRows.forEach(r => {
        if (r.dipendenza_id) r.dipendenza_id = idMap[r.dipendenza_id] ?? null;
      });
      await supabase.from('lavorazioni_gantt').insert(newRows);
    }

    setCreating(false);
    await loadVersions();
    onSelectVersion(newV);
  };

  const handleDeleteVersion = async (v) => {
    if (!confirm(`Eliminare "${v.name}"? Le lavorazioni associate saranno rimosse.`)) return;
    await supabase.from('gantt_versions').update({ deleted_at: new Date().toISOString() }).eq('id', v.id);
    await loadVersions();
  };

  const handleContextMenu = (e, v) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ id: v.id, x: e.clientX, y: e.clientY });
  };

  const handleRenameStart = (v) => {
    setRenamingId(v.id);
    setRenamingName(v.name);
    setContextMenu(null);
  };

  const handleRenameSave = async (v) => {
    const trimmed = renamingName.trim();
    setRenamingId(null);
    if (!trimmed || trimmed === v.name) return;
    await supabase.from('gantt_versions').update({ name: trimmed }).eq('id', v.id);
    setVersions(prev => prev.map(ver => ver.id === v.id ? { ...ver, name: trimmed } : ver));
  };

  // Chiude il context menu al click fuori
  useEffect(() => {
    if (!contextMenu) return;
    const close = () => setContextMenu(null);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [contextMenu]);

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:0, minHeight:'calc(100vh - 120px)' }}>

      {/* Toolbar */}
      <div style={{ background:T.surface, border:`1px solid ${T.border}`, padding:'10px 16px', display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <button onClick={onBack} style={{ background:'none', border:`0.5px solid ${T.borderMd}`, cursor:'pointer', color:T.muted, padding:'5px 12px', ...mono, fontSize:10, letterSpacing:'0.08em', textTransform:'uppercase' }}>← Gantt</button>
          <div style={{ fontSize:16, fontWeight:600, color:T.ink, letterSpacing:'-0.02em' }}>{project.name}</div>
          {project.client && <div style={{ ...mono, fontSize:10, color:T.muted }}>{project.client}</div>}
        </div>
        <div style={{ display:'flex', gap:8 }}>
          {versions.length > 0 && (
            <button onClick={handleCopyLast} disabled={creating}
              style={{ background:'none', border:`0.5px solid ${T.borderMd}`, cursor:'pointer', color:T.muted, padding:'5px 14px', ...mono, fontSize:10, letterSpacing:'0.08em', textTransform:'uppercase', opacity: creating ? 0.5 : 1 }}>
              ⎘ Copia ultima
            </button>
          )}
          <button onClick={handleNewVersion} disabled={creating}
            style={{ background:T.navy, border:'none', cursor:'pointer', color:T.bg, padding:'6px 16px', ...mono, fontSize:10, letterSpacing:'0.08em', textTransform:'uppercase', opacity: creating ? 0.5 : 1 }}>
            + Nuova versione
          </button>
        </div>
      </div>

      {/* Contenuto */}
      <div style={{ padding:'28px 0' }}>
        {loading ? (
          <div style={{ ...mono, fontSize:11, color:T.muted }}>Caricamento...</div>
        ) : versions.length === 0 ? (
          <div style={{ background:T.surface, border:`1px solid ${T.border}`, padding:'56px 0', textAlign:'center' }}>
            <div style={{ fontSize:36, marginBottom:12 }}>📊</div>
            <div style={{ ...mono, fontSize:11, color:T.muted, marginBottom:8 }}>Nessuna versione salvata</div>
            <div style={{ ...mono, fontSize:10, color:T.muted }}>Crea la prima versione per iniziare</div>
          </div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {[...versions].reverse().map((v, idx) => {
              const count = v.lavorazioni_gantt?.[0]?.count ?? 0;
              const isLatest = idx === 0;
              const isRenaming = renamingId === v.id;
              return (
                <div key={v.id}
                  style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'16px 20px', background:T.surface, border:`1px solid ${isLatest ? T.navy : T.border}`, cursor: isRenaming ? 'default' : 'pointer', transition:'border-color 0.15s', borderRadius:T.radius, backdropFilter:T.blurSm, WebkitBackdropFilter:T.blurSm, boxShadow:T.shadow }}
                  onClick={() => { if (!isRenaming) onSelectVersion(v); }}
                  onContextMenu={e => handleContextMenu(e, v)}
                  onMouseEnter={e => e.currentTarget.style.borderColor = T.navy}
                  onMouseLeave={e => e.currentTarget.style.borderColor = isLatest ? T.navy : T.border}
                >
                  <div style={{ display:'flex', alignItems:'center', gap:14 }}>
                    <div style={{ width:36, height:36, background: isLatest ? T.navy : T.surface2, border:`1px solid ${T.border}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, flexShrink:0 }}>
                      📊
                    </div>
                    <div>
                      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:3 }}>
                        {isRenaming ? (
                          <input
                            autoFocus
                            value={renamingName}
                            onChange={e => setRenamingName(e.target.value)}
                            onBlur={() => handleRenameSave(v)}
                            onKeyDown={e => {
                              if (e.key === 'Enter') { e.preventDefault(); handleRenameSave(v); }
                              if (e.key === 'Escape') { setRenamingId(null); }
                            }}
                            onClick={e => e.stopPropagation()}
                            style={{ fontSize:14, fontWeight:600, color:T.ink, background:T.surface2, border:`1px solid ${T.navy}`, padding:'2px 8px', outline:'none', fontFamily:"'Space Grotesk', sans-serif", borderRadius:2, minWidth:160 }}
                          />
                        ) : (
                          <span style={{ fontSize:14, fontWeight:600, color:T.ink }}>{v.name}</span>
                        )}
                        {isLatest && <span style={{ ...mono, fontSize:8, letterSpacing:'0.12em', textTransform:'uppercase', color:T.navy, border:`0.5px solid ${T.navy}`, padding:'1px 6px' }}>Ultima</span>}
                      </div>
                      <div style={{ ...mono, fontSize:9, color:T.muted }}>
                        {new Date(v.created_at).toLocaleDateString('it-IT',{day:'numeric',month:'long',year:'numeric'})}
                        {' · '}
                        {count} {count === 1 ? 'lavorazione' : 'lavorazioni'}
                      </div>
                    </div>
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                    <button
                      onClick={e => { e.stopPropagation(); handleDeleteVersion(v); }}
                      style={{ background:'none', border:`1px solid ${T.border}`, cursor:'pointer', color:T.muted, padding:'5px 10px', ...mono, fontSize:10 }}
                      title="Elimina versione"
                    >×</button>
                    <span style={{ ...mono, fontSize:11, color:T.navy }}>Apri →</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Context menu tasto destro */}
      {contextMenu && (() => {
        const ver = versions.find(v => v.id === contextMenu.id);
        return (
          <div
            onClick={e => e.stopPropagation()}
            style={{ position:'fixed', left:contextMenu.x, top:contextMenu.y, zIndex:9999, background:T.glassBg, backdropFilter:T.blur, WebkitBackdropFilter:T.blur, border:`1px solid ${T.glassBorder}`, boxShadow:T.shadowMd, borderRadius:12, minWidth:160 }}
          >
            <button
              onClick={() => handleRenameStart(ver)}
              style={{ width:'100%', padding:'10px 16px', background:'none', border:'none', cursor:'pointer', textAlign:'left', color:T.ink, ...mono, fontSize:11, display:'flex', alignItems:'center', gap:10 }}
              onMouseEnter={e => e.currentTarget.style.background = T.surface2}
              onMouseLeave={e => e.currentTarget.style.background = 'none'}
            >
              ✏ Rinomina
            </button>
            <div style={{ height:'0.5px', background:T.border }}/>
            <button
              onClick={() => { setContextMenu(null); handleDeleteVersion(ver); }}
              style={{ width:'100%', padding:'10px 16px', background:'none', border:'none', cursor:'pointer', textAlign:'left', color:'#c0392b', ...mono, fontSize:11, display:'flex', alignItems:'center', gap:10 }}
              onMouseEnter={e => e.currentTarget.style.background = T.surface2}
              onMouseLeave={e => e.currentTarget.style.background = 'none'}
            >
              × Elimina
            </button>
          </div>
        );
      })()}
    </div>
  );
}

// ── PROJECT GANTT ─────────────────────────────────────────────────
function ProjectGantt({ project, studioId, onBack, version }) {
  const { T } = useTheme();
  const [lavorazioni, setLavorazioni] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [viewMode, setViewMode]       = useState('week');
  const [newRow, setNewRow]           = useState({
    descrizione:'', operatore:'',
    data_inizio: toISO(new Date()),
    data_fine: toISO(addDays(new Date(), 6)),
    durata_giorni: 7,
    dipendenza_id: '',
  });
  const [savingNew, setSavingNew] = useState(false);
  const [onlyChart, setOnlyChart] = useState(false);
  const [rowDragState, setRowDragState] = useState(null);
  const [impresaSuggest, setImpresaSuggest] = useState(null); // { rowId: string|'new' }
  const chartRef     = useRef(null);
  const leftRef      = useRef(null);
  const rowDivsRef   = useRef([]);
  const [measuredHeights, setMeasuredHeights] = useState([]);

  const dayW = viewMode==='week' ? DAY_W_WEEK : DAY_W_MONTH;

  // Mappa impresa → colore (calcolata dai dati)
  const impresaColorMap = useMemo(() => {
    const map = {};
    lavorazioni.forEach(l => { if (l.operatore) colorForImpresa(l.operatore, map, T.navy); });
    return map;
  }, [lavorazioni]);

  // Altezze cumulative righe per allineamento chart
  const rowTops = useMemo(() => {
    const tops = [];
    let y = 0;
    lavorazioni.forEach((_, i) => { tops.push(y); y += measuredHeights[i] ?? ROW_H; });
    return tops;
  }, [measuredHeights, lavorazioni.length]);

  const newRowTop = useMemo(() =>
    lavorazioni.reduce((s, _, i) => s + (measuredHeights[i] ?? ROW_H), 0),
  [measuredHeights, lavorazioni.length]);

  const getRowTop = useCallback((i) => rowTops[i] ?? i * ROW_H, [rowTops]);
  const getRowH   = useCallback((i) => measuredHeights[i] ?? ROW_H, [measuredHeights]);

  const updateNewRow = (field, value) => {
    setNewRow(prev => {
      const next = {...prev, [field]: value};
      if (field === 'dipendenza_id' && value) {
        const parent = lavorazioni.find(l => l.id === value);
        if (parent?.data_fine) {
          next.data_inizio = nextWorkingDay(parent.data_fine);
          next.data_fine = toISO(addDays(parseDate(next.data_inizio), Number(next.durata_giorni)-1));
        }
      }
      if (field === 'data_inizio' && next.durata_giorni) {
        next.data_fine = toISO(addDays(parseDate(value), Number(next.durata_giorni)-1));
      }
      if (field === 'durata_giorni' && next.data_inizio) {
        next.data_fine = toISO(addDays(parseDate(next.data_inizio), Number(value)-1));
      }
      if (field === 'data_fine' && next.data_inizio) {
        const d = diffDays(next.data_inizio, value) + 1;
        if (d > 0) next.durata_giorni = d;
      }
      return next;
    });
  };

  const loadData = useCallback(async () => {
    const q = supabase.from("lavorazioni_gantt").select("*")
      .eq("studio", studioId).eq("project_id", project.id)
      .is("deleted_at", null);
    if (version?.id) q.eq("version_id", version.id);
    const { data } = await q.order("order", {ascending:true});
    setLavorazioni(data??[]);
    setLoading(false);
  }, [studioId, project.id, version?.id]);

  useEffect(()=>{ loadData(); }, [loadData]);

  // Misura l'altezza reale di ogni riga dopo il render (per allineamento chart)
  useEffect(() => {
    rowDivsRef.current.forEach(div => {
      if (!div) return;
      const ta = div.querySelector('textarea.desc-ta');
      if (!ta) return;
      ta.style.height = '0';
      ta.style.height = ta.scrollHeight + 'px';
    });
    const heights = lavorazioni.map((_, i) => {
      const div = rowDivsRef.current[i];
      return div ? Math.max(ROW_H, Math.round(div.getBoundingClientRect().height)) : ROW_H;
    });
    setMeasuredHeights(prev =>
      prev.length === heights.length && heights.every((h, i) => h === prev[i]) ? prev : heights
    );
  }, [lavorazioni]);

  // Range: 2 settimane fa → 1 anno avanti
  const startDate = useMemo(()=>getMondayOf(addDays(new Date(),-14)), []);
  const totalDays = 393; // ~13 mesi
  const totalW    = totalDays * dayW;
  const todayX    = diffDays(startDate, new Date()) * dayW;
  const timeHeaders = useMemo(()=>buildTimeHeaders(startDate, totalDays, dayW), [startDate, totalDays, dayW]);

  const dateToX = useCallback((dateStr) => {
    if (!dateStr) return 0;
    const d = parseDate(dateStr);
    if (!d) return 0;
    return diffDays(startDate, d) * dayW;
  }, [startDate, dayW]);

  // ── SALVA NUOVA RIGA ─────────────────────────────────────────────
  const handleSaveNew = async () => {
    if (!newRow.descrizione.trim()) return;
    setSavingNew(true);
    const map = {...impresaColorMap};
    const colore = newRow.operatore ? colorForImpresa(newRow.operatore, map, T.navy) : T.navy;
    let dataInizio = newRow.data_inizio;
    if (newRow.dipendenza_id) {
      const parent = lavorazioni.find(l => l.id === newRow.dipendenza_id);
      if (parent?.data_fine) {
        dataInizio = nextWorkingDay(parent.data_fine);
      }
    }
    const payload = {
      studio: studioId,
      project_id: project.id,
      version_id: version?.id || null,
      descrizione: newRow.descrizione.trim(),
      operatore: newRow.operatore || null,
      data_inizio: dataInizio || null,
      data_fine: newRow.data_fine || null,
      durata_giorni: Number(newRow.durata_giorni) || 7,
      colore,
      order: lavorazioni.length,
      percentuale_completamento: 0,
      dipendenza_id: newRow.dipendenza_id || null,
    };
    const { data, error } = await supabase.from("lavorazioni_gantt").insert(payload).select();
    console.log('ERROR:', JSON.stringify(error));
    console.log('PAYLOAD:', JSON.stringify(payload));
    if (!error) {
      setNewRow({ descrizione:'', operatore:'', dipendenza_id:'', data_inizio: toISO(new Date()), data_fine: toISO(addDays(new Date(), 6)), durata_giorni:7 });
      await loadData();
    }
    setSavingNew(false);
  };

  // ── INLINE EDIT ───────────────────────────────────────────────────
  const handleInlineEdit = async (lav, field, value) => {
    const updated = {...lav, [field]: value};

    if (field === 'durata_giorni') {
      updated.data_fine = toISO(addDays(parseDate(lav.data_inizio), Number(value) - 1));
    }
    if (field === 'data_inizio') {
      updated.data_fine = toISO(addDays(parseDate(value), Number(lav.durata_giorni) - 1));
    }
    if (field === 'data_fine') {
      updated.durata_giorni = diffDays(lav.data_inizio, value) + 1;
    }
    if (field === 'operatore') {
      const map = {...impresaColorMap};
      updated.colore = value ? colorForImpresa(value, map, T.navy) : T.navy;
    }

    await supabase.from('lavorazioni_gantt').update(updated).eq('id', lav.id);

    // Propaga SEMPRE a tutte le dipendenti — non solo se delta != 0
    if (['data_inizio', 'data_fine', 'durata_giorni'].includes(field)) {
      const propagate = async (parentId, parentDataFine) => {
        const q2 = supabase.from('lavorazioni_gantt')
          .select('*').eq('studio', studioId).eq('project_id', project.id).is('deleted_at', null);
        if (version?.id) q2.eq('version_id', version.id);
        const { data: allLav } = await q2;
        const deps = (allLav ?? []).filter(l => l.dipendenza_id === parentId);
        for (const dep of deps) {
          // Il figlio parte SEMPRE il giorno lavorativo dopo la fine del parent
          const newStart = nextWorkingDay(parentDataFine);
          const newEnd   = toISO(addDays(parseDate(newStart), Number(dep.durata_giorni) - 1));
          await supabase.from('lavorazioni_gantt').update({
            data_inizio: newStart,
            data_fine:   newEnd,
            durata_giorni: dep.durata_giorni,
          }).eq('id', dep.id);
          // Propaga ai figli del figlio
          await propagate(dep.id, newEnd);
        }
      };
      await propagate(lav.id, updated.data_fine);
    }

    await loadData();
  };

  const handleDelete = async (id) => {
    if (!confirm("Eliminare questa lavorazione?")) return;
    await supabase.from("lavorazioni_gantt").update({ deleted_at: new Date().toISOString() }).eq("id", id);
    loadData();
  };

  // ── DRAG ROW (riordino righe) ─────────────────────────────────────
  const onRowDragStart = useCallback((e, lav, lavIdx) => {
    e.preventDefault();
    e.stopPropagation();
    const dragId = lav.id;
    const group = getDependentGroup(dragId, lavorazioni);
    const groupIds = new Set(group.map(l => l.id));
    let dragOverIdx = lavIdx;

    setRowDragState({ dragId, dragOverIdx, groupIds });
    document.body.style.cursor = 'grabbing';

    const onMove = (ev) => {
      if (!leftRef.current) return;
      const rect = leftRef.current.getBoundingClientRect();
      const relY = ev.clientY - rect.top + leftRef.current.scrollTop;
      // Trova l'insertion point in base alle altezze reali
      let targetIdx = 0;
      for (let k = 0; k < rowTops.length; k++) {
        const midY = rowTops[k] + (measuredHeights[k] ?? ROW_H) / 2;
        if (relY > midY) targetIdx = k + 1;
      }
      targetIdx = Math.max(0, Math.min(lavorazioni.length, targetIdx));
      dragOverIdx = targetIdx;
      setRowDragState({ dragId, dragOverIdx: targetIdx, groupIds });
    };

    const onUp = async () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.body.style.cursor = '';
      setRowDragState(null);

      const groupIdxs = group.map(l => lavorazioni.indexOf(l));
      const minG = Math.min(...groupIdxs);
      const maxG = Math.max(...groupIdxs);
      if (dragOverIdx >= minG && dragOverIdx <= maxG + 1) return;

      const without = lavorazioni.filter(l => !groupIds.has(l.id));
      const cutpoint = lavorazioni.slice(0, dragOverIdx).filter(l => !groupIds.has(l.id)).length;
      const newList = [
        ...without.slice(0, cutpoint),
        ...group,
        ...without.slice(cutpoint),
      ];
      const withOrder = newList.map((l, i) => ({ ...l, order: i }));
      setLavorazioni(withOrder);
      await Promise.all(withOrder.map(l =>
        supabase.from('lavorazioni_gantt').update({ order: l.order }).eq('id', l.id)
      ));
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, [lavorazioni, rowTops, measuredHeights]);

  // ── DRAG BAR ──────────────────────────────────────────────────────
  const onBarMouseDown = useCallback((e, lav) => {
    e.preventDefault(); e.stopPropagation();
    const startX = e.clientX;
    const origDate = lav.data_inizio;
    const onMove = (ev) => {
      const delta = Math.round((ev.clientX-startX)/dayW);
      if (!delta) return;
      const newStart = toISO(addDays(parseDate(origDate), delta));
      setLavorazioni(prev=>prev.map(l=>l.id===lav.id?{...l,data_inizio:newStart,data_fine:toISO(addDays(parseDate(newStart),Number(l.durata_giorni)-1))}:l));
    };
    const onUp = async (ev) => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      const delta = Math.round((ev.clientX - startX) / dayW);
      if (delta) {
        const newStart = toISO(addDays(parseDate(origDate), delta));
        const newEnd   = toISO(addDays(parseDate(newStart), Number(lav.durata_giorni) - 1));
        await supabase.from('lavorazioni_gantt').update({data_inizio: newStart, data_fine: newEnd}).eq('id', lav.id);

        // Propaga alle dipendenti
        const propagate = async (parentId, deltaGiorni) => {
          const q3 = supabase.from('lavorazioni_gantt').select('*').eq('studio', studioId).eq('project_id', project.id).is('deleted_at', null);
          if (version?.id) q3.eq('version_id', version.id);
          const res = await q3;
          const deps = (res.data ?? []).filter(l => l.dipendenza_id === parentId);
          for (const dep of deps) {
            const ns = toISO(addDays(parseDate(dep.data_inizio), deltaGiorni));
            const ne = toISO(addDays(parseDate(dep.data_fine),   deltaGiorni));
            await supabase.from('lavorazioni_gantt').update({data_inizio: ns, data_fine: ne}).eq('id', dep.id);
            await propagate(dep.id, deltaGiorni);
          }
        };
        await propagate(lav.id, delta);
        loadData();
      }
    };
    document.addEventListener("mousemove",onMove);
    document.addEventListener("mouseup",onUp);
  }, [dayW, loadData, studioId, project]);

  // ── RESIZE BAR ────────────────────────────────────────────────────
  const onResizeMouseDown = useCallback((e, lav) => {
    e.preventDefault(); e.stopPropagation();
    const startX = e.clientX;
    const origDurata = Number(lav.durata_giorni);
    const onMove = (ev) => {
      const newDurata = Math.max(1, origDurata+Math.round((ev.clientX-startX)/dayW));
      setLavorazioni(prev=>prev.map(l=>l.id===lav.id?{...l,durata_giorni:newDurata,data_fine:toISO(addDays(parseDate(l.data_inizio),newDurata-1))}:l));
    };
    const onUp = async (ev) => {
      document.removeEventListener("mousemove",onMove);
      document.removeEventListener("mouseup",onUp);
      const newDurata = Math.max(1, origDurata+Math.round((ev.clientX-startX)/dayW));
      const newEnd = toISO(addDays(parseDate(lav.data_inizio), newDurata-1));
      await supabase.from("lavorazioni_gantt").update({durata_giorni:newDurata, data_fine:newEnd}).eq("id", lav.id);

      // Ricalcola dipendenti
      const updatedLav = {...lav, durata_giorni:newDurata, data_fine:newEnd};
      const allLav = lavorazioni.map(l => l.id===lav.id ? updatedLav : l);
      const updates = ricalcolaDipendenti(lav.id, allLav);
      if (Object.keys(updates).length > 0) {
        setLavorazioni(prev => prev.map(l => updates[l.id] ? {...l,...updates[l.id]} : l));
        await Promise.all(Object.values(updates).map(u =>
          supabase.from("lavorazioni_gantt").update({data_inizio:u.data_inizio, data_fine:u.data_fine}).eq("id", u.id)
        ));
      }
      loadData();
    };
    document.addEventListener("mousemove",onMove);
    document.addEventListener("mouseup",onUp);
  }, [dayW, loadData]);

  const inputSt = {padding:'2px 4px', border:'none', background:'transparent', color:T.ink, fontSize:10, fontFamily:"'IBM Plex Mono', monospace", outline:'none', width:'100%', boxSizing:'border-box'};

  if (loading) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:200,fontFamily:"'IBM Plex Mono', monospace",fontSize:11,color:T.muted}}>Caricamento...</div>
  );

  const totalH = Math.max(newRowTop + ROW_H, window.innerHeight);

  return (
    <div style={{display:'flex',flexDirection:'column',gap:0,height:'calc(100vh - 120px)'}}>

      {/* Toolbar */}
      <div style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius: T.radius, backdropFilter: T.blurSm, WebkitBackdropFilter: T.blurSm, boxShadow: T.shadow, padding:'10px 16px',display:'flex',alignItems:'center',justifyContent:'space-between',flexShrink:0}}>
        <div style={{display:'flex',alignItems:'center',gap:12}}>
          <button onClick={onBack} style={{background:'none',border:`0.5px solid ${T.borderMd}`,cursor:'pointer',color:T.muted,padding:'5px 12px',fontFamily:"'IBM Plex Mono', monospace",fontSize:10,letterSpacing:'0.08em',textTransform:'uppercase'}}>← Versioni</button>
          <div style={{fontSize:16,fontWeight:600,color:T.ink,letterSpacing:'-0.02em'}}>{project.name}</div>
          {version&&<div style={{fontFamily:"'IBM Plex Mono', monospace",fontSize:10,color:T.navy,border:`0.5px solid ${T.navy}`,padding:'2px 8px'}}>{version.name}</div>}
          {project.client&&<div style={{fontFamily:"'IBM Plex Mono', monospace",fontSize:10,color:T.muted}}>{project.client}</div>}
        </div>
        <div style={{display:'flex',alignItems:'center',gap:8}}>
          {/* Export */}
          <button onClick={()=>exportExcel(lavorazioni,project.name)} style={{background:'none',border:`0.5px solid ${T.borderMd}`,cursor:'pointer',color:T.muted,padding:'5px 12px',fontFamily:"'IBM Plex Mono', monospace",fontSize:10,letterSpacing:'0.08em',textTransform:'uppercase'}}>
            Excel
          </button>
          <button onClick={()=>exportPDF(lavorazioni,project.name,viewMode)} style={{background:'none',border:`0.5px solid ${T.borderMd}`,cursor:'pointer',color:T.muted,padding:'5px 12px',fontFamily:"'IBM Plex Mono', monospace",fontSize:10,letterSpacing:'0.08em',textTransform:'uppercase'}}>
            PDF
          </button>
          {/* Solo grafico */}
          <button onClick={()=>setOnlyChart(p=>!p)} style={{background:onlyChart?T.navy:'transparent',border:`0.5px solid ${T.borderMd}`,color:onlyChart?T.bg:T.muted,padding:'6px 14px',cursor:'pointer',fontFamily:"'IBM Plex Mono', monospace",fontSize:10,letterSpacing:'0.08em',textTransform:'uppercase'}}>
            {onlyChart ? '⊞ Tabella' : '▦ Solo grafico'}
          </button>
          {/* Vista */}
          <div style={{display:'flex',border:`0.5px solid ${T.borderMd}`,overflow:'hidden'}}>
            {[['week','Settimane'],['month','Mesi']].map(([m,label])=>(
              <button key={m} onClick={()=>setViewMode(m)} style={{padding:'6px 14px',border:'none',background:viewMode===m?T.navy:'transparent',color:viewMode===m?T.bg:T.muted,fontFamily:"'IBM Plex Mono', monospace",fontSize:10,letterSpacing:'0.08em',textTransform:'uppercase',cursor:'pointer'}}>{label}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Body */}
      <div style={{flex:1,display:'flex',overflow:'hidden',border:`1px solid ${T.border}`,borderTop:'none',background:T.surface}}>

        {/* LEFT */}
        {!onlyChart && (
        <div style={{width:LEFT_W,flexShrink:0,borderRight:`0.5px solid ${T.border}`,display:'flex',flexDirection:'column'}}>
          {/* Header colonne */}
          <div style={{height:52,borderBottom:`0.5px solid ${T.border}`,display:'grid',gridTemplateColumns:`${COL.drag}px ${COL.attivita}px ${COL.impresa}px ${COL.dipende}px ${COL.inizio}px ${COL.fine}px ${COL.durata}px ${COL.del}px`,background:T.bg,flexShrink:0}}>
            {['','Attività','Impresa','Dipende da','Inizio','Fine','Durata',''].map((h,i)=>(
              <div key={i} style={{padding:'0 10px',display:'flex',alignItems:'center',fontFamily:"'IBM Plex Mono', monospace",fontSize:8,letterSpacing:'0.2em',textTransform:'uppercase',color:T.muted,borderRight:i<7?`0.5px solid ${T.border}`:'none'}}>{h}</div>
            ))}
          </div>
          {/* Righe */}
          <div ref={leftRef} style={{flex:1,overflowY:'hidden',position:'relative'}}>
            {/* Linea di inserimento durante il drag */}
            {rowDragState && (
              <div style={{position:'absolute',left:0,right:0,top:(rowDragState.dragOverIdx < lavorazioni.length ? getRowTop(rowDragState.dragOverIdx) : newRowTop)-1,height:2,background:T.navy,zIndex:20,pointerEvents:'none',borderRadius:1}}/>
            )}
            {lavorazioni.map((lav,i)=>{
              const color = lav.colore || (lav.operatore ? colorForImpresa(lav.operatore, {...impresaColorMap}, T.navy) : T.navy);
              const isDragging = rowDragState?.groupIds?.has(lav.id);
              return (
                <div key={lav.id}
                  ref={el => { rowDivsRef.current[i] = el; }}
                  style={{minHeight:ROW_H,display:'grid',gridTemplateColumns:`${COL.drag}px ${COL.attivita}px ${COL.impresa}px ${COL.dipende}px ${COL.inizio}px ${COL.fine}px ${COL.durata}px ${COL.del}px`,borderBottom:`0.5px solid ${T.border}`,background:i%2===0?T.surface:T.surface2,opacity:isDragging?0.35:1,transition:'opacity 0.1s'}}>
                  {/* Drag handle */}
                  <div onMouseDown={e=>onRowDragStart(e,lav,i)} style={{display:'flex',alignItems:'center',justifyContent:'center',cursor:'grab',borderRight:`0.5px solid ${T.border}`,color:T.muted,fontSize:11,userSelect:'none',flexShrink:0}}>⠿</div>
                  {/* Nome — textarea auto-height */}
                  <div style={{padding:'4px 8px',display:'flex',alignItems:'flex-start',gap:6,borderRight:`0.5px solid ${T.border}`}}>
                    <div style={{width:8,height:8,borderRadius:'50%',background:color,flexShrink:0,marginTop:5}}/>
                    <textarea className="desc-ta"
                      value={lav.descrizione||''}
                      onChange={e=>{
                        e.target.style.height='0';
                        e.target.style.height=e.target.scrollHeight+'px';
                        setLavorazioni(p=>p.map(l=>l.id===lav.id?{...l,descrizione:e.target.value}:l));
                      }}
                      onBlur={e=>handleInlineEdit(lav,'descrizione',e.target.value)}
                      onKeyDown={e=>{ if(e.key==='Enter'){e.preventDefault();e.target.blur();} }}
                      rows={1}
                      style={{...inputSt,fontWeight:600,fontSize:12,fontFamily:"'Space Grotesk', sans-serif",resize:'none',overflow:'hidden',lineHeight:'1.4',padding:'0',height:'auto'}}/>
                  </div>
                  {/* Impresa — autocomplete custom */}
                  <div style={{padding:'0 6px',display:'flex',alignItems:'center',borderRight:`0.5px solid ${T.border}`,position:'relative'}}>
                    <input value={lav.operatore||''}
                      onChange={e=>{setLavorazioni(p=>p.map(l=>l.id===lav.id?{...l,operatore:e.target.value}:l));setImpresaSuggest({rowId:lav.id});}}
                      onFocus={()=>setImpresaSuggest({rowId:lav.id})}
                      onBlur={e=>{handleInlineEdit(lav,'operatore',e.target.value);setTimeout(()=>setImpresaSuggest(null),150);}}
                      onKeyDown={e=>{ if(e.key==='Enter') e.target.blur(); }}
                      style={{...inputSt,fontSize:10}}/>
                    {impresaSuggest?.rowId===lav.id && Object.keys(impresaColorMap).filter(o=>!lav.operatore||o.toLowerCase().includes(lav.operatore.toLowerCase())).length>0 && (
                      <div style={{position:'absolute',top:'100%',left:0,zIndex:1000,background:T.surface,border:`0.5px solid ${T.borderMd}`,borderRadius: T.radius, backdropFilter: T.blurSm, WebkitBackdropFilter: T.blurSm, boxShadow: T.shadow, boxShadow:'0 4px 12px rgba(0,0,0,0.12)',minWidth:130,maxHeight:160,overflowY:'auto'}}>
                        {Object.keys(impresaColorMap).filter(o=>!lav.operatore||o.toLowerCase().includes(lav.operatore.toLowerCase())).map(opt=>(
                          <div key={opt} onMouseDown={()=>{handleInlineEdit(lav,'operatore',opt);setImpresaSuggest(null);}}
                            style={{padding:'7px 10px',cursor:'pointer',color:T.ink,fontFamily:"'IBM Plex Mono', monospace",fontSize:10,display:'flex',alignItems:'center',gap:8}}
                            onMouseEnter={e=>e.currentTarget.style.background=T.surface2}
                            onMouseLeave={e=>e.currentTarget.style.background='none'}>
                            <span style={{width:7,height:7,borderRadius:'50%',background:impresaColorMap[opt]||T.navy,flexShrink:0,display:'inline-block'}}/>
                            {opt}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  {/* Dipende da */}
                  <div style={{padding:'0 6px',display:'flex',alignItems:'center',borderRight:`0.5px solid ${T.border}`}}>
                    <select value={lav.dipendenza_id||''}
                      onChange={e=>handleInlineEdit(lav,'dipendenza_id',e.target.value||null)}
                      style={{...inputSt,fontSize:9,cursor:'pointer'}}>
                      <option value=''>—</option>
                      {lavorazioni.filter(l=>l.id!==lav.id).map(l=>(
                        <option key={l.id} value={l.id}>{l.descrizione||'—'}</option>
                      ))}
                    </select>
                  </div>
                  {/* Data inizio */}
                  <div style={{padding:'0 4px',display:'flex',alignItems:'center',borderRight:`0.5px solid ${T.border}`}}>
                    <input type="date" value={lav.data_inizio||''}
                      onChange={e=>handleInlineEdit(lav,'data_inizio',e.target.value)}
                      style={{...inputSt,fontSize:9,padding:'2px 4px'}}/>
                  </div>
                  {/* Data fine */}
                  <div style={{padding:'0 4px',display:'flex',alignItems:'center',borderRight:`0.5px solid ${T.border}`}}>
                    <input type="date" value={lav.data_fine||''}
                      onChange={e=>handleInlineEdit(lav,'data_fine',e.target.value)}
                      style={{...inputSt,fontSize:9,padding:'2px 4px'}}/>
                  </div>
                  {/* Durata */}
                  <div style={{padding:'0 6px',display:'flex',alignItems:'center',borderRight:`0.5px solid ${T.border}`}}>
                    <input type="number" min={1} value={lav.durata_giorni||''}
                      onChange={e=>setLavorazioni(p=>p.map(l=>l.id===lav.id?{...l,durata_giorni:e.target.value}:l))}
                      onBlur={e=>handleInlineEdit(lav,'durata_giorni',e.target.value)}
                      onKeyDown={e=>{ if(e.key==='Enter') e.target.blur(); }}
                      style={{...inputSt,width:'100%'}}/>
                  </div>
                  {/* Elimina */}
                  <div style={{display:'flex',alignItems:'center',justifyContent:'center'}}>
                    <button onClick={()=>handleDelete(lav.id)} style={{background:'none',border:'none',cursor:'pointer',color:T.muted,fontSize:16,lineHeight:1,padding:'0 4px'}}>×</button>
                  </div>
                </div>
              );
            })}

            {/* Riga nuova lavorazione */}
            <div style={{height:ROW_H,display:'grid',gridTemplateColumns:`${COL.drag}px ${COL.attivita}px ${COL.impresa}px ${COL.dipende}px ${COL.inizio}px ${COL.fine}px ${COL.durata}px ${COL.del}px`,borderBottom:`0.5px solid ${T.border}`,background:T.navyLight}}>
              {/* Drag handle vuoto */}
              <div style={{borderRight:`0.5px solid ${T.border}`}}/>
              {/* Descrizione */}
              <div style={{padding:'0 8px',display:'flex',alignItems:'center',gap:6,borderRight:`0.5px solid ${T.border}`}}>
                <div style={{width:8,height:8,borderRadius:'50%',background:T.muted,flexShrink:0}}/>
                <input value={newRow.descrizione}
                  onChange={e=>setNewRow(p=>({...p,descrizione:e.target.value}))}
                  onKeyDown={e=>{ if(e.key==='Enter'){ e.preventDefault(); e.stopPropagation(); handleSaveNew(); } }}
                  placeholder="+ Nuova lavorazione..."
                  style={{...inputSt,fontSize:12,fontFamily:"'Space Grotesk', sans-serif",color:T.muted}}/>
              </div>
              {/* Impresa nuova riga — autocomplete custom */}
              <div style={{padding:'0 6px',display:'flex',alignItems:'center',borderRight:`0.5px solid ${T.border}`,position:'relative'}}>
                <input value={newRow.operatore}
                  onChange={e=>{updateNewRow('operatore',e.target.value);setImpresaSuggest({rowId:'new'});}}
                  onFocus={()=>setImpresaSuggest({rowId:'new'})}
                  onBlur={()=>setTimeout(()=>setImpresaSuggest(null),150)}
                  onKeyDown={e=>{ if(e.key==='Enter') handleSaveNew(); }}
                  placeholder="Impresa..."
                  style={{...inputSt,fontSize:10,color:T.muted}}/>
                {impresaSuggest?.rowId==='new' && Object.keys(impresaColorMap).filter(o=>!newRow.operatore||o.toLowerCase().includes(newRow.operatore.toLowerCase())).length>0 && (
                  <div style={{position:'absolute',top:'100%',left:0,zIndex:1000,background:T.surface,border:`0.5px solid ${T.borderMd}`,borderRadius: T.radius, backdropFilter: T.blurSm, WebkitBackdropFilter: T.blurSm, boxShadow: T.shadow, boxShadow:'0 4px 12px rgba(0,0,0,0.12)',minWidth:130,maxHeight:160,overflowY:'auto'}}>
                    {Object.keys(impresaColorMap).filter(o=>!newRow.operatore||o.toLowerCase().includes(newRow.operatore.toLowerCase())).map(opt=>(
                      <div key={opt} onMouseDown={()=>{updateNewRow('operatore',opt);setImpresaSuggest(null);}}
                        style={{padding:'7px 10px',cursor:'pointer',color:T.ink,fontFamily:"'IBM Plex Mono', monospace",fontSize:10,display:'flex',alignItems:'center',gap:8}}
                        onMouseEnter={e=>e.currentTarget.style.background=T.surface2}
                        onMouseLeave={e=>e.currentTarget.style.background='none'}>
                        <span style={{width:7,height:7,borderRadius:'50%',background:impresaColorMap[opt]||T.navy,flexShrink:0,display:'inline-block'}}/>
                        {opt}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {/* Dipende da */}
              <div style={{padding:'0 6px',display:'flex',alignItems:'center',borderRight:`0.5px solid ${T.border}`}}>
                <select value={newRow.dipendenza_id}
                  onChange={e=>updateNewRow('dipendenza_id',e.target.value)}
                  style={{...inputSt,fontSize:9,cursor:'pointer'}}>
                  <option value=''>—</option>
                  {lavorazioni.map(l=>(
                    <option key={l.id} value={l.id}>{l.descrizione||'—'}</option>
                  ))}
                </select>
              </div>
              {/* Data inizio */}
              <div style={{padding:'0 4px',display:'flex',alignItems:'center',borderRight:`0.5px solid ${T.border}`}}>
                <input type="date" value={newRow.data_inizio}
                  onChange={e=>updateNewRow('data_inizio',e.target.value)}
                  style={{...inputSt,fontSize:9,padding:'2px 4px'}}/>
              </div>
              {/* Data fine */}
              <div style={{padding:'0 4px',display:'flex',alignItems:'center',borderRight:`0.5px solid ${T.border}`}}>
                <input type="date" value={newRow.data_fine}
                  onChange={e=>updateNewRow('data_fine',e.target.value)}
                  style={{...inputSt,fontSize:9,padding:'2px 4px'}}/>
              </div>
              {/* Durata */}
              <div style={{padding:'0 6px',display:'flex',alignItems:'center',borderRight:`0.5px solid ${T.border}`}}>
                <input type="number" min={1} value={newRow.durata_giorni}
                  onChange={e=>updateNewRow('durata_giorni',e.target.value)}
                  onKeyDown={e=>{ if(e.key==='Enter') handleSaveNew(); }}
                  style={{...inputSt,width:'100%'}}/>
              </div>
              {/* Salva */}
              <div style={{display:'flex',alignItems:'center',justifyContent:'center'}}>
                <button onClick={handleSaveNew} disabled={savingNew||!newRow.descrizione.trim()}
                  style={{background:T.navy,border:'none',cursor:'pointer',color:T.bg,width:22,height:22,fontSize:16,display:'flex',alignItems:'center',justifyContent:'center',borderRadius:2,opacity:savingNew||!newRow.descrizione.trim()?0.4:1}}>+</button>
              </div>
            </div>
          </div>
        </div>
        )}

        {/* RIGHT — chart */}
        <div ref={chartRef}
          onScroll={e=>{ if(leftRef.current) leftRef.current.scrollTop=e.target.scrollTop; }}
          style={{flex:1,overflowX:'auto',overflowY:'auto',position:'relative'}}>
          <div style={{width:totalW,minWidth:'100%',position:'relative'}}>

            {/* Header temporale sticky */}
            <div style={{height:52,position:'sticky',top:0,zIndex:10,background:T.bg,borderBottom:`0.5px solid ${T.border}`}}>
              {/* Mesi */}
              <div style={{height:26,display:'flex',borderBottom:`0.5px solid ${T.border}`}}>
                {timeHeaders.months.map((m,i)=>{
                  const [year,month]=m.label.split('-');
                  const label=new Date(Number(year),Number(month),1).toLocaleDateString('it-IT',{month:'long',year:'numeric'});
                  return (
                    <div key={i} style={{width:m.width,flexShrink:0,padding:'0 8px',display:'flex',alignItems:'center',borderRight:`0.5px solid ${T.border}`,overflow:'hidden',background:T.bg}}>
                      <span style={{fontFamily:"'IBM Plex Mono', monospace",fontSize:9,letterSpacing:'0.1em',textTransform:'uppercase',color:T.ink,whiteSpace:'nowrap'}}>{label}</span>
                    </div>
                  );
                })}
              </div>
              {/* Settimane */}
              <div style={{height:26,display:'flex'}}>
                {viewMode==='week' ? timeHeaders.weeks.map((w,i)=>(
                  <div key={i} style={{width:w.width,flexShrink:0,padding:'0 6px',display:'flex',alignItems:'center',borderRight:`0.5px solid ${T.border}`,overflow:'hidden',background:T.bg}}>
                    <span style={{fontFamily:"'IBM Plex Mono', monospace",fontSize:8,color:T.muted,whiteSpace:'nowrap'}}>
                      {w.date?w.date.toLocaleDateString('it-IT',{day:'numeric',month:'short'}):''}
                    </span>
                  </div>
                )) : Array.from({length:Math.ceil(totalDays/5)},(_,i)=>{
                  const d=addDays(startDate,i*5);
                  return (
                    <div key={i} style={{width:dayW*5,flexShrink:0,padding:'0 4px',display:'flex',alignItems:'center',borderRight:`0.5px solid ${T.border}`,background:T.bg}}>
                      <span style={{fontFamily:"'IBM Plex Mono', monospace",fontSize:8,color:T.muted}}>{d.getDate()}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Grid corpo */}
            <div style={{position:'relative',height:totalH}}>

              {/* ── SFONDO COLORATO — tutto il calendario ── */}
              {Array.from({length:totalDays},(_,i)=>{
                const d = addDays(startDate, i);
                const isWeekend = d.getDay()===0||d.getDay()===6;
                const isMonday  = d.getDay()===1;
                const weekNum   = Math.floor(i/7);
                const isOdd     = weekNum%2===1;
                const isToday   = toISO(d)===toISO(new Date());
                return (
                  <div key={i} style={{
                    position:'absolute', left:i*dayW, top:0, width:dayW, height:totalH,
                    background: isToday
                      ? 'rgba(19,49,92,0.10)'
                      : isWeekend
                      ? T.border
                      : isOdd
                      ? 'rgba(19,49,92,0.03)'
                      : `${T.bg}80`,
                    borderRight:`0.5px solid ${isMonday?T.borderMd:T.border}`,
                    pointerEvents:'none',
                  }}/>
                );
              })}

              {/* Linea oggi */}
              <div style={{position:'absolute',left:todayX,top:0,width:2,height:totalH,background:T.navy,opacity:0.8,pointerEvents:'none',zIndex:5}}/>

              {/* Linee orizzontali righe */}
              {lavorazioni.map((_,i)=>(
                <div key={i} style={{position:'absolute',left:0,top:getRowTop(i),right:0,height:getRowH(i),borderBottom:`0.5px solid ${T.border}`,background:i%2===0?'transparent':'rgba(14,14,13,0.01)',pointerEvents:'none'}}/>
              ))}
              <div style={{position:'absolute',left:0,top:newRowTop,right:0,height:ROW_H,borderBottom:`0.5px solid ${T.border}`,pointerEvents:'none'}}/>

              {/* SVG dipendenze */}
              <svg style={{position:'absolute',top:0,left:0,width:totalW,height:totalH,pointerEvents:'none',overflow:'visible',zIndex:3}}>
                <defs>
                  <marker id="arr" markerWidth="6" markerHeight="6" refX="6" refY="3" orient="auto">
                    <path d="M0,0 L6,3 L0,6 Z" fill={T.muted}/>
                  </marker>
                </defs>
                {lavorazioni.filter(l=>l.dipendenza_id).map((lav)=>{
                  const dep=lavorazioni.find(d=>d.id===lav.dipendenza_id);
                  if (!dep||!dep.data_inizio||!lav.data_inizio) return null;
                  const di=lavorazioni.indexOf(dep); const li=lavorazioni.indexOf(lav);
                  const x1=dateToX(dep.data_inizio)+Number(dep.durata_giorni||1)*dayW;
                  const y1=getRowTop(di)+getRowH(di)/2;
                  const x2=dateToX(lav.data_inizio);
                  const y2=getRowTop(li)+getRowH(li)/2;
                  return (
                    <path key={lav.id} d={`M${x1} ${y1} C${x1+30} ${y1} ${x2-30} ${y2} ${x2} ${y2}`}
                      fill="none" stroke={T.muted} strokeWidth={1.5} strokeDasharray="4,3" markerEnd="url(#arr)"/>
                  );
                })}
              </svg>

              {/* Barre lavorazioni */}
              {lavorazioni.map((lav,i)=>{
                const rH  = getRowH(i);
                const rTop = getRowTop(i);
                if (!lav.data_inizio) return (
                  <div key={lav.id} style={{position:'absolute',top:rTop,left:0,right:0,height:rH}}/>
                );
                const barX  = dateToX(lav.data_inizio);
                const barW  = Math.max(Number(lav.durata_giorni||1)*dayW, 8);
                const pct   = Number(lav.percentuale_completamento)||0;
                const color = lav.colore || (lav.operatore ? colorForImpresa(lav.operatore, {...impresaColorMap}, T.navy) : T.navy);
                return (
                  <div key={lav.id} style={{position:'absolute',top:rTop,left:0,right:0,height:rH,zIndex:4}}>
                    <div
                      onMouseDown={e=>onBarMouseDown(e,lav)}
                      style={{
                        position:'absolute', left:barX, top:rH*0.18, height:rH*0.64,
                        width:barW, background:color, cursor:'grab', borderRadius:4,
                        overflow:'hidden', userSelect:'none',
                        boxShadow:'0 2px 6px rgba(0,0,0,0.18)',
                      }}
                    >
                      {/* Progress */}
                      <div style={{position:'absolute',left:0,top:0,height:'100%',width:`${pct}%`,background:'rgba(255,255,255,0.3)',pointerEvents:'none'}}/>
                      {/* Label */}
                      {barW>60&&(
                        <div style={{position:'absolute',left:8,top:0,height:'100%',display:'flex',alignItems:'center',fontFamily:"'IBM Plex Mono', monospace",fontSize:9,color:T.surface,letterSpacing:'0.04em',whiteSpace:'nowrap',pointerEvents:'none',maxWidth:barW-24,overflow:'hidden',textOverflow:'ellipsis'}}>
                          {lav.descrizione}
                        </div>
                      )}
                      {/* Date sotto la barra */}
                      <div style={{position:'absolute',top:'100%',left:0,marginTop:2,fontFamily:"'IBM Plex Mono', monospace",fontSize:8,color:T.muted,whiteSpace:'nowrap',pointerEvents:'none'}}>
                        {fmtDate(lav.data_inizio)} → {fmtDate(lav.data_fine)}
                      </div>
                      {/* Resize handle */}
                      <div onMouseDown={e=>onResizeMouseDown(e,lav)} style={{position:'absolute',right:0,top:0,width:8,height:'100%',cursor:'ew-resize',background:'rgba(0,0,0,0.15)',zIndex:6}}/>
                    </div>
                  </div>
                );
              })}

              {/* Riga nuova — preview barra */}
              <div style={{position:'absolute',top:newRowTop,left:0,right:0,height:ROW_H,background:`${T.navyLight}cc`}}>
                {newRow.data_inizio&&(
                  <div style={{position:'absolute',left:dateToX(newRow.data_inizio),top:ROW_H*0.18,height:ROW_H*0.64,width:Math.max(Number(newRow.durata_giorni||7)*dayW,8),background:T.navy,opacity:0.25,borderRadius:4}}/>
                )}
              </div>

            </div>
          </div>
        </div>
      </div>

    </div>
  );
}

// ── LISTA PROGETTI ────────────────────────────────────────────────
export default function GanttPage() {
  const { T } = useTheme();
  usePageTitleOnMount("Gantt");
  const { studioId } = useStudio();
  const [projects, setProjects]               = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [selectedVersion, setSelectedVersion] = useState(null);
  const [loading, setLoading]                 = useState(true);

  useEffect(()=>{
    if (!studioId) return;
    supabase.from("projects")
      .select("id,name,client,status,gantt_enabled")
      .eq("studio", studioId).eq("archived", false).eq("gantt_enabled", true)
      .order("name")
      .then(({data})=>{ setProjects(data??[]); setLoading(false); });
  }, [studioId]);

  // Progetto + Versione → Gantt editor
  if (selectedProject && selectedVersion) return (
    <ProjectGantt
      project={selectedProject}
      studioId={studioId}
      version={selectedVersion}
      onBack={() => setSelectedVersion(null)}
    />
  );

  // Progetto senza versione → lista versioni
  if (selectedProject) return (
    <GanttVersionsList
      project={selectedProject}
      studioId={studioId}
      onSelectVersion={v => setSelectedVersion(v)}
      onBack={() => setSelectedProject(null)}
    />
  );

  if (loading) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:240,fontFamily:"'IBM Plex Mono', monospace",fontSize:11,color:T.muted}}>
      Caricamento...
    </div>
  );

  return (
    <div style={{display:'flex',flexDirection:'column',gap:14}}>
      <div>
        <div style={{fontSize:22,fontWeight:600,letterSpacing:'-0.03em',color:T.ink,marginBottom:4}}>Gantt</div>
        <div style={{fontFamily:"'IBM Plex Mono', monospace",fontSize:10,color:T.muted}}>
          {projects.length} {projects.length===1?'progetto':'progetti'} con Gantt attivo — clicca per aprire
        </div>
      </div>

      {projects.length===0 ? (
        <div style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius: T.radius, backdropFilter: T.blurSm, WebkitBackdropFilter: T.blurSm, boxShadow: T.shadow, padding:'48px 0',textAlign:'center'}}>
          <div style={{fontFamily:"'IBM Plex Mono', monospace",fontSize:11,color:T.muted,marginBottom:8}}>
            Nessun progetto con Gantt attivo.
          </div>
          <div style={{fontFamily:"'IBM Plex Mono', monospace",fontSize:10,color:T.muted}}>
            Abilita il Gantt modificando un progetto.
          </div>
        </div>
      ) : (
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))',gap:10}}>
          {projects.map(p=>(
            <button key={p.id} onClick={()=>setSelectedProject(p)}
              style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius: T.radius, backdropFilter: T.blurSm, WebkitBackdropFilter: T.blurSm, boxShadow: T.shadow, padding:'20px 22px',textAlign:'left',cursor:'pointer',transition:'border-color 0.1s'}}
              onMouseEnter={e=>e.currentTarget.style.borderColor=T.navy}
              onMouseLeave={e=>e.currentTarget.style.borderColor=T.border}
            >
              <div style={{fontSize:15,fontWeight:600,color:T.ink,marginBottom:6}}>{p.name}</div>
              <div style={{fontFamily:"'IBM Plex Mono', monospace",fontSize:9,color:T.muted,display:'flex',gap:10}}>
                {p.client&&<span>{p.client}</span>}
                {p.status&&<span style={{textTransform:'uppercase',letterSpacing:'0.08em'}}>{p.status}</span>}
              </div>
              <div style={{marginTop:14,fontFamily:"'IBM Plex Mono', monospace",fontSize:9,color:T.navy,letterSpacing:'0.08em',textTransform:'uppercase',display:'flex',alignItems:'center',gap:6}}>
                <span>Apri Gantt</span><span>→</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
