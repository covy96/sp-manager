import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { usePageTitleOnMount } from "../hooks/usePageTitle";
import { useStudio } from "../hooks/useStudio";
import { supabase } from "../lib/supabase";
import { formatOre } from "../lib/utils";
import { useTheme } from "../contexts/ThemeContext";
import SlidingTabs from "../components/SlidingTabs";
import { useToast } from "../contexts/ToastContext";

function getTodayDate() { return new Date().toISOString().slice(0, 10); }
function formatDateDisplay(dateStr) {
  const date = new Date(dateStr);
  const today = new Date();
  const isToday = date.toDateString() === today.toDateString();
  const formatted = date.toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long" });
  return isToday ? `${formatted} (Oggi)` : formatted;
}
function getInitials(text) {
  if (!text) return "?";
  const parts = text.trim().split(/\s+/);
  return parts.length >= 2 ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase() : text.slice(0, 2).toUpperCase();
}

const HOURS_OPTIONS = [];
for (let h = 0.25; h <= 12; h += 0.25) HOURS_OPTIONS.push({ value: h, label: formatOre(h) });

const AVATAR_COLORS = ["#13315C","#1a6b3c","#7c3aed","#b45309","#be185d","#0e7490"];
function avatarColor(seed = "") {
  let h = 0; for (let i = 0; i < seed.length; i++) h = seed.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

// ── SHARED UI ────────────────────────────────────────────────────
function FieldLabel({ children }) {
  const { T } = useTheme();
  return <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: T.muted, marginBottom: 6 }}>{children}</div>;
}
function Input({ value, onChange, type = "text", placeholder, style = {} }) {
  const { T } = useTheme();
  const [focus, setFocus] = useState(false);
  return (
    <input type={type} value={value} onChange={onChange} placeholder={placeholder}
      onFocus={() => setFocus(true)} onBlur={() => setFocus(false)}
      style={{ width: '100%', padding: '8px 12px', boxSizing: 'border-box', border: `1px solid ${focus ? T.navy : T.ink20}`, borderRadius: T.radiusSm, background: T.surface, color: T.ink, fontSize: 12, fontFamily: "'Space Grotesk', sans-serif", outline: 'none', ...style }} />
  );
}
function BtnPrimary({ children, onClick, disabled, type = "button", style = {} }) {
  const { T } = useTheme();
  return (
    <button type={type} onClick={onClick} disabled={disabled} style={{
      background: T.navy, color: T.bg, border: 'none',
      fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase',
      padding: '8px 18px', cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.6 : 1, ...style,
    }}>{children}</button>
  );
}
function BtnGhost({ children, onClick, disabled, danger, style = {} }) {
  const { T } = useTheme();
  return (
    <button type="button" onClick={onClick} disabled={disabled} style={{
      background: 'transparent', border: `1px solid ${danger ? T.red : T.ink20}`, borderRadius: T.radiusSm,
      color: danger ? T.red : T.ink, fontFamily: "'IBM Plex Mono', monospace", fontSize: 11,
      letterSpacing: '0.08em', textTransform: 'uppercase', padding: '8px 18px',
      cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1, ...style,
    }}>{children}</button>
  );
}
function Modal({ open, onClose, title, children, width = 480 }) {
  const { T } = useTheme();
  if (!open) return null;
  return (
    <div className="asm-modal-bg" style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div className="asm-modal-content" style={{ width: '100%', maxWidth: width, background: T.glassBg, backdropFilter: T.blur, WebkitBackdropFilter: T.blur, border: `1px solid ${T.glassBorder}`, boxShadow: T.shadowLg, borderRadius: T.radiusLg, padding: 28, maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: 16, fontWeight: 600, color: T.ink, letterSpacing: '-0.02em' }}>{title}</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.muted, fontSize: 20, lineHeight: 1 }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}
function Divider() { const { T } = useTheme(); return <div style={{ height: '0.5px', background: T.ink10, margin: '14px 0' }} />; }

// ── HELPERS DATE ─────────────────────────────────────────────────
function getMonday(d) {
  const day = new Date(d); const dow = day.getDay();
  day.setDate(day.getDate() - (dow === 0 ? 6 : dow - 1));
  return day.toISOString().slice(0, 10);
}
function addDays(dateStr, n) {
  const d = new Date(dateStr); d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}
