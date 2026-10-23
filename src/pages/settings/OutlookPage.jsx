import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { usePageTitleOnMount } from "../../hooks/usePageTitle";
import { useBodyScrollLock } from "../../hooks/useBodyScrollLock";
import { useEscKey } from "../../hooks/useEscKey";
import { useTheme } from "../../contexts/ThemeContext";
import { useToast } from "../../contexts/ToastContext";
import { useStudio } from "../../hooks/useStudio";
import { supabase } from "../../lib/supabase";
import { findMailDates, firstTime } from "../../lib/mailDates";
import BodyPortal from "../../components/BodyPortal";
import {
  outlookStatus, connectOutlook, disconnectOutlook,
  listOutlookMessages, getOutlookMessage,
} from "../../lib/outlook";

const fmtDate = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  const today = new Date();
  return d.toDateString() === today.toDateString()
    ? d.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })
    : d.toLocaleDateString("it-IT", { day: "2-digit", month: "short", year: d.getFullYear() === today.getFullYear() ? undefined : "numeric" });
};
const sender = (m) => m?.from?.emailAddress?.name || m?.from?.emailAddress?.address || "(sconosciuto)";
const recipients = (list) => (list ?? []).map(r => r.emailAddress?.name || r.emailAddress?.address).filter(Boolean).join(", ");

