import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { usePageTitleOnMount } from "../hooks/usePageTitle";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { useStudio } from "../hooks/useStudio";
import { supabase } from "../lib/supabase";
import { useTheme } from '../contexts/ThemeContext';
import { useIsMobile } from '../hooks/useIsMobile';
import { useEscKey } from '../hooks/useEscKey';
import { useToast } from "../contexts/ToastContext";

function currency(v) {
  return new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR", maximumFractionDigits: 2 }).format(Number(v) || 0);
}
function pct(v) { const n = Number(v); return isNaN(n) ? '—' : `${n.toFixed(1)}%`; }

// ── SHARED UI ────────────────────────────────────────────────────
function BtnPrimary({ children, onClick, disabled, type = "button", style = {} }) {
  const { T } = useTheme();
  return (
    <button type={type} onClick={onClick} disabled={disabled} style={{
      background: T.navy, color: T.bg, border: 'none',
      fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase',
      padding: '7px 16px', cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.6 : 1, ...style,
    }}>{children}</button>
  );
}
function BtnGhost({ children, onClick, disabled, danger, style = {} }) {
  const { T } = useTheme();
  return (
    <button type="button" onClick={onClick} disabled={disabled} style={{
      background: 'transparent', border: `1px solid ${danger ? T.red : T.borderMd}`, borderRadius: T.radiusSm,
      color: danger ? T.red : T.ink,
      fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase',
      padding: '7px 16px', cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1, ...style,
    }}>{children}</button>
  );
}
function FieldLabel({ children }) {
  const { T } = useTheme();
  return <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: T.muted, marginBottom: 6 }}>{children}</div>;
}
function Input({ value, onChange, type = "text", placeholder, required, style = {} }) {
  const { T } = useTheme();
  const [focus, setFocus] = useState(false);
  return (
    <input type={type} value={value ?? ""} onChange={onChange} placeholder={placeholder} required={required}
      onFocus={() => setFocus(true)} onBlur={() => setFocus(false)}
      style={{ width: '100%', padding: '7px 10px', boxSizing: 'border-box', border: `1px solid ${focus ? T.navy : T.borderMd}`, borderRadius: T.radiusSm, background: T.surface, color: T.ink, fontSize: 12, fontFamily: "'Space Grotesk', sans-serif", outline: 'none', ...style }} />
  );
}
function Modal({ open, onClose, title, subtitle, children, width = 520 }) {
  const { T } = useTheme();
  if (!open) return null;
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(14,14,13,0.5)', padding: 16 }}>
      <div style={{ width: '100%', maxWidth: width, background: T.glassBg, backdropFilter: T.blur, WebkitBackdropFilter: T.blur, border: `1px solid ${T.glassBorder}`, borderRadius: T.radiusSm, padding: 28, maxHeight: '90vh', overflowY: 'auto', boxShadow: T.shadowLg }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 600, color: T.ink, letterSpacing: '-0.02em' }}>{title}</div>
            {subtitle && <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: T.muted, marginTop: 4 }}>{subtitle}</div>}
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.muted, fontSize: 20, lineHeight: 1, padding: 0 }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}
function Divider() {
  const { T } = useTheme();
  return <div style={{ height: '0.5px', background: T.border, margin: '14px 0' }} />;
}
function SectionHeader({ title, action }) {
  const { T } = useTheme();
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
      <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, letterSpacing: '0.25em', textTransform: 'uppercase', color: T.muted }}>{title}</div>
      {action}
    </div>
  );
}
function Panel({ children, style = {} }) {
  const { T } = useTheme();
  return <div style={{ background: T.surface, backdropFilter: T.blurSm, WebkitBackdropFilter: T.blurSm, border: `1px solid ${T.border}`, borderRadius: T.radius, padding: '16px 18px', boxShadow: T.shadow, ...style }}>{children}</div>;
}
function KpiCard({ label, value, color, onClick, hint }) {
  const { T } = useTheme();
  const [hover, setHover] = React.useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background: T.surface, backdropFilter: T.blurSm, WebkitBackdropFilter: T.blurSm,
        border: `1px solid ${onClick && hover ? T.borderMd : T.border}`,
        borderRadius: T.radiusSm, padding: '12px 14px', minWidth: 0, overflow: 'hidden',
        boxShadow: T.shadow, cursor: onClick ? 'pointer' : 'default',
        transition: 'border-color 0.15s',
      }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 6 }}>
        <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 7, letterSpacing: '0.15em', textTransform: 'uppercase', color: T.muted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</div>
        {onClick && <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 7, color: T.muted, opacity: 0.6 }}>↗</span>}
      </div>
      <div style={{ fontSize: 'clamp(13px, 3.5vw, 20px)', fontWeight: 600, letterSpacing: '-0.02em', color: color || T.ink, fontFamily: "'Space Grotesk', sans-serif", whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{value}</div>
    </div>
  );
}
function RowMenu({ open, onOpen, onClose, items }) {
  const { T } = useTheme();
  const btnRef = React.useRef(null);
  const menuRef = React.useRef(null);
  const [pos, setPos] = React.useState({ top: 0, right: 0 });

  const handleOpen = (e) => {
    e.stopPropagation();
    if (!open) {
      const rect = btnRef.current.getBoundingClientRect();
      setPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
    }
    open ? onClose() : onOpen();
  };

  // Chiudi al click fuori, allo scroll o al resize (le coord sono fisse).
  React.useEffect(() => {
    if (!open) return;
    const onDocDown = (e) => {
      if (btnRef.current?.contains(e.target) || menuRef.current?.contains(e.target)) return;
      onClose();
    };
    const onScrollResize = () => onClose();
    document.addEventListener('mousedown', onDocDown);
    document.addEventListener('touchstart', onDocDown);
    window.addEventListener('scroll', onScrollResize, true);
    window.addEventListener('resize', onScrollResize);
    return () => {
      document.removeEventListener('mousedown', onDocDown);
      document.removeEventListener('touchstart', onDocDown);
      window.removeEventListener('scroll', onScrollResize, true);
      window.removeEventListener('resize', onScrollResize);
    };
  }, [open, onClose]);

  // La tendina va in portal su document.body: un antenato con backdrop-filter
  // creerebbe un containing block che sballerebbe il position:fixed.
  const menu = open ? createPortal(
    <div ref={menuRef} style={{ position: 'fixed', top: pos.top, right: pos.right, width: 150, background: T.surface, border: `1px solid ${T.borderMd}`, borderRadius: T.radiusSm, zIndex: 9999, boxShadow: '0 4px 16px rgba(0,0,0,0.12)', overflow: 'hidden' }}>
      {items.map(item => (
        <button key={item.label} onClick={e => { e.stopPropagation(); onClose(); item.onClick(); }}
          style={{ display: 'block', width: '100%', padding: '11px 12px', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: item.danger ? T.red : T.ink, letterSpacing: '0.05em' }}>
          {item.label}
        </button>
      ))}
    </div>,
    document.body
  ) : null;

  return (
    <div style={{ position: 'relative' }}>
      <button ref={btnRef} onClick={handleOpen}
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.muted, fontSize: 16, padding: '4px 8px', lineHeight: 1 }}>···</button>
      {menu}
    </div>
  );
}

