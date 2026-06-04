import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useStudio } from "../hooks/useStudio";
import { useTheme } from '../contexts/ThemeContext';
import { useIsMobile } from "../hooks/useIsMobile";

function currency(v) {
  return new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR", maximumFractionDigits: 2 }).format(Number(v) || 0);
}
function formatDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("it-IT");
}
function isScaduta(dataScadenza, pagato) {
  if (!dataScadenza || pagato) return false;
  const oggi = new Date(); oggi.setHours(0,0,0,0);
  const scad = new Date(dataScadenza); scad.setHours(0,0,0,0);
  return scad < oggi;
}
function getStato(p, T) {
  if (p.pagato) return { label: "Pagata", color: T.green };
  if (isScaduta(p.data_scadenza, p.pagato)) return { label: "Scaduta", color: '#b45309' };
  return { label: "In attesa", color: T.muted };
}

function KpiCard({ label, value, note, color }) {
  const { T } = useTheme();
  return (
    <div style={{ background: T.surface, border: `0.5px solid ${T.border}`, padding: '18px 20px' }}>
      <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, letterSpacing: '0.25em', textTransform: 'uppercase', color: T.muted, marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.03em', color: color || T.ink, fontFamily: "'Space Grotesk', sans-serif", marginBottom: 4 }}>{value}</div>
      {note && <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: T.muted }}>{note}</div>}
    </div>
  );
}

function SortBtn({ field, label, sortField, sortDesc, onSort }) {
  const { T } = useTheme();
  const active = sortField === field;
  return (
    <button onClick={() => onSort(field)} style={{
      background: 'none', border: 'none', cursor: 'pointer', padding: 0,
      fontFamily: "'IBM Plex Mono', monospace", fontSize: 8, letterSpacing: '0.2em', textTransform: 'uppercase',
      color: active ? T.navy : T.muted, display: 'inline-flex', alignItems: 'center', gap: 4,
    }}>
      {label} {active && <span style={{ fontSize: 9 }}>{sortDesc ? '↓' : '↑'}</span>}
    </button>
  );
}