// "Metti a calendario": crea un'attività (tasks.data_pianificata, la stessa del
// Calendario ASM) precompilata con oggetto e date trovate nel testo della mail.
function CalendarForm({ msg, onDone }) {
  const { T } = useTheme();
  const showToast = useToast();
  const { studioId, teamMember } = useStudio();
  const text = `${msg.subject || ""}\n${msg.body?.content || ""}`;
  const suggestions = findMailDates(text, new Date(msg.receivedDateTime));
  const pick = suggestions[0];

  const [title, setTitle]     = useState(msg.subject || "");
  const [date, setDate]       = useState(pick?.date || "");
  const [time, setTime]       = useState(pick?.time || (pick ? firstTime(text) : null) || "");
  const [projectId, setProjectId] = useState("");
  const [projects, setProjects]   = useState([]);
  const [saving, setSaving]   = useState(false);

  useEffect(() => {
    if (!studioId) return;
    supabase.from("projects").select("id,name").eq("studio", studioId).eq("archived", false).order("name", { ascending: true })
      .then(({ data }) => setProjects(data ?? []));
  }, [studioId]);

  const save = async () => {
    if (!title.trim() || !date) return;
    setSaving(true);
    const from = msg.from?.emailAddress;
    const note = [`Da mail di ${from?.name || from?.address || "?"} del ${new Date(msg.receivedDateTime).toLocaleDateString("it-IT")}: ${msg.subject || ""}`, msg.webLink].filter(Boolean).join("\n");
    const { error } = await supabase.from("tasks").insert({
      project_id: projectId || null, title: title.trim(), categoria: null, status: "todo",
      assigned_member: teamMember?.id || null, assigned_to_name: teamMember?.user_name || teamMember?.user_email || null,
      data_pianificata: date, ora_pianificata: time || null, note, order: 0, studio: studioId || null,
    });
    setSaving(false);
    if (error) { showToast("Errore: " + error.message, "error"); return; }
    showToast("Aggiunta al calendario", "success");
    onDone();
  };

  const input = { padding: "8px 10px", border: `1px solid ${T.inputBorder}`, borderRadius: T.radiusSm, background: T.inputBg, color: T.inputText, fontSize: 12, outline: "none", minWidth: 0 };
  const label = { fontFamily: "var(--font-label)", fontSize: 10, color: T.muted };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {suggestions.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
          <span style={label}>Trovate nella mail:</span>
          {suggestions.slice(0, 6).map(s => {
            const active = s.date === date && (s.time || "") === time;
            return (
              <button key={`${s.date}|${s.time}`} type="button" title={s.match} onClick={() => { setDate(s.date); setTime(s.time || ""); }}
                style={{ padding: "4px 10px", borderRadius: 999, border: `1px solid ${active ? T.navy : T.borderMd}`, background: active ? T.navyLight : "transparent", color: T.ink, fontSize: 11, cursor: "pointer" }}>
                {new Date(s.date + "T00:00").toLocaleDateString("it-IT", { weekday: "short", day: "numeric", month: "short" })}{s.time ? ` · ${s.time}` : ""}
              </button>
            );
          })}
        </div>
      )}
      <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Titolo attività" style={input} />
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <input type="date" value={date} onChange={e => setDate(e.target.value)} style={{ ...input, flex: "1 1 140px" }} />
        <input type="time" value={time} onChange={e => setTime(e.target.value)} style={{ ...input, flex: "0 1 110px" }} />
        <select value={projectId} onChange={e => setProjectId(e.target.value)} style={{ ...input, flex: "2 1 180px", cursor: "pointer" }}>
          <option value="">Nessun progetto</option>
          {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
        <button type="button" onClick={onDone} style={{ padding: "8px 14px", borderRadius: T.radiusSm, border: `1px solid ${T.borderMd}`, background: "transparent", color: T.ink, fontSize: 12, cursor: "pointer" }}>Annulla</button>
        <button type="button" disabled={saving || !title.trim() || !date} onClick={save}
          style={{ padding: "8px 14px", borderRadius: T.radiusSm, border: "none", background: T.navy, color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer", opacity: saving || !title.trim() || !date ? 0.5 : 1 }}>
          {saving ? "Salvataggio…" : "Aggiungi al calendario"}
        </button>
      </div>
    </div>
  );
}

function MessageModal({ id, onClose }) {
  const { T } = useTheme();
  const [msg, setMsg] = useState(null);
  const [error, setError] = useState("");
  const [showCal, setShowCal] = useState(false);
  useBodyScrollLock(true);
  useEscKey(onClose);

  useEffect(() => {
    getOutlookMessage(id).then(setMsg).catch(e => setError(e.message));
  }, [id]);

  const label = { fontFamily: "var(--font-label)", fontSize: 10, color: T.muted };
  return (
    <BodyPortal>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.35)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
        <div onClick={e => e.stopPropagation()} style={{ width: "100%", maxWidth: 720, maxHeight: "85vh", display: "flex", flexDirection: "column", background: T.glassBg, border: `1px solid ${T.glassBorder}`, borderRadius: T.radiusLg, boxShadow: T.shadowLg, overflow: "hidden" }}>
          <div style={{ padding: "18px 20px", borderBottom: `0.5px solid ${T.borderMd}`, display: "flex", gap: 12, alignItems: "flex-start" }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: T.ink, marginBottom: 6, wordBreak: "break-word" }}>{msg?.subject || (error ? "Errore" : "Caricamento…")}</div>
              {msg && (
                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <div style={label}><b>Da:</b> {sender(msg)} {msg.from?.emailAddress?.address && `<${msg.from.emailAddress.address}>`}</div>
                  {msg.toRecipients?.length > 0 && <div style={label}><b>A:</b> {recipients(msg.toRecipients)}</div>}
                  {msg.ccRecipients?.length > 0 && <div style={label}><b>Cc:</b> {recipients(msg.ccRecipients)}</div>}
                  <div style={label}>{new Date(msg.receivedDateTime).toLocaleString("it-IT")}{msg.hasAttachments ? " · 📎 allegati" : ""}</div>
                </div>
              )}
            </div>
            <button onClick={onClose} aria-label="Chiudi" style={{ border: "none", background: "transparent", color: T.muted, fontSize: 20, cursor: "pointer", lineHeight: 1 }}>×</button>
          </div>
          <div style={{ padding: "16px 20px", overflowY: "auto", flex: 1 }}>
            {error && <div style={{ ...label, fontSize: 12, color: T.red }}>{error}</div>}
            {msg && <div style={{ fontSize: 13, color: T.ink, whiteSpace: "pre-wrap", lineHeight: 1.55, wordBreak: "break-word" }}>{msg.body?.content?.trim() || "(nessun testo)"}</div>}
          </div>
          {msg && (
            <div style={{ padding: "12px 20px", borderTop: `0.5px solid ${T.borderMd}` }}>
              {showCal
                ? <CalendarForm msg={msg} onDone={() => setShowCal(false)} />
                : (
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                    <button type="button" onClick={() => setShowCal(true)} style={{ padding: "8px 14px", borderRadius: T.radiusSm, border: "none", background: T.navy, color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>📅 Metti a calendario</button>
                    {msg.webLink && <a href={msg.webLink} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, fontWeight: 600, color: T.navy, textDecoration: "none" }}>Apri in Outlook ↗</a>}
                  </div>
                )}
            </div>
          )}
        </div>
      </div>
    </BodyPortal>
  );
}

