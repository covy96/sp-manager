import { useCallback, useEffect, useMemo, useState } from "react";
import BodyPortal from "./BodyPortal";
import SlidingTabs from "./SlidingTabs";
import { useTheme } from "../contexts/ThemeContext";
import { useToast } from "../contexts/ToastContext";
import { useEscKey } from "../hooks/useEscKey";
import { useBodyScrollLock } from "../hooks/useBodyScrollLock";
import { useIsMobile } from "../hooks/useIsMobile";
import { supabase } from "../lib/supabase";
import { formatOre } from "../lib/utils";

const MONTHS = ["Gennaio","Febbraio","Marzo","Aprile","Maggio","Giugno","Luglio","Agosto","Settembre","Ottobre","Novembre","Dicembre"];

// Data locale in YYYY-MM-DD (toISOString userebbe UTC e in Italia
// sposterebbe il primo del mese al giorno prima)
export function toLocalISO(d) {
  const p = n => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}`;
}

function mondayOf(ref) {
  const d = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate());
  const day = d.getDay();
  d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day));
  return d;
}

function weekRange(ref) {
  const mon = mondayOf(ref);
  const sun = new Date(mon); sun.setDate(mon.getDate() + 6);
  return { start: toLocalISO(mon), end: toLocalISO(sun), monday: mon, sunday: sun };
}

function monthRange(year, month) {
  return { start: toLocalISO(new Date(year, month, 1)), end: toLocalISO(new Date(year, month + 1, 0)) };
}

function weekLabel(ref) {
  const { monday, sunday } = weekRange(ref);
  const f = d => d.toLocaleDateString("it-IT", { day: "numeric", month: "short" });
  return `${f(monday)} – ${f(sunday)} ${sunday.getFullYear()}`;
}

function csvEscape(v) {
  const s = String(v ?? "");
  return s.includes(",") || s.includes('"') || s.includes("\n") ? `"${s.replace(/"/g, '""')}"` : s;
}

function slug(s) {
  return String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "").toLowerCase();
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback per browser senza Clipboard API (o contesto non sicuro)
    const ta = document.createElement("textarea");
    ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0";
    document.body.appendChild(ta); ta.select();
    let ok = false;
    try { ok = document.execCommand("copy"); } catch { ok = false; }
    document.body.removeChild(ta);
    return ok;
  }
}

// ── GUSCIO MODALE ────────────────────────────────────────────────
function ModalShell({ title, subtitle, onClose, children, footer }) {
  const { T } = useTheme();
  const isMobile = useIsMobile();
  useEscKey(onClose);
  useBodyScrollLock(true);
  return (
    <BodyPortal>
      <div onClick={onClose} style={{ position:"fixed", inset:0, zIndex:200, background:"rgba(10,16,30,0.35)", backdropFilter:"blur(4px)", WebkitBackdropFilter:"blur(4px)", display:"flex", alignItems: isMobile ? "flex-end" : "center", justifyContent:"center", padding: isMobile ? 0 : 16 }}>
        <div onClick={e => e.stopPropagation()} style={{
          width:"100%", maxWidth:480, maxHeight: isMobile ? "88vh" : "86vh", display:"flex", flexDirection:"column",
          background:T.glassBg, border:`1px solid ${T.glassBorder}`, boxShadow:T.shadowLg,
          borderRadius: isMobile ? `${T.radiusLg} ${T.radiusLg} 0 0` : T.radiusLg,
          paddingBottom: isMobile ? "env(safe-area-inset-bottom)" : 0,
        }}>
          <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:12, padding:"20px 20px 12px" }}>
            <div>
              <div style={{ fontFamily:"var(--font-ui)", fontSize:17, fontWeight:700, letterSpacing:"-0.02em", color:T.ink }}>{title}</div>
              {subtitle && <div style={{ fontFamily:"var(--font-label)", fontSize:10, letterSpacing:"0.08em", color:T.muted, marginTop:4 }}>{subtitle}</div>}
            </div>
            <button onClick={onClose} aria-label="Chiudi" style={{ background:T.navyLight, border:"none", borderRadius:"50%", width:28, height:28, cursor:"pointer", color:T.navy, fontSize:16, lineHeight:1, flexShrink:0 }}>×</button>
          </div>
          <div style={{ padding:"0 20px 16px", overflowY:"auto", flex:1 }}>{children}</div>
          {footer && <div style={{ padding:"12px 20px 20px", borderTop:`0.5px solid ${T.borderMd}`, display:"flex", gap:8, justifyContent:"flex-end", alignItems:"center", flexWrap:"wrap" }}>{footer}</div>}
        </div>
      </div>
    </BodyPortal>
  );
}

