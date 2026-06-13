import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import SlidingTabs from "../components/SlidingTabs";
import { useTheme } from '../contexts/ThemeContext';
import { useStudio } from "../hooks/useStudio";
import { getOrCreateTeamMember, supabase } from "../lib/supabase";
import { usePageTitleOnMount } from "../hooks/usePageTitle";
import { useIsMobile } from "../hooks/useIsMobile";
import { handleListKeyDown } from "../lib/listKeyDown";
import { useBodyScrollLock } from "../hooks/useBodyScrollLock";
import { useToast } from "../contexts/ToastContext";

const NOTE_COLORS = [
  '#FFF9C4','#F8BBD0','#C8E6C9','#BBDEFB','#E1BEE7','#FFE0B2','#FFFFFF',
];

function toDateOnly(v) {
  if (!v) return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
function isOverdue(v) {
  const p = toDateOnly(v);
  return p ? p < toDateOnly(new Date().toISOString()) : false;
}
function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('it-IT', { day:'numeric', month:'short' });
}

// ── TASK ROW ─────────────────────────────────────────────────────
function TaskRow({ task, projectName, onToggle, updating, done }) {
  const { T } = useTheme();
  const navigate = useNavigate();
  const [hover, setHover] = useState(false);
  const overdue = !done && isOverdue(task.data_pianificata);

  return (
    <div
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{
        display:'flex', alignItems:'center', justifyContent:'space-between',
        width:'100%', padding:'8px 12px',
        background: hover ? T.bg : 'transparent',
        border:`1px solid ${hover ? T.borderMd : T.border}`,
        borderRadius: T.radiusSm,
        opacity: updating ? 0.5 : 1, transition:'all 0.1s',
        boxSizing:'border-box',
      }}>
      <div style={{ display:'flex', alignItems:'center', gap:10, minWidth:0, flex:1 }}>
        {/* Pallino: solo toggle */}
        <button
          type="button"
          onClick={e => { e.stopPropagation(); onToggle(task, done); }}
          disabled={updating}
          style={{
            width:15, height:15, borderRadius:'50%', flexShrink:0, padding:0,
            border:`1px solid ${done ? T.navy : overdue ? T.red : T.borderMd}`, borderRadius: T.radiusSm,
            background: done ? T.navy : 'transparent',
            display:'inline-flex', alignItems:'center', justifyContent:'center',
            cursor: updating ? 'not-allowed' : 'pointer',
          }}>
          {done && <svg width="7" height="5" viewBox="0 0 7 5" fill="none"><path d="M1 2.5L2.5 4L6 1" stroke={T.bg} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
        </button>

        {/* Testo: naviga al progetto */}
        <div
          onClick={() => task.project_id && navigate(`/progetti/${task.project_id}`)}
          style={{ minWidth:0, flex:1, cursor: task.project_id ? 'pointer' : 'default' }}>
          <div style={{ fontSize:12, fontWeight:600, color: done ? T.muted : T.ink, textDecoration: done ? 'line-through' : 'none', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
            {task.title || "Task senza titolo"}
          </div>
          <div style={{ fontFamily:"'IBM Plex Mono', monospace", fontSize:9, color:T.muted, marginTop:2 }}>
            {done ? `${projectName} · ${task.categoria||'—'}` : (task.categoria||'Senza categoria')}
          </div>
        </div>
      </div>

      <div style={{ flexShrink:0, marginLeft:8, fontFamily:"'IBM Plex Mono', monospace", fontSize:9, color: done ? T.green : overdue ? T.red : T.muted }}>
        {done ? '✓' : task.data_pianificata ? formatDate(task.data_pianificata) : ''}
      </div>
    </div>
  );
}

// ── NOTA CARD ─────────────────────────────────────────────────────
function NoteCard({ note, currentMemberId, teamMembers, onDelete, onUpdate, onRefresh, single = false }) {
  const { T, isDark } = useTheme();
  const [content, setContent]       = useState(note.content || '');
  const [color, setColor]           = useState(note.color || '#FFF9C4');
  const [isPrivate, setIsPrivate]   = useState(note.is_private !== false);
  const [sharedWith, setSharedWith] = useState(note.shared_with || []);
  const [showShare, setShowShare]   = useState(false);
  const [showMenu, setShowMenu]     = useState(false);
  const [saving, setSaving]         = useState(false);
  const saveTimer = useRef(null);
  const taRef = useRef(null);
  const isTyping = useRef(false); // true mentre l'utente sta digitando (debounce attivo)

  const isOwn = note.author_id === currentMemberId;
  const canEdit = isOwn || sharedWith.includes(currentMemberId);
  const authorName = teamMembers.find(m => m.id === note.author_id)?.user_name || 'Membro';

  // Sync contenuto da remoto: si applica solo se l'utente non sta digitando in questo momento
  useEffect(() => {
    if (!isTyping.current) {
      setContent(note.content || '');
    }
  }, [note.content, note.updated_at]);

  useEffect(() => {
    setSharedWith(note.shared_with || []);
    setIsPrivate(note.is_private !== false);
    setColor(note.color || '#FFF9C4');
  }, [note.shared_with, note.is_private, note.color]);

  const saveContent = (val) => {
    isTyping.current = true;
    clearTimeout(saveTimer.current);
    setSaving(true);
    saveTimer.current = setTimeout(async () => {
      const newUpdatedAt = new Date().toISOString();
      // Usa RPC SECURITY DEFINER per bypassare la RLS UPDATE che blocca i non-autori
      // (i membri in shared_with hanno diritto di scrivere ma non sono author_id)
      const { error } = await supabase.rpc('update_note_content', {
        p_note_id:    note.id,
        p_member_id:  currentMemberId,
        p_content:    val,
        p_updated_at: newUpdatedAt,
      });
      if (!error) onUpdate(note.id, { content: val, updated_at: newUpdatedAt });
      isTyping.current = false;
      setSaving(false);
    }, 700);
  };

  const saveField = async (updates) => {
    await supabase.from('notes').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', note.id);
    onUpdate(note.id, updates);
  };

  const handleColorChange = (c) => { setColor(c); saveField({ color: c }); };
  const handlePrivacyToggle = () => {
    const next = !isPrivate;
    setIsPrivate(next);
    const sw = next ? [] : sharedWith;
    setSharedWith(sw);
    saveField({ is_private: next, shared_with: sw });
    if (!next) setShowShare(true);
  };
  const handleSharedWith = (memberId) => {
    const next = sharedWith.includes(memberId) ? sharedWith.filter(id => id !== memberId) : [...sharedWith, memberId];
    setSharedWith(next);
    const updates = { shared_with: next };
    if (next.length > 0 && isPrivate) { setIsPrivate(false); updates.is_private = false; }
    saveField(updates);
  };

  // In dark mode: sfondo scuro con bordo sinistro colorato (i pastelli su nero sono illeggibili)
  const cardStyle = isDark
    ? { background: T.surface, border:`1px solid ${T.border}`, borderLeft:`3px solid ${color}`, display:'flex', flexDirection:'column', borderRadius:T.radius, boxShadow:T.shadow }
    : { background: color, border:`1px solid ${T.border}`, display:'flex', flexDirection:'column', borderRadius:T.radius, boxShadow:T.shadow };

  return (
    <div style={cardStyle}>
      {/* Toolbar */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'7px 10px', borderBottom:`0.5px solid ${T.border}`, flexWrap:'wrap', gap:4 }}>
        <div style={{ display:'flex', alignItems:'center', gap:5, flexWrap:'wrap' }}>
          {NOTE_COLORS.map(c => (
            <button key={c} onClick={() => isOwn && handleColorChange(c)} style={{
              width:13, height:13, borderRadius:'50%', background:c,
              border:`1.5px solid ${color === c ? T.ink : T.border}`, borderRadius: T.radiusSm,
              cursor: isOwn ? 'pointer' : 'default', padding:0, flexShrink:0,
            }}/>
          ))}
          {isOwn && (
            <button onClick={handlePrivacyToggle} style={{
              background:'none', border:`0.5px solid ${isPrivate ? T.muted : T.navy}`, borderRadius: T.radiusSm,
              padding:'1px 6px', cursor:'pointer', marginLeft:4,
              fontFamily:"'IBM Plex Mono', monospace", fontSize:8,
              color: isPrivate ? T.muted : T.navy, letterSpacing:'0.05em',
            }}>
              {isPrivate ? '🔒' : '👥'}
            </button>
          )}
          {!isOwn && (
            <span style={{ fontFamily:"'IBM Plex Mono', monospace", fontSize:8, color:T.muted }}>
              {authorName}
            </span>
          )}
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
          {saving && <span style={{ fontFamily:"'IBM Plex Mono', monospace", fontSize:8, color:T.muted }}>•</span>}
          {isOwn && (
            <div style={{ position:'relative' }}>
              <button onClick={() => setShowMenu(!showMenu)} style={{ background:'none', border:'none', cursor:'pointer', color:T.muted, fontSize:14, lineHeight:1, padding:'0 2px' }}>···</button>
              {showMenu && (
                <div style={{ position:'absolute', right:0, top:'100%', background: T.surface, border:`0.5px solid ${T.borderMd}`, width:160, zIndex:30, marginTop:2 }}>
                  <button onClick={() => { setShowShare(!showShare); setShowMenu(false); }}
                    style={{ display:'block', width:'100%', padding:'8px 12px', textAlign:'left', background:'none', border:'none', cursor:'pointer', fontFamily:"'IBM Plex Mono', monospace", fontSize:11, color:T.ink }}>
                    Condivisione
                  </button>
                  <button onClick={() => { onDelete(note.id); setShowMenu(false); }}
                    style={{ display:'block', width:'100%', padding:'8px 12px', textAlign:'left', background:'none', border:'none', cursor:'pointer', fontFamily:"'IBM Plex Mono', monospace", fontSize:11, color:T.red }}>
                    Elimina
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Titolo nota condivisa */}
      {sharedWith.length > 0 && (
        <div style={{
          padding:'5px 12px', borderBottom:`0.5px solid ${T.border}`,
          fontFamily:"'IBM Plex Mono', monospace", fontSize:9,
          letterSpacing:'0.18em', textTransform:'uppercase',
          color: isDark ? T.navy : '#1a3a5c',
          background: isDark ? 'transparent' : 'rgba(0,0,0,0.04)',
        }}>
          {isOwn
            ? `nota con ${sharedWith.map(id => teamMembers.find(m => m.id === id)?.user_name || 'Membro').join(', ')}`
            : `nota di ${authorName}`
          }
        </div>
      )}

      {/* Pannello condivisione */}
      {showShare && isOwn && (
        <div style={{ padding:'8px 12px', borderBottom:`0.5px solid ${T.border}`, background: isDark ? T.surface2 : 'rgba(255,255,255,0.4)' }}>
          <div style={{ fontFamily:"'IBM Plex Mono', monospace", fontSize:8, color:T.muted, marginBottom:6, letterSpacing:'0.1em', textTransform:'uppercase' }}>Condividi con:</div>
          {teamMembers.filter(m => m.id !== currentMemberId).map(m => (
            <label key={m.id} style={{ display:'flex', alignItems:'center', gap:7, cursor:'pointer', padding:'2px 0' }}>
              <input type="checkbox" checked={sharedWith.includes(m.id)} onChange={() => handleSharedWith(m.id)} style={{ accentColor:T.navy, width:12, height:12 }}/>
              <span style={{ fontSize:12, color:T.ink }}>{m.user_name || m.user_email}</span>
            </label>
          ))}
        </div>
      )}

      {/* Area testo */}
      <textarea
        ref={taRef}
        value={content}
        onFocus={() => { if (!isTyping.current && onRefresh) onRefresh(); }}
        onChange={e => { if (!canEdit) return; setContent(e.target.value); saveContent(e.target.value); }}
        onKeyDown={e => canEdit && handleListKeyDown(e, content, val => { setContent(val); saveContent(val); })}
        readOnly={!canEdit}
        placeholder={canEdit ? "Inizia a scrivere..." : ""}
        style={{
          flex:1, width:'100%',
          minHeight: single ? 200 : 120,
          maxHeight: single ? 'none' : undefined,
          padding:'12px 14px', boxSizing:'border-box',
          background:'transparent', border:'none', outline:'none',
          fontSize:13, fontFamily:"'Space Grotesk', sans-serif",
          color:T.ink, lineHeight:1.7,
          resize: single ? 'vertical' : 'none',
          cursor: canEdit ? 'text' : 'default',
          overflow: single ? 'auto' : 'hidden',
        }}
      />

      {/* Footer data */}
      <div style={{ padding:'4px 10px 6px', fontFamily:"'IBM Plex Mono', monospace", fontSize:8, color:T.muted, borderTop:`0.5px solid ${T.border}` }}>
        {new Date(note.updated_at || note.created_at).toLocaleDateString('it-IT', { day:'numeric', month:'short' })}
        {sharedWith.length > 0 && ` · condivisa con ${sharedWith.length}`}
      </div>
    </div>
  );
}

// ── NOTA PREVIEW (card compatta per lista multi-nota) ────────────
function NoteCardPreview({ note, onClick }) {
  const { T, isDark } = useTheme();
  const color = note.color || '#FFF9C4';
  const cardStyle = isDark
    ? { background: T.surface, border:`1px solid ${T.border}`, borderLeft:`3px solid ${color}`, borderRadius:T.radius, boxShadow:T.shadow, cursor:'pointer', padding:'10px 14px', overflow:'hidden' }
    : { background: color, border:`1px solid ${T.border}`, borderRadius:T.radius, boxShadow:T.shadow, cursor:'pointer', padding:'10px 14px', overflow:'hidden' };

  const preview = (note.content || '').split('\n').slice(0, 4).join('\n');

  return (
    <div style={cardStyle} onClick={onClick}>
      <div style={{ fontSize:12, fontFamily:"'Space Grotesk', sans-serif", color:T.ink, lineHeight:1.6, whiteSpace:'pre-wrap', overflow:'hidden', display:'-webkit-box', WebkitLineClamp:4, WebkitBoxOrient:'vertical' }}>
        {preview || <span style={{ color:T.muted, fontStyle:'italic' }}>Nota vuota</span>}
      </div>
      <div style={{ marginTop:6, fontFamily:"'IBM Plex Mono', monospace", fontSize:8, color:T.muted }}>
        {new Date(note.updated_at || note.created_at).toLocaleDateString('it-IT', { day:'numeric', month:'short' })}
      </div>
    </div>
  );
}

// ── NOTA MODAL (overlay per modifica) ────────────────────────────
function NoteModal({ note, currentMemberId, teamMembers, onDelete, onUpdate, onRefresh, onClose }) {
  const { T } = useTheme();
  useBodyScrollLock(true);
  return (
    <div onClick={onClose} style={{ position:'fixed', inset:0, zIndex:60, background:'rgba(14,14,13,0.55)', display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
      <div onClick={e => e.stopPropagation()} style={{ width:'100%', maxWidth:540, maxHeight:'85vh', display:'flex', flexDirection:'column' }}>
        <NoteCard
          note={note} currentMemberId={currentMemberId} teamMembers={teamMembers}
          onDelete={(id) => { onDelete(id); onClose(); }} onUpdate={onUpdate} onRefresh={onRefresh}
          single={true}
        />
        <button onClick={onClose} style={{ marginTop:10, alignSelf:'flex-end', background:'none', border:`0.5px solid ${T.borderMd}`, borderRadius:T.radiusSm, color:T.muted, fontFamily:"'IBM Plex Mono', monospace", fontSize:10, letterSpacing:'0.08em', textTransform:'uppercase', padding:'6px 14px', cursor:'pointer' }}>
          Chiudi
        </button>
      </div>
    </div>
  );
}

// ── MAIN ─────────────────────────────────────────────────────────
export default function ScrivaniaPage() {
  const { T } = useTheme();
  const showToast = useToast();
  const isMobile = useIsMobile();
  usePageTitleOnMount("Scrivania");
  const { studioId } = useStudio();

  const [currentMemberId, setCurrentMemberId] = useState(null);
  const currentMemberIdRef = useRef(null); // ref per evitare stale closure nel real-time handler
  const [activeTasks, setActiveTasks]         = useState([]);
  const [completedToday, setCompletedToday]   = useState([]);
  const [projectsById, setProjectsById]       = useState({});
  const [notes, setNotes]                     = useState([]);
  const [teamMembers, setTeamMembers]         = useState([]);
  const [loading, setLoading]                 = useState(true);
  const [error, setError]                     = useState("");
  const [updatingTaskId, setUpdatingTaskId]   = useState(null);
  const [taskTab, setTaskTab]                 = useState("active");
  const [creatingNote, setCreatingNote]       = useState(false);
  const [collapsedProjects, setCollapsedProjects] = useState(new Set());
  const [expandedNoteId, setExpandedNoteId]   = useState(null);

  const loadData = async () => {
    setLoading(true); setError("");
    const today = new Date().toISOString().slice(0, 10);
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData?.user?.id) { setError("Utente non autenticato."); setLoading(false); return; }

    let tm;
    try { tm = await getOrCreateTeamMember(authData.user); }
    catch(e) { setError(e.message); setLoading(false); return; }
    setCurrentMemberId(tm.id);
    currentMemberIdRef.current = tm.id;

    const [tasksRes, membersRes, notesRes] = await Promise.all([
      supabase.from("tasks").select("*").eq("studio", studioId).eq("assigned_member", tm.id).is("deleted_at", null),
      supabase.from("team_members").select("id,user_name,user_email,color").eq("studio", studioId),
      supabase.rpc("get_notes_for_member", { p_studio_id: studioId, p_member_id: tm.id }),
    ]);

    const combined = tasksRes.data ?? [];
    setActiveTasks(combined.filter(t => t.status !== "completed").sort((a, b) => {
      if (!a.data_pianificata && !b.data_pianificata) return 0;
      if (!a.data_pianificata) return 1; if (!b.data_pianificata) return -1;
      return new Date(a.data_pianificata) - new Date(b.data_pianificata);
    }));
    setCompletedToday(combined.filter(t =>
      t.status === "completed" &&
      t.updated_at >= `${today}T00:00:00` && t.updated_at <= `${today}T23:59:59`
    ));

    const pIds = [...new Set(combined.map(t => t.project_id).filter(Boolean))];
    if (pIds.length > 0) {
      const { data: projs } = await supabase.from("projects").select("id,name").in("id", pIds);
      setProjectsById((projs ?? []).reduce((acc, p) => { acc[p.id] = p.name; return acc; }, {}));
    }
    setTeamMembers(membersRes.data ?? []);
    setNotes(notesRes.data ?? []);
    setLoading(false);
  };

  useEffect(() => { if (studioId) loadData(); }, [studioId]);

  // Real-time notes sync — usa RPC per bypassare RLS anche sui refresh real-time
  const reloadNotesRef = useRef(null);
  const reloadNotes = async (membId, stdId) => {
    const { data } = await supabase.rpc("get_notes_for_member", {
      p_studio_id: stdId ?? studioId,
      p_member_id: membId ?? currentMemberId,
    });
    if (data) setNotes(data);
  };
  // Mantieni sempre aggiornato il ref alla funzione per evitare stale closure nel canale RT
  reloadNotesRef.current = reloadNotes;

  useEffect(() => {
    if (!studioId) return;
    const channel = supabase.channel(`notes-rt-${studioId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notes', filter: `studio=eq.${studioId}` },
        ({ eventType, old: oldRow }) => {
          if (eventType === 'DELETE') {
            setNotes(p => p.filter(n => n.id !== oldRow.id));
          } else {
            // INSERT o UPDATE: usa ref per avere sempre la versione fresca di reloadNotes
            // e currentMemberIdRef per il memberId aggiornato (evita doppia stale closure)
            const mid = currentMemberIdRef.current;
            if (mid) reloadNotesRef.current(mid, studioId);
          }
        })
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [studioId]);

  // Polling di fallback ogni 8s per garantire sync delle note condivise
  // indipendentemente da eventuali problemi RLS con postgres_changes real-time
  useEffect(() => {
    if (!studioId) return;
    const interval = setInterval(() => {
      const mid = currentMemberIdRef.current;
      if (mid) reloadNotesRef.current(mid, studioId);
    }, 8000);
    return () => clearInterval(interval);
  }, [studioId]);

  const groupedActive = useMemo(() => activeTasks.reduce((acc, t) => {
    const key = t.project_id || "senza-progetto";
    if (!acc[key]) acc[key] = []; acc[key].push(t); return acc;
  }, {}), [activeTasks]);

  const toggleTask = async (task, fromDone = false) => {
    const nextStatus = task.status === "completed" ? "todo" : "completed";
    setUpdatingTaskId(task.id);
    if (fromDone) {
      setCompletedToday(p => p.filter(i => i.id !== task.id));
      if (nextStatus !== "completed") setActiveTasks(p => [{ ...task, status: nextStatus }, ...p]);
    } else {
      setActiveTasks(p => p.filter(i => i.id !== task.id));
      if (nextStatus === "completed") setCompletedToday(p => [{ ...task, status: "completed" }, ...p]);
    }
    await supabase.from("tasks").update({ status: nextStatus }).eq("id", task.id);
    setUpdatingTaskId(null);
  };

  const handleCreateNote = async () => {
    if (creatingNote || !currentMemberId || !studioId) return;
    setCreatingNote(true);
    const { data, error: err } = await supabase.from('notes').insert({
      content: '',
      color: '#FFF9C4',
      is_private: true,
      shared_with: [],
      studio: studioId,
      author_id: currentMemberId,
    }).select('*').single();
    if (!err && data) {
      setNotes(p => [data, ...p]);
      if (isMobile) setExpandedNoteId(data.id); // su mobile apri subito la nota
    }
    setCreatingNote(false);
  };

  const handleNoteUpdate = (id, updates) => setNotes(p => p.map(n => n.id === id ? { ...n, ...updates } : n));
  const handleNoteDelete = async (id) => {
    if (!confirm("Eliminare questa nota? Verrà spostata nel cestino.")) return;
    // Rimuovi subito dallo stato locale (ottimistico)
    setNotes(p => p.filter(n => n.id !== id));
    const { error } = await supabase.rpc('delete_note_by_member', {
      p_note_id:   id,
      p_member_id: currentMemberId,
    });
    if (error) {
      showToast('Errore: ' + error.message);
      // Ripristina ricaricando dal DB
      const mid = currentMemberIdRef.current;
      if (mid) reloadNotesRef.current(mid, studioId);
    }
  };

  const tabSt = (active) => ({
    padding:'6px 14px', border:'none', background:'transparent', cursor:'pointer',
    fontFamily:"'IBM Plex Mono', monospace", fontSize:10, letterSpacing:'0.1em', textTransform:'uppercase',
    color: active ? T.navy : T.muted,
    borderBottom:`1.5px solid ${active ? T.navy : 'transparent'}`,
    marginBottom:-0.5,
  });

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:240, fontFamily:"'IBM Plex Mono', monospace", fontSize:11, color:T.muted }}>
      Caricamento scrivania...
    </div>
  );

  return (
    <div style={{ display:'flex', flexDirection:'column', gap: isMobile ? 14 : 20 }}>

      {/* Header */}
      <div style={{ display:'flex', alignItems: isMobile ? 'flex-start' : 'center', justifyContent:'space-between', flexWrap:'wrap', gap:10 }}>
        <div>
          <div style={{ fontSize: isMobile ? 18 : 22, fontWeight:600, letterSpacing:'-0.03em', color:T.ink }}>Scrivania</div>
          <div style={{ fontFamily:"'IBM Plex Mono', monospace", fontSize:10, color:T.muted, marginTop:2 }}>
            {activeTasks.length} task attive · {notes.length} note
          </div>
        </div>
        <button onClick={handleCreateNote} disabled={creatingNote} style={{
          background:T.navy, color:T.bg, border:'none',
          fontFamily:"'IBM Plex Mono', monospace", fontSize:10, letterSpacing:'0.08em', textTransform:'uppercase',
          padding: isMobile ? '7px 14px' : '8px 18px', cursor: creatingNote ? 'not-allowed' : 'pointer', opacity: creatingNote ? 0.6 : 1,
          flexShrink: 0,
        }}>
          {creatingNote ? '...' : '+ Nuova nota'}
        </button>
      </div>

      {/* Layout 50/50 — colonna singola su mobile */}
      <div style={{ display:'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: isMobile ? 14 : 20, alignItems:'start' }}>

        {/* ── COLONNA TASK ── */}
        <div style={{ background: T.surface, border:`1px solid ${T.border}`, padding: isMobile ? '14px 12px' : '16px 18px', borderRadius:T.radius, backdropFilter:T.blurSm, WebkitBackdropFilter:T.blurSm, boxShadow:T.shadow, minWidth:0 }}>
          <div style={{ fontFamily:"'IBM Plex Mono', monospace", fontSize:9, letterSpacing:'0.25em', textTransform:'uppercase', color:T.muted, marginBottom:12 }}>
            Le mie task
          </div>
          <div style={{ marginBottom:14 }}>
            <SlidingTabs
              tabs={[
                { key: "active",    label: `Attive (${activeTasks.length})` },
                { key: "completed", label: `Oggi (${completedToday.length})` },
              ]}
              active={taskTab}
              onChange={setTaskTab}
            />
          </div>

          {taskTab === "active" && (
            Object.keys(groupedActive).length === 0 ? (
              <div style={{ textAlign:'center', padding:'32px 0', fontFamily:"'IBM Plex Mono', monospace", fontSize:11, color:T.muted }}>
                Nessuna task attiva assegnata.
              </div>
            ) : Object.entries(groupedActive).map(([pid, tasks]) => {
              const isCollapsed = collapsedProjects.has(pid);
              const toggleCollapse = () => setCollapsedProjects(prev => {
                const next = new Set(prev);
                next.has(pid) ? next.delete(pid) : next.add(pid);
                return next;
              });
              return (
                <div key={pid} style={{ marginBottom: isCollapsed ? 8 : 16 }}>
                  {/* Header progetto cliccabile */}
                  <button onClick={toggleCollapse} style={{
                    display:'flex', alignItems:'center', justifyContent:'space-between',
                    width:'100%', background:'none', border:'none', cursor:'pointer',
                    padding:'4px 0', marginBottom: isCollapsed ? 0 : 6,
                  }}>
                    <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                      <span style={{ fontFamily:"'IBM Plex Mono', monospace", fontSize:9, letterSpacing:'0.2em', textTransform:'uppercase', color:T.navy, fontWeight:600 }}>
                        {projectsById[pid] || "Senza progetto"}
                      </span>
                      <span style={{ fontFamily:"'IBM Plex Mono', monospace", fontSize:8, color:T.muted, border:`0.5px solid ${T.border}`, borderRadius: T.radiusSm, padding:'1px 5px' }}>
                        {tasks.length}
                      </span>
                    </div>
                    <span style={{ fontFamily:"'IBM Plex Mono', monospace", fontSize:10, color:T.muted, lineHeight:1 }}>
                      {isCollapsed ? '▸' : '▾'}
                    </span>
                  </button>
                  {/* Lista task */}
                  {!isCollapsed && (
                    <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
                      {tasks.map(t => (
                        <TaskRow key={t.id} task={t} projectName={projectsById[t.project_id]||"—"}
                          onToggle={toggleTask} updating={updatingTaskId === t.id} done={false}/>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}

          {taskTab === "completed" && (
            completedToday.length === 0 ? (
              <div style={{ textAlign:'center', padding:'32px 0', fontFamily:"'IBM Plex Mono', monospace", fontSize:11, color:T.muted }}>
                Nessuna task completata oggi.
              </div>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
                {completedToday.map(t => (
                  <TaskRow key={t.id} task={t} projectName={projectsById[t.project_id]||"—"}
                    onToggle={toggleTask} updating={updatingTaskId === t.id} done={true}/>
                ))}
              </div>
            )
          )}
        </div>

        {/* ── COLONNA NOTE ── */}
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {notes.length === 0 ? (
            <div style={{ background: T.surface, border:`0.5px solid ${T.border}`, borderRadius: T.radiusSm, padding:'48px 0', textAlign:'center', fontFamily:"'IBM Plex Mono', monospace", fontSize:11, color:T.muted }}>
              Nessuna nota. Clicca "+ Nuova nota" per iniziare.
            </div>
          ) : notes.length === 1 ? (
            /* Nota singola: visibile e modificabile direttamente */
            <NoteCard
              key={notes[0].id} note={notes[0]}
              currentMemberId={currentMemberId} teamMembers={teamMembers}
              onDelete={handleNoteDelete} onUpdate={handleNoteUpdate}
              onRefresh={() => reloadNotesRef.current(currentMemberIdRef.current, studioId)}
              single={true}
            />
          ) : (
            /* Note multiple: preview cliccabile → modal overlay */
            notes.map(note => (
              <NoteCardPreview key={note.id} note={note} onClick={() => setExpandedNoteId(note.id)} />
            ))
          )}
        </div>

        {/* Modal nota espansa */}
        {expandedNoteId && (() => {
          const n = notes.find(x => x.id === expandedNoteId);
          if (!n) return null;
          return (
            <NoteModal
              note={n} currentMemberId={currentMemberId} teamMembers={teamMembers}
              onDelete={handleNoteDelete} onUpdate={handleNoteUpdate}
              onRefresh={() => reloadNotesRef.current(currentMemberIdRef.current, studioId)}
              onClose={() => setExpandedNoteId(null)}
            />
          );
        })()}

      </div>

      {error && <div style={{ fontFamily:"'IBM Plex Mono', monospace", fontSize:11, color:T.red }}>{error}</div>}
    </div>
  );
}
