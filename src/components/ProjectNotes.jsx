import { useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabase";
import { useTheme } from "../contexts/ThemeContext";

// ── Serializzazione contenuto ────────────────────────────────────────────────
// Ogni riga della casella è testo semplice OPPURE una voce spuntabile:
//   "- [ ] fare X"  → checkbox non spuntata
//   "- [x] fatto Y" → checkbox spuntata
//   "testo libero"  → riga di testo normale
const CHECK_RE = /^\s*-?\s*\[( |x|X)\]\s?(.*)$/;

function parseRows(content) {
  const lines = (content ?? "").split("\n");
  // Se completamente vuota, parti con una riga di testo vuota
  if (lines.length === 1 && lines[0] === "") {
    return [{ type: "text", done: false, text: "" }];
  }
  return lines.map((line) => {
    const m = line.match(CHECK_RE);
    if (m) return { type: "check", done: m[1].toLowerCase() === "x", text: m[2] };
    return { type: "text", done: false, text: line };
  });
}

function serializeRows(rows) {
  return rows
    .map((r) => (r.type === "check" ? `- [${r.done ? "x" : " "}] ${r.text}` : r.text))
    .join("\n");
}

export default function ProjectNotes({ projectId, studioId, currentMemberId }) {
  const { T, isDark } = useTheme();
  const [note, setNote] = useState(null);          // riga notes (id, ...)
  const [rows, setRows] = useState([{ type: "text", done: false, text: "" }]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const isTyping = useRef(false);       // true mentre l'utente digita (blocca i sync remoti)
  const saveTimer = useRef(null);
  const inputRefs = useRef({});         // { rowIndex: HTMLInputElement }
  const noteIdRef = useRef(null);

  // ── Caricamento (get-or-create) ────────────────────────────────────────────
  const load = async () => {
    if (!projectId || !studioId || !currentMemberId) return;
    const { data, error } = await supabase.rpc("get_or_create_project_note", {
      p_studio_id: studioId,
      p_project_id: projectId,
      p_member_id: currentMemberId,
    });
    const row = Array.isArray(data) ? data[0] : data;
    if (!error && row) {
      setNote(row);
      noteIdRef.current = row.id;
      if (!isTyping.current) setRows(parseRows(row.content));
    }
    setLoading(false);
  };

  useEffect(() => {
    setLoading(true);
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, studioId, currentMemberId]);

  // ── Sync remoto (realtime + polling di fallback) ───────────────────────────
  const reload = async () => {
    if (isTyping.current || !noteIdRef.current) return;
    // Via RPC SECURITY DEFINER: bypassa la RLS così anche i membri non-autori
    // ricevono gli aggiornamenti della bacheca condivisa.
    const { data } = await supabase.rpc("get_or_create_project_note", {
      p_studio_id: studioId,
      p_project_id: projectId,
      p_member_id: currentMemberId,
    });
    const row = Array.isArray(data) ? data[0] : data;
    if (row && !isTyping.current) {
      setNote(row);
      setRows(parseRows(row.content));
    }
  };
  const reloadRef = useRef(reload);
  reloadRef.current = reload;

  useEffect(() => {
    if (!projectId) return;
    const channel = supabase
      .channel(`project-notes-${projectId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notes", filter: `project_id=eq.${projectId}` },
        () => reloadRef.current()
      )
      .subscribe();
    const interval = setInterval(() => reloadRef.current(), 8000);
    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  // ── Salvataggio (debounce) ─────────────────────────────────────────────────
  const persist = (nextRows) => {
    if (!noteIdRef.current || !currentMemberId) return;
    isTyping.current = true;
    setSaving(true);
    clearTimeout(saveTimer.current);
    const content = serializeRows(nextRows);
    saveTimer.current = setTimeout(async () => {
      const updated_at = new Date().toISOString();
      await supabase.rpc("update_project_note_content", {
        p_note_id: noteIdRef.current,
        p_member_id: currentMemberId,
        p_content: content,
        p_updated_at: updated_at,
      });
      setNote((n) => (n ? { ...n, content, updated_at } : n));
      isTyping.current = false;
      setSaving(false);
    }, 600);
  };

  const applyRows = (updater) => {
    setRows((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      persist(next);
      return next;
    });
  };

  // ── Editing per riga ───────────────────────────────────────────────────────
  const setRowText = (i, text) =>
    applyRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, text } : r)));

  const toggleDone = (i) =>
    applyRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, done: !r.done } : r)));

  const toggleType = (i) =>
    applyRows((prev) =>
      prev.map((r, idx) =>
        idx === i ? { ...r, type: r.type === "check" ? "text" : "check", done: false } : r
      )
    );

  const removeRow = (i) =>
    applyRows((prev) => {
      const next = prev.filter((_, idx) => idx !== i);
      return next.length ? next : [{ type: "text", done: false, text: "" }];
    });

  const focusRow = (i) =>
    requestAnimationFrame(() => {
      const el = inputRefs.current[i];
      if (el) {
        el.focus();
        const len = el.value.length;
        el.setSelectionRange(len, len);
      }
    });

  const onKeyDown = (e, i) => {
    if (e.key === "Enter") {
      e.preventDefault();
      applyRows((prev) => {
        const cur = prev[i];
        const newRow = { type: cur.type, done: false, text: "" };
        return [...prev.slice(0, i + 1), newRow, ...prev.slice(i + 1)];
      });
      focusRow(i + 1);
    } else if (e.key === "Backspace" && rows[i].text === "" && rows.length > 1) {
      e.preventDefault();
      removeRow(i);
      if (i > 0) focusRow(i - 1);
    }
  };

  // ── Stile card (coerente con le note della scrivania) ──────────────────────
  const accent = "#FFF9C4";
  const cardStyle = isDark
    ? { background: T.surface, border: `1px solid ${T.border}`, borderLeft: `3px solid ${accent}` }
    : { background: "#FEFCEB", border: `1px solid ${T.border}` };

  const doneCount = rows.filter((r) => r.type === "check" && r.done).length;
  const totalChecks = rows.filter((r) => r.type === "check").length;

  return (
    <div style={{ ...cardStyle, borderRadius: T.radius, boxShadow: T.shadow, marginBottom: 16 }}>
      {/* Header */}
      <div
        onClick={() => setCollapsed((v) => !v)}
        style={{
          display: "flex", alignItems: "center", gap: 8, padding: "9px 14px",
          borderBottom: collapsed ? "none" : `0.5px solid ${T.border}`, cursor: "pointer",
        }}
      >
        <span style={{ fontSize: 13 }}>📝</span>
        <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase", color: isDark ? T.ink : "#5c4a00" }}>
          Note di progetto
        </span>
        {totalChecks > 0 && (
          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: T.muted, border: `0.5px solid ${T.border}`, borderRadius: T.radiusSm, padding: "1px 6px" }}>
            {doneCount}/{totalChecks}
          </span>
        )}
        <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
          {saving && <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 8, color: T.muted }}>salvo…</span>}
          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: T.muted }}>{collapsed ? "▸" : "▾"}</span>
        </span>
      </div>

      {/* Corpo */}
      {!collapsed && (
        <div style={{ padding: "8px 10px 10px" }}>
          {loading ? (
            <div style={{ padding: "16px 6px", fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: T.muted }}>
              Caricamento…
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
              {rows.map((row, i) => (
                <div
                  key={i}
                  className="pn-row"
                  style={{ display: "flex", alignItems: "center", gap: 8, padding: "2px 4px", borderRadius: T.radiusSm }}
                >
                  {/* Cerchio di spunta / conversione */}
                  <button
                    type="button"
                    onClick={() => (row.type === "check" ? toggleDone(i) : toggleType(i))}
                    title={row.type === "check" ? "Spunta" : "Trasforma in casella da spuntare"}
                    style={{
                      width: 16, height: 16, flexShrink: 0, padding: 0, borderRadius: "50%",
                      border: `1.5px solid ${row.type === "check" ? (row.done ? T.navy : T.borderMd) : T.border}`,
                      background: row.type === "check" && row.done ? T.navy : "transparent",
                      opacity: row.type === "check" ? 1 : 0.35,
                      display: "inline-flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
                    }}
                  >
                    {row.type === "check" && row.done && (
                      <svg width="8" height="6" viewBox="0 0 7 5" fill="none">
                        <path d="M1 2.5L2.5 4L6 1" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </button>

                  {/* Testo riga */}
                  <input
                    ref={(el) => (inputRefs.current[i] = el)}
                    type="text"
                    value={row.text}
                    onChange={(e) => setRowText(i, e.target.value)}
                    onKeyDown={(e) => onKeyDown(e, i)}
                    placeholder={i === 0 ? "Scrivi una nota o una cosa da fare…" : ""}
                    style={{
                      flex: 1, minWidth: 0, background: "transparent", border: "none", outline: "none",
                      fontFamily: "'Space Grotesk', sans-serif", fontSize: 13, lineHeight: 1.6,
                      color: row.type === "check" && row.done ? T.muted : T.ink,
                      textDecoration: row.type === "check" && row.done ? "line-through" : "none",
                      padding: "2px 0",
                    }}
                  />

                  {/* Elimina riga — sempre visibile */}
                  <button
                    type="button"
                    onClick={() => removeRow(i)}
                    className="pn-del"
                    title="Elimina questa riga"
                    style={{
                      flexShrink: 0, background: "none", border: "none", cursor: "pointer",
                      color: T.muted, fontSize: 16, lineHeight: 1, padding: "2px 4px",
                      opacity: 0.5, borderRadius: T.radiusSm,
                    }}
                  >
                    ×
                  </button>
                </div>
              ))}

              {/* Aggiungi riga */}
              <button
                type="button"
                onClick={() => {
                  applyRows((prev) => [...prev, { type: "text", done: false, text: "" }]);
                  focusRow(rows.length);
                }}
                style={{
                  marginTop: 4, alignSelf: "flex-start", background: "none", border: "none", cursor: "pointer",
                  fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: T.muted, padding: "4px",
                }}
              >
                + aggiungi riga
              </button>
            </div>
          )}
        </div>
      )}

      <style>{`
        .pn-row:hover { background: ${isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)"}; }
        .pn-del:hover { opacity: 1 !important; color: ${T.red} !important; }
      `}</style>
    </div>
  );
}