export default function OutlookPage() {
  const { T } = useTheme();
  const showToast = useToast();
  usePageTitleOnMount("Posta Outlook");
  const [params, setParams] = useSearchParams();

  const [status, setStatus]     = useState(null); // { connected, email }
  const [busy, setBusy]         = useState(false);
  const [messages, setMessages] = useState([]);
  const [next, setNext]         = useState(null);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const [search, setSearch]     = useState("");
  const [query, setQuery]       = useState("");
  const [openId, setOpenId]     = useState(null);

  // Esito del ritorno dal login Microsoft
  useEffect(() => {
    const res = params.get("outlook");
    if (!res) return;
    if (res === "connected") showToast("Outlook collegato", "success");
    else showToast("Collegamento non riuscito: " + (params.get("msg") || "errore sconosciuto"), "error");
    setParams({}, { replace: true });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const loadStatus = useCallback(() => {
    outlookStatus().then(setStatus).catch(e => { setStatus({ connected: false }); setError(e.message); });
  }, []);
  useEffect(loadStatus, [loadStatus]);

  const load = useCallback(async (q, more) => {
    setLoading(true); setError("");
    try {
      const res = await listOutlookMessages(more ? { next: more } : { search: q || undefined });
      setMessages(prev => more ? [...prev, ...res.messages] : res.messages);
      setNext(res.next);
    } catch (e) {
      if (e.notConnected) setStatus({ connected: false });
      setError(e.message);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { if (status?.connected) load(query); }, [status?.connected, query, load]);

  const handleConnect = async () => {
    setBusy(true);
    try { await connectOutlook(); }
    catch (e) { showToast(e.message, "error"); setBusy(false); }
  };
  const handleDisconnect = async () => {
    if (!window.confirm("Scollegare Outlook da ASM?")) return;
    setBusy(true);
    try { await disconnectOutlook(); setStatus({ connected: false }); setMessages([]); setNext(null); }
    catch (e) { showToast(e.message, "error"); }
    finally { setBusy(false); }
  };

  const card = { background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.radius, backdropFilter: T.blurSm, WebkitBackdropFilter: T.blurSm, boxShadow: T.shadow };
  const btn = (primary) => ({ padding: "8px 16px", borderRadius: T.radiusSm, border: primary ? "none" : `1px solid ${T.borderMd}`, background: primary ? T.navy : "transparent", color: primary ? "#fff" : T.ink, fontSize: 12, fontWeight: 600, cursor: busy ? "default" : "pointer", opacity: busy ? 0.6 : 1, flexShrink: 0 });

  return (
    <div style={{ maxWidth: 760, display: "flex", flexDirection: "column", gap: 16 }}>
      <div>
        <div style={{ fontSize: 26, fontWeight: 700, color: T.ink, letterSpacing: "-0.025em", marginBottom: 4 }}>Posta Outlook</div>
        <div style={{ fontFamily: "var(--font-label)", fontSize: 10, color: T.muted }}>Collega la tua casella Outlook per leggere le mail in ASM (sola lettura)</div>
      </div>

      <div style={{ ...card, padding: "20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: T.ink, marginBottom: 4 }}>Account Microsoft</div>
          <div style={{ fontFamily: "var(--font-label)", fontSize: 10, color: T.muted, wordBreak: "break-all" }}>
            {status === null ? "Verifica…" : status.connected ? `Collegato: ${status.email || "account Microsoft"}` : "Non collegato"}
          </div>
        </div>
        {status && (status.connected
          ? <button disabled={busy} onClick={handleDisconnect} style={btn(false)}>Scollega</button>
          : <button disabled={busy} onClick={handleConnect} style={btn(true)}>{busy ? "Apertura…" : "Collega Outlook"}</button>)}
      </div>

      {error && !status?.connected && <div style={{ fontFamily: "var(--font-label)", fontSize: 11, color: T.red }}>{error}</div>}

      {status?.connected && (
        <div style={card}>
          <form onSubmit={e => { e.preventDefault(); setQuery(search.trim()); }} style={{ display: "flex", gap: 8, padding: "12px 16px", borderBottom: `0.5px solid ${T.border}` }}>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cerca nelle mail (mittente, oggetto, testo)…"
              style={{ flex: 1, minWidth: 0, padding: "8px 12px", border: `1px solid ${T.inputBorder}`, borderRadius: T.radiusSm, background: T.inputBg, color: T.inputText, fontSize: 13, outline: "none" }} />
            {query && <button type="button" onClick={() => { setSearch(""); setQuery(""); }} style={btn(false)}>Azzera</button>}
          </form>
          <div style={{ fontFamily: "var(--font-label)", fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", color: T.muted, padding: "10px 20px", borderBottom: `0.5px solid ${T.border}` }}>
            {query ? `Risultati per “${query}”` : "Posta in arrivo"}
          </div>

          {error && <div style={{ padding: "12px 20px", fontFamily: "var(--font-label)", fontSize: 11, color: T.red }}>{error}</div>}
          {!loading && !error && messages.length === 0 && (
            <div style={{ padding: "24px 0", textAlign: "center", fontFamily: "var(--font-label)", fontSize: 11, color: T.muted }}>Nessuna mail</div>
          )}

          {messages.map(m => (
            <button key={m.id} onClick={() => setOpenId(m.id)}
              style={{ display: "flex", width: "100%", textAlign: "left", gap: 12, padding: "12px 20px", border: "none", borderBottom: `0.5px solid ${T.border}`, background: "transparent", cursor: "pointer", color: T.ink }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", marginTop: 6, flexShrink: 0, background: m.isRead ? "transparent" : T.navy }} />
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: m.isRead ? 500 : 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{sender(m)}</span>
                  <span style={{ fontFamily: "var(--font-label)", fontSize: 10, color: T.muted, flexShrink: 0 }}>{m.hasAttachments ? "📎 " : ""}{fmtDate(m.receivedDateTime)}</span>
                </span>
                <span style={{ display: "block", fontSize: 12, fontWeight: m.isRead ? 400 : 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginTop: 2 }}>{m.subject || "(nessun oggetto)"}</span>
                <span style={{ display: "block", fontSize: 11, color: T.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginTop: 2 }}>{m.bodyPreview}</span>
              </span>
            </button>
          ))}

          {(loading || next) && (
            <div style={{ padding: "12px 20px", textAlign: "center" }}>
              {loading
                ? <span style={{ fontFamily: "var(--font-label)", fontSize: 11, color: T.muted }}>Caricamento…</span>
                : <button onClick={() => load(query, next)} style={btn(false)}>Carica altre</button>}
            </div>
          )}
        </div>
      )}

      {openId && <MessageModal id={openId} onClose={() => setOpenId(null)} />}
    </div>
  );
}
