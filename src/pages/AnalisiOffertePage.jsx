import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { usePageTitleOnMount } from "../hooks/usePageTitle";
import { useStudio } from "../hooks/useStudio";
import { useTheme } from "../contexts/ThemeContext";
import { usePermissions } from "../hooks/usePermissions";
import { usePlan } from "../hooks/usePlan";
import { supabase } from "../lib/supabase";

function currency(v) {
  return new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR", maximumFractionDigits: 2 }).format(Number(v) || 0);
}

const STATI = {
  offerta:   { label: "Offerta",   color: "#854d0e", bg: "#fefce8" },
  accettata: { label: "Accettata", color: "#1a6b3c", bg: "#f0fdf4" },
  rifiutata: { label: "Rifiutata", color: "#b91c1c", bg: "#fef2f2" },
};

export default function AnalisiOffertePage() {
  usePageTitleOnMount("Analisi Offerte");
  const navigate = useNavigate();
  const { T } = useTheme();
  const { studioId } = useStudio();
  const permissions = usePermissions();
  const { plan } = usePlan();

  const [offerte, setOfferte]     = useState([]);
  const [commesse, setCommesse]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [annoFiltro, setAnnoFiltro] = useState(new Date().getFullYear());
  const [sortCol, setSortCol]     = useState("totaleOfferte");
  const [sortAsc, setSortAsc]     = useState(false);
  const [search, setSearch]       = useState("");

  const mono = { fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)" };

  useEffect(() => {
    if (!studioId) return;
    const load = async () => {
      const [{ data: off }, { data: comm }] = await Promise.all([
        supabase.from("offerte").select("*").eq("studio", studioId).eq("archived", false).is("deleted_at", null),
        supabase.from("commesse").select("id,numero_offerta,importo_totale,data_commessa").eq("studio", studioId).is("deleted_at", null),
      ]);
      setOfferte(off ?? []);
      setCommesse(comm ?? []);
      setLoading(false);
    };
    load();
  }, [studioId]);

  const anni = useMemo(() => {
    const set = new Set(offerte.map(o => new Date(o.data_offerta || o.created_at).getFullYear()).filter(Boolean));
    return Array.from(set).sort((a, b) => b - a);
  }, [offerte]);

  // mappa numero_offerta -> importo_totale commessa
  const commessaByNumero = useMemo(() => {
    const m = {};
    for (const c of commesse) {
      if (c.numero_offerta) m[c.numero_offerta] = (m[c.numero_offerta] || 0) + (Number(c.importo_totale) || 0);
    }
    return m;
  }, [commesse]);

  // Aggrega per voce
  const righeVoci = useMemo(() => {
    const map = {}; // nome voce -> { nOfferte, totaleOfferte, nAccettate, totaleAccettate, totaleCommesse }

    const offFiltrate = annoFiltro === 0
      ? offerte
      : offerte.filter(o => new Date(o.data_offerta || o.created_at).getFullYear() === annoFiltro);

    for (const off of offFiltrate) {
      const sconto = Number(off.sconto) || 0;
      const voci = Array.isArray(off.voci) && off.voci.length > 0
        ? off.voci
        : [{ nome: off.nome_offerta || "Prestazione", prezzo: Number(off.importo_offerta_base) || 0, attiva: true }];

      // risali ai prezzi lordi se erano stati salvati scontati
      const lordiSalvati = voci.filter(v => v.attiva !== false).reduce((s, v) => s + Number(v.prezzo || 0), 0);
      const alreadyDisc = sconto > 0 && Math.abs(lordiSalvati - Number(off.importo_offerta_base)) < 0.5;
      const vociNorm = alreadyDisc
        ? voci.map(v => ({ ...v, prezzo: Math.round(Number(v.prezzo || 0) / (1 - sconto / 100) * 100) / 100 }))
        : voci;

      const isAccettata = off.stato === "accettata";
      const importoCommessa = isAccettata ? (commessaByNumero[off.numero_offerta] || 0) : 0;

      for (const v of vociNorm) {
        if (v.attiva === false) continue;
        const nome = (v.nome || "—").trim();
        if (!map[nome]) map[nome] = { nOfferte: 0, totaleOfferte: 0, nAccettate: 0, totaleAccettate: 0, totaleCommesse: 0 };
        const ent = map[nome];
        ent.nOfferte++;
        ent.totaleOfferte += Number(v.prezzo || 0);
        if (isAccettata) {
          ent.nAccettate++;
          // prezzo voce scontato
          const prezzoScontato = sconto > 0 ? Math.round(Number(v.prezzo || 0) * (1 - sconto / 100) * 100) / 100 : Number(v.prezzo || 0);
          ent.totaleAccettate += prezzoScontato;
        }
      }
      // totaleCommesse: ripartisci proporzionalmente per voce (se accettata)
      if (isAccettata && importoCommessa > 0) {
        const lordo = vociNorm.filter(v => v.attiva !== false).reduce((s, v) => s + Number(v.prezzo || 0), 0);
        for (const v of vociNorm) {
          if (v.attiva === false) continue;
          const nome = (v.nome || "—").trim();
          const quota = lordo > 0 ? (Number(v.prezzo || 0) / lordo) : (1 / vociNorm.filter(x => x.attiva !== false).length);
          map[nome].totaleCommesse += importoCommessa * quota;
        }
      }
    }

    return Object.entries(map).map(([nome, d]) => ({
      nome,
      ...d,
      tassoConversione: d.nOfferte > 0 ? Math.round((d.nAccettate / d.nOfferte) * 100) : 0,
    }));
  }, [offerte, commessaByNumero, annoFiltro]);

  const sorted = useMemo(() => {
    const filtered = search
      ? righeVoci.filter(r => r.nome.toLowerCase().includes(search.toLowerCase()))
      : righeVoci;
    return [...filtered].sort((a, b) => {
      const va = a[sortCol]; const vb = b[sortCol];
      return sortAsc ? (va > vb ? 1 : -1) : (va < vb ? 1 : -1);
    });
  }, [righeVoci, sortCol, sortAsc, search]);

  const totals = useMemo(() => sorted.reduce((acc, r) => ({
    nOfferte: acc.nOfferte + r.nOfferte,
    totaleOfferte: acc.totaleOfferte + r.totaleOfferte,
    nAccettate: acc.nAccettate + r.nAccettate,
    totaleAccettate: acc.totaleAccettate + r.totaleAccettate,
    totaleCommesse: acc.totaleCommesse + r.totaleCommesse,
  }), { nOfferte: 0, totaleOfferte: 0, nAccettate: 0, totaleAccettate: 0, totaleCommesse: 0 }), [sorted]);

  const handleSort = col => {
    if (sortCol === col) setSortAsc(p => !p);
    else { setSortCol(col); setSortAsc(false); }
  };

  if (!permissions.isProjectManager) return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: 300, gap: 16 }}>
      <div style={{ ...mono, fontSize: 11, color: T.muted, textAlign: "center" }}>Questa sezione è riservata al project manager.</div>
    </div>
  );

  if (plan.id !== "pro") return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: 300, gap: 16 }}>
      <div style={{ fontSize: 32 }}>🔒</div>
      <div style={{ fontSize: 16, fontWeight: 600, color: T.ink }}>Funzionalità Pro</div>
      <div style={{ ...mono, fontSize: 11, color: T.muted, textAlign: "center", maxWidth: 360 }}>La pagina Analisi Offerte è disponibile solo per il piano Pro.<br />Fai l'upgrade per accedere ai report economici.</div>
      <button onClick={() => navigate("/impostazioni/piano")} style={{ background: T.navy, color: "#EEF1F6", border: "none", ...mono, fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", padding: "10px 24px", cursor: "pointer" }}>Vedi piani →</button>
    </div>
  );

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 240, ...mono, fontSize: 11, color: T.muted }}>Caricamento...</div>
  );

  const thStyle = (col) => ({
    ...mono, fontSize: 10, color: T.muted, textTransform: "uppercase", letterSpacing: "0.08em",
    padding: "8px 12px", textAlign: col === "nome" ? "left" : "right",
    cursor: "pointer", userSelect: "none", whiteSpace: "nowrap",
    borderBottom: `1px solid ${T.border}`,
  });
  const tdStyle = (right) => ({
    ...mono, fontSize: 11, color: T.ink,
    padding: "9px 12px", textAlign: right ? "right" : "left",
    borderBottom: `0.5px solid ${T.border}`,
  });
  const arrow = col => sortCol === col ? (sortAsc ? " ↑" : " ↓") : "";

  // KPI cards
  const offFiltrate = annoFiltro === 0
    ? offerte
    : offerte.filter(o => new Date(o.data_offerta || o.created_at).getFullYear() === annoFiltro);
  const nTotOfferte = offFiltrate.length;
  const nAccettate  = offFiltrate.filter(o => o.stato === "accettata").length;
  const nRifiutate  = offFiltrate.filter(o => o.stato === "rifiutata").length;
  const tassoGlobale = nTotOfferte > 0 ? Math.round(nAccettate / nTotOfferte * 100) : 0;
  const totOfferte  = offFiltrate.reduce((s, o) => s + (Number(o.importo_offerta_base) || 0), 0);
  const totCommesse = offFiltrate.filter(o => o.stato === "accettata").reduce((s, o) => s + (commessaByNumero[o.numero_offerta] || 0), 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, paddingBottom: 40 }}>

      {/* Header + filtri */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <div style={{ ...mono, fontSize: 11, color: T.muted, marginRight: "auto" }}>Analisi per voce offerta</div>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Cerca voce…"
          style={{ ...mono, fontSize: 11, padding: "5px 10px", border: `1px solid ${T.border}`, background: T.surface, color: T.ink, outline: "none", width: 160 }}
        />
        <select
          value={annoFiltro}
          onChange={e => setAnnoFiltro(Number(e.target.value))}
          style={{ ...mono, fontSize: 11, padding: "5px 10px", border: `1px solid ${T.border}`, background: T.surface, color: T.ink, cursor: "pointer" }}
        >
          <option value={0}>Tutti gli anni</option>
          {anni.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
      </div>

      {/* KPI cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10 }}>
        {[
          { label: "Offerte totali",     value: nTotOfferte,              fmt: v => v },
          { label: "Accettate",          value: nAccettate,               fmt: v => v },
          { label: "Rifiutate",          value: nRifiutate,               fmt: v => v },
          { label: "Tasso conversione",  value: tassoGlobale,             fmt: v => `${v}%` },
          { label: "Valore offerte",     value: totOfferte,               fmt: currency },
          { label: "Valore commesse",    value: totCommesse,              fmt: currency },
        ].map(k => (
          <div key={k.label} style={{ background: T.surface, border: `1px solid ${T.border}`, padding: "14px 16px" }}>
            <div style={{ ...mono, fontSize: 9, color: T.muted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>{k.label}</div>
            <div style={{ ...mono, fontSize: 18, fontWeight: 700, color: T.ink }}>{k.fmt(k.value)}</div>
          </div>
        ))}
      </div>

      {/* Tabella voci */}
      <div style={{ background: T.surface, border: `1px solid ${T.border}`, overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={thStyle("nome")} onClick={() => handleSort("nome")}>Voce{arrow("nome")}</th>
              <th style={thStyle("nOfferte")} onClick={() => handleSort("nOfferte")}># Offerte{arrow("nOfferte")}</th>
              <th style={thStyle("totaleOfferte")} onClick={() => handleSort("totaleOfferte")}>Tot. offerto{arrow("totaleOfferte")}</th>
              <th style={thStyle("nAccettate")} onClick={() => handleSort("nAccettate")}># Acc.{arrow("nAccettate")}</th>
              <th style={thStyle("tassoConversione")} onClick={() => handleSort("tassoConversione")}>Conv.%{arrow("tassoConversione")}</th>
              <th style={thStyle("totaleAccettate")} onClick={() => handleSort("totaleAccettate")}>Tot. accettato{arrow("totaleAccettate")}</th>
              <th style={thStyle("totaleCommesse")} onClick={() => handleSort("totaleCommesse")}>Tot. commesse{arrow("totaleCommesse")}</th>
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 && (
              <tr><td colSpan={7} style={{ ...mono, fontSize: 11, color: T.muted, textAlign: "center", padding: "32px 0" }}>Nessun dato</td></tr>
            )}
            {sorted.map(r => (
              <tr key={r.nome} style={{ background: "transparent" }}>
                <td style={tdStyle(false)}>{r.nome}</td>
                <td style={tdStyle(true)}>{r.nOfferte}</td>
                <td style={tdStyle(true)}>{currency(r.totaleOfferte)}</td>
                <td style={tdStyle(true)}>{r.nAccettate}</td>
                <td style={{ ...tdStyle(true), color: r.tassoConversione >= 50 ? "#1a6b3c" : r.tassoConversione > 0 ? "#854d0e" : T.muted }}>
                  {r.tassoConversione}%
                </td>
                <td style={tdStyle(true)}>{currency(r.totaleAccettate)}</td>
                <td style={{ ...tdStyle(true), fontWeight: 600 }}>{r.totaleCommesse > 0 ? currency(r.totaleCommesse) : "—"}</td>
              </tr>
            ))}
          </tbody>
          {sorted.length > 0 && (
            <tfoot>
              <tr style={{ background: T.surface2 }}>
                <td style={{ ...tdStyle(false), fontWeight: 600, ...mono, fontSize: 10, color: T.muted, textTransform: "uppercase" }}>Totale</td>
                <td style={{ ...tdStyle(true), fontWeight: 600 }}>{totals.nOfferte}</td>
                <td style={{ ...tdStyle(true), fontWeight: 600 }}>{currency(totals.totaleOfferte)}</td>
                <td style={{ ...tdStyle(true), fontWeight: 600 }}>{totals.nAccettate}</td>
                <td style={{ ...tdStyle(true), fontWeight: 600, color: T.muted }}>
                  {totals.nOfferte > 0 ? Math.round(totals.nAccettate / totals.nOfferte * 100) : 0}%
                </td>
                <td style={{ ...tdStyle(true), fontWeight: 600 }}>{currency(totals.totaleAccettate)}</td>
                <td style={{ ...tdStyle(true), fontWeight: 700 }}>{totals.totaleCommesse > 0 ? currency(totals.totaleCommesse) : "—"}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      <div style={{ ...mono, fontSize: 10, color: T.muted }}>
        * "Tot. commesse" è il valore della commessa generata dall'offerta, ripartito proporzionalmente per voce.
      </div>
    </div>
  );
}
