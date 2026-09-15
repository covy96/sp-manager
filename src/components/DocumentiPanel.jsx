import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import { useTheme } from "../contexts/ThemeContext";
import { useBodyScrollLock } from "../hooks/useBodyScrollLock";
import { useEscKey } from "../hooks/useEscKey";

// Centro documenti del progetto: vista unificata (sola lettura) di offerte,
// capitolati, pratiche edilizie e report di cantiere, con tipo, titolo, data e
// numero di versioni. Le offerte sono legate alle commesse del progetto.

const mono = "'IBM Plex Mono', monospace";
const fmtData = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d)) return String(iso).slice(0, 10);
  const p = (n) => String(n).padStart(2, "0");
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}`;
};

// definizione dei tipi di documento e come leggerli
const TIPI = [
  {
    key: "offerte", label: "Offerte", color: "#0369a1",
    async load({ commessaIds }) {
      if (!commessaIds.length) return [];
      const { data } = await supabase.from("offerte")
        .select("id, nome_offerta, nome, stato, data, created_at")
        .in("commessa_id", commessaIds).eq("archived", false).is("deleted_at", null)
        .order("created_at", { ascending: false });
      return (data || []).map((o) => ({
        id: o.id, titolo: o.nome_offerta || o.nome || "Offerta",
        stato: o.stato || "", data: o.data || o.created_at,
      }));
    },
  },
  {
    key: "capitolati", label: "Capitolato", color: "#1F3864",
    async load({ projectId }) {
      const { data } = await supabase.from("capitolati")
        .select("id, nome, versioni, updated_at, created_at")
        .eq("project_id", projectId).is("deleted_at", null)
        .order("created_at", { ascending: false });
      return (data || []).map((c) => ({
        id: c.id, titolo: c.nome || "Capitolato",
        versioni: Array.isArray(c.versioni) ? c.versioni.length : 0,
        data: c.updated_at || c.created_at,
      }));
    },
  },
  {
    key: "pratiche", label: "Pratiche edilizie", color: "#b45309",
    async load({ projectId }) {
      const { data } = await supabase.from("pratiche_edilizie")
        .select("id, tipo_pratica, protocollo, stato, numero, updated_at, created_at")
        .eq("project_id", projectId).order("created_at", { ascending: false });
      return (data || []).map((p) => ({
        id: p.id,
        titolo: p.tipo_pratica || p.numero || p.protocollo || "Pratica",
        stato: p.stato || "", data: p.updated_at || p.created_at,
      }));
    },
  },
  {
    key: "report", label: "Report cantiere", color: "#166534",
    async load({ projectId }) {
      const { data } = await supabase.from("report_cantiere")
        .select("id, numero, titolo, data, created_at")
        .eq("project_id", projectId).is("deleted_at", null)
        .order("numero", { ascending: false });
      return (data || []).map((r) => ({
        id: r.id,
        titolo: r.titolo || (r.numero != null ? `Report n. ${r.numero}` : "Report"),
        data: r.data || r.created_at,
      }));
    },
  },
];

export default function DocumentiPanel({ projectId, studioId, project, commesse }) {
  const { T } = useTheme();
  const [open, setOpen] = useState(false);
  useBodyScrollLock(open);
  useEscKey(() => setOpen(false), open);

  const [loading, setLoading] = useState(false);
  const [gruppi, setGruppi] = useState([]); // [{key,label,color,items:[]}]
  const [count, setCount] = useState(0);    // badge: totale documenti

  const commessaIds = useMemo(() => (commesse || []).map((c) => c.id).filter(Boolean), [commesse]);

  const load = async () => {
    setLoading(true);
    try {
      const ctx = { projectId, studioId, commessaIds };
      const risultati = await Promise.all(TIPI.map((t) => t.load(ctx).catch(() => [])));
      const g = TIPI.map((t, i) => ({ key: t.key, label: t.label, color: t.color, items: risultati[i] }));
      setGruppi(g);
      setCount(g.reduce((s, x) => s + x.items.length, 0));
    } finally {
      setLoading(false);
    }
  };

  // badge: conteggio caricato all'avvio e ad ogni chiusura del pannello
  useEffect(() => {
    if (open) return;
    let alive = true;
    (async () => {
      const ctx = { projectId, studioId, commessaIds };
      const risultati = await Promise.all(TIPI.map((t) => t.load(ctx).catch(() => [])));
      if (alive) setCount(risultati.reduce((s, x) => s + x.length, 0));
    })();
    return () => { alive = false; };
  }, [open, projectId, commessaIds]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { if (open) load(); }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <button onClick={() => setOpen(true)} style={{
        display: "flex", alignItems: "center", gap: 8, height: 34, padding: "0 14px",
        border: `0.5px solid ${count > 0 ? T.navy : T.borderMd}`, borderRadius: T.radiusSm,
        background: count > 0 ? T.navyLight : "transparent",
        cursor: "pointer", fontFamily: mono, fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase",
      }}>
        <span style={{ color: count > 0 ? T.navy : T.ink, fontWeight: count > 0 ? 600 : 400 }}>▦ Documenti</span>
        {count > 0
          ? <span style={{ fontFamily: mono, fontSize: 9, color: T.navy, border: `0.5px solid ${T.navy}`, borderRadius: T.radiusSm, padding: "1px 6px" }}>{count}</span>
          : <span style={{ fontFamily: mono, fontSize: 9, color: T.muted }}>+ Apri</span>}
      </button>

      {open && (
        <div style={{ position: "fixed", inset: 0, zIndex: 70, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.62)", padding: 12 }}
          onClick={() => setOpen(false)}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 760, height: "88vh", display: "flex", flexDirection: "column", background: T.glassBg, backdropFilter: T.blur, WebkitBackdropFilter: T.blur, border: `1px solid ${T.glassBorder}`, borderRadius: T.radiusLg, overflow: "hidden", boxShadow: "0 24px 80px rgba(0,0,0,0.35)" }}>
            <div style={{ padding: "16px 20px", borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexShrink: 0 }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 600, color: T.ink }}>Documenti</div>
                <div style={{ fontFamily: mono, fontSize: 10, color: T.muted, marginTop: 2 }}>
                  {project?.name || "Progetto"} · {count} {count === 1 ? "documento" : "documenti"}
                </div>
              </div>
              <button onClick={() => setOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", color: T.muted, fontSize: 22, lineHeight: 1 }}>×</button>
            </div>

            <div style={{ flex: 1, overflowY: "auto", padding: 20, minHeight: 0 }}>
              {loading ? (
                <div style={{ textAlign: "center", marginTop: 40, color: T.muted, fontFamily: mono, fontSize: 12 }}>Carico…</div>
              ) : count === 0 ? (
                <div style={{ textAlign: "center", marginTop: 40, color: T.muted, fontFamily: mono, fontSize: 12 }}>Nessun documento per questo progetto.</div>
              ) : (
                <div style={{ maxWidth: 640, margin: "0 auto", display: "flex", flexDirection: "column", gap: 18 }}>
                  {gruppi.filter((g) => g.items.length > 0).map((g) => (
                    <div key={g.key}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                        <span style={{ width: 8, height: 8, borderRadius: 2, background: g.color, flexShrink: 0 }} />
                        <span style={{ fontFamily: mono, fontSize: 11, fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase", color: T.ink }}>{g.label}</span>
                        <span style={{ fontFamily: mono, fontSize: 10, color: T.muted }}>{g.items.length}</span>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        {g.items.map((it) => (
                          <div key={it.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 13px", border: `0.5px solid ${T.border}`, borderRadius: T.radiusSm, background: T.surface }}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 12.5, fontWeight: 600, color: T.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{it.titolo}</div>
                              <div style={{ fontFamily: mono, fontSize: 10, color: T.muted, marginTop: 2, display: "flex", gap: 8, flexWrap: "wrap" }}>
                                {it.data ? <span>{fmtData(it.data)}</span> : null}
                                {it.versioni != null ? <span>· {it.versioni} {it.versioni === 1 ? "versione" : "versioni"}</span> : null}
                                {it.stato ? <span>· {it.stato}</span> : null}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ padding: "10px 20px", borderTop: `1px solid ${T.border}`, flexShrink: 0, fontFamily: mono, fontSize: 9.5, color: T.muted, textAlign: "center" }}>
              Vista di sola lettura · apri offerte, capitolati, pratiche e report dai rispettivi pannelli
            </div>
          </div>
        </div>
      )}
    </>
  );
}
