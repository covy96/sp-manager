import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { usePageTitleOnMount } from "../../hooks/usePageTitle";
import { useStudio } from "../../hooks/useStudio";
import { supabase } from "../../lib/supabase";
import { useTheme } from '../../contexts/ThemeContext';

function currency(v) {
  const n = Number(v); return isNaN(n) ? "—" : n.toLocaleString("it-IT", { style: "currency", currency: "EUR" });
}

export default function CommesseArchiviatePage() {
  const { T } = useTheme();
  usePageTitleOnMount("Commesse Archiviate");
  const navigate = useNavigate();
  const { studioId } = useStudio();

  const [commesse, setCommesse]     = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState("");
  const [restoring, setRestoring]   = useState(null);

  useEffect(() => { if (studioId) loadData(); }, [studioId]);

  const loadData = async () => {
    setLoading(true); setError("");
    const { data, error: e } = await supabase.from("commesse").select("*").eq("studio", studioId).eq("archived", true).order("created_at", { ascending: false });
    if (e) setError(e.message); else setCommesse(data || []);
    setLoading(false);
  };

  const handleUnarchive = async id => {
    setRestoring(id);
    const { error: e } = await supabase.from("commesse").update({ archived: false }).eq("id", id);
    if (e) alert("Errore: " + e.message); else setCommesse(p => p.filter(c => c.id !== id));
    setRestoring(null);
  };

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: T.muted }}>Caricamento...</div>
  );

  return (
    <div style={{ maxWidth: 700 }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 18, fontWeight: 600, color: T.ink, letterSpacing: '-0.02em', marginBottom: 4 }}>Commesse Archiviate</div>
        <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: T.muted }}>Commesse archiviate non più attive</div>
      </div>

      {error && <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: T.red, marginBottom: 14 }}>{error}</div>}

      {commesse.length === 0 ? (
        <div style={{ background: T.surface, border: `0.5px solid ${T.border}`, padding: '48px 0', textAlign: 'center' }}>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: T.muted, marginBottom: 16 }}>Nessuna commessa archiviata.</div>
          <button onClick={() => navigate("/commesse")} style={{ background: T.navy, color: T.bg, border: 'none', fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '8px 18px', cursor: 'pointer' }}>Vai alle Commesse</button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {commesse.map(c => (
            <div key={c.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: T.surface, border: `0.5px solid ${T.border}`, padding: '14px 18px', flexWrap: 'wrap', gap: 12 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 4 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: T.ink }}>{c.nome_commessa || "Commessa senza nome"}</div>
                  {c.numero_offerta && (
                    <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, letterSpacing: '0.1em', color: T.muted, border: `0.5px solid ${T.border}`, padding: '1px 6px' }}>{c.numero_offerta}</span>
                  )}
                </div>
                <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: T.muted, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  <span>{c.cliente || "—"}</span>
                  <span>{currency(c.importo_offerta_base)}</span>
                  {c.data_commessa && <span>{new Date(c.data_commessa).toLocaleDateString("it-IT")}</span>}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                <button onClick={() => navigate(`/impostazioni/commesse-archiviate/${c.id}`)} style={{ padding: '6px 12px', background: T.bg, border: `0.5px solid ${T.borderMd}`, fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: T.muted, letterSpacing: '0.05em', textTransform: 'uppercase', cursor: 'pointer' }}>Visualizza</button>
                <button onClick={() => handleUnarchive(c.id)} disabled={restoring === c.id} style={{ padding: '6px 12px', background: 'transparent', border: `0.5px solid ${T.navy}`, fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: T.navy, letterSpacing: '0.05em', textTransform: 'uppercase', cursor: restoring === c.id ? 'not-allowed' : 'pointer', opacity: restoring === c.id ? 0.6 : 1 }}>
                  {restoring === c.id ? "..." : "Ripristina"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
