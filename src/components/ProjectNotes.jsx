import { useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabase";
import { useTheme } from "../contexts/ThemeContext";

// ── Modello righe ────────────────────────────────────────────────────────────
// Il contenuto è salvato come JSON in notes.content:
//   { "v": 1, "rows": [ { id, type:"text"|"check", done, text, authorId, authorName, at } ] }
// Retro-compatibile col vecchio formato testo (righe "- [ ] ..." / testo libero):
// se il parse JSON fallisce, si interpretano le righe come prima.
const CHECK_RE = /^\s*-?\s*\[( |x|X)\]\s?(.*)$/;

let _idc = 0;
const genId = () => `r${Date.now().toString(36)}${(_idc++).toString(36)}`;

function parseContent(content, fallback) {
  const raw = content ?? "";
  // Nuovo formato JSON
  if (raw.trim().startsWith("{")) {
    try {
      const obj = JSON.parse(raw);
      if (Array.isArray(obj.rows)) {
        const rows = obj.rows.map((r) => ({
          id: r.id || genId(),
          type: r.type === "check" ? "check" : "text",
          done: !!r.done,
          text: r.text ?? "",
          authorId: r.authorId ?? null,
          authorName: r.authorName ?? null,
          at: r.at ?? null,
        }));
        return rows.length ? rows : [emptyRow()];
      }
    } catch { /* fallback sotto */ }
  }
  // Vecchio formato testo
  const lines = raw.split("\n");
  if (lines.length === 1 && lines[0] === "") return [emptyRow()];
  return lines.map((line) => {
    const m = line.match(CHECK_RE);
    const base = m
      ? { type: "check", done: m[1].toLowerCase() === "x", text: m[2] }
      : { type: "text", done: false, text: line };
    return {
      id: genId(), ...base,
      authorId: fallback?.authorId ?? null,
      authorName: fallback?.authorName ?? null,
      at: fallback?.at ?? null,
    };
  });
}

function emptyRow() {
  return { id: genId(), type: "text", done: false, text: "", authorId: null, authorName: null, at: null };
}

function serializeRows(rows) {
  return JSON.stringify({
    v: 1,
    rows: rows.map((r) => ({
      id: r.id, type: r.type, done: r.done, text: r.text,
      authorId: r.authorId, authorName: r.authorName, at: r.at,
    })),
  });
}

function formatWhen(at) {
  if (!at) return "";
  const d = new Date(at);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleString("it-IT", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

export default function ProjectNotes({ projectId, studioId, currentMemberId, currentMemberName, teamMembers = [] }) {
  const { T, isDark } = useTheme();
  const nameById = (id) => {
    const m = teamMembers.find((x) => x.id === id);
    return m ? (m.user_name || m.user_email || null) : null;
  };
  const [note, setNote] = useState(null);
  const [rows, setRows] = useState([emptyRow()]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const isTyping = useRef(false);
  const saveTimer = useRef(null);
  const inputRefs = useRef({});
  const noteIdRef = useRef(null);

  const fallbackFor = (row) => ({
    authorId: row?.author_id ?? null,
    authorName: nameById(row?.author_id) ?? null,  // risale al nome dall'autore della nota
    at: row?.updated_at ?? null,
  });

  // Riempie il nome mancante risalendo dall'authorId (righe legacy o cambi nome)
  const hydrate = (rowsIn) =>
    rowsIn.map((r) => (!r.authorName && r.authorId ? { ...r, authorName: nameById(r.authorId) } : r));

  // ── Caricamento (get-or-create) ────────────────────────────────────────────
  const load = async () => {
    if (!projectId || !studioId || !currentMemberId) return;
    const { data, error } = await supabase.rpc("get_or_create_project_note", {
      p_studio_id: studioId, p_project_id: projectId, p_member_id: currentMemberId,
    });
    const row = Array.isArray(data) ? data[0] : data;
    if (!error && row) {
      setNote(row);
      noteIdRef.current = row.id;
      if (!isTyping.current) setRows(hydrate(parseContent(row.content, fallbackFor(row))));
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
    const { data } = await supabase.rpc("get_or_create_project_note", {
      p_studio_id: studioId, p_project_id: projectId, p_member_id: currentMemberId,
    });
    const row = Array.isArray(data) ? data[0] : data;
    if (row && !isTyping.current) {
      setNote(row);
      setRows(hydrate(parseContent(row.content, fallbackFor(row))));
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
        p_note_id: noteIdRef.current, p_member_id: currentMemberId,
        p_content: content, p_updated_at: updated_at,
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

  // Marca la riga come scritta dall'utente corrente adesso
  const stamp = (r) => ({ ...r, authorId: currentMemberId, authorName: currentMemberName || null, at: new Date().toISOString() });

  // ── Editing per riga ───────────────────────────────────────────────────────
  const setRowText = (i, text) =>
    applyRows((prev) => prev.map((r, idx) => (idx === i ? stamp({ ...r, text }) : r)));

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
      return next.length ? next : [emptyRow()];
    });

  const focusRow = (i) =>
    requestAnimationFrame(() => {
      const el = inputRefs.current[i];
      if (el) { el.focus(); const len = el.value.length; el.setSelectionRange(len, len); }
    });

  const onKeyDown = (e, i) => {
    if (e.key === "Enter") {
      e.preventDefault();
      applyRows((prev) => {
        const cur = prev[i];
        const newRow = stamp({ ...emptyRow(), type: cur.type });
        return [...prev.slice(0, i + 1), newRow, ...prev.slice(i + 1)];
      });
      focusRow(i + 1);
    } else if (e.key === "Backspace" && rows[i].text === "" && rows.length > 1) {
      e.preventDefault();
      removeRow(i);
      if (i > 0) focusRow(i - 1);
    }
  };

  // ── Stile card ─────────────────────────────────────────────────────────────
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
                  key={row.id}
                  className="pn-row"
                  style={{ position: "relative", display: "flex", alignItems: "center", gap: 8, padding: "2px 4px", borderRadius: T.radiusSm }}
                >
                  {/* Nuvoletta autore/data (stile Google Docs) */}
                  {(row.authorName || row.at) && (
                    <div
                      className="pn-meta"
                      style={{
                        position: "absolute", left: 24, top: -22, zIndex: 20,
                        background: isDark ? "#1c1c1e" : "#0e0e0d", color: "#fff",
                        fontFamily: "'IBM Plex Mono', monospace", fontSize: 9.5, letterSpacing: "0.02em",
                        padding: "3px 8px", borderRadius: 6, whiteSpace: "nowrap",
                        boxShadow: "0 2px 8px rgba(0,0,0,0.35)", pointerEvents: "none",
                        opacity: 0, transition: "opacity 0.12s",
                      }}
                    >
                      ✍ {row.authorName || "Sconosciuto"}{row.at ? ` · ${formatWhen(row.at)}` : ""}
                    </div>
                  )}

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
                  applyRows((prev) => [...prev, stamp(emptyRow())]);
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
        .pn-row:hover .pn-meta { opacity: 1; }
        .pn-del:hover { opacity: 1 !important; color: ${T.red} !important; }
      `}</style>
    </div>
  );
}