function useStyles() {
  const { T } = useTheme();
  return useMemo(() => ({
    label: { fontFamily:"var(--font-label)", fontSize:10, letterSpacing:"0.2em", textTransform:"uppercase", color:T.muted, marginBottom:8, display:"block" },
    select: { width:"100%", background:T.inputBg, border:`1px solid ${T.inputBorder}`, color:T.inputText, borderRadius:T.radiusSm, padding:"9px 12px", fontFamily:"var(--font-ui)", fontSize:13, outline:"none" },
    navBtn: { background:T.inputBg, border:`1px solid ${T.inputBorder}`, borderRadius:T.radiusSm, cursor:"pointer", color:T.ink, padding:"8px 12px", fontFamily:"var(--font-label)", fontSize:12 },
    primary: { background:T.navy, border:"none", borderRadius:T.radiusSm, cursor:"pointer", color:"#fff", padding:"10px 18px", fontFamily:"var(--font-label)", fontSize:11, letterSpacing:"0.08em", textTransform:"uppercase" },
    secondary: { background:"transparent", border:`1px solid ${T.borderMd}`, borderRadius:T.radiusSm, cursor:"pointer", color:T.ink, padding:"10px 16px", fontFamily:"var(--font-label)", fontSize:11, letterSpacing:"0.08em", textTransform:"uppercase" },
    section: { marginTop:16 },
  }), [T]);
}

function PeriodNav({ label, onPrev, onNext }) {
  const { T } = useTheme();
  const S = useStyles();
  return (
    <div style={{ display:"flex", alignItems:"center", gap:8 }}>
      <button onClick={onPrev} style={S.navBtn} aria-label="Precedente">←</button>
      <div style={{ flex:1, textAlign:"center", fontFamily:"var(--font-ui)", fontSize:14, fontWeight:600, color:T.ink, letterSpacing:"-0.01em" }}>{label}</div>
      <button onClick={onNext} style={S.navBtn} aria-label="Successivo">→</button>
    </div>
  );
}