// ── MAIN COMPONENT ────────────────────────────────────────────────
export default function CommessaDetailPage() {
  const { T } = useTheme();
  const showToast = useToast();
  usePageTitleOnMount("Commessa");
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const location = useLocation();
  const { id: commessaId } = useParams();
  const { studioId, studio } = useStudio();
  // Evita di riproporre "inserisci una pratica" quando arriviamo QUI da una pratica
  const skipPraticaPromptRef = useRef(false);
  const isFattura = studio?.tipo_fatturazione === 'fattura';

  const [commessa, setCommessa]           = useState(null);
  const [costiExtra, setCostiExtra]       = useState([]);
  const [suddivisione, setSuddivisione]   = useState([]);
  const [proforma, setProforma]           = useState([]);
  const [collaboratori, setCollaboratori] = useState([]);
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState("");

  const [menuOpen, setMenuOpen]           = useState(false);
  const [openMenuId, setOpenMenuId]       = useState(null);
  const [showCollaboratori, setShowCollaboratori] = useState(false);
  const [showCostiInterni, setShowCostiInterni]   = useState(false);

  const [editOpen, setEditOpen]           = useState(false);
  const [editForm, setEditForm]           = useState({});
  const [editSaving, setEditSaving]       = useState(false);
  const [editError, setEditError]         = useState("");

  const [costoModal, setCostoModal]       = useState(false);
  const [costoForm, setCostoForm]         = useState({});
  const [costoSaving, setCostoSaving]     = useState(false);
  const [costoError, setCostoError]       = useState("");

  const [rataModal, setRataModal]         = useState(false);
  const [rataMode, setRataMode]           = useState("percentuale");
  const [rataCount, setRataCount]         = useState(2);
  const [rateRows, setRateRows]           = useState([]);
  const [rataStep, setRataStep]           = useState("config");
  const [rataSaving, setRataSaving]       = useState(false);
  const [rataError, setRataError]         = useState("");

  const [editRataModal, setEditRataModal] = useState(false);
  const [editRataData, setEditRataData]   = useState(null);
  const [editRataForm, setEditRataForm]   = useState({});
  const [editRataSaving, setEditRataSaving] = useState(false);

  const [editCostoModal, setEditCostoModal] = useState(false);
  const [editCostoData, setEditCostoData]   = useState(null);
  const [editCostoForm, setEditCostoForm]   = useState({});
  const [editCostoSaving, setEditCostoSaving] = useState(false);

  const [newCollab, setNewCollab]         = useState({ ruolo: "", nome_cognome: "", importo: "" });
  const [savingCollab, setSavingCollab]   = useState(false);
  const [editCollabModal, setEditCollabModal] = useState(false);
  const [editCollabData, setEditCollabData]   = useState(null);
  const [editCollabForm, setEditCollabForm]   = useState({});
  const [editCollabSaving, setEditCollabSaving] = useState(false);

  const [teamMembers, setTeamMembers]           = useState([]);
  const [costiInterni, setCostiInterni]         = useState([]);
  const [newCostoInterno, setNewCostoInterno]   = useState({ team_member_id:'', descrizione:'', importo:'', data:new Date().toISOString().slice(0,10) });
  const [savingCostoInt, setSavingCostoInt]     = useState(false);

  const [previewProforma, setPreviewProforma] = useState(null);
  const [proformaModal, setProformaModal] = useState(false);
  const [proformaForm, setProformaForm]   = useState({ numero_proforma: "", data_creazione: "", data_scadenza: "", note: "" });
  const [proformaSaving, setProformaSaving] = useState(false);
  const [proformaError, setProformaError] = useState("");
  const [proformaRateIds, setProformaRateIds] = useState([]);
  const [proformaCostiIds, setProformaCostiIds] = useState([]);

  const [altreCommesse, setAltreCommesse] = useState([]);
  const [vociOfferta, setVociOfferta]     = useState(null); // { voci, sconto, sconto_fisso } dall'offerta collegata
  const [showVociPopup, setShowVociPopup] = useState(false);
  const [altreCommesseData, setAltreCommesseData] = useState({});

  const [editProformaModal, setEditProformaModal] = useState(false);
  const [editProformaData, setEditProformaData]   = useState(null);
  const [editProformaForm, setEditProformaForm]   = useState({});
  const [editProformaSaving, setEditProformaSaving] = useState(false);

  const [pagProformaModal, setPagProformaModal]   = useState(false);
  const [pagProformaData, setPagProformaData]     = useState({ numero_fattura: "", data_pagamento: "" });
  const [pagProformaSaving, setPagProformaSaving] = useState(false);
  const [selectedProforma, setSelectedProforma]   = useState(null);
  const [rimuoviModal, setRimuoviModal]           = useState(false);
  const [rimuoviSaving, setRimuoviSaving]         = useState(false);

  const [deleteCommessaModal, setDeleteCommessaModal] = useState(false);
  const [deletingSaving, setDeletingSaving]           = useState(false);

  // Avviso "vuoi inserire una pratica?" dopo aver salvato un costo di tipo Diritti
  const [praticaPrompt, setPraticaPrompt] = useState(false);

  // Apertura automatica del popup Costo Extra (pre-impostato su "Diritti")
  // quando si arriva qui dal popup Pratiche di un progetto.
  useEffect(() => {
    if (location.state?.openCostoDiritti) {
      skipPraticaPromptRef.current = true;
      setCostoForm({ tipo_costo: "Diritti", data_costo: new Date().toISOString().slice(0, 10) });
      setCostoError("");
      setCostoModal(true);
      navigate(location.pathname, { replace: true, state: {} });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Chiudi modal con ESC (dal più recente)
  useEscKey(() => {
    if (previewProforma)    { setPreviewProforma(null); return; }
    if (rimuoviModal)       { setRimuoviModal(false); return; }
    if (pagProformaModal)   { setPagProformaModal(false); return; }
    if (editProformaModal)  { setEditProformaModal(false); return; }
    if (proformaModal)      { setProformaModal(false); return; }
    if (costoModal)         { setCostoModal(false); return; }
    if (rataModal)          { setRataModal(false); return; }
    if (menuOpen)           { setMenuOpen(false); }
  }, previewProforma || rimuoviModal || pagProformaModal || editProformaModal || proformaModal || costoModal || rataModal || menuOpen);

  // ── LOAD ─────────────────────────────────────────────────────
  const loadData = async () => {
    if (!commessaId) return;
    setLoading(true); setError("");
    const [cR, costiR, suddR, collabR] = await Promise.all([
      supabase.from("commesse").select("*").eq("id", commessaId).eq("studio", studioId).maybeSingle(),
      supabase.from("costi_extra").select("*").eq("commessa_id", commessaId).is("deleted_at", null).order("created_at", { ascending: true }),
      supabase.from("suddivisione_pagamenti").select("*").eq("commessa_id", commessaId).is("deleted_at", null).order("numero_rata", { ascending: true }).order("created_at", { ascending: true }),
      supabase.from("collaboratori_esterni").select("*").eq("commessa_id", commessaId).order("created_at", { ascending: true }),
    ]);
    if (cR.error) { setError(cR.error.message); setLoading(false); return; }
    const commessa = cR.data ?? null;
    setCommessa(commessa);
    setCostiExtra(costiR.data ?? []);
    setSuddivisione(suddR.data ?? []);

    // Carica proforma: quelle di questa commessa + quelle che la includono in commessa_ids
    const [{ data: profDirect }, { data: profLinked }] = await Promise.all([
      supabase.from("proforma").select("*").eq("commessa_id", commessaId).is("deleted_at", null),
      supabase.from("proforma").select("*").contains("commessa_ids", [commessaId]).is("deleted_at", null),
    ]);
    const profMap = new Map();
    [...(profDirect || []), ...(profLinked || [])].forEach(p => profMap.set(p.id, p));
    const allProf = Array.from(profMap.values()).sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    setProforma(allProf);
    setCollaboratori(collabR.data ?? []);

    const { data: ci } = await supabase.from('costi_interni').select('*').eq('commessa_id', commessaId).is('deleted_at', null).order('data', { ascending:false });
    setCostiInterni(ci ?? []);

    // Carica voci dall'offerta collegata (per breakdown importo base)
    const { data: offCollegata } = await supabase
      .from('offerte').select('voci, sconto, sconto_fisso')
      .eq('commessa_id', commessaId).maybeSingle();
    setVociOfferta(offCollegata ?? null);
    const { data: tm } = await supabase.from('team_members').select('id, user_name, user_email').eq('studio', studioId).eq('active', true);
    setTeamMembers(tm ?? []);

    if (commessa?.project_id) {
      const { data: altreComm } = await supabase
        .from('commesse')
        .select('id, nome_commessa, importo_offerta_base')
        .eq('project_id', commessa.project_id)
        .eq('studio', studioId)
        .neq('id', commessaId);
      setAltreCommesse(altreComm ?? []);
      const altreData = {};
      for (const ac of (altreComm ?? [])) {
        const [{ data: rate }, { data: costi }] = await Promise.all([
          supabase.from('suddivisione_pagamenti').select('*').eq('commessa_id', ac.id).is('deleted_at', null).order('order'),
          supabase.from('costi_extra').select('*').eq('commessa_id', ac.id).is('deleted_at', null),
        ]);
        altreData[ac.id] = { suddivisione: rate ?? [], costiExtra: costi ?? [] };
      }
      setAltreCommesseData(altreData);
    } else {
      setAltreCommesse([]);
      setAltreCommesseData({});
    }

    setLoading(false);
  };

  useEffect(() => { if (studioId) loadData(); }, [commessaId, studioId]);

  // Forza la suddivisione pagamenti: alla prima apertura (per montaggio) di una
  // commessa senza rate, apri automaticamente il modale "Genera Rate".
  // È rinviabile (vedi banner), ma riappare alla prossima apertura finché manca.
  const forcedRataTried = React.useRef(false);
  useEffect(() => {
    if (forcedRataTried.current) return;
    if (loading || !commessa) return;
    forcedRataTried.current = true;
    if (suddivisione.length === 0) { setRataStep("config"); setRataModal(true); }
  }, [loading, commessa, suddivisione.length]);

  // ── CALCOLATI — usa nomi campi originali ──────────────────────
  const importoBase = Number(commessa?.importo_offerta_base) || 0;

  const importoPagato = useMemo(() =>
    suddivisione
      .filter(s => s.pagato)
      .reduce((sum, s) => {
        const importoRata = Number(s.importo_fisso) || (importoBase * (Number(s.percentuale) || 0) / 100);
        return sum + importoRata;
      }, 0)
  , [suddivisione, importoBase]);

  const residuo = importoBase - importoPagato;
  const totCostiExtra = costiExtra.reduce((s, c) => s + (Number(c.importo) || 0), 0);
  const totCollaboratori = collaboratori.reduce((s, c) => s + (Number(c.importo) || 0), 0);

  // mappe usando nomi originali: suddivisione_pagamento_ids, costo_extra_ids
  const proformaPerRata = useMemo(() => {
    const map = {};
    proforma.forEach(p => { (p.suddivisione_pagamento_ids || []).forEach(id => { map[id] = p; }); });
    return map;
  }, [proforma]);

  const proformaPerCosto = useMemo(() => {
    const map = {};
    proforma.forEach(p => { (p.costo_extra_ids || []).forEach(id => { map[id] = p; }); });
    return map;
  }, [proforma]);

  const rateGiaUsate = useMemo(() => new Set(Object.keys(proformaPerRata)), [proformaPerRata]);

  // Business logic rate
  const hasAnyRates  = suddivisione.length > 0;
  const hasPaidRates = suddivisione.some(r => r.pagato);
  const costiGiaUsati = useMemo(() => new Set(Object.keys(proformaPerCosto)), [proformaPerCosto]);

  const importoProformaSelezionata = useMemo(() => {
    const fromRate = suddivisione
      .filter(r => proformaRateIds.includes(r.id))
      .reduce((s, r) => s + (Number(r.importo_fisso) || (importoBase * (Number(r.percentuale) || 0) / 100)), 0);
    const fromCosti = costiExtra
      .filter(c => proformaCostiIds.includes(c.id))
      .reduce((s, c) => s + (Number(c.importo) || 0), 0);
    const fromAltreRate = Object.entries(altreCommesseData).flatMap(([acId, d]) =>
      d.suddivisione.filter(r => proformaRateIds.includes(r.id)).map(r => {
        const ac = altreCommesse.find(a => a.id === acId);
        const acBase = Number(ac?.importo_offerta_base) || 0;
        return Number(r.importo_fisso) || (acBase * (Number(r.percentuale) || 0) / 100);
      })
    ).reduce((s, v) => s + v, 0);
    const fromAltreCosti = Object.values(altreCommesseData).flatMap(d => d.costiExtra)
      .filter(c => proformaCostiIds.includes(c.id))
      .reduce((s, c) => s + (Number(c.importo) || 0), 0);
    return fromRate + fromCosti + fromAltreRate + fromAltreCosti;
  }, [proformaRateIds, proformaCostiIds, suddivisione, costiExtra, importoBase, altreCommesseData]);

  // Incassato = somma delle RATE PAGATE (stessa formula di tutte le viste e del
  // trigger DB). NB: a DB un trigger su suddivisione_pagamenti mantiene comunque
  // questo campo allineato; qui lo aggiorniamo subito per reattività dell'UI.
  const ricalcolaIncassato = async () => {
    const totale = suddivisione
      .filter(r => r.pagato)
      .reduce((s, r) => s + (Number(r.importo_fisso) || (importoBase * (Number(r.percentuale) || 0) / 100)), 0);
    await supabase.from("commesse").update({ importo_incassato: totale }).eq("id", commessaId);
  };

  // ── HANDLERS ─────────────────────────────────────────────────

  const openEdit = () => {
    setEditForm({ numero_offerta: commessa?.numero_offerta || "", nome_commessa: commessa?.nome_commessa || "", cliente: commessa?.cliente || "", data_commessa: commessa?.data_commessa || "", importo_offerta_base: commessa?.importo_offerta_base || "", note_amministrative: commessa?.note_amministrative || "" });
    setEditError(""); setEditOpen(true); setMenuOpen(false);
  };
  const handleSaveEdit = async e => {
    e.preventDefault(); setEditSaving(true); setEditError("");
    const payload = { numero_offerta: editForm.numero_offerta?.trim(), nome_commessa: editForm.nome_commessa?.trim(), cliente: editForm.cliente?.trim(), data_commessa: editForm.data_commessa || null, importo_offerta_base: Number(editForm.importo_offerta_base) || 0, note_amministrative: editForm.note_amministrative?.trim() || null };
    const { error: uErr } = await supabase.from("commesse").update(payload).eq("id", commessaId);
    if (uErr) { setEditError(uErr.message); setEditSaving(false); return; }
    setCommessa(p => ({ ...p, ...payload })); setEditSaving(false); setEditOpen(false);
  };

  const handleSaveCosto = async e => {
    e.preventDefault(); setCostoError(""); setCostoSaving(true);
    const tipo = costoForm.tipo_costo || "Altro";
    const { error: iErr } = await supabase.from("costi_extra").insert({ commessa_id: commessaId, tipo_costo: tipo, description: costoForm.description || null, importo: Number(costoForm.importo) || 0, data_costo: costoForm.data_costo || new Date().toISOString().slice(0,10), studio: studioId });
    if (iErr) { setCostoError(iErr.message); setCostoSaving(false); return; }
    setCostoModal(false); setCostoForm({}); await loadData(); setCostoSaving(false);
    // Se ho appena inserito un "Diritto" e la commessa ha un progetto collegato,
    // proponi di inserire la pratica corrispondente (a meno che non sia stato l'avvio a portarci qui).
    if (tipo === "Diritti" && commessa?.project_id && !skipPraticaPromptRef.current) {
      setPraticaPrompt(true);
    }
    skipPraticaPromptRef.current = false;
  };

  // Rate — usa campi originali: percentuale, importo_fisso, studio
  const initRateRows = () => {
    const n = Math.max(1, Number(rataCount));
    const base = rataMode === "percentuale"
      ? parseFloat((100 / n).toFixed(1))
      : parseFloat((importoBase / n).toFixed(2));
    setRateRows(Array.from({ length: n }, (_, i) => ({ label: `Rata ${i + 1}`, value: base })));
    setRataStep("edit"); setRataError("");
  };
  const handleSaveRate = async e => {
    e.preventDefault(); setRataSaving(true); setRataError("");
    const payload = rateRows.map((r, i) => ({
      commessa_id: commessaId,
      studio: studioId,
      numero_rata: suddivisione.length + i + 1,
      label: r.label || `Rata ${i+1}`,
      percentuale: rataMode === "percentuale" ? Number(r.value) : null,
      importo_fisso: rataMode === "importo" ? Number(r.value) : null,
      pagato: false,
    }));
    const { error: iErr } = await supabase.from("suddivisione_pagamenti").insert(payload);
    if (iErr) { setRataError(iErr.message); setRataSaving(false); return; }
    setRataModal(false); setRataStep("config"); setRateRows([]); await loadData(); setRataSaving(false);
  };
  const handleRataValueChange = (idx, newVal) => {
    setRateRows(prev => {
      const updated = prev.map((r, i) => i === idx ? { ...r, value: newVal } : r);
      const totale = rataMode === "percentuale" ? 100 : importoBase;
      const ultimoIdx = prev.length - 1;
      if (idx !== ultimoIdx) {
        const sommaEsclUltima = updated
          .slice(0, ultimoIdx)
          .reduce((s, r) => s + (parseFloat(r.value) || 0), 0);
        const residuo = parseFloat((totale - sommaEsclUltima).toFixed(2));
        updated[ultimoIdx] = { ...updated[ultimoIdx], value: residuo };
      }
      return updated;
    });
  };

  const openEditRata = rata => {
    setEditRataData(rata);
    setEditRataForm({ percentuale: rata.percentuale ?? "", importo_fisso: rata.importo_fisso ?? "", data_pagamento: rata.data_pagamento ?? "", pagato: rata.pagato ?? false });
    setEditRataModal(true); setOpenMenuId(null);
  };
  const handleSaveRata = async e => {
    e.preventDefault(); setEditRataSaving(true);
    await supabase.from("suddivisione_pagamenti").update({ percentuale: editRataForm.percentuale !== "" ? Number(editRataForm.percentuale) : null, importo_fisso: editRataForm.importo_fisso !== "" ? Number(editRataForm.importo_fisso) : null, data_pagamento: editRataForm.data_pagamento || null, pagato: editRataForm.pagato }).eq("id", editRataData.id);
    setEditRataModal(false); setEditRataData(null); await loadData(); setEditRataSaving(false);
  };
  const handleDeleteRata = async id => {
    if (!window.confirm("Eliminare questa rata? Verrà spostata nel cestino.")) return;
    const { error: dErr } = await supabase.from("suddivisione_pagamenti").update({ deleted_at: new Date().toISOString() }).eq("id", id);
    if (dErr) { showToast("Errore eliminazione: " + dErr.message); return; }
    setOpenMenuId(null); await loadData();
  };

  const openEditCosto = costo => {
    setEditCostoData(costo);
    setEditCostoForm({ tipo_costo: costo.tipo_costo || "", description: costo.description || "", importo: costo.importo || "", data_costo: costo.data_costo || "" });
    setEditCostoModal(true); setOpenMenuId(null);
  };
  const handleSaveCostoEdit = async e => {
    e.preventDefault(); setEditCostoSaving(true);
    await supabase.from("costi_extra").update({ tipo_costo: editCostoForm.tipo_costo, description: editCostoForm.description || null, importo: Number(editCostoForm.importo), data_costo: editCostoForm.data_costo || new Date().toISOString().slice(0,10) }).eq("id", editCostoData.id);
    setEditCostoModal(false); await loadData(); setEditCostoSaving(false);
  };
  const handleDeleteCosto = async id => {
    if (!window.confirm("Eliminare questo costo?")) return;
    const { data: dData, error: dErr } = await supabase.from("costi_extra").update({ deleted_at: new Date().toISOString() }).eq("id", id).is("deleted_at", null).select();
    if (dErr) { showToast("Errore eliminazione: " + dErr.message); return; }
    if (!dData || dData.length === 0) { showToast("Impossibile eliminare il costo (permessi insufficienti)."); return; }
    setOpenMenuId(null); await loadData();
  };

  const handleAddCollab = async e => {
    e.preventDefault(); setSavingCollab(true);
    await supabase.from("collaboratori_esterni").insert({ commessa_id: commessaId, ruolo: newCollab.ruolo, nome_cognome: newCollab.nome_cognome, importo: Number(newCollab.importo) || 0, studio: studioId });
    setNewCollab({ ruolo: "", nome_cognome: "", importo: "" }); await loadData(); setSavingCollab(false);
  };
  const openEditCollab = c => { setEditCollabData(c); setEditCollabForm({ ruolo: c.ruolo || "", nome_cognome: c.nome_cognome || "", importo: c.importo || "" }); setEditCollabModal(true); setOpenMenuId(null); };
  const handleSaveCollab = async e => {
    e.preventDefault(); setEditCollabSaving(true);
    await supabase.from("collaboratori_esterni").update({ ruolo: editCollabForm.ruolo, nome_cognome: editCollabForm.nome_cognome, importo: Number(editCollabForm.importo) }).eq("id", editCollabData.id);
    setEditCollabModal(false); await loadData(); setEditCollabSaving(false);
  };
  const handleDeleteCollab = async id => {
    if (!window.confirm("Eliminare questo collaboratore? Verrà spostato nel cestino.")) return;
    const { error } = await supabase.rpc('elimina_collaboratore', { p_id: id });
    if (error) { showToast('Errore: ' + error.message); return; }
    setOpenMenuId(null); await loadData();
  };

  const handleAddCostoInterno = async () => {
    if (!newCostoInterno.descrizione.trim() || !newCostoInterno.importo) return;
    setSavingCostoInt(true);
    const membro = teamMembers?.find(m => m.id === newCostoInterno.team_member_id);
    await supabase.from('costi_interni').insert({
      studio: studioId,
      commessa_id: commessaId,
      team_member_id: newCostoInterno.team_member_id || null,
      nome_membro: membro?.user_name || membro?.user_email || null,
      descrizione: newCostoInterno.descrizione.trim(),
      importo: Number(newCostoInterno.importo),
      data: newCostoInterno.data || new Date().toISOString().slice(0,10),
    });
    setNewCostoInterno({ team_member_id:'', descrizione:'', importo:'', data:new Date().toISOString().slice(0,10) });
    setSavingCostoInt(false);
    await loadData();
  };

  const handleDeleteCostoInterno = async (id) => {
    if (!confirm('Eliminare questo costo interno? Verrà spostato nel cestino.')) return;
    const { error } = await supabase.rpc('elimina_costo_interno', { p_id: id });
    if (error) { showToast('Errore: ' + error.message); return; }
    await loadData();
  };

  // Proforma — usa nomi originali: data_creazione, suddivisione_pagamento_ids, costo_extra_ids, pagato
  const handleSaveProforma = async e => {
    e.preventDefault(); setProformaError(""); setProformaSaving(true);
    if (!proformaForm.numero_proforma?.trim()) { setProformaError("Numero proforma obbligatorio."); setProformaSaving(false); return; }
    if (!proformaForm.data_scadenza) { setProformaError("Inserisci la data di scadenza."); setProformaSaving(false); return; }
    const commessaIdsSet = new Set([commessaId]);
    proformaRateIds.forEach(rid => {
      Object.entries(altreCommesseData).forEach(([cId, data]) => {
        if (data.suddivisione.some(r => r.id === rid)) commessaIdsSet.add(cId);
      });
    });
    proformaCostiIds.forEach(ceid => {
      Object.entries(altreCommesseData).forEach(([cId, data]) => {
        if (data.costiExtra.some(ce => ce.id === ceid)) commessaIdsSet.add(cId);
      });
    });
    const { error: iErr } = await supabase.from("proforma").insert({
      commessa_id: commessaId, numero_proforma: proformaForm.numero_proforma.trim(),
      data_creazione: proformaForm.data_creazione || null,
      data_scadenza: proformaForm.data_scadenza,
      importo_totale: importoProformaSelezionata,
      note: proformaForm.note || null, pagato: false,
      suddivisione_pagamento_ids: proformaRateIds,
      costo_extra_ids: proformaCostiIds,
      commessa_ids: Array.from(commessaIdsSet),
      studio: studioId,
    });
    if (iErr) { setProformaError(iErr.message); setProformaSaving(false); return; }
    setProformaModal(false); setProformaForm({ numero_proforma: "", data_creazione: "", data_scadenza: "", note: "" });
    setProformaRateIds([]); setProformaCostiIds([]);
    await loadData(); setProformaSaving(false);
  };

  const openEditProforma = p => { setEditProformaData(p); setEditProformaForm({ numero_proforma: p.numero_proforma || "", numero_fattura: p.numero_fattura || "", data_creazione: p.data_creazione || "", data_scadenza: p.data_scadenza || "", data_pagamento: p.data_pagamento || "", note: p.note || "" }); setEditProformaModal(true); setOpenMenuId(null); };
  const handleSaveEditProforma = async e => {
    e.preventDefault(); setEditProformaSaving(true);
    const isPagata = editProformaData.pagato;
    await supabase.from("proforma").update({
      numero_proforma: editProformaForm.numero_proforma,
      numero_fattura: isPagata ? (editProformaForm.numero_fattura || null) : editProformaData.numero_fattura,
      data_creazione: editProformaForm.data_creazione || null,
      data_scadenza: editProformaForm.data_scadenza || null,
      data_pagamento: isPagata ? (editProformaForm.data_pagamento || null) : editProformaData.data_pagamento,
      note: editProformaForm.note || null,
    }).eq("id", editProformaData.id);
    // mantieni allineate le rate collegate quando cambia la data di pagamento
    if (isPagata && editProformaData.suddivisione_pagamento_ids?.length) {
      await supabase.from("suddivisione_pagamenti").update({ data_pagamento: editProformaForm.data_pagamento || null }).in("id", editProformaData.suddivisione_pagamento_ids);
    }
    setEditProformaModal(false); await loadData(); setEditProformaSaving(false);
  };
  const handleDeleteProforma = async (proformaToDelete) => {
    if (!window.confirm("Eliminare questa proforma?")) return;
    if (proformaToDelete.suddivisione_pagamento_ids?.length > 0) {
      await supabase.from("suddivisione_pagamenti")
        .update({ pagato: false, data_pagamento: null })
        .in("id", proformaToDelete.suddivisione_pagamento_ids);
    }
    if (proformaToDelete.costo_extra_ids?.length > 0) {
      await supabase.from("costi_extra")
        .update({ pagato: false })
        .in("id", proformaToDelete.costo_extra_ids);
    }
    const { error: pErr } = await supabase.rpc('elimina_proforma', { p_id: proformaToDelete.id });
    if (pErr) { showToast('Errore: ' + pErr.message); return; }
    setOpenMenuId(null); await loadData();
  };

  // Pagamento — aggiorna "pagato" (nome originale) + cascata su rate e costi
  const openPagamentoProforma = p => { setSelectedProforma(p); setPagProformaData({ numero_fattura: "", data_pagamento: "" }); setPagProformaModal(true); };
  const handleSavePagamento = async e => {
    e.preventDefault(); setPagProformaSaving(true);
    await supabase.from("proforma").update({ pagato: true, numero_fattura: pagProformaData.numero_fattura || null, data_pagamento: pagProformaData.data_pagamento || null }).eq("id", selectedProforma.id);
    if (selectedProforma.suddivisione_pagamento_ids?.length > 0) {
      await supabase.from("suddivisione_pagamenti").update({ pagato: true, data_pagamento: pagProformaData.data_pagamento || null }).in("id", selectedProforma.suddivisione_pagamento_ids);
    }
    if (selectedProforma.costo_extra_ids?.length > 0) {
      await supabase.from("costi_extra").update({ pagato: true }).in("id", selectedProforma.costo_extra_ids);
    }
    setPagProformaModal(false); setSelectedProforma(null);
    await loadData(); await ricalcolaIncassato(); setPagProformaSaving(false);
  };

  const handleRimuoviPagamento = async () => {
    setRimuoviSaving(true);
    await supabase.from("proforma").update({ pagato: false, numero_fattura: null, data_pagamento: null }).eq("id", selectedProforma.id);
    if (selectedProforma.suddivisione_pagamento_ids?.length > 0) {
      await supabase.from("suddivisione_pagamenti").update({ pagato: false, data_pagamento: null }).in("id", selectedProforma.suddivisione_pagamento_ids);
    }
    if (selectedProforma.costo_extra_ids?.length > 0) {
      await supabase.from("costi_extra").update({ pagato: false }).in("id", selectedProforma.costo_extra_ids);
    }
    setRimuoviModal(false); setSelectedProforma(null);
    await loadData(); await ricalcolaIncassato(); setRimuoviSaving(false);
  };

  // ── RENDER ────────────────────────────────────────────────────
  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 240, fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: T.muted }}>Caricamento commessa...</div>
  );
  if (error || !commessa) return (
    <div style={{ border: `1px solid ${T.border}`, borderRadius: T.radiusSm, background: T.surface, padding: 32, color: T.red, fontSize: 13 }}>{error || "Commessa non trovata."}</div>
  );

  const thSt = { fontFamily: "'IBM Plex Mono', monospace", fontSize: 8, letterSpacing: '0.2em', textTransform: 'uppercase', color: T.muted, padding: '6px 10px', borderBottom: `0.5px solid ${T.border}`, textAlign: 'left' };
  const tdSt = { padding: '8px 10px', borderBottom: `0.5px solid ${T.border}`, fontSize: 12, color: T.ink, fontFamily: "'Space Grotesk', sans-serif", verticalAlign: 'middle' };
  const monoSt = { fontFamily: "'IBM Plex Mono', monospace", fontSize: 11 };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, minWidth: 0, width: '100%' }}>

      {/* HEADER */}
      <Panel>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: T.muted, letterSpacing: '0.25em', textTransform: 'uppercase', marginBottom: 6 }}>{commessa.numero_offerta || "—"}</div>
            <div style={{ fontSize: 20, fontWeight: 600, color: T.ink, letterSpacing: '-0.02em', marginBottom: 4 }}>{commessa.nome_commessa || "Commessa senza nome"}</div>
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: T.muted }}>
              {commessa.cliente || "—"}
              {commessa.data_commessa && <span style={{ marginLeft: 12 }}>{new Date(commessa.data_commessa).toLocaleDateString('it-IT')}</span>}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <BtnGhost onClick={() => navigate("/commesse")} style={{ fontSize: 10 }}>← Commesse</BtnGhost>
            {commessa.project_id && <BtnGhost onClick={() => navigate(`/progetti/${commessa.project_id}`)} style={{ fontSize: 10 }}>Progetto →</BtnGhost>}
            <div style={{ position: 'relative' }}>
              <button onClick={() => setMenuOpen(p => !p)} style={{ background: 'none', border: `1px solid ${T.borderMd}`, cursor: 'pointer', color: T.ink, width: 34, height: 34, fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>···</button>
              {menuOpen && (
                <div style={{ position: 'absolute', right: 0, top: '100%', marginTop: 4, width: 190, background: T.surface, border: `1px solid ${T.borderMd}`, zIndex: 30 }}>
                  <button onClick={openEdit} style={{ display: 'block', width: '100%', padding: '10px 14px', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: T.ink }}>Modifica</button>
                  <button onClick={async()=>{ if(!confirm('Archiviare questa commessa? Sarà visibile in Impostazioni → Commesse archiviate.')) return; setMenuOpen(false); await supabase.from('commesse').update({archived:true}).eq('id',commessaId); navigate('/commesse'); }} style={{ display: 'block', width: '100%', padding: '10px 14px', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: T.muted }}>Archivia commessa</button>
                  <button onClick={()=>{ setMenuOpen(false); setDeleteCommessaModal(true); }} style={{ display: 'block', width: '100%', padding: '10px 14px', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: T.red }}>Elimina commessa</button>
                </div>
              )}
            </div>
          </div>
        </div>
      </Panel>

      {/* KPI */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(3, 1fr)' : 'repeat(5, 1fr)', gap: 10 }}>
        <KpiCard label="Importo Base" value={currency(importoBase)}
          onClick={vociOfferta?.voci?.length > 0 ? () => setShowVociPopup(true) : undefined} />
        <KpiCard label="Pagato"        value={currency(importoPagato)}  color={T.green} />
        <KpiCard label="Residuo"       value={currency(residuo)}         color={residuo > 0 ? T.navy : T.muted} />
        <KpiCard label="Costi Extra"   value={currency(totCostiExtra)}   color={T.muted} />
        <KpiCard label="Collaboratori" value={currency(totCollaboratori)} color={T.muted} />
      </div>

      {/* Popup breakdown voci offerta */}
      {showVociPopup && vociOfferta && (
        <div onClick={() => setShowVociPopup(false)}
          style={{ position:'fixed', inset:0, zIndex:80, background:'rgba(0,0,0,0.4)', display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
          <div onClick={e => e.stopPropagation()}
            style={{ background: T.bg, border:`1px solid ${T.border}`, borderRadius: T.radius, boxShadow: '0 8px 32px rgba(0,0,0,0.18)', padding:'20px 22px', width:'100%', maxWidth:420 }}>
            {/* Header */}
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
              <div style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:9, letterSpacing:'0.2em', textTransform:'uppercase', color:T.muted }}>
                Dettaglio importo base
              </div>
              <button onClick={() => setShowVociPopup(false)}
                style={{ background:'none', border:'none', cursor:'pointer', color:T.muted, fontSize:18, lineHeight:1 }}>×</button>
            </div>
            {/* Voci — la % è calcolata sul totale netto finale (importoBase della commessa) */}
            {(() => {
              const vociAttive = (vociOfferta.voci || []).filter(v => v.attiva !== false);
              const lordo = vociAttive.reduce((s,v) => s + Number(v.prezzo||0), 0);
              const netto = importoBase; // fonte di verità: importo_offerta_base della commessa
              const scontoTotale = lordo - netto;
              const hasSconti = scontoTotale > 0.005;
              return (
                <>
                  <div style={{ display:'flex', flexDirection:'column', gap:0, border:`0.5px solid ${T.border}`, borderRadius: T.radiusSm, overflow:'hidden', marginBottom:12 }}>
                    {vociAttive.map((v, i, arr) => {
                      const perc = lordo > 0 ? Math.round(Number(v.prezzo||0) / lordo * 1000) / 10 : 0;
                      return (
                        <div key={v.id || i} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 14px', borderBottom: i < arr.length-1 ? `0.5px solid ${T.border}` : 'none', background: i % 2 === 0 ? 'transparent' : T.surface }}>
                          <div style={{ flex:1, minWidth:0 }}>
                            <div style={{ fontSize:12, fontWeight:600, color:T.ink, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{v.nome}</div>
                            <div style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:8, color:T.muted, marginTop:2 }}>{perc}% del lordo</div>
                          </div>
                          <div style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:12, fontWeight:600, color:T.navy, flexShrink:0, marginLeft:12 }}>{currency(v.prezzo)}</div>
                        </div>
                      );
                    })}
                  </div>
                  <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                    {hasSconti && (
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                        <span style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:9, color:T.muted }}>
                          {Number(vociOfferta.sconto) > 0 && `Sconto ${vociOfferta.sconto}%`}
                          {Number(vociOfferta.sconto) > 0 && Number(vociOfferta.sconto_fisso) > 0 && ' + '}
                          {Number(vociOfferta.sconto_fisso) > 0 && `−${currency(vociOfferta.sconto_fisso)}`}
                          {!Number(vociOfferta.sconto) && !Number(vociOfferta.sconto_fisso) && 'Sconto applicato'}
                        </span>
                        <span style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:11, color:T.red }}>−{currency(scontoTotale)}</span>
                      </div>
                    )}
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', paddingTop: hasSconti ? 8 : 0, borderTop: hasSconti ? `0.5px solid ${T.border}` : 'none' }}>
                      <span style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:9, letterSpacing:'0.15em', textTransform:'uppercase', color:T.muted }}>Totale netto</span>
                      <span style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:16, fontWeight:700, color:T.navy }}>{currency(netto)}</span>
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {commessa.note_amministrative && (
        <Panel><div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: T.muted, lineHeight: 1.8 }}>{commessa.note_amministrative}</div></Panel>
      )}

      {/* PROFORMA / FATTURA */}
      <Panel>
        <SectionHeader title={isFattura ? "Fattura" : "Proforma"} action={
          hasAnyRates
            ? <BtnPrimary onClick={() => { setProformaRateIds([]); setProformaCostiIds([]); setProformaForm({ numero_proforma: "", data_creazione: "", note: "" }); setProformaModal(true); }}>+ Nuova</BtnPrimary>
            : <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: T.muted }}>crea prima la suddivisione pagamenti</span>
                <BtnPrimary disabled style={{ opacity:0.5, cursor:'not-allowed' }}>+ Nuova</BtnPrimary>
              </div>
        } />
        {!hasAnyRates && (
          <div onClick={() => { setRataStep("config"); setRataModal(true); }}
            style={{ display:'flex', alignItems:'center', gap:10, padding:'12px 14px', marginBottom:14, cursor:'pointer',
              background:T.redLight, border:`0.5px solid ${T.red}`, borderRadius: T.radiusSm }}>
            <span style={{ fontSize:15 }}>⚠️</span>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:12, fontWeight:600, color:T.ink }}>Suddivisione pagamenti mancante</div>
              <div style={{ fontFamily:"'IBM Plex Mono', monospace", fontSize:10, color:T.muted, marginTop:2 }}>Senza rate non puoi emettere {isFattura ? "fatture" : "proforma"}. Tocca per crearla.</div>
            </div>
            <span style={{ fontFamily:"'IBM Plex Mono', monospace", fontSize:10, letterSpacing:'0.08em', textTransform:'uppercase', color:T.red, whiteSpace:'nowrap' }}>Crea rate →</span>
          </div>
        )}
        {proforma.filter(p => !p.pagato).length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 8, letterSpacing: '0.2em', textTransform: 'uppercase', color: T.muted, marginBottom: 8 }}>Da pagare</div>
            <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr>{['N°','Data','Importo','Note',''].map(h => <th key={h} style={thSt}>{h}</th>)}</tr></thead>
              <tbody>
                {proforma.filter(p => !p.pagato).map(p => (
                  <tr key={p.id} onClick={() => setPreviewProforma(p)} style={{ cursor: 'pointer' }}>
                    <td style={tdSt}><span style={monoSt}>{p.numero_proforma}</span></td>
                    <td style={{ ...tdSt, ...monoSt }}>{p.data_creazione ? new Date(p.data_creazione).toLocaleDateString('it-IT') : '—'}</td>
                    <td style={{ ...tdSt, ...monoSt, fontWeight: 600 }}>{currency(p.importo_totale)}</td>
                    <td style={{ ...tdSt, color: T.muted, fontSize: 11 }}>{p.note || '—'}</td>
                    <td style={{ ...tdSt, textAlign: 'right' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'flex-end' }} onClick={e => e.stopPropagation()}>
                        <BtnPrimary onClick={() => openPagamentoProforma(p)} style={{ fontSize: 10, padding: '5px 10px' }}>Segna pagata</BtnPrimary>
                        <RowMenu open={openMenuId === p.id} onOpen={() => setOpenMenuId(p.id)} onClose={() => setOpenMenuId(null)}
                          items={[{ label: 'Modifica', onClick: () => openEditProforma(p) }, { label: 'Elimina', danger: true, onClick: () => handleDeleteProforma(p) }]} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>
        )}
        {proforma.filter(p => p.pagato).length > 0 && (
          <div>
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 8, letterSpacing: '0.2em', textTransform: 'uppercase', color: T.green, marginBottom: 8 }}>Pagate</div>
            <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr>{['N°','Fattura','Data pag.','Importo',''].map(h => <th key={h} style={thSt}>{h}</th>)}</tr></thead>
              <tbody>
                {proforma.filter(p => p.pagato).map(p => (
                  <tr key={p.id} onClick={() => setPreviewProforma(p)} style={{ cursor: 'pointer' }}>
                    <td style={tdSt}><span style={monoSt}>{p.numero_proforma}</span></td>
                    <td style={{ ...tdSt, ...monoSt }}>{p.numero_fattura || '—'}</td>
                    <td style={{ ...tdSt, ...monoSt }}>{p.data_pagamento ? new Date(p.data_pagamento).toLocaleDateString('it-IT') : '—'}</td>
                    <td style={{ ...tdSt, ...monoSt, fontWeight: 600, color: T.green }}>{currency(p.importo_totale)}</td>
                    <td style={{ ...tdSt, textAlign: 'right' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'flex-end' }} onClick={e => e.stopPropagation()}>
                        <button onClick={() => { setSelectedProforma(p); setRimuoviModal(true); }}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: T.muted }}>annulla pag.</button>
                        <RowMenu open={openMenuId === `paid-${p.id}`} onOpen={() => setOpenMenuId(`paid-${p.id}`)} onClose={() => setOpenMenuId(null)}
                          items={[{ label: 'Modifica', onClick: () => openEditProforma(p) }, { label: 'Elimina', danger: true, onClick: () => handleDeleteProforma(p) }]} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>
        )}
        {proforma.length === 0 && <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: T.muted, padding: '24px 0', textAlign: 'center' }}>{isFattura ? "Nessuna fattura" : "Nessuna proforma"}</div>}
      </Panel>

      {/* GRID COSTI + RATE */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 10 }}>
        <Panel>
          <SectionHeader title="Costi Extra" action={<BtnPrimary onClick={() => { setCostoForm({}); setCostoError(""); setCostoModal(true); }} style={{ fontSize: 10, padding: '5px 12px' }}>+ Aggiungi</BtnPrimary>} />
          {costiExtra.length === 0
            ? <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: T.muted, padding: '20px 0', textAlign: 'center' }}>Nessun costo extra</div>
            : <div style={{ overflowX: 'auto' }}><table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead><tr>{['Tipo','Importo','Stato',''].map(h => <th key={h} style={thSt}>{h}</th>)}</tr></thead>
                <tbody>
                  {costiExtra.map(c => (
                    <tr key={c.id}>
                      <td style={tdSt}>
                        <div style={{ fontSize: 12, fontWeight: 600 }}>{c.tipo_costo || 'Altro'}</div>
                        {c.description && <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: T.muted }}>{c.description}</div>}
                        {proformaPerCosto[c.id] && <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: T.navy }}>pf {proformaPerCosto[c.id].numero_proforma}</div>}
                      </td>
                      <td style={{ ...tdSt, ...monoSt, fontWeight: 600 }}>{currency(c.importo)}</td>
                      <td style={{ padding:'8px 14px', fontSize:11, fontFamily:"'IBM Plex Mono', monospace" }}>
                        {c.pagato ? (
                          <span style={{ color:T.green, fontSize:9, letterSpacing:'0.1em' }}>✓ PAGATO</span>
                        ) : (
                          <span style={{ color:T.muted, fontSize:9, letterSpacing:'0.1em' }}>IN ATTESA</span>
                        )}
                      </td>
                      <td style={tdSt}><RowMenu open={openMenuId === `costo-${c.id}`} onOpen={() => setOpenMenuId(`costo-${c.id}`)} onClose={() => setOpenMenuId(null)} items={[{ label: 'Modifica', onClick: () => openEditCosto(c) }, { label: 'Elimina', danger: true, onClick: () => handleDeleteCosto(c.id) }]} /></td>
                    </tr>
                  ))}
                </tbody>
                <tfoot><tr><td style={{ ...tdSt, ...monoSt, fontSize: 9, letterSpacing: '0.15em', textTransform: 'uppercase', color: T.muted }}>Totale</td><td style={{ ...tdSt, ...monoSt, fontWeight: 600 }}>{currency(totCostiExtra)}</td><td /></tr></tfoot>
              </table></div>
          }
        </Panel>

        <Panel>
          <SectionHeader title="Suddivisione Pagamenti" action={
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {hasAnyRates && !hasPaidRates && (
                <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: T.muted }}>elimina le rate esistenti per modificare</span>
              )}
              {hasAnyRates && hasPaidRates && (
                <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: T.muted }}>rate con pagamenti registrati</span>
              )}
              <BtnPrimary onClick={() => { setRataStep("config"); setRataModal(true); }} style={{ fontSize: 10, padding: '5px 12px' }} disabled={hasAnyRates}>+ Rate</BtnPrimary>
            </div>
          } />
          {suddivisione.length === 0
            ? <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: T.muted, padding: '20px 0', textAlign: 'center' }}>Nessuna rata</div>
            : <div style={{ overflowX: 'auto' }}><table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead><tr>{['Rata','Importo','Stato',''].map(h => <th key={h} style={thSt}>{h}</th>)}</tr></thead>
                <tbody>
                  {suddivisione.map((r, i) => {
                    const imp = r.importo_fisso || (importoBase * (Number(r.percentuale) || 0) / 100);
                    const pf = proformaPerRata[r.id];
                    return (
                      <tr key={r.id}>
                        <td style={tdSt}>
                          <div style={{ fontSize: 12, fontWeight: 600 }}>Rata {r.numero_rata || i + 1}</div>
                          {r.percentuale && <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: T.muted }}>{pct(r.percentuale)}</div>}
                          {pf && <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: T.navy }}>pf {pf.numero_proforma}</div>}
                        </td>
                        <td style={{ ...tdSt, ...monoSt, fontWeight: 600 }}>{currency(imp)}</td>
                        <td style={tdSt}>
                          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: r.pagato ? T.green : T.muted }}>{r.pagato ? '✓ Pagata' : 'In attesa'}</span>
                          {r.data_pagamento && <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: T.muted }}>{new Date(r.data_pagamento).toLocaleDateString('it-IT')}</div>}
                        </td>
                        <td style={tdSt}>
                          {r.pagato ? (
                            <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: T.muted, padding: '2px 8px' }}>—</span>
                          ) : (
                            <RowMenu open={openMenuId === `rata-${r.id}`} onOpen={() => setOpenMenuId(`rata-${r.id}`)} onClose={() => setOpenMenuId(null)} items={[{ label: 'Modifica', onClick: () => openEditRata(r) }, { label: 'Elimina', danger: true, onClick: () => handleDeleteRata(r.id) }]} />
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table></div>
          }
        </Panel>
      </div>

      {/* ── COLLABORATORI + COSTI INTERNI affiancati ── */}
      <div style={{ display:'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap:14, marginTop:14 }}>

        {/* COLLABORATORI ESTERNI */}
        <div style={{ background:T.surface, border:`0.5px solid ${T.border}`, minWidth:0, overflow:'hidden' }}>
          <div style={{ padding:'12px 16px', borderBottom:`0.5px solid ${T.border}`, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <div>
              <div style={{ fontSize:13, fontWeight:600, color:T.ink }}>Collaboratori esterni</div>
              <div style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:9, color:T.muted, marginTop:2 }}>
                {currency(totCollaboratori)} totale
              </div>
            </div>
            <button onClick={()=>setShowCollaboratori(p=>!p)} style={{ background:'none', border:`0.5px solid ${T.borderMd}`, borderRadius: T.radiusSm, cursor:'pointer', color:T.muted, fontFamily:"'IBM Plex Mono',monospace", fontSize:9, letterSpacing:'0.08em', textTransform:'uppercase', padding:'4px 10px' }}>
              {showCollaboratori ? 'Chiudi ↑' : `Vedi (${collaboratori.length}) ↓`}
            </button>
          </div>

          {showCollaboratori && (
            <>
              {collaboratori.length > 0 && (
                <table style={{ width:'100%', borderCollapse:'collapse' }}>
                  <thead><tr>{['Ruolo','Nome','Importo',''].map(h=><th key={h} style={thSt}>{h}</th>)}</tr></thead>
                  <tbody>
                    {collaboratori.map(c=>(
                      <tr key={c.id}>
                        <td style={{ ...tdSt, color:T.muted, fontFamily:"'IBM Plex Mono',monospace", fontSize:11 }}>{c.ruolo||'—'}</td>
                        <td style={{ ...tdSt, fontWeight:600, fontSize:12 }}>{c.nome_cognome}</td>
                        <td style={{ ...tdSt, fontFamily:"'IBM Plex Mono',monospace", fontWeight:600, fontSize:12 }}>{currency(c.importo)}</td>
                        <td style={tdSt}><RowMenu open={openMenuId===`collab-${c.id}`} onOpen={()=>setOpenMenuId(`collab-${c.id}`)} onClose={()=>setOpenMenuId(null)} items={[{label:'Modifica',onClick:()=>openEditCollab(c)},{label:'Elimina',danger:true,onClick:()=>handleDeleteCollab(c.id)}]}/></td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot><tr><td colSpan={2} style={{ ...tdSt, fontFamily:"'IBM Plex Mono',monospace", fontSize:9, color:T.muted }}>Totale</td><td style={{ ...tdSt, fontFamily:"'IBM Plex Mono',monospace", fontWeight:600 }}>{currency(totCollaboratori)}</td><td/></tr></tfoot>
                </table>
              )}
              {collaboratori.length === 0 && <div style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:11, color:T.muted, padding:'12px 16px', textAlign:'center' }}>Nessun collaboratore</div>}
            </>
          )}

          {/* Form aggiungi collaboratore */}
          <div style={{ padding:'10px 14px', borderTop:`0.5px solid ${T.border}` }}>
            <form onSubmit={handleAddCollab} style={{ display:'flex', flexDirection:'column', gap:8 }}>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                <Input value={newCollab.ruolo} onChange={e=>setNewCollab(p=>({...p,ruolo:e.target.value}))} placeholder="Ruolo"/>
                <Input value={newCollab.nome_cognome} onChange={e=>setNewCollab(p=>({...p,nome_cognome:e.target.value}))} placeholder="Nome e cognome" required/>
              </div>
              <div style={{ display:'flex', gap:8 }}>
                <Input type="number" value={newCollab.importo} onChange={e=>setNewCollab(p=>({...p,importo:e.target.value}))} placeholder="Importo €" style={{ flex:1, minWidth:0 }}/>
                <BtnPrimary type="submit" disabled={savingCollab} style={{ flexShrink:0 }}>+ Aggiungi</BtnPrimary>
              </div>
            </form>
          </div>
        </div>

        {/* COSTI INTERNI */}
        <div style={{ background:T.surface, border:`0.5px solid ${T.border}`, minWidth:0, overflow:'hidden' }}>
          <div style={{ padding:'12px 16px', borderBottom:`0.5px solid ${T.border}`, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <div>
              <div style={{ fontSize:13, fontWeight:600, color:T.ink }}>Costi interni</div>
              <div style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:9, color:T.muted, marginTop:2 }}>
                {currency(costiInterni.reduce((s,c)=>s+Number(c.importo),0))} · solo per analisi
              </div>
            </div>
            <button onClick={()=>setShowCostiInterni(p=>!p)} style={{ background:'none', border:`0.5px solid ${T.borderMd}`, borderRadius: T.radiusSm, cursor:'pointer', color:T.muted, fontFamily:"'IBM Plex Mono',monospace", fontSize:9, letterSpacing:'0.08em', textTransform:'uppercase', padding:'4px 10px' }}>
              {showCostiInterni ? 'Chiudi ↑' : `Vedi (${costiInterni.length}) ↓`}
            </button>
          </div>

          {showCostiInterni && (
            <>
              {costiInterni.length > 0 && (
                <div>
                  {costiInterni.map(c=>(
                    <div key={c.id} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'8px 14px', borderBottom:`0.5px solid ${T.border}` }}>
                      <div>
                        <div style={{ fontSize:12, color:T.ink, fontWeight:500 }}>{c.descrizione}</div>
                        <div style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:9, color:T.muted, marginTop:1 }}>
                          {c.nome_membro&&<span>{c.nome_membro} · </span>}
                          {c.data&&new Date(c.data).toLocaleDateString('it-IT')}
                        </div>
                      </div>
                      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                        <span style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:12, fontWeight:600, color:T.red }}>{currency(c.importo)}</span>
                        <button onClick={()=>handleDeleteCostoInterno(c.id)} style={{ background:'none', border:'none', cursor:'pointer', color:T.muted, fontSize:16 }}>×</button>
                      </div>
                    </div>
                  ))}
                  <div style={{ display:'flex', justifyContent:'flex-end', padding:'6px 14px', borderBottom:`0.5px solid ${T.border}` }}>
                    <span style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:11, color:T.muted }}>Totale: </span>
                    <span style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:12, fontWeight:600, color:T.red, marginLeft:8 }}>
                      {currency(costiInterni.reduce((s,c)=>s+Number(c.importo),0))}
                    </span>
                  </div>
                </div>
              )}
              {costiInterni.length === 0 && <div style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:11, color:T.muted, padding:'12px 16px', textAlign:'center' }}>Nessun costo interno</div>}
            </>
          )}

          {/* Form aggiungi costo interno */}
          <div style={{ padding:'10px 14px', borderTop:`0.5px solid ${T.border}` }}>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                <select value={newCostoInterno.team_member_id} onChange={e=>setNewCostoInterno(p=>({...p,team_member_id:e.target.value}))}
                  style={{ padding:'7px 8px', border:`0.5px solid ${T.borderMd}`, borderRadius: T.radiusSm, background:T.surface, color:T.ink, fontSize:11, fontFamily:"'IBM Plex Mono',monospace", outline:'none' }}>
                  <option value=''>— Membro —</option>
                  {teamMembers.map(m=><option key={m.id} value={m.id}>{m.user_name||m.user_email}</option>)}
                </select>
                <input type='date' value={newCostoInterno.data} onChange={e=>setNewCostoInterno(p=>({...p,data:e.target.value}))}
                  style={{ padding:'7px 8px', border:`0.5px solid ${T.borderMd}`, borderRadius: T.radiusSm, background:T.surface, color:T.ink, fontSize:11, fontFamily:"'IBM Plex Mono',monospace", outline:'none' }}/>
              </div>
              <div style={{ display:'flex', gap:8 }}>
                <input type='text' value={newCostoInterno.descrizione} onChange={e=>setNewCostoInterno(p=>({...p,descrizione:e.target.value}))}
                  onKeyDown={e=>{ if(e.key==='Enter') handleAddCostoInterno(); }}
                  placeholder='Descrizione spesa...'
                  style={{ flex:'2 1 0', minWidth:0, padding:'7px 10px', border:`0.5px solid ${T.borderMd}`, borderRadius: T.radiusSm, background:T.surface, color:T.ink, fontSize:12, fontFamily:"'Space Grotesk',sans-serif", outline:'none' }}/>
                <input type='number' min={0} step={0.01} value={newCostoInterno.importo} onChange={e=>setNewCostoInterno(p=>({...p,importo:e.target.value}))}
                  onKeyDown={e=>{ if(e.key==='Enter') handleAddCostoInterno(); }}
                  placeholder='€'
                  style={{ flex:'1 1 0', minWidth:0, padding:'7px 8px', border:`0.5px solid ${T.borderMd}`, borderRadius: T.radiusSm, background:T.surface, color:T.ink, fontSize:12, fontFamily:"'IBM Plex Mono',monospace", outline:'none' }}/>
                <button onClick={handleAddCostoInterno} disabled={savingCostoInt||!newCostoInterno.descrizione.trim()||!newCostoInterno.importo}
                  style={{ background:T.navy, border:'none', color:'#EEF1F6', cursor:'pointer', padding:'0 14px', fontSize:18, opacity:savingCostoInt||!newCostoInterno.descrizione.trim()||!newCostoInterno.importo?0.4:1 }}>
                  +
                </button>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* ════ MODALI ════ */}

      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Modifica Commessa">
        <form onSubmit={handleSaveEdit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[['numero_offerta','Numero offerta','text'],['nome_commessa','Nome commessa *','text'],['cliente','Cliente *','text'],['data_commessa','Data commessa','date'],['importo_offerta_base','Importo offerta base','number']].map(([f,l,t]) => (
            <div key={f}><FieldLabel>{l}</FieldLabel><Input type={t} value={editForm[f] ?? ""} onChange={e => setEditForm(p => ({ ...p, [f]: e.target.value }))} required={l.includes('*')} /></div>
          ))}
          <div><FieldLabel>Note amministrative</FieldLabel>
            <textarea value={editForm.note_amministrative ?? ""} onChange={e => setEditForm(p => ({ ...p, note_amministrative: e.target.value }))} rows={3}
              style={{ width: '100%', padding: '8px 10px', boxSizing: 'border-box', border: `1px solid ${T.borderMd}`, borderRadius: T.radiusSm, background: T.surface, color: T.ink, fontSize: 12, fontFamily: "'Space Grotesk', sans-serif", outline: 'none', resize: 'vertical' }} />
          </div>
          {editError && <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: T.red }}>{editError}</div>}
          <Divider /><div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}><BtnGhost onClick={() => setEditOpen(false)} disabled={editSaving}>Annulla</BtnGhost><BtnPrimary type="submit" disabled={editSaving}>{editSaving ? "Salvataggio..." : "Salva"}</BtnPrimary></div>
        </form>
      </Modal>

      <Modal open={costoModal} onClose={() => setCostoModal(false)} title="Nuovo Costo Extra" width={420}>
        <form onSubmit={handleSaveCosto} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div><FieldLabel>Tipo</FieldLabel>
            <select value={costoForm.tipo_costo ?? "Altro"} onChange={e => setCostoForm(p => ({ ...p, tipo_costo: e.target.value }))}
              style={{ width: '100%', padding: '7px 10px', border: `1px solid ${T.borderMd}`, borderRadius: T.radiusSm, background: T.surface, color: T.ink, fontSize: 12, fontFamily: "'Space Grotesk', sans-serif", outline: 'none' }}>
              {['Diritti','Trasferte','Marche da bollo','Altro'].map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
          <div><FieldLabel>Descrizione</FieldLabel><Input value={costoForm.description ?? ""} onChange={e => setCostoForm(p => ({ ...p, description: e.target.value }))} /></div>
          <div><FieldLabel>Importo *</FieldLabel><Input type="number" value={costoForm.importo ?? ""} onChange={e => setCostoForm(p => ({ ...p, importo: e.target.value }))} required /></div>
          <div><FieldLabel>Data</FieldLabel><Input type="date" value={costoForm.data_costo ?? new Date().toISOString().slice(0,10)} onChange={e => setCostoForm(p => ({ ...p, data_costo: e.target.value }))} /></div>
          {costoError && <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: T.red }}>{costoError}</div>}
          <Divider /><div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}><BtnGhost onClick={() => setCostoModal(false)} disabled={costoSaving}>Annulla</BtnGhost><BtnPrimary type="submit" disabled={costoSaving}>{costoSaving ? "Salvataggio..." : "Salva"}</BtnPrimary></div>
        </form>
      </Modal>

      {/* Avviso: dopo un Diritto, proponi di inserire la pratica nel progetto */}
      <Modal open={praticaPrompt} onClose={() => setPraticaPrompt(false)} title="Inserire una pratica?" width={420}>
        <div style={{ fontSize: 13, color: T.ink, lineHeight: 1.5, marginBottom: 4 }}>
          Hai registrato un costo come <strong>Diritti</strong>. Vuoi inserire anche la pratica corrispondente nel progetto collegato?
        </div>
        <Divider />
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <BtnGhost onClick={() => setPraticaPrompt(false)}>Non ora</BtnGhost>
          <BtnPrimary onClick={() => { setPraticaPrompt(false); navigate(`/progetti/${commessa.project_id}`, { state: { openPraticaForm: true } }); }}>Sì, apri pratiche</BtnPrimary>
        </div>
      </Modal>

      {/* ── ANTEPRIMA PROFORMA ── */}
      {previewProforma && (() => {
        const p = previewProforma;
        const rateIds = p.suddivisione_pagamento_ids || [];
        const costiIds = p.costo_extra_ids || [];
        const rateIncluse = suddivisione.filter(r => rateIds.includes(r.id));
        // cerca nelle altre commesse
        const rateAltreCommesse = Object.entries(altreCommesseData || {}).flatMap(([cid, d]) =>
          (d.suddivisione || []).filter(r => rateIds.includes(r.id)).map(r => ({ ...r, _commessaNome: altreCommesse.find(c => c.id === cid)?.nome_commessa }))
        );
        const tutteLeRate = [...rateIncluse, ...rateAltreCommesse];
        const costiInclusi = costiExtra.filter(c => costiIds.includes(c.id));
        return (
          <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
            onClick={e => { if (e.target === e.currentTarget) setPreviewProforma(null); }}>
            <div style={{ background: T.surface, border: `1px solid ${T.borderMd}`, width: '100%', maxWidth: 560, maxHeight: '85vh', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
              {/* header modale */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 24px 14px', borderBottom: `0.5px solid ${T.border}` }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: T.ink }}>{p.numero_proforma}</div>
                  <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: T.muted, marginTop: 2 }}>
                    {p.data_creazione ? new Date(p.data_creazione).toLocaleDateString('it-IT') : ''}
                    {p.pagato && <span style={{ marginLeft: 8, color: T.green }}>· Pagata</span>}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ fontSize: 18, fontWeight: 700, color: T.ink }}>{currency(p.importo_totale)}</div>
                  <button onClick={() => setPreviewProforma(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: T.muted, lineHeight: 1 }}>×</button>
                </div>
              </div>
              <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>
                {/* Rate */}
                <div>
                  <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: T.muted, marginBottom: 10 }}>
                    Rate incluse {tutteLeRate.length > 0 && `(${tutteLeRate.length})`}
                  </div>
                  {tutteLeRate.length === 0 ? (
                    <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: T.muted }}>Nessuna rata</div>
                  ) : tutteLeRate.map(r => (
                    <div key={r.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 12px', background: T.bg, border: `1px solid ${T.border}`, marginBottom: 4 }}>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: T.ink }}>
                          Rata {r.numero_rata}{r.descrizione ? ` — ${r.descrizione}` : ''}
                        </div>
                        {r._commessaNome && (
                          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: T.muted, marginTop: 1 }}>{r._commessaNome}</div>
                        )}
                        {r.percentuale != null && (
                          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: T.muted, marginTop: 1 }}>{r.percentuale}%</div>
                        )}
                      </div>
                      <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, fontWeight: 600, color: T.ink }}>
                        {currency(r.importo_fisso || (importoBase * (Number(r.percentuale) || 0) / 100))}
                      </div>
                    </div>
                  ))}
                </div>
                {/* Costi */}
                <div>
                  <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: T.muted, marginBottom: 10 }}>
                    Costi extra inclusi {costiInclusi.length > 0 && `(${costiInclusi.length})`}
                  </div>
                  {costiInclusi.length === 0 ? (
                    <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: T.muted }}>Nessun costo extra</div>
                  ) : costiInclusi.map(c => (
                    <div key={c.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 12px', background: T.bg, border: `1px solid ${T.border}`, marginBottom: 4 }}>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: T.ink }}>{c.tipo_costo}</div>
                        {c.description && <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: T.muted, marginTop: 1 }}>{c.description}</div>}
                      </div>
                      <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, fontWeight: 600, color: T.ink }}>{currency(c.importo)}</div>
                    </div>
                  ))}
                </div>
                {/* Note */}
                {p.note && (
                  <div>
                    <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: T.muted, marginBottom: 6 }}>Note</div>
                    <div style={{ fontSize: 12, color: T.ink, lineHeight: 1.6 }}>{p.note}</div>
                  </div>
                )}
                {/* Totale */}
                <div style={{ borderTop: `0.5px solid ${T.border}`, paddingTop: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: T.muted }}>Totale proforma</span>
                  <span style={{ fontSize: 18, fontWeight: 700, color: T.ink }}>{currency(p.importo_totale)}</span>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      <Modal open={proformaModal} onClose={() => setProformaModal(false)} title={isFattura ? "Nuova Fattura" : "Nuova Proforma"} subtitle={`Importo selezionato: ${currency(importoProformaSelezionata)}`} width={600}>
        <form onSubmit={handleSaveProforma} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div><FieldLabel>{isFattura ? "N° Fattura *" : "N° Proforma *"}</FieldLabel><Input value={proformaForm.numero_proforma} onChange={e => setProformaForm(p => ({ ...p, numero_proforma: e.target.value }))} required /></div>
            <div><FieldLabel>Data creazione</FieldLabel><Input type="date" value={proformaForm.data_creazione} onChange={e => setProformaForm(p => ({ ...p, data_creazione: e.target.value }))} /></div>
            <div><FieldLabel>Data scadenza *</FieldLabel><Input type="date" value={proformaForm.data_scadenza} onChange={e => setProformaForm(p => ({ ...p, data_scadenza: e.target.value }))} required /></div>
          </div>
          {suddivisione.length > 0 && (
            <div><FieldLabel>Rate da includere</FieldLabel>
              <div style={{ border: `1px solid ${T.border}`, borderRadius: T.radiusSm, background: T.bg, padding: '8px 12px', maxHeight: 160, overflowY: 'auto' }}>
                {suddivisione.map((r, i) => {
                  const imp = r.importo_fisso || (importoBase * (Number(r.percentuale) || 0) / 100);
                  const used = rateGiaUsate.has(r.id);
                  return (
                    <label key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0', cursor: used ? 'not-allowed' : 'pointer', opacity: used ? 0.4 : 1 }}>
                      <input type="checkbox" checked={proformaRateIds.includes(r.id)} disabled={used} onChange={() => setProformaRateIds(p => p.includes(r.id) ? p.filter(x => x !== r.id) : [...p, r.id])} style={{ accentColor: T.navy, width: 13, height: 13 }} />
                      <span style={{ fontSize: 12, color: T.ink }}>Rata {r.numero_rata || i + 1}{r.percentuale ? ` — ${pct(r.percentuale)}` : ''}</span>
                      <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: T.muted, marginLeft: 'auto' }}>{currency(imp)}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}
          {costiExtra.length > 0 && (
            <div><FieldLabel>Costi extra da includere</FieldLabel>
              <div style={{ border: `1px solid ${T.border}`, borderRadius: T.radiusSm, background: T.bg, padding: '8px 12px', maxHeight: 130, overflowY: 'auto' }}>
                {costiExtra.map(c => {
                  const used = costiGiaUsati.has(c.id);
                  return (
                    <label key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0', cursor: used ? 'not-allowed' : 'pointer', opacity: used ? 0.4 : 1 }}>
                      <input type="checkbox" checked={proformaCostiIds.includes(c.id)} disabled={used} onChange={() => setProformaCostiIds(p => p.includes(c.id) ? p.filter(x => x !== c.id) : [...p, c.id])} style={{ accentColor: T.navy, width: 13, height: 13 }} />
                      <span style={{ fontSize: 12, color: T.ink }}>{c.tipo_costo || '—'}{c.description ? ` — ${c.description}` : ''}</span>
                      <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: T.muted, marginLeft: 'auto' }}>{currency(c.importo)}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}
          {altreCommesse.map(ac => {
            const acData = altreCommesseData[ac.id] || { suddivisione: [], costiExtra: [] };
            if (acData.suddivisione.length === 0 && acData.costiExtra.length === 0) return null;
            return (
              <div key={ac.id} style={{ marginTop: 16 }}>
                <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: T.muted, marginBottom: 8, paddingBottom: 6, borderBottom: `0.5px solid ${T.border}` }}>
                  {ac.nome_commessa}
                </div>
                {acData.suddivisione.map(r => {
                  const checked = proformaRateIds.includes(r.id);
                  const used = rateGiaUsate.has(r.id);
                  return (
                    <label key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', cursor: used ? 'not-allowed' : 'pointer', opacity: used ? 0.5 : 1 }}>
                      <input type="checkbox" checked={checked} disabled={used}
                        onChange={e => setProformaRateIds(p => e.target.checked ? [...p, r.id] : p.filter(x => x !== r.id))}
                        style={{ accentColor: T.navy }} />
                      <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: T.ink }}>
                        {r.label || (r.numero_rata != null ? `Rata ${r.numero_rata}` : '—')} — {r.importo_fisso ? new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(r.importo_fisso) : `${r.percentuale ?? '?'}%`}
                      </span>
                    </label>
                  );
                })}
                {acData.costiExtra.map(ce => {
                  const checked = proformaCostiIds.includes(ce.id);
                  const used = costiGiaUsati.has(ce.id);
                  return (
                    <label key={ce.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', cursor: used ? 'not-allowed' : 'pointer', opacity: used ? 0.5 : 1 }}>
                      <input type="checkbox" checked={checked} disabled={used}
                        onChange={e => setProformaCostiIds(p => e.target.checked ? [...p, ce.id] : p.filter(x => x !== ce.id))}
                        style={{ accentColor: T.navy }} />
                      <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: T.ink }}>
                        {ce.descrizione} — {new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(ce.importo)}
                      </span>
                    </label>
                  );
                })}
              </div>
            );
          })}
          <div><FieldLabel>Note</FieldLabel><Input value={proformaForm.note} onChange={e => setProformaForm(p => ({ ...p, note: e.target.value }))} /></div>
          {proformaError && <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: T.red }}>{proformaError}</div>}
          <Divider /><div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}><BtnGhost onClick={() => setProformaModal(false)} disabled={proformaSaving}>Annulla</BtnGhost><BtnPrimary type="submit" disabled={proformaSaving}>{proformaSaving ? "Salvataggio..." : "Salva"}</BtnPrimary></div>
        </form>
      </Modal>

      <Modal open={pagProformaModal} onClose={() => setPagProformaModal(false)} title="Conferma Pagamento" subtitle={selectedProforma ? `${isFattura ? "Fattura" : "Proforma"} ${selectedProforma.numero_proforma} — ${currency(selectedProforma.importo_totale)}` : ""} width={420}>
        <form onSubmit={handleSavePagamento} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div><FieldLabel>N° Fattura</FieldLabel><Input value={pagProformaData.numero_fattura} onChange={e => setPagProformaData(p => ({ ...p, numero_fattura: e.target.value }))} /></div>
          <div><FieldLabel>Data Pagamento</FieldLabel><Input type="date" value={pagProformaData.data_pagamento} onChange={e => setPagProformaData(p => ({ ...p, data_pagamento: e.target.value }))} /></div>
          <Divider /><div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}><BtnGhost onClick={() => setPagProformaModal(false)} disabled={pagProformaSaving}>Annulla</BtnGhost><BtnPrimary type="submit" disabled={pagProformaSaving}>{pagProformaSaving ? "Salvataggio..." : "Segna pagata"}</BtnPrimary></div>
        </form>
      </Modal>

      <Modal open={rimuoviModal} onClose={() => setRimuoviModal(false)} title="Annulla pagamento?" width={380}>
        <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: T.muted, lineHeight: 1.7, marginBottom: 20 }}>
          La proforma <strong style={{ color: T.ink }}>{selectedProforma?.numero_proforma}</strong> tornerà allo stato "Da pagare".
        </p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}><BtnGhost onClick={() => setRimuoviModal(false)} disabled={rimuoviSaving}>Annulla</BtnGhost><BtnGhost danger onClick={handleRimuoviPagamento} disabled={rimuoviSaving}>{rimuoviSaving ? "..." : "Conferma"}</BtnGhost></div>
      </Modal>

      <Modal open={rataModal} onClose={() => { setRataModal(false); setRataStep("config"); }} title="Genera Rate" subtitle={rataStep === "config" ? "Configura la suddivisione" : "Modifica le rate"} width={500}>
        {rataStep === "config" ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div><FieldLabel>Modalità</FieldLabel>
              <div style={{ display: 'flex', gap: 16 }}>
                {[['percentuale','Percentuale'],['importo','Importo fisso']].map(([v,l]) => (
                  <label key={v} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: T.ink }}>
                    <input type="radio" checked={rataMode === v} onChange={() => setRataMode(v)} style={{ accentColor: T.navy }} />{l}
                  </label>
                ))}
              </div>
            </div>
            <div><FieldLabel>Numero di rate</FieldLabel><Input type="number" value={rataCount} onChange={e => setRataCount(e.target.value)} /></div>
            <Divider /><div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}><BtnGhost onClick={() => setRataModal(false)}>Lo farò dopo</BtnGhost><BtnPrimary onClick={initRateRows}>Avanti →</BtnPrimary></div>
          </div>
        ) : (
          <form onSubmit={handleSaveRate} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 8, marginBottom: 4 }}>
              {['Rata', rataMode === 'percentuale' ? '%' : '€'].map(h => (
                <div key={h} style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 8, letterSpacing: '0.2em', textTransform: 'uppercase', color: T.muted }}>{h}</div>
              ))}
            </div>
            {rateRows.map((r, i) => (
              <div key={i} style={{ display:'grid', gridTemplateColumns:'2fr 1fr', gap:8 }}>
                <div style={{ padding:'8px 12px', border:`0.5px solid ${T.border}`, borderRadius: T.radiusSm, background:T.surface2, fontFamily:"'IBM Plex Mono', monospace", fontSize:12, color:T.muted, display:'flex', alignItems:'center' }}>
                  {r.label}
                </div>
                <Input
                  type="number"
                  value={r.value}
                  onChange={e => handleRataValueChange(i, e.target.value)}
                  disabled={i === rateRows.length - 1}
                  style={{ background: i === rateRows.length - 1 ? T.surface2 : T.inputBg, color: i === rateRows.length - 1 ? T.muted : T.inputText }}
                />
              </div>
            ))}
            {(() => {
              const totale = rataMode === "percentuale" ? 100 : importoBase;
              const somma = rateRows.reduce((s,r) => s + (parseFloat(r.value)||0), 0);
              const ok = Math.abs(somma - totale) < 0.1;
              return (
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 0', borderTop:`0.5px solid ${T.border}` }}>
                  <span style={{ fontFamily:"'IBM Plex Mono', monospace", fontSize:10, color:T.muted }}>Totale</span>
                  <span style={{ fontFamily:"'IBM Plex Mono', monospace", fontSize:12, fontWeight:600, color: ok ? T.green : T.red }}>
                    {rataMode === "percentuale" ? `${somma.toFixed(1)}%` : currency(somma)}
                    {!ok && ` ≠ ${rataMode === "percentuale" ? "100%" : currency(totale)}`}
                  </span>
                </div>
              );
            })()}
            {rataError && <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: T.red }}>{rataError}</div>}
            <Divider />
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
              <BtnGhost onClick={() => { setRataStep("config"); setRataError(""); }}>← Indietro</BtnGhost>
              <div style={{ display: 'flex', gap: 10 }}><BtnGhost onClick={() => setRataModal(false)} disabled={rataSaving}>Annulla</BtnGhost><BtnPrimary type="submit" disabled={rataSaving}>{rataSaving ? "Salvataggio..." : "Salva rate"}</BtnPrimary></div>
            </div>
          </form>
        )}
      </Modal>

      <Modal open={editRataModal} onClose={() => setEditRataModal(false)} title="Modifica Rata" width={420}>
        {editRataData?.pagato ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: T.muted, background: T.surface2, border: `1px solid ${T.border}`, borderRadius: T.radiusSm, padding: '12px 14px', lineHeight: 1.7 }}>
              Questa rata è già stata pagata e non può essere modificata.<br />
              Per apportare modifiche, annulla prima il pagamento dalla proforma associata.
            </div>
            <Divider /><div style={{ display: 'flex', justifyContent: 'flex-end' }}><BtnGhost onClick={() => setEditRataModal(false)}>Chiudi</BtnGhost></div>
          </div>
        ) : (
          <form onSubmit={handleSaveRata} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div><FieldLabel>Percentuale</FieldLabel><Input type="number" value={editRataForm.percentuale ?? ""} onChange={e => setEditRataForm(p => ({ ...p, percentuale: e.target.value }))} /></div>
            <div><FieldLabel>Importo fisso</FieldLabel><Input type="number" value={editRataForm.importo_fisso ?? ""} onChange={e => setEditRataForm(p => ({ ...p, importo_fisso: e.target.value }))} /></div>
            <div><FieldLabel>Data pagamento</FieldLabel><Input type="date" value={editRataForm.data_pagamento ?? ""} onChange={e => setEditRataForm(p => ({ ...p, data_pagamento: e.target.value }))} /></div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: T.ink }}>
              <input type="checkbox" checked={editRataForm.pagato ?? false} onChange={e => setEditRataForm(p => ({ ...p, pagato: e.target.checked }))} style={{ accentColor: T.navy }} />Segna come pagata
            </label>
            <Divider /><div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}><BtnGhost onClick={() => setEditRataModal(false)} disabled={editRataSaving}>Annulla</BtnGhost><BtnPrimary type="submit" disabled={editRataSaving}>{editRataSaving ? "Salvataggio..." : "Salva"}</BtnPrimary></div>
          </form>
        )}
      </Modal>

      <Modal open={editCostoModal} onClose={() => setEditCostoModal(false)} title="Modifica Costo Extra" width={420}>
        <form onSubmit={handleSaveCostoEdit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div><FieldLabel>Tipo</FieldLabel><Input value={editCostoForm.tipo_costo ?? ""} onChange={e => setEditCostoForm(p => ({ ...p, tipo_costo: e.target.value }))} /></div>
          <div><FieldLabel>Descrizione</FieldLabel><Input value={editCostoForm.description ?? ""} onChange={e => setEditCostoForm(p => ({ ...p, description: e.target.value }))} /></div>
          <div><FieldLabel>Importo</FieldLabel><Input type="number" value={editCostoForm.importo ?? ""} onChange={e => setEditCostoForm(p => ({ ...p, importo: e.target.value }))} /></div>
          <div><FieldLabel>Data</FieldLabel><Input type="date" value={editCostoForm.data_costo ?? ""} onChange={e => setEditCostoForm(p => ({ ...p, data_costo: e.target.value }))} /></div>
          <Divider /><div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}><BtnGhost onClick={() => setEditCostoModal(false)} disabled={editCostoSaving}>Annulla</BtnGhost><BtnPrimary type="submit" disabled={editCostoSaving}>{editCostoSaving ? "Salvataggio..." : "Salva"}</BtnPrimary></div>
        </form>
      </Modal>

      <Modal open={editCollabModal} onClose={() => setEditCollabModal(false)} title="Modifica Collaboratore" width={420}>
        <form onSubmit={handleSaveCollab} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div><FieldLabel>Ruolo</FieldLabel><Input value={editCollabForm.ruolo ?? ""} onChange={e => setEditCollabForm(p => ({ ...p, ruolo: e.target.value }))} /></div>
          <div><FieldLabel>Nome e cognome</FieldLabel><Input value={editCollabForm.nome_cognome ?? ""} onChange={e => setEditCollabForm(p => ({ ...p, nome_cognome: e.target.value }))} /></div>
          <div><FieldLabel>Importo</FieldLabel><Input type="number" value={editCollabForm.importo ?? ""} onChange={e => setEditCollabForm(p => ({ ...p, importo: e.target.value }))} /></div>
          <Divider /><div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}><BtnGhost onClick={() => setEditCollabModal(false)} disabled={editCollabSaving}>Annulla</BtnGhost><BtnPrimary type="submit" disabled={editCollabSaving}>{editCollabSaving ? "Salvataggio..." : "Salva"}</BtnPrimary></div>
        </form>
      </Modal>

      <Modal open={editProformaModal} onClose={() => setEditProformaModal(false)} title={isFattura ? "Modifica Fattura" : "Modifica Proforma"} width={420}>
        <form onSubmit={handleSaveEditProforma} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div><FieldLabel>{isFattura ? "N° Fattura" : "N° Proforma"}</FieldLabel><Input value={editProformaForm.numero_proforma ?? ""} onChange={e => setEditProformaForm(p => ({ ...p, numero_proforma: e.target.value }))} /></div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div><FieldLabel>Data creazione</FieldLabel><Input type="date" value={editProformaForm.data_creazione ?? ""} onChange={e => setEditProformaForm(p => ({ ...p, data_creazione: e.target.value }))} /></div>
            <div><FieldLabel>Data scadenza</FieldLabel><Input type="date" value={editProformaForm.data_scadenza ?? ""} onChange={e => setEditProformaForm(p => ({ ...p, data_scadenza: e.target.value }))} /></div>
          </div>
          {editProformaData?.pagato && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div><FieldLabel>N° Fattura</FieldLabel><Input value={editProformaForm.numero_fattura ?? ""} onChange={e => setEditProformaForm(p => ({ ...p, numero_fattura: e.target.value }))} /></div>
              <div><FieldLabel>Data pagamento</FieldLabel><Input type="date" value={editProformaForm.data_pagamento ?? ""} onChange={e => setEditProformaForm(p => ({ ...p, data_pagamento: e.target.value }))} /></div>
            </div>
          )}
          <div><FieldLabel>Note</FieldLabel><Input value={editProformaForm.note ?? ""} onChange={e => setEditProformaForm(p => ({ ...p, note: e.target.value }))} /></div>
          <Divider /><div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}><BtnGhost onClick={() => setEditProformaModal(false)} disabled={editProformaSaving}>Annulla</BtnGhost><BtnPrimary type="submit" disabled={editProformaSaving}>{editProformaSaving ? "Salvataggio..." : "Salva"}</BtnPrimary></div>
        </form>
      </Modal>

      {/* ── MODAL ELIMINA COMMESSA ───────────────────────────────── */}
      <Modal open={deleteCommessaModal} onClose={() => !deletingSaving && setDeleteCommessaModal(false)} title="Elimina commessa" width={420}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: T.ink, lineHeight: 1.6 }}>
            Sei sicuro di voler eliminare la commessa <strong>{commessa?.nome_commessa}</strong>?
          </div>
          {commessa?.numero_offerta ? (
            <>
              <div style={{ background: T.surface2, border: `1px solid ${T.border}`, padding: '12px 14px' }}>
                <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>Offerta collegata — N° {commessa.numero_offerta}</div>
                <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: T.muted }}>Vuoi eliminare anche l'offerta collegata?</div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  disabled={deletingSaving}
                  onClick={async () => {
                    setDeletingSaving(true);
                    const { error } = await supabase.rpc('elimina_commessa', { p_commessa_id: commessaId });
                    if (error) { showToast('Errore: ' + error.message); setDeletingSaving(false); return; }
                    await supabase.from('offerte').update({ deleted_at: new Date().toISOString() }).eq('studio', commessa.studio).eq('numero_offerta', commessa.numero_offerta).is('deleted_at', null);
                    navigate('/commesse');
                  }}
                  style={{ flex: 1, padding: '9px 10px', background: '#b91c1c', color: '#fff', border: 'none', cursor: 'pointer', fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', opacity: deletingSaving ? 0.6 : 1 }}
                >
                  {deletingSaving ? '...' : 'Sì, elimina entrambe'}
                </button>
                <button
                  disabled={deletingSaving}
                  onClick={async () => {
                    setDeletingSaving(true);
                    const { error } = await supabase.rpc('elimina_commessa', { p_commessa_id: commessaId });
                    if (error) { showToast('Errore: ' + error.message); setDeletingSaving(false); return; }
                    navigate('/commesse');
                  }}
                  style={{ flex: 1, padding: '9px 10px', background: 'transparent', color: T.ink, border: `1px solid ${T.borderMd}`, cursor: 'pointer', fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', opacity: deletingSaving ? 0.6 : 1 }}
                >
                  {deletingSaving ? '...' : 'No, solo la commessa'}
                </button>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <BtnGhost onClick={() => setDeleteCommessaModal(false)} disabled={deletingSaving}>Annulla</BtnGhost>
              </div>
            </>
          ) : (
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <BtnGhost onClick={() => setDeleteCommessaModal(false)} disabled={deletingSaving}>Annulla</BtnGhost>
              <button
                disabled={deletingSaving}
                onClick={async () => {
                  setDeletingSaving(true);
                  const { error } = await supabase.rpc('elimina_commessa', { p_commessa_id: commessaId });
                  if (error) { showToast('Errore: ' + error.message); setDeletingSaving(false); return; }
                  navigate('/commesse');
                }}
                style={{ padding: '8px 18px', background: '#b91c1c', color: '#fff', border: 'none', cursor: 'pointer', fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', opacity: deletingSaving ? 0.6 : 1 }}
              >
                {deletingSaving ? 'Eliminazione...' : 'Elimina'}
              </button>
            </div>
          )}
        </div>
      </Modal>

    </div>
  );
}
