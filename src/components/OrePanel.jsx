import { useEffect, useState, useMemo } from "react";
import { supabase } from "../lib/supabase";
import { useTheme } from "../contexts/ThemeContext";
import { formatOre } from "../lib/utils";

function avatarColor(name = "") {
  const colors = ["#13315C","#1a6b3c","#7c3aed","#b45309","#be185d","#0e7490"];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (name.charCodeAt(i) + ((h << 5) - h)) | 0;
  return colors[Math.abs(h) % colors.length];
}

function Avatar({ name, size = 22 }) {
  const initials = (name || "?").trim().split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase() || "").join("");
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: avatarColor(name), flexShrink: 0,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.38, fontWeight: 700, color: "#fff", letterSpacing: "-0.02em",
    }}>
      {initials || "?"}
    </div>
  );
}

function getMonday(d) {
  const dt = new Date(d);
  const day = dt.getDay();
  const diff = (day === 0 ? -6 : 1 - day);
  dt.setDate(dt.getDate() + diff);
  dt.setHours(0, 0, 0, 0);
  return dt;
}

function weekLabel(monday) {
  const end = new Date(monday);
  end.setDate(end.getDate() + 6);
  const fmt = (d) => d.toLocaleDateString("it-IT", { day: "numeric", month: "short" });
  return `${fmt(monday)} – ${fmt(end)}`;
}