// ── REPORT PER FATTURA ───────────────────────────────────────────
// Progetti su cui l'utente corrente ha lavorato nel mese (di default quello
// in corso), in un elenco pronto da copiare.
export function ReportFatturaModal({ studioId, teamMember, projectMap, onClose }) {
  const { T } = useTheme();
  const S = useStyles();
  const toast = useToast();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [withHours, setWithHours] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!studioId || !teamMember?.id) { setLoading(false); return; }
    let alive = true;
    const { start, end } = monthRange(year, month);
    setLoading(true); setError("");
    supabase.from("timesheet").select("*")
      .eq("studio", studioId).eq("team_member", teamMember.id).is("deleted_at", null)
      .gte("date", start).lte("date", end)
      .then(({ data, error: e }) => {
        if (!alive) return;
        if (e) setError(e.message); else setRows(data ?? []);
        setLoading(false);
      });
    return () => { alive = false; };
  }, [studioId, teamMember?.id, year, month]);

  const list = useMemo(() => {
    const g = {};
    rows.forEach(r => {
      const name = projectMap[r.project_id]?.name || r.project_name;
      if (!name) return;
      if (!g[name]) g[name] = { name, client: projectMap[r.project_id]?.client || r.project_client || "", hours: 0 };
      g[name].hours += Number(r.hours) || 0;
    });
    return Object.values(g).sort((a, b) => a.name.localeCompare(b.name, "it"));
  }, [rows, projectMap]);

  const text = list.map(p => withHours ? `${p.name} — ${formatOre(p.hours)}` : p.name).join("\n");

  const shiftMonth = n => {
    const d = new Date(year, month + n, 1);
    setYear(d.getFullYear()); setMonth(d.getMonth()); setCopied(false);
  };

  const doCopy = async () => {
    const ok = await copyText(text);
    if (ok) { setCopied(true); toast?.("Elenco copiato", "success"); setTimeout(() => setCopied(false), 2000); }
    else toast?.("Impossibile copiare: seleziona il testo a mano", "error");
  };

  return (
    <ModalShell
      title="Report per fattura"
      subtitle={teamMember?.user_name ? `Progetti di ${teamMember.user_name}` : undefined}
      onClose={onClose}
      footer={<>
        <label style={{ display:"flex", alignItems:"center", gap:6, marginRight:"auto", fontFamily:"var(--font-ui)", fontSize:12, color:T.ink, cursor:"pointer" }}>
          <input type="checkbox" checked={withHours} onChange={e => { setWithHours(e.target.checked); setCopied(false); }} style={{ accentColor:T.navy }}/>
          Includi ore
        </label>
        <button onClick={doCopy} disabled={!list.length} style={{ ...S.primary, opacity: list.length ? 1 : 0.4, cursor: list.length ? "pointer" : "default" }}>
          {copied ? "✓ Copiato" : "Copia elenco"}
        </button>
      </>}
    >
      <PeriodNav label={`${MONTHS[month]} ${year}`} onPrev={() => shiftMonth(-1)} onNext={() => shiftMonth(1)}/>
      <div style={S.section}>
        {!teamMember?.id ? (
          <div style={{ fontFamily:"var(--font-label)", fontSize:11, color:T.muted, textAlign:"center", padding:"24px 0" }}>Utente non trovato nel team.</div>
        ) : loading ? (
          <div style={{ fontFamily:"var(--font-label)", fontSize:11, color:T.muted, textAlign:"center", padding:"24px 0" }}>Caricamento…</div>
        ) : error ? (
          <div style={{ fontFamily:"var(--font-label)", fontSize:11, color:T.red, padding:"12px 0" }}>{error}</div>
        ) : list.length === 0 ? (
          <div style={{ fontFamily:"var(--font-label)", fontSize:11, color:T.muted, textAlign:"center", padding:"24px 0" }}>Nessuna ora registrata in questo mese.</div>
        ) : (
          <>
            <div style={{ fontFamily:"var(--font-label)", fontSize:10, letterSpacing:"0.2em", textTransform:"uppercase", color:T.muted, marginBottom:8 }}>
              {list.length} {list.length === 1 ? "progetto" : "progetti"} · {formatOre(list.reduce((s, p) => s + p.hours, 0))}
            </div>
            <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:T.radiusSm, overflow:"hidden" }}>
              {list.map((p, i) => (
                <div key={p.name} style={{ display:"flex", alignItems:"baseline", justifyContent:"space-between", gap:12, padding:"10px 14px", borderTop: i ? `0.5px solid ${T.borderMd}` : "none", userSelect:"text" }}>
                  <div style={{ minWidth:0 }}>
                    <div style={{ fontFamily:"var(--font-ui)", fontSize:13, fontWeight:600, color:T.ink }}>{p.name}</div>
                    {p.client && <div style={{ fontFamily:"var(--font-ui)", fontSize:11, color:T.muted, marginTop:2 }}>{p.client}</div>}
                  </div>
                  <div style={{ fontFamily:"var(--font-label)", fontSize:11, color:T.navy, whiteSpace:"nowrap" }}>{formatOre(p.hours)}</div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </ModalShell>
  );
}

// ── ESPORTA CSV ──────────────────────────────────────────────────
// Prima di scaricare: scelta del periodo (settimana / mese / anno) e filtri
// per utente e progetto.
export function ExportCsvModal({ studioId, projectMap, memberMap, initial, onClose }) {
  const { T } = useTheme();
  const S = useStyles();
  const toast = useToast();
  const now = new Date();
  const [kind, setKind] = useState(initial?.kind || "month"); // week | month | year
  const [weekRef, setWeekRef] = useState(initial?.weekRef || now);
  const [year, setYear] = useState(initial?.year ?? now.getFullYear());
  const [month, setMonth] = useState(initial?.month ?? now.getMonth());
  const [userId, setUserId] = useState("");
  const [projectId, setProjectId] = useState("");
  const [sortBy, setSortBy] = useState("data"); // data | utente | progetto
  const [busy, setBusy] = useState(false);

  const years = useMemo(() => {
    const cy = now.getFullYear();
    return Array.from({ length: 7 }, (_, i) => cy + 1 - i);
  }, []);

  const members = useMemo(() => Object.entries(memberMap).map(([id, name]) => ({ id, name: name || "—" })).sort((a, b) => a.name.localeCompare(b.name, "it")), [memberMap]);
  const projects = useMemo(() => Object.entries(projectMap).map(([id, p]) => ({ id, name: p?.name || "—" })).sort((a, b) => a.name.localeCompare(b.name, "it")), [projectMap]);

  const range = useMemo(() => {
    if (kind === "week") return weekRange(weekRef);
    if (kind === "year") return { start: `${year}-01-01`, end: `${year}-12-31` };
    return monthRange(year, month);
  }, [kind, weekRef, year, month]);

  const periodTag = kind === "week" ? `settimana-${range.start}` : kind === "year" ? `${year}` : `${year}-${String(month + 1).padStart(2, "0")}`;

  const download = useCallback(async () => {
    if (!studioId) return;
    setBusy(true);
    try {
      // Supabase restituisce al massimo 1000 righe per richiesta: su un anno
      // intero si superano, quindi si legge a pagine
      const PAGE = 1000;
      const rows = [];
      for (let from = 0; ; from += PAGE) {
        let q = supabase.from("timesheet").select("*")
          .eq("studio", studioId).is("deleted_at", null)
          .gte("date", range.start).lte("date", range.end);
        if (userId) q = q.eq("team_member", userId);
        if (projectId) q = q.eq("project_id", projectId);
        const { data, error } = await q.order("date", { ascending: true }).order("id", { ascending: true }).range(from, from + PAGE - 1);
        if (error) throw error;
        rows.push(...(data ?? []));
        if (!data || data.length < PAGE) break;
      }
      if (!rows.length) { toast?.("Nessuna ora nel periodo con questi filtri", "warning"); return; }

      const pName = r => projectMap[r.project_id]?.name || r.project_name || "Senza progetto";
      const pClient = r => projectMap[r.project_id]?.client || r.project_client || "";
      const uName = r => memberMap[r.team_member] || r.user_name || "—";
      const cmp = (a, b) => a.localeCompare(b, "it");
      const sorted = [...rows].sort((a, b) => {
        if (sortBy === "utente") return cmp(uName(a), uName(b)) || cmp(a.date, b.date);
        if (sortBy === "progetto") return cmp(pName(a), pName(b)) || cmp(a.date, b.date);
        return cmp(a.date, b.date);
      });

      const headers = ["data", "progetto", "cliente", "utente", "ore", "note"];
      const lines = [headers.join(","), ...sorted.map(r => [r.date, pName(r), pClient(r), uName(r), r.hours, r.notes || r.note].map(csvEscape).join(","))];
      // BOM: Excel apre correttamente gli accenti
      const blob = new Blob(["﻿" + lines.join("\n")], { type: "text/csv;charset=utf-8;" });
      const parts = ["report", periodTag];
      if (userId) parts.push(slug(memberMap[userId]));
      if (projectId) parts.push(slug(projectMap[projectId]?.name));
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = `${parts.filter(Boolean).join("-")}.csv`;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      onClose();
    } catch (e) {
      toast?.(e.message || "Errore durante l'esportazione", "error");
    } finally {
      setBusy(false);
    }
  }, [studioId, range, userId, projectId, sortBy, projectMap, memberMap, periodTag, onClose, toast]);

  return (
    <ModalShell
      title="Esporta CSV"
      subtitle={`Dal ${range.start.split("-").reverse().join("/")} al ${range.end.split("-").reverse().join("/")}`}
      onClose={onClose}
      footer={<>
        <button onClick={onClose} style={S.secondary}>Annulla</button>
        <button onClick={download} disabled={busy} style={{ ...S.primary, opacity: busy ? 0.6 : 1 }}>{busy ? "Preparazione…" : "Scarica CSV"}</button>
      </>}
    >
      <span style={S.label}>Periodo</span>
      <SlidingTabs
        fullWidth
        tabs={[{ key:"week", label:"Settimana" }, { key:"month", label:"Mese" }, { key:"year", label:"Anno" }]}
        active={kind}
        onChange={setKind}
      />
      <div style={{ marginTop:12 }}>
        {kind === "week" && (
          <PeriodNav
            label={weekLabel(weekRef)}
            onPrev={() => setWeekRef(w => { const d = new Date(w); d.setDate(d.getDate() - 7); return d; })}
            onNext={() => setWeekRef(w => { const d = new Date(w); d.setDate(d.getDate() + 7); return d; })}
          />
        )}
        {kind === "month" && (
          <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr", gap:8 }}>
            <select value={month} onChange={e => setMonth(Number(e.target.value))} style={S.select}>
              {MONTHS.map((m, i) => <option key={m} value={i}>{m}</option>)}
            </select>
            <select value={year} onChange={e => setYear(Number(e.target.value))} style={S.select}>
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        )}
        {kind === "year" && (
          <select value={year} onChange={e => setYear(Number(e.target.value))} style={S.select}>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        )}
      </div>

      <div style={S.section}>
        <span style={S.label}>Utente</span>
        <select value={userId} onChange={e => setUserId(e.target.value)} style={S.select}>
          <option value="">Tutti gli utenti</option>
          {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
      </div>

      <div style={S.section}>
        <span style={S.label}>Progetto</span>
        <select value={projectId} onChange={e => setProjectId(e.target.value)} style={S.select}>
          <option value="">Tutti i progetti</option>
          {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>

      <div style={S.section}>
        <span style={S.label}>Ordina per</span>
        <SlidingTabs
          fullWidth
          tabs={[{ key:"data", label:"Data" }, { key:"utente", label:"Utente" }, { key:"progetto", label:"Progetto" }]}
          active={sortBy}
          onChange={setSortBy}
        />
      </div>
    </ModalShell>
  );
}
