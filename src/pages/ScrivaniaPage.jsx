import { useEffect, useMemo, useRef, useState } from "react";
import { useStudio } from "../hooks/useStudio";
import { getOrCreateTeamMember, supabase } from "../lib/supabase";
import { usePageTitleOnMount } from "../hooks/usePageTitle";

const T = {
  ink:'#0E0E0D', navy:'#13315C', brass:'#D9C98A',
  paper:'#EEF1F6', muted:'#8a847b',
  ink10:'#0E0E0D1A', ink20:'#0E0E0D33',
  red:'#b91c1c', green:'#1a6b3c',
};

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
  const [hover, setHover] = useState(false);
  const overdue = !done && isOverdue(task.data_pianificata);
  return (
    <button type="button" onClick={() => onToggle(task, done)} disabled={updating}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{
        display:'flex', alignItems:'center', justifyContent:'space-between',
        width:'100%', padding:'8px 12px', textAlign:'left',
        background: hover ? T.paper : 'transparent',
        border:`0.5px solid ${hover ? T.ink20 : T.ink10}`,
        cursor: updating ? 'not-allowed' : 'pointer',
        opacity: updating ? 0.5 : 1, transition:'all 0.1s',
      }}>
      <div style={{ display:'flex', alignItems:'center', gap:10, minWidth:0 }}>
        <span style={{
          width:15, height:15, borderRadius:'50%', flexShrink:0,
          border:`1px solid ${done ? T.navy : overdue ? T.red : T.ink20}`,
          background: done ? T.navy : 'transparent',
          display:'inline-flex', alignItems:'center', justifyContent:'center',
        }}>
          {done && <svg width="7" height="5" viewBox="0 0 7 5" fill="none"><path d="M1 2.5L2.5 4L6 1" stroke="#EEF1F6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
        </span>
        <div style={{ minWidth:0 }}>
          <div style={{ fontSize:12, fontWeight:600, color: done ? T.muted : T.ink, textDecoration: done ? 'line-through' : 'none', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
            {task.title || "Task senza titolo"}
          </div>
          <div style={{ fontFamily:"'IBM Plex Mono', monospace", fontSize:9, color:T.muted, marginTop:2 }}>
            {done ? `${projectName} · ${task.categoria||'—'}` : (task.categoria||'Senza categoria')}
          </div>
        </div>
      </div>
      <div style={{ flexShrink:0, marginLeft:12, fontFamily:"'IBM Plex Mono', monospace", fontSize:10, color: done ? T.green : overdue ? T.red : T.muted }}>
        {done ? '✓' : task.data_pianificata ? formatDate(task.data_pianificata) : '—'}
      </div>
    </button>
  );
}

// ── NOTA CARD ─────────────────────────────────────────────────────
function NoteCard({ note, currentMemberId, teamMembers, onDelete, onUpdate }) {
  const [content, setContent]       = useState(note.content || '');
  const [color, setColor]           = useState(note.color || '#FFF9C4');
  const [isPrivate, setIsPrivate]   = useState(note.is_private !== false);
  const [sharedWith, setSharedWith] = useState(note.shared_with || []);
  const [showShare, setShowShare]   = useState(false);
  const [showMenu, setShowMenu]     = useState(false);
  const [saving, setSaving]         = useState(false);
  const saveTimer = useRef(null);

  const isOwn = note.author_id === currentMemberId;
  const authorName = teamMembers.find(m => m.id === note.author_id)?.user_name || 'Membro';

  const saveContent = (val) => {
    clearTimeout(saveTimer.current);
    setSaving(true);
    saveTimer.current = setTimeout(async () => {
      await supabase.from('notes').update({ content: val, updated_at: new Date().toISOString() }).eq('id', note.id);
      onUpdate(note.id, { content: val });
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
  };
  const handleSharedWith = (memberId) => {
    const next = sharedWith.includes(memberId) ? sharedWith.filter(id => id !== memberId) : [...sharedWith, memberId];
    setSharedWith(next);
    saveField({ shared_with: next });
  };

  return (
    <div style={{ background: color, border:`0.5px solid ${T.ink10}`, display:'flex', flexDirection:'column' }}>
      {/* Toolbar */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'7px 10px', borderBottom:`0.5px solid rgba(14,14,13,0.08)` }}>
        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
          {NOTE_COLORS.map(c => (
            <button key={c} onClick={() => isOwn && handleColorChange(c)} style={{
              width:13, height:13, borderRadius:'50%', background:c,
              border:`1.5px solid ${color === c ? T.ink : 'rgba(14,14,13,0.15)'}`,
              cursor: isOwn ? 'pointer' : 'default', padding:0, flexShrink:0,
            }}/>
          ))}
          {isOwn && (
            <button onClick={handlePrivacyToggle} style={{
              background:'none', border:`0.5px solid ${isPrivate ? T.muted : T.navy}`,
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
                <div style={{ position:'absolute', right:0, top:'100%', background:'#fff', border:`0.5px solid ${T.ink20}`, width:160, zIndex:30, marginTop:2 }}>
                  {!isPrivate && (
                    <button onClick={() => { setShowShare(!showShare); setShowMenu(false); }}
                      style={{ display:'block', width:'100%', padding:'8px 12px', textAlign:'left', background:'none', border:'none', cursor:'pointer', fontFamily:"'IBM Plex Mono', monospace", fontSize:11, color:T.ink }}>
                      Condivisione
                    </button>
                  )}
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

      {/* Pannello condivisione */}
      {showShare && !isPrivate && isOwn && (
        <div style={{ padding:'8px 12px', borderBottom:`0.5px solid rgba(14,14,13,0.08)`, background:'rgba(255,255,255,0.4)' }}>
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
        value={content}
        onChange={e => { if (!isOwn) return; setContent(e.target.value); saveContent(e.target.value); }}
        readOnly={!isOwn}
        placeholder={isOwn ? "Inizia a scrivere..." : ""}
        style={{
          flex:1, width:'100%', minHeight:120,
          padding:'12px 14px', boxSizing:'border-box',
          background:'transparent', border:'none', outline:'none',
          fontSize:13, fontFamily:"'Space Grotesk', sans-serif",
          color:T.ink, lineHeight:1.7, resize:'vertical',
          cursor: isOwn ? 'text' : 'default',
        }}
      />

      {/* Footer data */}
      <div style={{ padding:'4px 10px 6px', fontFamily:"'IBM Plex Mono', monospace", fontSize:8, color:T.muted, borderTop:`0.5px solid rgba(14,14,13,0.06)` }}>
        {new Date(note.updated_at || note.created_at).toLocaleDateString('it-IT', { day:'numeric', month:'short' })}
        {!isPrivate && sharedWith.length > 0 && ` · condivisa con ${sharedWith.length}`}
      </div>
    </div>
  );
}

// ── MAIN ─────────────────────────────────────────────────────────
export default function ScrivaniaPage() {
  usePageTitleOnMount("Scrivania");
  const { studioId } = useStudio();

  const [currentMemberId, setCurrentMemberId] = useState(null);
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

  const loadData = async () => {
    setLoading(true); setError("");
    const today = new Date().toISOString().slice(0, 10);
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData?.user?.id) { setError("Utente non autenticato."); setLoading(false); return; }

    let tm;
    try { tm = await getOrCreateTeamMember(authData.user); }
    catch(e) { setError(e.message); setLoading(false); return; }
    setCurrentMemberId(tm.id);

    const [tasksRes, membersRes, notesRes] = await Promise.all([
      supabase.from("tasks").select("*").eq("studio", studioId).eq("assigned_member", tm.id),
      supabase.from("team_members").select("id,user_name,user_email,color").eq("studio", studioId),
      supabase.from("notes").select("*").eq("studio", studioId)
        .or(`author_id.eq.${tm.id},and(is_private.eq.false,shared_with.cs.{${tm.id}})`)
        .order("updated_at", { ascending: false }),
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
    if (!err && data) setNotes(p => [data, ...p]);
    setCreatingNote(false);
  };

  const handleNoteUpdate = (id, updates) => setNotes(p => p.map(n => n.id === id ? { ...n, ...updates } : n));
  const handleNoteDelete = async (id) => {
    if (!confirm("Eliminare questa nota?")) return;
    await supabase.from("notes").delete().eq("id", id);
    setNotes(p => p.filter(n => n.id !== id));
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
    <div style={{ display:'flex', flexDirection:'column', gap:20 }}>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div>
          <div style={{ fontSize:22, fontWeight:600, letterSpacing:'-0.03em', color:T.ink }}>Scrivania</div>
          <div style={{ fontFamily:"'IBM Plex Mono', monospace", fontSize:10, color:T.muted, marginTop:2 }}>
            {activeTasks.length} task attive · {notes.length} note
          </div>
        </div>
        <button onClick={handleCreateNote} disabled={creatingNote} style={{
          background:T.navy, color:'#EEF1F6', border:'none',
          fontFamily:"'IBM Plex Mono', monospace", fontSize:11, letterSpacing:'0.08em', textTransform:'uppercase',
          padding:'8px 18px', cursor: creatingNote ? 'not-allowed' : 'pointer', opacity: creatingNote ? 0.6 : 1,
        }}>
          {creatingNote ? '...' : '+ Nuova nota'}
        </button>
      </div>

      {/* Layout 50/50 */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20, alignItems:'start' }}>

        {/* ── COLONNA TASK ── */}
        <div style={{ background:'#fff', border:`0.5px solid ${T.ink10}`, padding:'16px 18px' }}>
          <div style={{ fontFamily:"'IBM Plex Mono', monospace", fontSize:9, letterSpacing:'0.25em', textTransform:'uppercase', color:T.muted, marginBottom:12 }}>
            Le mie task
          </div>
          <div style={{ display:'flex', borderBottom:`0.5px solid ${T.ink10}`, marginBottom:14 }}>
            <button style={tabSt(taskTab === "active")} onClick={() => setTaskTab("active")}>
              Attive ({activeTasks.length})
            </button>
            <button style={tabSt(taskTab === "completed")} onClick={() => setTaskTab("completed")}>
              Oggi ({completedToday.length})
            </button>
          </div>

          {taskTab === "active" && (
            Object.keys(groupedActive).length === 0 ? (
              <div style={{ textAlign:'center', padding:'32px 0', fontFamily:"'IBM Plex Mono', monospace", fontSize:11, color:T.muted }}>
                Nessuna task attiva assegnata.
              </div>
            ) : Object.entries(groupedActive).map(([pid, tasks]) => (
              <div key={pid} style={{ marginBottom:16 }}>
                <div style={{ fontFamily:"'IBM Plex Mono', monospace", fontSize:9, letterSpacing:'0.2em', textTransform:'uppercase', color:T.muted, marginBottom:6 }}>
                  {projectsById[pid] || "Senza progetto"}
                </div>
                <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
                  {tasks.map(t => (
                    <TaskRow key={t.id} task={t} projectName={projectsById[t.project_id]||"—"}
                      onToggle={toggleTask} updating={updatingTaskId === t.id} done={false}/>
                  ))}
                </div>
              </div>
            ))
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
            <div style={{ background:'#fff', border:`0.5px solid ${T.ink10}`, padding:'48px 0', textAlign:'center', fontFamily:"'IBM Plex Mono', monospace", fontSize:11, color:T.muted }}>
              Nessuna nota. Clicca "+ Nuova nota" per iniziare.
            </div>
          ) : notes.map(note => (
            <NoteCard
              key={note.id} note={note}
              currentMemberId={currentMemberId}
              teamMembers={teamMembers}
              onDelete={handleNoteDelete}
              onUpdate={handleNoteUpdate}
            />
          ))}
        </div>

      </div>

      {error && <div style={{ fontFamily:"'IBM Plex Mono', monospace", fontSize:11, color:T.red }}>{error}</div>}
    </div>
  );
}