export default function OrePanel({ projectId, studioId }) {
  const { T, isDark } = useTheme();
  const mono = { fontFamily: "'IBM Plex Mono', monospace" };

  const [open, setOpen]           = useState(false);
  const [entries, setEntries]     = useState([]);
  const [memberMap, setMemberMap] = useState({}); // team_member id → user_name
  const [loading, setLoading]     = useState(false);
  const [view, setView]           = useState("mese");
  const [expanded, setExpanded]   = useState({}); // key → bool

  useEffect(() => {
    if (!projectId || !studioId) return;
    loadEntries();
  }, [projectId, studioId]);

  const loadEntries = async () => {
    setLoading(true);
    // Carica timesheet + team_members in parallelo
    const [{ data: ts }, { data: tm }] = await Promise.all([
      supabase
        .from("timesheet")
        .select("id, date, hours, user_name, team_member")
        .eq("project_id", projectId)
        .order("date", { ascending: false }),
      supabase
        .from("team_members")
        .select("id, user_name, user_email")
        .eq("studio", studioId),
    ]);
    // Mappa id → nome per risolvere record senza user_name
    const map = {};
    for (const m of (tm || [])) {
      map[m.id] = m.user_name || m.user_email || "Utente";
    }
    setMemberMap(map);
    setEntries(ts || []);
    setLoading(false);
  };

  // Risolve il nome: prima user_name salvato, poi lookup via team_member id
  const resolveName = (e) =>
    (e.user_name && e.user_name.trim()) ? e.user_name.trim()
    : e.team_member ? (memberMap[e.team_member] || "Utente")
    : "Sconosciuto";

  const totalOre = useMemo(() => entries.reduce((s, e) => s + (Number(e.hours) || 0), 0), [entries]);

  const buildGroups = (keyFn, labelFn) => {
    const map = {};
    for (const e of entries) {
      const key = keyFn(e.date);
      const label = labelFn(e.date);
      if (!map[key]) map[key] = { key, label, total: 0, members: {} };
      map[key].total += Number(e.hours) || 0;
      const name = resolveName(e);
      map[key].members[name] = (map[key].members[name] || 0) + (Number(e.hours) || 0);
    }
    return Object.values(map).sort((a, b) => b.key.localeCompare(a.key));
  };

  const byMonth = useMemo(() => buildGroups(
    (d) => { const dt = new Date(d); return `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,"0")}`; },
    (d) => new Date(d).toLocaleDateString("it-IT", { month: "long", year: "numeric" }),
  ), [entries, memberMap]);

  const byWeek = useMemo(() => buildGroups(
    (d) => getMonday(d).toISOString().slice(0, 10),
    (d) => weekLabel(getMonday(d)),
  ), [entries, memberMap]);

  const groups = view === "mese" ? byMonth : byWeek;

  // Primo rendering: espandi solo il periodo più recente
  useEffect(() => {
    if (groups.length > 0 && Object.keys(expanded).length === 0) {
      setExpanded({ [groups[0].key]: true });
    }
  }, [groups]);

  const toggleExpand = (key) => setExpanded(p => ({ ...p, [key]: !p[key] }));

  const btnBase = {
    ...mono, fontSize: 9, letterSpacing: "0.15em", textTransform: "uppercase",
    padding: "4px 10px", cursor: "pointer", border: `0.5px solid ${T.borderMd}`,
  };

  return (
    <>
      {/* Trigger */}
      <button
        onClick={() => { setOpen(true); loadEntries(); }}
        style={{
          display: "flex", alignItems: "center", gap: 6,
          padding: "7px 13px", border: `0.5px solid ${T.borderMd}`,
          background: "transparent", color: T.ink, cursor: "pointer",
          ...mono, fontSize: 11, letterSpacing: "0.06em", textTransform: "uppercase",
          whiteSpace: "nowrap",
        }}
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
        </svg>
        {loading ? "…" : `${formatOre(totalOre)} h`}
      </button>

      {/* Modal */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{
            position: "fixed", inset: 0, zIndex: 60,
            background: "rgba(0,0,0,0.45)",
            display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: "100%", maxWidth: 540,
              background: T.surface, border: `0.5px solid ${T.borderMd}`,
              maxHeight: "80vh", display: "flex", flexDirection: "column",
              boxShadow: `0 8px 32px rgba(0,0,0,${isDark ? "0.5" : "0.14"})`,
            }}
          >
            {/* Header modal */}
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "14px 20px", borderBottom: `0.5px solid ${T.border}`,
            }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 600, color: T.ink, letterSpacing: "-0.01em" }}>Ore lavorate</div>
                <div style={{ ...mono, fontSize: 10, color: T.muted, marginTop: 2 }}>
                  Totale: <strong style={{ color: T.navy }}>{formatOre(totalOre)} h</strong>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ display: "flex" }}>
                  <button onClick={() => setView("mese")}
                    style={{ ...btnBase, background: view === "mese" ? T.navy : "transparent", color: view === "mese" ? "#fff" : T.muted, borderRight: "none" }}>
                    Mese
                  </button>
                  <button onClick={() => setView("settimana")}
                    style={{ ...btnBase, background: view === "settimana" ? T.navy : "transparent", color: view === "settimana" ? "#fff" : T.muted }}>
                    Settimana
                  </button>
                </div>
                <button onClick={() => setOpen(false)}
                  style={{ background: "none", border: "none", cursor: "pointer", color: T.muted, fontSize: 22, lineHeight: 1, padding: "0 4px" }}>×</button>
              </div>
            </div>

            {/* Body */}
            <div style={{ flex: 1, overflowY: "auto", padding: "10px 20px 20px" }}>
              {loading ? (
                <div style={{ ...mono, fontSize: 11, color: T.muted, padding: "32px 0", textAlign: "center" }}>Caricamento…</div>
              ) : groups.length === 0 ? (
                <div style={{ ...mono, fontSize: 11, color: T.muted, padding: "48px 0", textAlign: "center" }}>Nessuna ora registrata per questo progetto.</div>
              ) : groups.map(g => {
                const isOpen = !!expanded[g.key];
                const memberRows = Object.entries(g.members).sort((a, b) => b[1] - a[1]);
                return (
                  <div key={g.key} style={{ marginBottom: 8 }}>
                    {/* Header periodo — cliccabile */}
                    <button
                      onClick={() => toggleExpand(g.key)}
                      style={{
                        width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
                        padding: "8px 12px", background: T.bg, border: `0.5px solid ${T.border}`,
                        cursor: "pointer", textAlign: "left",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        {/* Chevron */}
                        <svg
                          width="10" height="10" viewBox="0 0 24 24" fill="none"
                          stroke={T.muted} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                          style={{ transition: "transform 0.15s", transform: isOpen ? "rotate(90deg)" : "rotate(0deg)", flexShrink: 0 }}
                        >
                          <polyline points="9 18 15 12 9 6"/>
                        </svg>
                        <span style={{ ...mono, fontSize: 10, color: T.ink, fontWeight: 600, textTransform: "capitalize" }}>{g.label}</span>
                        <span style={{ ...mono, fontSize: 9, color: T.muted }}>({memberRows.length} {memberRows.length === 1 ? "persona" : "persone"})</span>
                      </div>
                      <span style={{ ...mono, fontSize: 11, color: T.navy, fontWeight: 700 }}>{formatOre(g.total)} h</span>
                    </button>

                    {/* Righe membro — visibili solo se espanso */}
                    {isOpen && memberRows.map(([name, ore]) => (
                      <div key={name} style={{
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        padding: "7px 12px", borderBottom: `0.5px solid ${T.border}`,
                        background: T.surface,
                      }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <Avatar name={name} size={24} />
                          <span style={{ ...mono, fontSize: 10, color: T.ink }}>{name}</span>
                        </div>
                        <span style={{ ...mono, fontSize: 10, color: T.muted, fontWeight: 600 }}>{formatOre(ore)} h</span>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
