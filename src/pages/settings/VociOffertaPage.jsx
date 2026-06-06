import { useEffect, useState } from "react";
import { usePageTitleOnMount } from "../../hooks/usePageTitle";
import { useStudio } from "../../hooks/useStudio";
import { supabase } from "../../lib/supabase";
import { useTheme } from "../../contexts/ThemeContext";

function currency(v) {
  const n = Number(v);
  return isNaN(n) ? "—" : n.toLocaleString("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
}

export default function VociOffertaPage() {
  const { T } = useTheme();
  usePageTitleOnMount("Voci Offerta");
  const { studioId } = useStudio();

  const [voci, setVoci]         = useState([]);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState("");
  const [newNome, setNewNome]   = useState("");
  const [newPrezzo, setNewPrezzo] = useState("");
  const [editId, setEditId]     = useState(null);
  const [editNome, setEditNome] = useState("");
  const [editPrezzo, setEditPrezzo] = useState("");

  const inputSt = { width:"100%", padding:"8px 12px", boxSizing:"border-box", border:`0.5px solid ${T.borderMd}`, borderRadius:T.radiusSm, background:T.surface, color:T.ink, fontSize:13, fontFamily:"'Space Grotesk', sans-serif", outline:"none" };

  useEffect(() => { if (studioId) load(); }, [studioId]);

  const load = async () => {
    setLoading(true);
    const { data, error:e } = await supabase.from("voci_offerta_template").select("*").eq("studio", studioId).order("order", { ascending:true }).order("created_at", { ascending:true });
    if (e) setError(e.message); else setVoci(data||[]);
    setLoading(false);
  };

  const handleAdd = async e => {
    e.preventDefault();
    if (!newNome.trim()) return;
    setSaving(true);
    const { error:insErr } = await supabase.from("voci_offerta_template").insert({
      studio: studioId,
      nome: newNome.trim(),
      prezzo_default: Number(newPrezzo)||0,
      order: voci.length,
    });
    if (insErr) setError(insErr.message);
    else { setNewNome(""); setNewPrezzo(""); await load(); }
    setSaving(false);
  };

  const handleEdit = (v) => { setEditId(v.id); setEditNome(v.nome); setEditPrezzo(String(v.prezzo_default||"")); };
  const handleSaveEdit = async () => {
    if (!editNome.trim()) return;
    setSaving(true);
    const { error:updErr } = await supabase.from("voci_offerta_template").update({ nome:editNome.trim(), prezzo_default:Number(editPrezzo)||0 }).eq("id", editId);
    if (updErr) setError(updErr.message); else { setEditId(null); await load(); }
    setSaving(false);
  };

  const handleDelete = async (id) => {
    if (!confirm("Eliminare questa voce?")) return;
    await supabase.from("voci_offerta_template").delete().eq("id", id);
    await load();
  };

  const handleMoveUp = async (idx) => {
    if (idx===0) return;
    const a=voci[idx-1], b=voci[idx];
    await supabase.from("voci_offerta_template").update({ order:b.order }).eq("id",a.id);
    await supabase.from("voci_offerta_template").update({ order:a.order }).eq("id",b.id);
    await load();
  };

  if (loading) return <div style={{ fontFamily:"'IBM Plex Mono', monospace", fontSize:11, color:T.muted, padding:32 }}>Caricamento...</div>;

  return (
    <div style={{ maxWidth:640 }}>
      <div style={{ marginBottom:24 }}>
        <div style={{ fontSize:18, fontWeight:600, color:T.ink, letterSpacing:"-0.02em", marginBottom:4 }}>Voci Offerta</div>
        <div style={{ fontFamily:"'IBM Plex Mono', monospace", fontSize:10, color:T.muted }}>
          Voci predefinite da usare nella creazione delle offerte. Puoi attivarle/disattivarle e modificare il prezzo per ogni offerta.
        </div>
      </div>

      {error && <div style={{ fontFamily:"'IBM Plex Mono', monospace", fontSize:11, color:T.red, marginBottom:12 }}>{error}</div>}

      {/* Lista voci */}
      <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:T.radius, backdropFilter:T.blurSm, WebkitBackdropFilter:T.blurSm, boxShadow:T.shadow, marginBottom:16, overflow:"hidden" }}>
        {voci.length === 0 ? (
          <div style={{ padding:"32px 0", textAlign:"center", fontFamily:"'IBM Plex Mono', monospace", fontSize:11, color:T.muted }}>
            Nessuna voce ancora. Aggiungine una qui sotto.
          </div>
        ) : voci.map((v, idx) => (
          <div key={v.id} style={{ display:"flex", alignItems:"center", gap:10, padding:"12px 16px", borderBottom:idx<voci.length-1?`0.5px solid ${T.border}`:"none" }}>
            {/* Ordine */}
            <div style={{ display:"flex", flexDirection:"column", gap:2, flexShrink:0 }}>
              <button onClick={() => handleMoveUp(idx)} disabled={idx===0} style={{ background:"none", border:"none", cursor:idx===0?"default":"pointer", color:idx===0?T.border:T.muted, fontSize:10, lineHeight:1, padding:"1px 4px" }}>▲</button>
            </div>

            {editId===v.id ? (
              <>
                <input value={editNome} onChange={e=>setEditNome(e.target.value)} style={{...inputSt, flex:1}} autoFocus/>
                <input type="number" value={editPrezzo} onChange={e=>setEditPrezzo(e.target.value)} placeholder="Prezzo €" style={{...inputSt, width:120}} />
                <button onClick={handleSaveEdit} disabled={saving} style={{ background:T.navy, color:T.bg, border:"none", borderRadius:T.radiusSm, fontFamily:"'IBM Plex Mono', monospace", fontSize:11, letterSpacing:"0.06em", padding:"7px 14px", cursor:"pointer" }}>Salva</button>
                <button onClick={() => setEditId(null)} style={{ background:"none", border:`0.5px solid ${T.borderMd}`, borderRadius:T.radiusSm, fontFamily:"'IBM Plex Mono', monospace", fontSize:11, color:T.muted, padding:"7px 10px", cursor:"pointer" }}>✕</button>
              </>
            ) : (
              <>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:13, fontWeight:500, color:T.ink, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{v.nome}</div>
                </div>
                <div style={{ fontFamily:"'IBM Plex Mono', monospace", fontSize:12, color:T.navy, fontWeight:600, flexShrink:0 }}>
                  {Number(v.prezzo_default)>0 ? currency(v.prezzo_default) : <span style={{color:T.muted}}>—</span>}
                </div>
                <button onClick={() => handleEdit(v)} style={{ background:"none", border:`0.5px solid ${T.borderMd}`, borderRadius:T.radiusSm, fontFamily:"'IBM Plex Mono', monospace", fontSize:10, color:T.ink, padding:"5px 10px", cursor:"pointer" }}>Modifica</button>
                <button onClick={() => handleDelete(v.id)} style={{ background:"none", border:`0.5px solid ${T.red}`, borderRadius:T.radiusSm, fontFamily:"'IBM Plex Mono', monospace", fontSize:10, color:T.red, padding:"5px 10px", cursor:"pointer" }}>×</button>
              </>
            )}
          </div>
        ))}
      </div>

      {/* Aggiungi nuova voce */}
      <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:T.radius, backdropFilter:T.blurSm, WebkitBackdropFilter:T.blurSm, boxShadow:T.shadow, padding:"16px 20px" }}>
        <div style={{ fontFamily:"'IBM Plex Mono', monospace", fontSize:9, letterSpacing:"0.2em", textTransform:"uppercase", color:T.muted, marginBottom:12 }}>Aggiungi voce</div>
        <form onSubmit={handleAdd} style={{ display:"flex", gap:10, alignItems:"flex-end", flexWrap:"wrap" }}>
          <div style={{ flex:"1 1 200px", minWidth:0 }}>
            <div style={{ fontFamily:"'IBM Plex Mono', monospace", fontSize:9, color:T.muted, marginBottom:5 }}>Nome voce *</div>
            <input value={newNome} onChange={e=>setNewNome(e.target.value)} placeholder="es. Progetto esecutivo" style={inputSt} required/>
          </div>
          <div style={{ flex:"0 0 140px" }}>
            <div style={{ fontFamily:"'IBM Plex Mono', monospace", fontSize:9, color:T.muted, marginBottom:5 }}>Prezzo default (€)</div>
            <input type="number" value={newPrezzo} onChange={e=>setNewPrezzo(e.target.value)} placeholder="0" style={inputSt}/>
          </div>
          <button type="submit" disabled={saving||!newNome.trim()} style={{ background:T.navy, color:T.bg, border:"none", borderRadius:T.radiusSm, fontFamily:"'IBM Plex Mono', monospace", fontSize:11, letterSpacing:"0.08em", textTransform:"uppercase", padding:"9px 20px", cursor:saving?"not-allowed":"pointer", opacity:saving||!newNome.trim()?0.6:1, whiteSpace:"nowrap" }}>
            + Aggiungi
          </button>
        </form>
      </div>
    </div>
  );
}
