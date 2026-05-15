import { useEffect, useMemo, useState, useRef } from "react";
import { usePageTitleOnMount } from "../hooks/usePageTitle";
import { useStudio } from "../hooks/useStudio";
import { supabase } from "../lib/supabase";
import { formatOre } from "../lib/utils";

// ── BRAND TOKENS ─────────────────────────────────────────────────
const T = {
  ink: '#0E0E0D', navy: '#13315C', brass: '#D9C98A',
  paper: '#EEF1F6', muted: '#8a847b',
  ink10: '#0E0E0D1A', ink20: '#0E0E0D33', ink05: '#0E0E0D0D',
  red: '#b91c1c', green: '#1a6b3c',
};

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
  return <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: T.muted, marginBottom: 6 }}>{children}</div>;
}
function Input({ value, onChange, type = "text", placeholder, style = {} }) {
  const [focus, setFocus] = useState(false);
  return (
    <input type={type} value={value} onChange={onChange} placeholder={placeholder}
      onFocus={() => setFocus(true)} onBlur={() => setFocus(false)}
      style={{ width: '100%', padding: '8px 12px', boxSizing: 'border-box', border: `0.5px solid ${focus ? T.navy : T.ink20}`, background: '#fff', color: T.ink, fontSize: 12, fontFamily: "'Space Grotesk', sans-serif", outline: 'none', ...style }} />
  );
}
function BtnPrimary({ children, onClick, disabled, type = "button", style = {} }) {
  return (
    <button type={type} onClick={onClick} disabled={disabled} style={{
      background: T.navy, color: '#EEF1F6', border: 'none',
      fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase',
      padding: '8px 18px', cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.6 : 1, ...style,
    }}>{children}</button>
  );
}
function BtnGhost({ children, onClick, disabled, danger, style = {} }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} style={{
      background: 'transparent', border: `0.5px solid ${danger ? T.red : T.ink20}`,
      color: danger ? T.red : T.ink, fontFamily: "'IBM Plex Mono', monospace", fontSize: 11,
      letterSpacing: '0.08em', textTransform: 'uppercase', padding: '8px 18px',
      cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1, ...style,
    }}>{children}</button>
  );
}
function Modal({ open, onClose, title, children, width = 480 }) {
  if (!open) return null;
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(14,14,13,0.5)', padding: 16 }}>
      <div style={{ width: '100%', maxWidth: width, background: '#fff', border: `0.5px solid ${T.ink20}`, padding: 28, maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: 16, fontWeight: 600, color: T.ink, letterSpacing: '-0.02em' }}>{title}</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.muted, fontSize: 20, lineHeight: 1 }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}
function Divider() { return <div style={{ height: '0.5px', background: T.ink10, margin: '14px 0' }} />; }

