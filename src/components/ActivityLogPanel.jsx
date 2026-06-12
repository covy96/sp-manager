import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useTheme } from "../contexts/ThemeContext";
import { actionLabel } from "../lib/activityLog";

function fmtTs(ts) {
  if (!ts) return "—";
  const d = new Date(ts);
  const now = new Date();
  const diffMs = now - d;
  const diffMin = Math.floor(diffMs / 60000);
  const diffH   = Math.floor(diffMs / 3600000);
  const diffD   = Math.floor(diffMs / 86400000);
  if (diffMin < 1)  return "adesso";
  if (diffMin < 60) return `${diffMin} min fa`;
  if (diffH   < 24) return `${diffH} ore fa`;
  if (diffD   < 7)  return `${diffD}g fa`;
  return d.toLocaleDateString("it-IT", { day:"numeric", month:"short" });
}

const ACTION_ICON = {
  "task.created":   "＋",
  "task.completed": "✓",
  "task.reopened":  "↩",
  "task.deleted":   "×",
  "task.assigned":  "→",
  "project.edited": "✎",
  "pratica.created":"📋",
  "pratica.updated":"📋",
  "pratica.deleted":"📋",
  "ore.logged":     "⏱",
};

export default function ActivityLogPanel({ projectId, studioId }) {
  const { T } = useTheme();
  const mono = { fontFamily:"'IBM Plex Mono', monospace" };

  const [logs, setLogs]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen]       = useState(false);

  useEffect(() => {
    if (!projectId || !studioId || !open) return;
    load();
  }, [projectId, studioId, open]);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("activity_log")
      .select("*, team_members(user_name, color)")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false })
      .limit(50);
    setLogs(data || []);
    setLoading(false);
  };

  const count = logs.length;

  return (
    <>
      {/* Widget button */}
      <button onClick={() => setOpen(true)} style={{
        display:"flex", alignItems:"center", gap:8,
        border:`0.5px solid ${T.borderMd}`, borderRadius:T.radiusSm,
        background:"transparent", height:34, padding:"0 12px", cursor:"pointer",
      }}>
        <span style={{ ...mono, fontSize:9, letterSpacing:"0.15em", textTransform:"uppercase", color:T.ink }}>
          Attività
        </span>
        {count > 0 && (
          <span style={{ ...mono, fontSize:9, color:T.muted, border:`0.5px solid ${T.border}`, borderRadius:T.radiusSm, padding:"1px 5px" }}>{count}</span>
        )}
      </button>

      {/* Drawer / Modal */}
      {open && (
        <div style={{ position:"fixed", inset:0, zIndex:60, display:"flex", alignItems:"center", justifyContent:"center", background:"rgba(14,14,13,0.5)", padding:16 }}>
          <div style={{ width:"100%", maxWidth:520, background:T.glassBg, backdropFilter:T.blur, WebkitBackdropFilter:T.blur, border:`1px solid ${T.glassBorder}`, borderRadius:T.radiusLg, padding:28, maxHeight:"86vh", display:"flex", flexDirection:"column" }}>

            {/* Header */}
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20 }}>
              <div>
                <div style={{ fontSize:15, fontWeight:600, color:T.ink }}>Attività progetto</div>
                <div style={{ ...mono, fontSize:10, color:T.muted, marginTop:3 }}>Ultime 50 azioni registrate</div>
              </div>
              <button onClick={() => setOpen(false)} style={{ background:"none", border:"none", cursor:"pointer", color:T.muted, fontSize:20, lineHeight:1 }}>×</button>
            </div>

            {/* Lista */}
            <div style={{ overflowY:"auto", flex:1 }}>
              {loading ? (
                <div style={{ ...mono, fontSize:11, color:T.muted, padding:"32px 0", textAlign:"center" }}>Caricamento...</div>
              ) : logs.length === 0 ? (
                <div style={{ textAlign:"center", padding:"40px 0", display:"flex", flexDirection:"column", alignItems:"center", gap:8 }}>
                  <div style={{ fontSize:28, opacity:0.2 }}>📋</div>
                  <div style={{ ...mono, fontSize:11, color:T.muted }}>Nessuna attività registrata</div>
                </div>
              ) : (
                <div style={{ display:"flex", flexDirection:"column", gap:0 }}>
                  {logs.map(log => {
                    const memberName = log.team_members?.user_name || "Sistema";
                    const memberColor = log.team_members?.color || T.muted;
                    const icon = ACTION_ICON[log.action] || "·";
                    return (
                      <div key={log.id} style={{ display:"flex", gap:12, padding:"10px 0", borderBottom:`0.5px solid ${T.border}` }}>
                        {/* Icona azione */}
                        <div style={{ width:28, height:28, borderRadius:"50%", background:T.bg, border:`0.5px solid ${T.border}`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, fontSize:12 }}>
                          {icon}
                        </div>
                        {/* Contenuto */}
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ display:"flex", alignItems:"baseline", gap:6, flexWrap:"wrap" }}>
                            <span style={{ fontSize:12, fontWeight:600, color:memberColor }}>{memberName}</span>
                            <span style={{ fontSize:12, color:T.ink }}>{actionLabel(log.action)}</span>
                          </div>
                          {log.meta?.title && (
                            <div style={{ ...mono, fontSize:10, color:T.muted, marginTop:2, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                              {log.meta.title}
                            </div>
                          )}
                        </div>
                        {/* Timestamp */}
                        <div style={{ ...mono, fontSize:9, color:T.muted, flexShrink:0, alignSelf:"center" }}>
                          {fmtTs(log.created_at)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