export default function ProformaPage() {
  const { T } = useTheme();
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const { studioId } = useStudio();

  const [proformaList, setProformaList] = useState([]);
  const [commesseMap, setCommesseMap]   = useState({});
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState("");
  const [mostraPagate, setMostraPagate] = useState(false);
  const [annoFiltro, setAnnoFiltro]     = useState(new Date().getFullYear());
  const [sortField, setSortField]       = useState("data_creazione");
  const [sortDesc, setSortDesc]         = useState(true);

  useEffect(() => {
    const loadData = async () => {
      if (!studioId) return;
      setLoading(true); setError("");
      try {
        const { data: proforma, error: pErr } = await supabase
          .from("proforma").select("*").eq("studio", studioId)
          .order("data_creazione", { ascending: false });
        if (pErr) { setError(pErr.message); setLoading(false); return; }
        const pData = proforma || [];
        setProformaList(pData);
        const ids = [...new Set(pData.map(p => p.commessa_id).filter(Boolean))];
        if (ids.length > 0) {
          const { data: commesse } = await supabase.from("commesse").select("id,nome_commessa,cliente").in("id", ids);
          setCommesseMap(Object.fromEntries((commesse || []).map(c => [c.id, c])));
        }
      } catch (e) { setError(e.message); }
      finally { setLoading(false); }
    };
    loadData();
  }, [studioId]);

  const anniDisponibili = useMemo(() => {
    const anni = new Set();
    anni.add(new Date().getFullYear());
    proformaList.forEach(p => {
      const d = p.data_creazione || p.created_at;
      if (d) {
        const y = new Date(d).getFullYear();
        if (!isNaN(y) && y >= 2000 && y <= 2100) anni.add(y);
      }
    });
    return Array.from(anni).sort((a,b)=>b-a);
  }, [proformaList]);

  const filteredProforma = useMemo(() => {
    let list = mostraPagate ? proformaList : proformaList.filter(p => !p.pagato);
    if (annoFiltro !== 0) {
      list = list.filter(p => {
        const d = p.data_creazione || p.created_at;
        return d && new Date(d).getFullYear() === annoFiltro;
      });
    }
    return [...list].sort((a, b) => {
      let vA = a[sortField], vB = b[sortField];
      if (sortField === "importo_totale") { vA = Number(vA)||0; vB = Number(vB)||0; }
      if (sortField === "data_creazione" || sortField === "data_scadenza") { vA = vA ? new Date(vA).getTime() : 0; vB = vB ? new Date(vB).getTime() : 0; }
      if (sortField === "nome_commessa" || sortField === "cliente") { vA = commesseMap[a.commessa_id]?.[sortField] || ""; vB = commesseMap[b.commessa_id]?.[sortField] || ""; }
      if (vA < vB) return sortDesc ? 1 : -1;
      if (vA > vB) return sortDesc ? -1 : 1;
      return 0;
    });
  }, [proformaList, mostraPagate, annoFiltro, sortField, sortDesc, commesseMap]);

  const stats = useMemo(() => {
    const base = annoFiltro === 0
      ? proformaList
      : proformaList.filter(p => {
          const d = p.data_emissione || p.created_at;
          return d && new Date(d).getFullYear() === annoFiltro;
        });
    const totale = base.reduce((s, p) => s + (Number(p.importo_totale)||0), 0);
    const pagato = base.filter(p => p.pagato).reduce((s, p) => s + (Number(p.importo_totale)||0), 0);
    return { totale, pagato, daIncassare: totale - pagato, count: base.length, countPagate: base.filter(p=>p.pagato).length, countAperte: base.filter(p=>!p.pagato).length };
  }, [proformaList, annoFiltro]);

  const handleSort = field => {
    if (sortField === field) { setSortDesc(p => !p); return; }
    setSortField(field); setSortDesc(true);
  };

  const thSt = { fontFamily: "'IBM Plex Mono', monospace", fontSize: 8, letterSpacing: '0.2em', textTransform: 'uppercase', color: T.muted, padding: '8px 12px', borderBottom: `0.5px solid ${T.border}`, textAlign: 'left', whiteSpace: 'nowrap' };
  const tdSt = { padding: '9px 12px', borderBottom: `0.5px solid ${T.border}`, fontSize: 12, color: T.ink, fontFamily: "'Space Grotesk', sans-serif", verticalAlign: 'middle' };
  const monoSt = { fontFamily: "'IBM Plex Mono', monospace", fontSize: 11 };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.03em', color: T.ink }}>Proforma</div>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <select value={annoFiltro} onChange={e=>setAnnoFiltro(Number(e.target.value))}
            style={{ padding:'4px 8px', border:`0.5px solid ${T.borderMd}`, background:T.surface, color:T.ink, fontFamily:"'IBM Plex Mono', monospace", fontSize:11, cursor:'pointer', outline:'none', appearance:'auto' }}>
            <option value={0}>Tutti gli anni</option>
            {anniDisponibili.map(a=><option key={a} value={a}>{a}</option>)}
          </select>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: T.muted }}>
            <input type="checkbox" checked={mostraPagate} onChange={e => setMostraPagate(e.target.checked)} style={{ accentColor: T.navy, width: 13, height: 13 }} />
            Mostra anche pagate
          </label>
        </div>
      </div>

      {/* KPI */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: 10 }}>
        <KpiCard label="Totale proforma"  value={currency(stats.totale)}       note={`${stats.count} proforma`}           color={T.navy} />
        <KpiCard label="Pagate"           value={currency(stats.pagato)}        note={`${stats.countPagate} pagate`}       color={T.green} />
        <KpiCard label="Da incassare"     value={currency(stats.daIncassare)}   note={`${stats.countAperte} aperte`}       color={T.red} />
      </div>

      {/* Tabella */}
      <div style={{ background: T.surface, border: `0.5px solid ${T.border}`, overflowX: 'auto' }}>
        {loading ? (
          <div style={{ padding: '48px 0', textAlign: 'center', fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: T.muted }}>Caricamento...</div>
        ) : error ? (
          <div style={{ padding: 24, color: T.red, fontSize: 13 }}>{error}</div>
        ) : filteredProforma.length === 0 ? (
          <div style={{ padding: '48px 0', textAlign: 'center', fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: T.muted }}>
            {mostraPagate ? "Nessuna proforma." : "Nessuna proforma da incassare."}
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 700 }}>
            <thead>
              <tr>
                <th style={thSt}><SortBtn field="numero_proforma" label="N° Proforma"    sortField={sortField} sortDesc={sortDesc} onSort={handleSort} /></th>
                <th style={thSt}><SortBtn field="nome_commessa"   label="Commessa"       sortField={sortField} sortDesc={sortDesc} onSort={handleSort} /></th>
                <th style={thSt}><SortBtn field="cliente"         label="Cliente"        sortField={sortField} sortDesc={sortDesc} onSort={handleSort} /></th>
                <th style={thSt}><SortBtn field="importo_totale"  label="Valore"         sortField={sortField} sortDesc={sortDesc} onSort={handleSort} /></th>
                <th style={thSt}><SortBtn field="data_creazione"  label="Data creazione" sortField={sortField} sortDesc={sortDesc} onSort={handleSort} /></th>
                <th style={thSt}><SortBtn field="data_scadenza"   label="Data scadenza"  sortField={sortField} sortDesc={sortDesc} onSort={handleSort} /></th>
                <th style={thSt}>Stato</th>
              </tr>
            </thead>
            <tbody>
              {filteredProforma.map(p => {
                const commessa = commesseMap[p.commessa_id];
                const scaduta = isScaduta(p.data_scadenza, p.pagato);
                const stato = getStato(p, T);
                return (
                  <tr key={p.id} onClick={() => navigate(`/commesse/${p.commessa_id}`)}
                    style={{ cursor: 'pointer', transition: 'background 0.1s' }}
                    onMouseEnter={e => e.currentTarget.style.background = T.bg}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <td style={{ ...tdSt, fontWeight: 600 }}>{p.numero_proforma}</td>
                    <td style={tdSt}>{commessa?.nome_commessa || '—'}</td>
                    <td style={{ ...tdSt, color: T.muted }}>{commessa?.cliente || '—'}</td>
                    <td style={{ ...tdSt, ...monoSt, fontWeight: 600, color: T.navy }}>{currency(p.importo_totale)}</td>
                    <td style={{ ...tdSt, ...monoSt }}>{formatDate(p.data_creazione)}</td>
                    <td style={{ ...tdSt, ...monoSt, color: scaduta ? T.red : T.muted }}>{formatDate(p.data_scadenza)}</td>
                    <td style={tdSt}>
                      <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: stato.color, border: `0.5px solid ${stato.color}`, padding: '2px 7px', whiteSpace: 'nowrap', display: 'inline-block' }}>
                        {stato.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