// ── MAIN ─────────────────────────────────────────────────────────
export default function TimesheetPage() {
  usePageTitleOnMount("Timesheet");
  const { studioId, teamMember: currentMember } = useStudio();

  const [selectedDate, setSelectedDate] = useState(getTodayDate());
  const [entries, setEntries]           = useState([]);
  const [projects, setProjects]         = useState([]);
  const [teamMembers, setTeamMembers]   = useState([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState("");

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
    if (!studioId) return;
    setLoading(true); setError("");
    const { data, error: qErr } = await supabase.from("timesheet").select("*").eq("studio", studioId).eq("date", date).order("created_at", { ascending: false });
    if (qErr) { setError(qErr.message); setEntries([]); } else setEntries(data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    if (!studioId) return;
    supabase.from("projects").select("id,name,client,archived").eq("studio", studioId).eq("archived", false).order("name", { ascending: true }).then(({ data }) => setProjects(data ?? []));
    supabase.from("team_members").select("id,user_name,user_email,color").eq("studio", studioId).then(({ data }) => setTeamMembers(data ?? []));
  }, [studioId]);

  useEffect(() => { if (studioId) loadEntries(selectedDate); }, [selectedDate, studioId]);

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
    if (!projectSearch.trim()) return projects.slice(0, 10);
    const s = projectSearch.toLowerCase();
    return projects.filter(p => p.name?.toLowerCase().includes(s) || p.client?.toLowerCase().includes(s)).slice(0, 10);
  }, [projectSearch, projects]);

  const handleSelectProject = p => { setSelectedProject(p); setProjectSearch(p.name); setShowDrop(false); };
  const handleClearProject = () => { setSelectedProject(null); setProjectSearch(""); setShowDrop(false); };

  const handleAddEntry = async e => {
    e.preventDefault();
    if (!selectedProject) { setError("Seleziona un progetto"); return; }
    if (!hours || hours <= 0) { setError("Inserisci un numero di ore valido"); return; }
    setAdding(true); setError("");
    const { data, error: iErr } = await supabase.from("timesheet").insert({
      project_id: selectedProject.id, project_name: selectedProject.name,
      date: selectedDate, hours, notes: notes.trim() || null,
      team_member: currentMember?.id,
      user_name: currentMember?.user_name || currentMember?.user_email || "Utente",
      studio: studioId,
    }).select("*").single();
    if (iErr) { setError(iErr.message); }
    else { setEntries(p => [data, ...p]); setSelectedProject(null); setProjectSearch(""); setHours(1); setNotes(""); }
    setAdding(false);
  };

  const handleSaveEdit = async e => {
    e.preventDefault(); if (!editingEntry) return; setSavingEdit(true);
    const { data, error: uErr } = await supabase.from("timesheet").update({ hours: editHours, notes: editNotes.trim() || null }).eq("id", editingEntry.id).select("*").single();
    if (uErr) alert("Errore: " + uErr.message);
    else { setEntries(p => p.map(en => en.id === data.id ? data : en)); setEditingEntry(null); }
    setSavingEdit(false);
  };

  const handleDeleteEntry = async () => {
    if (!editingEntry || !confirm("Sei sicuro di voler eliminare questa registrazione?")) return;
    const { error: dErr } = await supabase.from("timesheet").delete().eq("id", editingEntry.id);
    if (dErr) alert("Errore: " + dErr.message);
    else { setEntries(p => p.filter(en => en.id !== editingEntry.id)); setEditingEntry(null); }
  };

  const totalHours = useMemo(() => entries.reduce((s, en) => s + (Number(en.hours) || 0), 0), [entries]);

  const getMemberColor = id => { const m = teamMembers.find(m => m.id === id); return m?.color || avatarColor(m?.user_name || m?.user_email || ""); };
  const getClientName = pid => projects.find(p => p.id === pid)?.client || null;

  const selectSt = { width: '100%', padding: '8px 12px', border: `0.5px solid ${T.ink20}`, background: '#fff', color: T.ink, fontSize: 12, fontFamily: "'Space Grotesk', sans-serif", outline: 'none', appearance: 'none' };

  if (!studioId) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 240, fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: T.muted }}>Caricamento...</div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.03em', color: T.ink }}>Timesheet</div>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: T.muted, marginTop: 2, letterSpacing: '0.05em', textTransform: 'capitalize' }}>
            {formatDateDisplay(selectedDate)}
          </div>
        </div>
        {/* Date navigator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, border: `0.5px solid ${T.ink20}`, padding: '4px 8px', background: '#fff' }}>
          <button onClick={() => navigateDate(-1)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.muted, fontSize: 16, padding: '2px 6px' }}>←</button>
          <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)}
            style={{ background: 'transparent', border: 'none', color: T.ink, fontSize: 12, fontFamily: "'IBM Plex Mono', monospace", outline: 'none', cursor: 'pointer' }} />
          <button onClick={() => navigateDate(1)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.muted, fontSize: 16, padding: '2px 6px' }}>→</button>
        </div>
      </div>

      {/* Add entry form */}
      <form onSubmit={handleAddEntry} style={{ background: '#fff', border: `0.5px solid ${T.ink10}`, padding: '16px 20px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 140px 2fr auto', gap: 10, alignItems: 'end' }}>
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
            {showDrop && filteredProjects.length > 0 && (
              <div style={{ position: 'absolute', left: 0, right: 0, top: '100%', zIndex: 20, background: '#fff', border: `0.5px solid ${T.ink20}`, maxHeight: 200, overflowY: 'auto', marginTop: 2 }}>
                {filteredProjects.map(p => (
                  <button key={p.id} type="button" onClick={() => handleSelectProject(p)}
                    style={{ display: 'block', width: '100%', padding: '8px 12px', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', borderBottom: `0.5px solid ${T.ink10}` }}
                    onMouseEnter={e => e.currentTarget.style.background = T.paper}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <div style={{ fontSize: 12, fontWeight: 600, color: T.ink }}>{p.name}</div>
                    {p.client && <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: T.muted }}>{p.client}</div>}
                  </button>
                ))}
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

          {/* Note */}
          <div>
            <FieldLabel>Note (opzionale)</FieldLabel>
            <input type="text" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Descrizione attività..."
              style={{ ...selectSt }} />
          </div>

          {/* Add button */}
          <BtnPrimary type="submit" disabled={adding || !selectedProject} style={{ padding: '8px 16px', whiteSpace: 'nowrap' }}>
            +
          </BtnPrimary>
        </div>
        {error && <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: T.red, marginTop: 10 }}>{error}</div>}
      </form>

      {/* Entries */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '48px 0', fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: T.muted }}>Caricamento...</div>
      ) : entries.length === 0 ? (
        <div style={{ background: '#fff', border: `0.5px solid ${T.ink10}`, padding: '48px 0', textAlign: 'center', fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: T.muted }}>
          Nessuna registrazione per questa data.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {entries.map(en => (
            <button key={en.id} onClick={() => { setEditingEntry(en); setEditHours(en.hours); setEditNotes(en.notes || ""); }}
              style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px', background: '#fff', border: `0.5px solid ${T.ink10}`, cursor: 'pointer', textAlign: 'left', width: '100%', transition: 'background 0.1s' }}
              onMouseEnter={e => e.currentTarget.style.background = T.paper}
              onMouseLeave={e => e.currentTarget.style.background = '#fff'}
            >
              {/* Avatar */}
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: getMemberColor(en.team_member), flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 600, color: '#fff' }}>
                {getInitials(en.user_name)}
              </div>
              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: T.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{en.project_name}</div>
                {getClientName(en.project_id) && <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: T.muted, marginTop: 2 }}>{getClientName(en.project_id)}</div>}
                {en.notes && <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: T.muted, marginTop: 2 }}>{en.notes}</div>}
              </div>
              {/* Hours */}
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontSize: 20, fontWeight: 600, color: T.navy, fontFamily: "'Space Grotesk', sans-serif", letterSpacing: '-0.03em' }}>{formatOre(en.hours)} h</div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Totale */}
      {entries.length > 0 && (
        <div style={{ background: '#fff', border: `0.5px solid ${T.ink10}`, padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: T.muted, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            Totale {new Date(selectedDate).toLocaleDateString("it-IT", { day: "numeric", month: "short" })}
          </div>
          <div style={{ fontSize: 24, fontWeight: 600, color: T.navy, letterSpacing: '-0.04em', fontFamily: "'Space Grotesk', sans-serif" }}>{formatOre(totalHours)} h</div>
        </div>
      )}

      {/* Edit Modal */}
      <Modal open={!!editingEntry} onClose={() => setEditingEntry(null)} title="Modifica registrazione">
        <form onSubmit={handleSaveEdit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Progetto (readonly) */}
          <div>
            <FieldLabel>Progetto</FieldLabel>
            <div style={{ padding: '8px 12px', border: `0.5px solid ${T.ink10}`, background: T.paper, fontSize: 12, color: T.muted, fontFamily: "'Space Grotesk', sans-serif" }}>
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
              style={{ width: '100%', padding: '8px 12px', boxSizing: 'border-box', border: `0.5px solid ${T.ink20}`, background: '#fff', color: T.ink, fontSize: 12, fontFamily: "'Space Grotesk', sans-serif", outline: 'none', resize: 'vertical' }} />
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