function addWeeks(dateStr, n) { return addDays(dateStr, n * 7); }
function addMonths(dateStr, n) {
  const d = new Date(dateStr); d.setMonth(d.getMonth() + n);
  return d.toISOString().slice(0, 10);
}
function getMonthStart(dateStr) {
  const d = new Date(dateStr); d.setDate(1);
  return d.toISOString().slice(0, 10);
}
function getMonthEnd(dateStr) {
  const d = new Date(dateStr); d.setMonth(d.getMonth() + 1); d.setDate(0);
  return d.toISOString().slice(0, 10);
}
function formatWeekLabel(monday) {
  const sun = addDays(monday, 6);
  const mDate = new Date(monday); const sDate = new Date(sun);
  const mStr = mDate.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' });
  const sStr = sDate.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' });
  return `${mStr} – ${sStr}`;
}
function formatMonthLabel(dateStr) {
  return new Date(dateStr).toLocaleDateString('it-IT', { month: 'long', year: 'numeric' });
}
const IT_DAYS_SHORT = ['Lun','Mar','Mer','Gio','Ven','Sab','Dom'];

// ── VISTA PERSONALE ───────────────────────────────────────────────
function VistaTeam({ studioId, projects, currentMemberId, refreshKey = 0 }) {
  const { T } = useTheme();
  const isMobile = window.innerWidth < 768;

  const [mode, setMode]             = useState('settimana');
  const [weekStart, setWeekStart]   = useState(() => getMonday(new Date().toISOString().slice(0,10)));
  const [monthStart, setMonthStart] = useState(() => getMonthStart(new Date().toISOString().slice(0,10)));
  const [entries, setEntries]       = useState([]);
  const [loading, setLoading]       = useState(false);

  const { dateFrom, dateTo, days, label } = useMemo(() => {
    if (mode === 'settimana') {
      const monday = weekStart;
      const daysArr = Array.from({ length: 7 }, (_, i) => addDays(monday, i));
      return { dateFrom: monday, dateTo: addDays(monday, 6), days: daysArr, label: formatWeekLabel(monday) };
    } else {
      const ms = monthStart;
      const me = getMonthEnd(ms);
      const daysArr = [];
      let cur = ms;
      while (cur <= me) { daysArr.push(cur); cur = addDays(cur, 1); }
      return { dateFrom: ms, dateTo: me, days: daysArr, label: formatMonthLabel(ms) };
    }
  }, [mode, weekStart, monthStart]);

  const load = useCallback(async () => {
    if (!studioId || !currentMemberId) return;
    setLoading(true);
    const { data } = await supabase.from('timesheet').select('*')
      .eq('studio', studioId)
      .eq('team_member', currentMemberId)
      .gte('date', dateFrom)
      .lte('date', dateTo)
      .is('deleted_at', null);
    setEntries(data ?? []);
    setLoading(false);
  }, [studioId, currentMemberId, dateFrom, dateTo]);

  useEffect(() => { load(); }, [load, refreshKey]);

  const navigate = dir => {
    if (mode === 'settimana') setWeekStart(p => addWeeks(p, dir));
    else setMonthStart(p => addMonths(p, dir));
  };

  // righe = progetti, colonne = giorni
  const tableData = useMemo(() => {
    const projectIds = [...new Set(entries.map(e => e.project_id).filter(Boolean))];
    return projectIds.map(pid => {
      const proj = projects.find(p => p.id === pid);
      const projEntries = entries.filter(e => e.project_id === pid);
      const byDay = {};
      days.forEach(d => {
        const hrs = projEntries.filter(e => e.date === d).reduce((s, e) => s + (Number(e.hours) || 0), 0);
        byDay[d] = hrs;
      });
      const total = Object.values(byDay).reduce((s, v) => s + v, 0);
      return { id: pid, label: proj?.name || entries.find(e => e.project_id === pid)?.project_name || '—', byDay, total };
    }).sort((a, b) => b.total - a.total);
  }, [entries, projects, days]);

  // Colonne da mostrare (solo quelle con dati, in mese collassa a settimane)
  const columns = useMemo(() => {
    if (mode === 'mese') {
      // raggruppa per settimana (lun-dom)
      const weeks = [];
      let i = 0;
      while (i < days.length) {
        const dayOfWeek = new Date(days[i]).getDay();
        const daysToSun = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;
        const end = Math.min(i + daysToSun, days.length - 1);
        const wDays = days.slice(i, end + 1);
        weeks.push({ key: days[i], label: `${new Date(days[i]).getDate()}/${new Date(days[i]).getMonth()+1}`, days: wDays });
        i = end + 1;
      }
      return weeks.map(w => ({
        key: w.key,
        label: w.label,
        getVal: (byDay) => w.days.reduce((s, d) => s + (byDay[d] || 0), 0),
      }));
    } else {
      const today = new Date().toISOString().slice(0, 10);
      return days.map((d, i) => ({
        key: d,
        label: IT_DAYS_SHORT[i] || IT_DAYS_SHORT[new Date(d).getDay() === 0 ? 6 : new Date(d).getDay() - 1],
        sub: new Date(d).getDate(),
        isToday: d === today,
        isWeekend: new Date(d).getDay() === 0 || new Date(d).getDay() === 6,
        getVal: (byDay) => byDay[d] || 0,
      }));
    }
  }, [days, mode]);

  const totalByCol = useMemo(() =>
    columns.map(col => tableData.reduce((s, row) => s + col.getVal(row.byDay), 0)),
    [columns, tableData]
  );

  const mono = { fontFamily: "'IBM Plex Mono', monospace" };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* controlli */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <SlidingTabs
          tabs={[{ key: 'settimana', label: 'Sett.' }, { key: 'mese', label: 'Mese' }]}
          active={mode}
          onChange={setMode}
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: 0, border: `0.5px solid ${T.borderMd}`, borderRadius: T.radiusSm, overflow: 'hidden' }}>
          <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', borderRight: `0.5px solid ${T.borderMd}`, cursor: 'pointer', color: T.ink, padding: '5px 10px', fontSize: 13, lineHeight: 1 }}>←</button>
          <span style={{ ...mono, fontSize: 10, color: T.ink, whiteSpace: 'nowrap', padding: '0 12px', minWidth: 100, textAlign: 'center' }}>{label}</span>
          <button onClick={() => navigate(1)} style={{ background: 'none', border: 'none', borderLeft: `0.5px solid ${T.borderMd}`, cursor: 'pointer', color: T.ink, padding: '5px 10px', fontSize: 13, lineHeight: 1 }}>→</button>
        </div>
        {loading && <span style={{ ...mono, fontSize: 10, color: T.muted }}>...</span>}
      </div>

      {/* tabella */}
      <div style={{ overflowX: 'auto', borderRadius: T.radiusSm, border: `1px solid ${T.ink10}`, background: T.surface, backdropFilter: T.blurSm, WebkitBackdropFilter: T.blurSm, boxShadow: T.shadow }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: mode === 'settimana' ? 500 : 400 }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${T.ink10}` }}>
              <th style={{ padding: '10px 16px', textAlign: 'left', ...mono, fontSize: 8.5, letterSpacing: '0.15em', textTransform: 'uppercase', color: T.muted, fontWeight: 400, width: isMobile ? 90 : 160 }}>
                Progetto
              </th>
              {columns.map((col, ci) => (
                <th key={col.key} style={{ padding: '10px 8px', textAlign: 'center', ...mono, fontSize: 8.5, color: col.isToday ? T.navy : col.isWeekend ? T.muted : T.ink, fontWeight: col.isToday ? 700 : 400, background: col.isWeekend ? T.bg : 'transparent', minWidth: 48 }}>
                  <div>{col.label}</div>
                  {col.sub !== undefined && <div style={{ fontSize: 9, color: col.isToday ? T.navy : T.muted, marginTop: 1 }}>{col.sub}</div>}
                </th>
              ))}
              <th style={{ padding: '10px 12px', textAlign: 'right', ...mono, fontSize: 8.5, letterSpacing: '0.1em', textTransform: 'uppercase', color: T.navy, fontWeight: 700, minWidth: 52 }}>Tot</th>
            </tr>
          </thead>
          <tbody>
            {tableData.length === 0 && !loading ? (
              <tr>
                <td colSpan={columns.length + 2} style={{ padding: '32px 16px', textAlign: 'center', ...mono, fontSize: 11, color: T.muted }}>
                  Nessuna registrazione in questo periodo.
                </td>
              </tr>
            ) : tableData.map((row, ri) => (
              <tr key={row.id} style={{ borderBottom: ri < tableData.length - 1 ? `0.5px solid ${T.ink10}` : 'none', transition: 'background 0.1s' }}
                onMouseEnter={e => e.currentTarget.style.background = T.bg}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                {/* label */}
                <td style={{ padding: '9px 16px' }}>
                  <span style={{ fontSize: isMobile ? 10 : 11, fontWeight: 600, color: T.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: isMobile ? 70 : 120, display: 'block' }}>{row.label}</span>
                </td>
                {/* celle ore */}
                {columns.map(col => {
                  const val = col.getVal(row.byDay);
                  return (
                    <td key={col.key} style={{ padding: '9px 8px', textAlign: 'center', background: col.isWeekend ? T.bg : 'transparent' }}>
                      {val > 0
                        ? <span style={{ display: 'inline-flex', minWidth: 32, height: 22, background: `${row.color}20`, borderRadius: 5, ...mono, fontSize: 9, color: row.color, fontWeight: 700, alignItems: 'center', justifyContent: 'center', padding: '0 5px' }}>{formatOre(val)}h</span>
                        : <span style={{ ...mono, fontSize: 10, color: 'rgba(14,14,13,0.18)' }}>—</span>
                      }
                    </td>
                  );
                })}
                {/* totale riga */}
                <td style={{ padding: '9px 12px', textAlign: 'right' }}>
                  <span style={{ ...mono, fontSize: 11, fontWeight: 700, color: T.navy }}>{formatOre(row.total)}h</span>
                </td>
              </tr>
            ))}
          </tbody>
          {/* footer totali colonne */}
          {tableData.length > 0 && (
            <tfoot>
              <tr style={{ borderTop: `1px solid ${T.ink10}`, background: T.bg }}>
                <td style={{ padding: '8px 16px', ...mono, fontSize: 8.5, letterSpacing: '0.1em', textTransform: 'uppercase', color: T.muted }}>Totale</td>
                {totalByCol.map((tot, ci) => (
                  <td key={columns[ci].key} style={{ padding: '8px 8px', textAlign: 'center', background: columns[ci].isWeekend ? T.bg : 'transparent' }}>
                    {tot > 0
                      ? <span style={{ ...mono, fontSize: 9, fontWeight: 700, color: T.navy }}>{formatOre(tot)}h</span>
                      : <span style={{ ...mono, fontSize: 10, color: 'rgba(14,14,13,0.18)' }}>—</span>
                    }
                  </td>
                ))}
                <td style={{ padding: '8px 12px', textAlign: 'right', ...mono, fontSize: 11, fontWeight: 700, color: T.navy }}>
                  {formatOre(tableData.reduce((s, r) => s + r.total, 0))}h
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}

// ── MAIN ─────────────────────────────────────────────────────────
export default function TimesheetPage() {
  const { T } = useTheme();
  const showToast = useToast();
  usePageTitleOnMount("Timesheet");
  const { studioId, teamMember: currentMember } = useStudio();

  const [selectedDate, setSelectedDate] = useState(getTodayDate());
  const [entries, setEntries]           = useState([]);
  const [projects, setProjects]         = useState([]);
  const [teamMembers, setTeamMembers]   = useState([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState("");
  const [teamRefreshKey, setTeamRefreshKey] = useState(0);

  const [projectSearch, setProjectSearch]   = useState("");
  const [selectedProject, setSelectedProject] = useState(null);
  const [showDrop, setShowDrop]             = useState(false);
  const [hours, setHours]                   = useState(1);
  const [notes, setNotes]                   = useState("");
  const [adding, setAdding]                 = useState(false);

  const [editingEntry, setEditingEntry]     = useState(null);
  const [editHours, setEditHours]           = useState(1);
  const [editNotes, setEditNotes]           = useState("");
  const [savingEdit, setSavingEdit]         = useState(false);

  const searchRef = useRef(null);

  const loadEntries = async (date) => {
    if (!studioId || !currentMember?.id) return;
    setLoading(true); setError("");
    const { data, error: qErr } = await supabase
      .from("timesheet").select("*")
      .eq("studio", studioId)
      .eq("date", date)
      .eq("team_member", currentMember.id)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });
    if (qErr) { setError(qErr.message); setEntries([]); } else setEntries(data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    if (!studioId) return;
    supabase.from("projects").select("id,name,client,archived").eq("studio", studioId).eq("nascosto_offerta", false).order("name", { ascending: true }).then(({ data }) => setProjects(data ?? []));
    supabase.from("team_members").select("id,user_name,user_email,color").eq("studio", studioId).then(({ data }) => setTeamMembers(data ?? []));
  }, [studioId]);

  useEffect(() => { if (studioId && currentMember?.id) loadEntries(selectedDate); }, [selectedDate, studioId, currentMember?.id]);

  useEffect(() => {
    function handler(e) { if (searchRef.current && !searchRef.current.contains(e.target)) setShowDrop(false); }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const navigateDate = dir => {
    const d = new Date(selectedDate); d.setDate(d.getDate() + dir);
    setSelectedDate(d.toISOString().slice(0, 10));
  };

  const filteredProjects = useMemo(() => {
    const s = projectSearch.trim().toLowerCase();
    const all = s
      ? projects.filter(p => p.name?.toLowerCase().includes(s) || p.client?.toLowerCase().includes(s))
      : projects;
    const active   = all.filter(p => !p.archived).slice(0, s ? 20 : 10);
    const archived = all.filter(p =>  p.archived).slice(0, s ? 20 : 5);
    return { active, archived, isEmpty: all.length === 0 && s.length > 0 };
  }, [projectSearch, projects]);

  const handleSelectProject = p => { setSelectedProject(p); setProjectSearch(p.name); setShowDrop(false); };
  const handleClearProject = () => { setSelectedProject(null); setProjectSearch(""); setShowDrop(false); };

  const handleAddEntry = async e => {
    e.preventDefault();
    if (!selectedProject) { setError("Seleziona un progetto"); return; }
    if (!hours || hours <= 0) { setError("Inserisci un numero di ore valido"); return; }
    setAdding(true); setError("");

    // Se esiste già una voce per lo stesso progetto in questa data, somma le ore
    const existing = entries.find(en => en.project_id === selectedProject.id && en.date === selectedDate);
    if (existing) {
      const newHours = (Number(existing.hours) || 0) + Number(hours);
      const mergedNotes = [existing.notes, notes.trim()].filter(Boolean).join(" — ") || null;
      const { data, error: uErr } = await supabase.from("timesheet")
        .update({ hours: newHours, notes: mergedNotes })
        .eq("id", existing.id)
        .select("*").single();
      if (uErr) { setError(uErr.message); }
      else { setEntries(p => p.map(en => en.id === data.id ? data : en)); setSelectedProject(null); setProjectSearch(""); setHours(1); setNotes(""); setTeamRefreshKey(k => k + 1); }
    } else {
      const { data, error: iErr } = await supabase.from("timesheet").insert({
        project_id: selectedProject.id, project_name: selectedProject.name,
        date: selectedDate, hours, notes: notes.trim() || null,
        team_member: currentMember?.id,
        user_name: currentMember?.user_name || currentMember?.user_email || "Utente",
        studio: studioId,
      }).select("*").single();
      if (iErr) { setError(iErr.message); }
      else { setEntries(p => [data, ...p]); setSelectedProject(null); setProjectSearch(""); setHours(1); setNotes(""); setTeamRefreshKey(k => k + 1); }
    }
    setAdding(false);
  };

  const handleSaveEdit = async e => {
    e.preventDefault(); if (!editingEntry) return; setSavingEdit(true);
    const { data, error: uErr } = await supabase.from("timesheet").update({ hours: editHours, notes: editNotes.trim() || null }).eq("id", editingEntry.id).select("*").single();
    if (uErr) showToast("Errore: " + uErr.message);
    else { setEntries(p => p.map(en => en.id === data.id ? data : en)); setEditingEntry(null); setTeamRefreshKey(k => k + 1); }
    setSavingEdit(false);
  };

  const handleDeleteEntry = async () => {
    if (!editingEntry || !confirm("Sei sicuro di voler eliminare questa registrazione?")) return;
    const { error: dErr } = await supabase.rpc('elimina_timesheet', { p_id: editingEntry.id });
    if (dErr) { showToast("Errore: " + dErr.message); return; }
    setEntries(p => p.filter(en => en.id !== editingEntry.id)); setEditingEntry(null); setTeamRefreshKey(k => k + 1);
  };

  const totalHours = useMemo(() => entries.reduce((s, en) => s + (Number(en.hours) || 0), 0), [entries]);

  const getMemberColor = id => { const m = teamMembers.find(m => m.id === id); return m?.color || avatarColor(m?.user_name || m?.user_email || ""); };
  const getProjectName = pid => projects.find(p => p.id === pid)?.name || null;
  const getClientName  = pid => projects.find(p => p.id === pid)?.client || null;

  const selectSt = { width: '100%', padding: '8px 12px', border: `1px solid ${T.ink20}`, borderRadius: T.radiusSm, background: T.surface, color: T.ink, fontSize: 12, fontFamily: "'Space Grotesk', sans-serif", outline: 'none', appearance: 'none' };

  if (!studioId) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 240, fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: T.muted }}>Caricamento...</div>
  );

  const isMobile = window.innerWidth < 768;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

      {/* Header globale */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.03em', color: T.ink }}>Timesheet</div>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: T.muted, marginTop: 2, letterSpacing: '0.05em', textTransform: 'capitalize' }}>
            {formatDateDisplay(selectedDate)}
          </div>
        </div>
        {/* Date navigator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, border: `1px solid ${T.ink20}`, borderRadius: T.radiusSm, padding: '4px 8px', background: T.surface }}>
          <button onClick={() => navigateDate(-1)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.muted, fontSize: 16, padding: '2px 6px' }}>←</button>
          <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)}
            style={{ background: 'transparent', border: 'none', color: T.ink, fontSize: 12, fontFamily: "'IBM Plex Mono', monospace", outline: 'none', cursor: 'pointer' }} />
          <button onClick={() => navigateDate(1)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.muted, fontSize: 16, padding: '2px 6px' }}>→</button>
        </div>
      </div>

      {/* Layout a due colonne */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 16, alignItems: 'start' }}>

        {/* ── COLONNA SINISTRA: giornaliero ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {/* sezione label */}
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: T.muted }}>
            Registra ore
          </div>

          {/* Add entry form */}
          <form onSubmit={handleAddEntry} style={{ background: T.surface, border: `1px solid ${T.ink10}`, borderRadius: T.radiusSm, padding: isMobile ? '14px 16px' : '16px 20px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 90px' : '1fr 90px 1fr auto', gap: 10, alignItems: 'end' }}>
              {/* Project search */}
              <div ref={searchRef} style={{ position: 'relative' }}>
                <FieldLabel>Progetto</FieldLabel>
                <div style={{ position: 'relative' }}>
                  <input type="text" value={projectSearch}
                    onChange={e => { setProjectSearch(e.target.value); setShowDrop(true); if (selectedProject && e.target.value !== selectedProject.name) setSelectedProject(null); }}
                    onFocus={() => setShowDrop(true)}
                    placeholder="Cerca progetto..."
                    style={{ ...selectSt, paddingLeft: 12, paddingRight: selectedProject ? 32 : 12 }}
                  />
                  {selectedProject && (
                    <button type="button" onClick={handleClearProject}
                      style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: T.muted, fontSize: 16 }}>×</button>
                  )}
                </div>
                {selectedProject?.archived && (
                  <div style={{ marginTop: 4, fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: T.yellow, display: 'flex', alignItems: 'center', gap: 4 }}>
                    ⚠ Progetto archiviato
                  </div>
                )}
                {showDrop && filteredProjects.isEmpty && (
                  <div style={{ position: 'absolute', left: 0, right: 0, top: '100%', zIndex: 20, background: T.glassBg, backdropFilter: T.blur, WebkitBackdropFilter: T.blur, border: `1px solid ${T.glassBorder}`, borderRadius: 12, boxShadow: T.shadowMd, padding: '12px 14px', marginTop: 2, fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: T.muted }}>
                    Nessun progetto trovato
                  </div>
                )}
                {showDrop && !filteredProjects.isEmpty && (filteredProjects.active.length > 0 || filteredProjects.archived.length > 0) && (
                  <div style={{ position: 'absolute', left: 0, right: 0, top: '100%', zIndex: 20, background: T.glassBg, backdropFilter: T.blur, WebkitBackdropFilter: T.blur, border: `1px solid ${T.glassBorder}`, borderRadius: 12, boxShadow: T.shadowMd, maxHeight: 220, overflowY: 'auto', marginTop: 2 }}>
                    {filteredProjects.active.map(p => (
                      <button key={p.id} type="button" onClick={() => handleSelectProject(p)}
                        style={{ display: 'block', width: '100%', padding: '8px 12px', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', borderBottom: `0.5px solid ${T.ink10}` }}
                        onMouseEnter={e => e.currentTarget.style.background = T.bg}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <div style={{ fontSize: 12, fontWeight: 600, color: T.ink }}>{p.name}</div>
                        {p.client && <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: T.muted }}>{p.client}</div>}
                      </button>
                    ))}
                    {filteredProjects.archived.length > 0 && (
                      <>
                        <div style={{ padding: '6px 12px 4px', fontFamily: "'IBM Plex Mono', monospace", fontSize: 8, letterSpacing: '0.12em', textTransform: 'uppercase', color: T.muted, borderTop: filteredProjects.active.length > 0 ? `0.5px solid ${T.ink10}` : 'none' }}>Archiviati</div>
                        {filteredProjects.archived.map(p => (
                          <button key={p.id} type="button" onClick={() => handleSelectProject(p)}
                            style={{ display: 'block', width: '100%', padding: '8px 12px', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', borderBottom: `0.5px solid ${T.ink10}` }}
                            onMouseEnter={e => e.currentTarget.style.background = T.bg}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                          >
                            <div style={{ fontSize: 12, fontWeight: 600, color: T.muted }}>{p.name}</div>
                            {p.client && <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: T.muted }}>{p.client}</div>}
                          </button>
                        ))}
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Ore */}
              <div>
                <FieldLabel>Ore</FieldLabel>
                <select value={hours} onChange={e => setHours(Number(e.target.value))} style={selectSt}>
                  {HOURS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>

              {/* Note — solo desktop nella griglia */}
              {!isMobile && (
                <div>
                  <FieldLabel>Note (opzionale)</FieldLabel>
                  <input type="text" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Descrizione attività..."
                    style={{ ...selectSt }} />
                </div>
              )}

              {/* Add button — solo desktop nella griglia */}
              {!isMobile && (
                <BtnPrimary type="submit" disabled={adding || !selectedProject} style={{ padding: '0', width: 36, height: 36, fontSize: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  +
                </BtnPrimary>
              )}
            </div>

            {/* Note + submit su mobile — seconda riga */}
            {isMobile && (
              <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div>
                  <FieldLabel>Note (opzionale)</FieldLabel>
                  <input type="text" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Descrizione attività..."
                    style={{ ...selectSt }} />
                </div>
                <BtnPrimary type="submit" disabled={adding || !selectedProject} style={{ width: '100%', padding: '10px', justifyContent: 'center', display: 'flex', alignItems: 'center', fontSize: 13, letterSpacing: '0.08em' }}>
                  {adding ? "..." : "+ Aggiungi"}
                </BtnPrimary>
              </div>
            )}

            {error && <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: T.red, marginTop: 10 }}>{error}</div>}
          </form>

          {/* Entries */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '48px 0', fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: T.muted }}>Caricamento...</div>
      ) : entries.length === 0 ? (
        <div style={{ background: T.surface, border: `1px solid ${T.ink10}`, borderRadius: T.radiusSm, padding: '48px 0', textAlign: 'center', fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: T.muted }}>
          Nessuna registrazione per questa data.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {entries.map(en => (
            <button key={en.id} onClick={() => { setEditingEntry(en); setEditHours(en.hours); setEditNotes(en.notes || ""); }}
              style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px', background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.radiusSm, backdropFilter: T.blurSm, WebkitBackdropFilter: T.blurSm, boxShadow: T.shadow, cursor: 'pointer', textAlign: 'left', width: '100%', transition: 'background 0.1s' }}
              onMouseEnter={e => e.currentTarget.style.background = T.bg}
              onMouseLeave={e => e.currentTarget.style.background = T.surface}
            >
              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: T.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {getProjectName(en.project_id) || en.project_name || '—'}
                </div>
                {getClientName(en.project_id) && (
                  <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: T.muted, marginTop: 2 }}>{getClientName(en.project_id)}</div>
                )}
                {en.notes && <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: T.muted, marginTop: 2 }}>{en.notes}</div>}
              </div>
              {/* Hours */}
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontSize: isMobile ? 16 : 20, fontWeight: 600, color: T.navy, fontFamily: "'Space Grotesk', sans-serif", letterSpacing: '-0.03em' }}>{formatOre(en.hours)} h</div>
              </div>
            </button>
          ))}
        </div>
      )}

          {/* Totale */}
          {entries.length > 0 && (
            <div style={{ background: T.surface, border: `1px solid ${T.ink10}`, borderRadius: T.radiusSm, padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: T.muted, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                Totale {new Date(selectedDate).toLocaleDateString("it-IT", { day: "numeric", month: "short" })}
              </div>
              <div style={{ fontSize: 24, fontWeight: 600, color: T.navy, letterSpacing: '-0.04em', fontFamily: "'Space Grotesk', sans-serif" }}>{formatOre(totalHours)} h</div>
            </div>
          )}
        </div>{/* fine colonna sinistra */}

        {/* ── COLONNA DESTRA: visualizza ore ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, minWidth: 0 }}>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: T.muted }}>
            Visualizza ore
          </div>
          <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <VistaTeam studioId={studioId} projects={projects} currentMemberId={currentMember?.id} refreshKey={teamRefreshKey} />
          </div>
        </div>

      </div>{/* fine grid */}

      {/* Edit Modal */}
      <Modal open={!!editingEntry} onClose={() => setEditingEntry(null)} title="Modifica registrazione">
        <form onSubmit={handleSaveEdit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <FieldLabel>Progetto</FieldLabel>
            <div style={{ padding: '8px 12px', border: `1px solid ${T.ink10}`, borderRadius: T.radiusSm, background: T.bg, fontSize: 12, color: T.muted, fontFamily: "'Space Grotesk', sans-serif" }}>
              {editingEntry?.project_name}
              {getClientName(editingEntry?.project_id) && <span style={{ marginLeft: 8 }}>· {getClientName(editingEntry?.project_id)}</span>}
            </div>
          </div>
          <div>
            <FieldLabel>Ore</FieldLabel>
            <select value={editHours} onChange={e => setEditHours(Number(e.target.value))} style={selectSt}>
              {HOURS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div>
            <FieldLabel>Note</FieldLabel>
            <textarea value={editNotes} onChange={e => setEditNotes(e.target.value)} rows={3} placeholder="Descrizione attività..."
              style={{ width: '100%', padding: '8px 12px', boxSizing: 'border-box', border: `1px solid ${T.ink20}`, borderRadius: T.radiusSm, background: T.surface, color: T.ink, fontSize: 12, fontFamily: "'Space Grotesk', sans-serif", outline: 'none', resize: 'vertical' }} />
          </div>
          <Divider />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <BtnGhost danger onClick={handleDeleteEntry}>Elimina</BtnGhost>
            <div style={{ display: 'flex', gap: 10 }}>
              <BtnGhost onClick={() => setEditingEntry(null)} disabled={savingEdit}>Annulla</BtnGhost>
              <BtnPrimary type="submit" disabled={savingEdit}>{savingEdit ? "Salvataggio..." : "Salva"}</BtnPrimary>
            </div>
          </div>
        </form>
      </Modal>

    </div>
  );
}
