/**
 * Migration script: Base44 → Supabase
 * Usage: node migrate-base44-to-supabase.mjs
 */

import { createClient as createBase44Client } from "@base44/sdk";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createHash } from "crypto";
import https from "https";

// ── CONFIG ────────────────────────────────────────────────────────
const BASE44_APP_ID  = "697255032d967aa9ffcaa1f8";
const BASE44_API_KEY = "af1c5cdf479a467abd9d924d3f395850";
const SUPABASE_URL   = "https://rwysezttfgdicpvymeiw.supabase.co";
const SUPABASE_KEY   = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ3eXNlenR0ZmdkaWNwdnltZWl3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzAyNTQ2NCwiZXhwIjoyMDkyNjAxNDY0fQ.UI8mYj0FLzoIdS30gW6VZFzNzuT8AStmVAcin8eGEPk";
const STUDIO_ID      = "fef25156-bc74-47e7-9221-2ba7a73f359d";

// ── CLIENTS ───────────────────────────────────────────────────────
// Platform token (from localStorage on base44.app)
const BASE44_PLATFORM_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjb3Z5OTZAZ21haWwuY29tIiwiZXhwIjoxNzc5OTcxMDYyLCJpYXQiOjE3NzczNzkwNjIsImF1ZCI6InBsYXRmb3JtIn0.JHYPP98-n7jx4S7qdUje0Q5Fg2W8rN7gfTnvP0S0Rb4";

// Will be filled after exchanging platform token for app token
let base44;
const supabase = createSupabaseClient(SUPABASE_URL, SUPABASE_KEY);

// ── ID MAPPING ────────────────────────────────────────────────────
// Deterministic UUID from Base44 ID — same input always gives same UUID
// so upserts work correctly on re-runs and FK references stay stable.
const MIGRATION_NS = "sp-manager-migration-v1:";
const idMap = new Map();
function mapId(b44Id) {
  if (!b44Id) return null;
  if (!idMap.has(b44Id)) {
    const h = createHash("sha256").update(MIGRATION_NS + b44Id).digest("hex");
    const uuid = `${h.slice(0,8)}-${h.slice(8,12)}-4${h.slice(13,16)}-${
      ((parseInt(h.slice(16,18), 16) & 0x3f) | 0x80).toString(16)}${h.slice(18,20)}-${h.slice(20,32)}`;
    idMap.set(b44Id, uuid);
  }
  return idMap.get(b44Id);
}
function mid(b44Id) { return mapId(b44Id); }

// Maps Base44 user IDs → Supabase team_member UUIDs (built at runtime)
const userMap = new Map();
// Maps normalized name → Supabase team_member UUID (built at runtime)
const nameToSbIdGlobal = new Map();
function nkName(s) {
  return (s||"").toLowerCase().trim().normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/\s+/g," ");
}

// ── HELPERS ───────────────────────────────────────────────────────
function clean(obj) {
  // Remove null/undefined keys to avoid Supabase constraint errors
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined && v !== null && v !== ""));
}
function date(v) {
  if (!v) return null;
  try {
    const d = new Date(v);
    if (isNaN(d.getTime())) return null;
    const iso = d.toISOString().split("T")[0];
    const y = parseInt(iso);
    if (y < 1900 || y > 2100) return null;
    return iso;
  } catch { return null; }
}
function ts(v) {
  if (!v) return null;
  try { return new Date(v).toISOString(); } catch { return null; }
}
function num(v) { return v !== undefined && v !== null && v !== "" ? Number(v) || 0 : 0; }
function bool(v) { return Boolean(v); }

// ── ENTITY FETCH ──────────────────────────────────────────────────
async function fetchAll(entityName) {
  // Try asServiceRole first, fall back to regular entities access
  const attempts = [
    () => base44.asServiceRole.entities[entityName].list(),
    () => base44.entities[entityName].list(),
  ];
  for (const attempt of attempts) {
    try {
      const records = await attempt();
      console.log(`  ✓ ${entityName}: ${records.length} records`);
      return records || [];
    } catch (e) {
      if (e.message?.includes("Service token")) continue; // try next
      console.warn(`  ⚠ ${entityName}: fetch failed — ${e.message}`);
      return [];
    }
  }
  console.warn(`  ⚠ ${entityName}: all auth methods failed`);
  return [];
}

// ── SUPABASE INSERT ───────────────────────────────────────────────
async function upsertAll(table, rows, label) {
  if (!rows.length) { console.log(`  — ${label}: no rows to insert`); return; }
  let ok = 0, fail = 0;
  for (const row of rows) {
    const { error } = await supabase.from(table).upsert(row, { onConflict: "id" });
    if (error) {
      console.error(`  ✗ ${label} [${row.id}]: ${error.message}`);
      fail++;
    } else ok++;
  }
  console.log(`  ✓ ${label} → ${table}: ${ok} ok${fail ? `, ${fail} failed` : ""}`);
}

// ── MAPPERS ───────────────────────────────────────────────────────
// NOTE: All Base44 fields are snake_case (not camelCase).

function mapGlobalContact(r) {
  return clean({
    id:         mid(r.id),
    studio:     STUDIO_ID,
    full_name:  r.full_name || r.nome || r.name || "—",
    company:    r.company || r.azienda || null,
    email:      r.email || null,
    phone:      r.phone || r.telefono || null,
    notes:      r.notes || r.note || null,
    created_at: ts(r.created_date),
  });
}

function mapCommessa(r) {
  return clean({
    id:                   mid(r.id),
    studio:               STUDIO_ID,
    project_id:           mid(r.project_id),
    nome_commessa:        r.nome_commessa || r.nome || r.name || "—",
    cliente:              r.cliente || null,
    numero_offerta:       r.numero_offerta || `C-${String(r.id||"").slice(-6)}`,
    importo_offerta_base: num(r.importo_offerta_base),
    importo_totale:       num(r.importo_totale || r.importo_offerta_base),
    importo_incassato:    num(r.importo_incassato || 0),
    data_commessa:        date(r.data_commessa),
    note_amministrative:  r.note_amministrative || null,
    archived:             bool(r.archived),
    stato_pagamento:      r.stato_pagamento || "non_iniziato",
    created_at:           ts(r.created_date),
  });
}

// b44EmailToSbId is built at runtime in main()
const b44EmailToSbId = new Map();

function mapProject(r, commessaIdOverride) {
  // assigned_users in Base44 = array of gmail/personal emails → map to Supabase team_member UUIDs
  const assignedUsers = Array.isArray(r.assigned_users)
    ? r.assigned_users.map(e => b44EmailToSbId.get(e)).filter(Boolean)
    : [];
  return clean({
    id:            mid(r.id),
    studio:        STUDIO_ID,
    commessa_id:   commessaIdOverride || null,
    name:          r.name || "—",
    client:        r.client || null,
    status:        r.status || "planning",
    gantt_enabled: bool(r.gantt_enabled),
    archived:      bool(r.archived),
    start_date:    date(r.start_date),
    end_date:      date(r.end_date),
    assigned_users: assignedUsers.length ? assignedUsers : undefined,
    created_at:    ts(r.created_date),
  });
}

function mapTask(r) {
  const assignedMember =
    (r.assigned_member && userMap.get(r.assigned_member)) ||
    (r.assigned_to_name && nameToSbIdGlobal.get(nkName(r.assigned_to_name))) ||
    null;
  return clean({
    id:              mid(r.id),
    studio:          STUDIO_ID,
    project_id:      mid(r.project_id),
    parent_task_id:  mid(r.parent_task_id),
    title:           r.title || "—",
    description:     r.description || null,
    status:          r.status || "todo",
    assigned_member: assignedMember,
    assigned_to_name: r.assigned_to_name || null,
    data_pianificata: date(r.data_pianificata),
    order:           num(r.order || 0),
    created_at:      ts(r.created_date),
  });
}

function mapTimesheet(r) {
  return clean({
    id:          mid(r.id),
    studio:      STUDIO_ID,
    project_id:  mid(r.project_id),
    team_member: userMap.get(r.team_member) || null,
    date:        date(r.date),
    hours:       num(r.hours),
    task_id:     mid(r.task_id),
    created_at:  ts(r.created_date),
  });
}

function mapPagamento(r) {
  return clean({
    id:             mid(r.id),
    studio:         STUDIO_ID,
    commessa_id:    mid(r.commessa_id),
    importo:        num(r.importo),
    data_pagamento: date(r.data_pagamento || r.created_date) || new Date().toISOString().split("T")[0],
    created_at:     ts(r.created_date),
  });
}

function mapProforma(r) {
  return clean({
    id:                       mid(r.id),
    studio:                   STUDIO_ID,
    commessa_id:              mid(r.commessa_id),
    numero_proforma:          r.numero_proforma || `P-${String(r.id||"").slice(-6)}`,
    data_creazione:           date(r.data_creazione || r.created_date) || new Date().toISOString().split("T")[0],
    data_scadenza:            date(r.data_scadenza || r.data_creazione || r.created_date) || new Date().toISOString().split("T")[0],
    data_pagamento:           date(r.data_pagamento) || null,
    numero_fattura:           r.numero_fattura || null,
    importo_totale:           num(r.importo_totale),
    pagato:                   bool(r.pagato),
    note:                     r.note || null,
    suddivisione_pagamento_ids: Array.isArray(r.suddivisione_pagamento_ids)
      ? r.suddivisione_pagamento_ids.map(mid).filter(Boolean)
      : null,
    costo_extra_ids:          Array.isArray(r.costo_extra_ids)
      ? r.costo_extra_ids.map(mid).filter(Boolean)
      : null,
    created_at:               ts(r.created_date),
  });
}

function mapCostoExtra(r) {
  return clean({
    id:          mid(r.id),
    studio:      STUDIO_ID,
    commessa_id: mid(r.commessa_id),
    description: r.description || null,
    importo:     num(r.importo),
    tipo_costo:  r.tipo_costo || "Altro",
    data_costo:  date(r.data_costo || r.created_date) || new Date().toISOString().split("T")[0],
    pagato:      bool(r.pagato),
    created_at:  ts(r.created_date),
  });
}

function mapLavorazioneGantt(r) {
  return clean({
    id:            mid(r.id),
    studio:        STUDIO_ID,
    project_id:    mid(r.project_id),
    descrizione:   r.descrizione || r.description || r.title || "—",
    operatore:     r.operatore || null,
    dipendenza_id: mid(r.dipendenza_id),
    data_inizio:   date(r.data_inizio) || new Date().toISOString().split("T")[0],
    data_fine:     date(r.data_fine) || new Date().toISOString().split("T")[0],
    durata_giorni: num(r.durata_giorni) || 1,
    order:         num(r.order || 0),
  });
}

function mapSuddivisionePagamento(r) {
  return clean({
    id:             mid(r.id),
    studio:         STUDIO_ID,
    commessa_id:    mid(r.commessa_id),
    percentuale:    r.percentuale !== null && r.percentuale !== undefined ? num(r.percentuale) : null,
    importo_fisso:  r.importo_fisso !== null && r.importo_fisso !== undefined ? num(r.importo_fisso) : null,
    pagato:         bool(r.pagato),
    data_pagamento: date(r.data_pagamento) || null,
    order:          num(r.order || 0),
    created_at:     ts(r.created_date),
  });
}

function mapProjectContact(r) {
  return clean({
    id:                mid(r.id),
    project_id:        mid(r.project_id),
    global_contact_id: mid(r.global_contact_id || r.contact_id),
    professional_role: r.professional_role || r.ruolo || r.role || "Contatto",
  });
}

function mapCollaboratoreEsterno(r) {
  return clean({
    id:           mid(r.id),
    studio:       STUDIO_ID,
    commessa_id:  mid(r.commessa_id),
    nome_cognome: r.nome_cognome || r.nome || r.name || "—",
    ruolo:        r.ruolo || null,
    importo:      num(r.importo || r.compenso),
  });
}

function mapAziendaEsterna(r) {
  return clean({
    id:           mid(r.id),
    studio:       STUDIO_ID,
    commessa_id:  mid(r.commessa_id),
    nome_cognome: r.nome || r.name || r.ragione_sociale || "—",
    ruolo:        r.ruolo || "Azienda Esterna",
    importo:      num(r.importo || r.costo),
  });
}

// Fattura not in Base44 app schema — placeholder
function mapFattura(r) {
  return clean({
    id:             mid(r.id),
    studio:         STUDIO_ID,
    commessa_id:    mid(r.commessa_id),
    numero:         r.numero || null,
    data_emissione: date(r.data_emissione || r.created_date),
    importo:        num(r.importo),
    pagato:         bool(r.pagato),
    created_at:     ts(r.created_date),
  });
}

// Offerte not in Base44 app schema — placeholder (no rows to insert)
function mapOfferta(r) {
  return clean({
    id:             mid(r.id),
    studio:         STUDIO_ID,
    numero_offerta: r.numero_offerta || r.numero || null,
    cliente:        r.cliente || null,
    importo:        num(r.importo),
    stato:          r.stato || "bozza",
    data:           date(r.data || r.created_date),
    created_at:     ts(r.created_date),
  });
}

// ── MAIN ──────────────────────────────────────────────────────────
async function main() {
  console.log("\n🚀 Starting Base44 → Supabase migration\n");
  console.log(`   Studio: ${STUDIO_ID}`);
  console.log(`   Base44 App: ${BASE44_APP_ID}\n`);

  // ── EXCHANGE PLATFORM TOKEN FOR APP TOKEN ────────────────────
  console.log("🔑 Exchanging platform token for app token...");
  const appTokenResp = await fetch(
    `https://base44.app/api/apps/${BASE44_APP_ID}/auth/token`,
    { headers: { Authorization: `Bearer ${BASE44_PLATFORM_TOKEN}` } }
  );
  if (!appTokenResp.ok) {
    console.error("   ✗ Could not get app token:", await appTokenResp.text());
    process.exit(1);
  }
  const { token: appToken } = await appTokenResp.json();
  console.log("   ✓ App token obtained\n");

  base44 = createBase44Client({
    appId: BASE44_APP_ID,
    apiKey: BASE44_API_KEY,
    token: appToken,
    serviceToken: appToken,
  });

  // ── PHASE 1: Fetch all data ──────────────────────────────────
  console.log("📥 Fetching from Base44...");
  const [
    globalContacts,
    aziendeEsterne,
    commesse,
    projects,
    tasks,
    timesheets,
    pagamenti,
    proformas,
    fatture,
    offerte,
    collaboratoriEsterni,
    costiExtra,
    costiInterni,
    praticheEdilizie,
    notes,
    lavorazioniGantt,
    suddivisioniPagamento,
    projectContacts,
  ] = await Promise.all([
    fetchAll("GlobalContact"),
    fetchAll("AziendaEsterna"),
    fetchAll("Commessa"),
    fetchAll("Project"),
    fetchAll("Task"),
    fetchAll("Timesheet"),
    fetchAll("Pagamento"),
    fetchAll("Proforma"),
    fetchAll("Fattura"),
    fetchAll("Offerta"),
    fetchAll("CollabotatoreEsterno"),
    fetchAll("CostoExtra"),
    fetchAll("CostoInterno"),
    fetchAll("PraticaEdilizia"),
    fetchAll("Note"),
    fetchAll("LavorazioneGantt"),
    fetchAll("SuddivisionePagamento"),
    fetchAll("ProjectContact"),
  ]);

  // ── BUILD USER MAPS ───────────────────────────────────────────
  console.log("👤 Building user maps (Base44 → Supabase)...");
  const { data: sbMembers } = await supabase
    .from("team_members").select("id, user_name").eq("studio", STUDIO_ID);
  (sbMembers || []).forEach(m => nameToSbIdGlobal.set(nkName(m.user_name), m.id));

  // Scan timesheets: build b44_user_id → sbId (via user_name)
  //                        b44_email   → sbId (via user_name, for project assigned_users)
  timesheets.forEach(t => {
    if (t.team_member && t.user_name) {
      const sbId = nameToSbIdGlobal.get(nkName(t.user_name));
      if (sbId) {
        userMap.set(t.team_member, sbId);
        if (t.user_email) b44EmailToSbId.set(t.user_email, sbId);
      }
    }
  });
  console.log(`   Mapped ${userMap.size} users, ${b44EmailToSbId.size} emails`);
  for (const [b44, sbId] of userMap) {
    const m = (sbMembers||[]).find(x => x.id === sbId);
    console.log(`   ${b44} → ${m?.user_name}`);
  }

  // ── BUILD project → commessa_id map ──────────────────────────
  // commesse.project_id is a Base44 project ID; we need:
  //   b44_project_id → supabase_commessa_uuid
  const projectToCommessaId = new Map();
  commesse.forEach(c => { if (c.project_id) projectToCommessaId.set(c.project_id, mid(c.id)); });

  // Pre-register all IDs so foreign keys resolve correctly
  const allRecords = [
    ...globalContacts, ...aziendeEsterne, ...commesse, ...projects,
    ...tasks, ...timesheets, ...pagamenti, ...proformas, ...fatture,
    ...offerte, ...collaboratoriEsterni, ...costiExtra, ...costiInterni,
    ...praticheEdilizie, ...notes, ...lavorazioniGantt,
    ...suddivisioniPagamento, ...projectContacts,
  ];
  allRecords.forEach(r => r?.id && mapId(r.id));
  console.log(`\n   Total records to migrate: ${allRecords.length}`);
  console.log(`   Unique IDs mapped: ${idMap.size}\n`);

  // ── PHASE 2: Clear old data and insert fresh ─────────────────
  console.log("🧹 Clearing existing studio data...");
  // project_contacts has no studio column — clear first (before projects/global_contacts)
  // by matching projects that belong to this studio
  const { data: studioProjectIds } = await supabase
    .from("projects").select("id").eq("studio", STUDIO_ID);
  if (studioProjectIds?.length) {
    const ids = studioProjectIds.map(r => r.id);
    const { error } = await supabase.from("project_contacts").delete().in("project_id", ids);
    if (error) console.warn(`  ⚠ Could not clear project_contacts: ${error.message}`);
    else console.log(`  ✓ Cleared project_contacts`);
  }
  // Tables with studio column — delete by studio (now safe, no FK blockers)
  const studioTables = [
    "lavorazioni_gantt","costi_extra",
    "pagamenti","proforma","timesheet","tasks","projects","commesse","global_contacts",
  ];
  for (const t of studioTables) {
    const { error } = await supabase.from(t).delete().eq("studio", STUDIO_ID);
    if (error) console.warn(`  ⚠ Could not clear ${t}: ${error.message}`);
    else console.log(`  ✓ Cleared ${t}`);
  }
  // suddivisione_pagamenti has no studio col — delete via commessa IDs in this studio
  const commessaIds = commesse.map(r => mid(r.id)).filter(Boolean);
  if (commessaIds.length) {
    const { error } = await supabase.from("suddivisione_pagamenti").delete().in("commessa_id", commessaIds);
    if (error) console.warn(`  ⚠ Could not clear suddivisione_pagamenti: ${error.message}`);
    else console.log(`  ✓ Cleared suddivisione_pagamenti`);
  }

  console.log("📤 Inserting into Supabase...");

  await upsertAll("global_contacts", globalContacts.map(mapGlobalContact), "GlobalContact");
  // Commesse and Projects have circular FK: commessa.project_id ↔ project.commessa_id
  // Insert both without cross-references first, then link in pass 2
  await upsertAll("commesse", commesse.map(r => ({ ...mapCommessa(r), project_id: null })), "Commessa (pass 1)");
  // Projects: two-pass to break circular FK with commesse
  const mappedProjects = projects.map(r => mapProject(r, projectToCommessaId.get(r.id) || null));
  await upsertAll("projects", mappedProjects.map(p => ({ ...p, commessa_id: null })), "Project (pass 1)");
  // Pass 2: set commessa_id
  const projWithCommessa = mappedProjects.filter(p => p.commessa_id);
  let pOk = 0, pFail = 0;
  for (const p of projWithCommessa) {
    const { error } = await supabase.from("projects").update({ commessa_id: p.commessa_id }).eq("id", p.id);
    if (error) { console.error(`  ✗ Project commessa [${p.id}]: ${error.message}`); pFail++; } else pOk++;
  }
  if (projWithCommessa.length) console.log(`  ✓ Project (pass 2 – commessa links): ${pOk} ok${pFail ? `, ${pFail} failed` : ""}`);
  // Commesse pass 2: set project_id
  const mappedCommesse = commesse.map(mapCommessa);
  const commesseWithProject = mappedCommesse.filter(c => c.project_id);
  let cOk = 0, cFail = 0;
  for (const c of commesseWithProject) {
    const { error } = await supabase.from("commesse").update({ project_id: c.project_id }).eq("id", c.id);
    if (error) { console.error(`  ✗ Commessa project [${c.id}]: ${error.message}`); cFail++; } else cOk++;
  }
  if (commesseWithProject.length) console.log(`  ✓ Commessa (pass 2 – project links): ${cOk} ok${cFail ? `, ${cFail} failed` : ""}`);
  await upsertAll("offerte",               offerte.map(mapOfferta),                      "Offerta");

  // Tasks: two-pass to handle self-referential parent_task_id FK
  // Build valid project UUID set to avoid FK violations
  const validProjectIds = new Set(projects.map(r => mid(r.id)));
  const mappedTasks = tasks.map(r => {
    const t = mapTask(r);
    if (t.project_id && !validProjectIds.has(t.project_id)) t.project_id = null;
    return t;
  });
  await upsertAll("tasks", mappedTasks.map(t => ({ ...t, parent_task_id: null })), "Task (pass 1 – no parent)");
  // Pass 2: update parent_task_id where set
  const tasksWithParent = mappedTasks.filter(t => t.parent_task_id);
  let parentOk = 0, parentFail = 0;
  for (const t of tasksWithParent) {
    const { error } = await supabase.from("tasks").update({ parent_task_id: t.parent_task_id }).eq("id", t.id);
    if (error) { console.error(`  ✗ Task parent [${t.id}]: ${error.message}`); parentFail++; } else parentOk++;
  }
  if (tasksWithParent.length) console.log(`  ✓ Task (pass 2 – parent links): ${parentOk} ok${parentFail ? `, ${parentFail} failed` : ""}`);
  await upsertAll("timesheet",             timesheets.map(r => {
    const t = mapTimesheet(r);
    if (t.project_id && !validProjectIds.has(t.project_id)) t.project_id = null;
    return t;
  }), "Timesheet");
  // Valid commessa UUIDs — for FK validation
  const validCommessaIds = new Set(commesse.map(r => mid(r.id)));
  await upsertAll("proforma", proformas.map(r => {
    const p = mapProforma(r);
    if (p.commessa_id && !validCommessaIds.has(p.commessa_id)) p.commessa_id = null;
    return p;
  }), "Proforma");
  await upsertAll("fatture",               fatture.map(mapFattura),                      "Fattura");
  await upsertAll("pagamenti", pagamenti.map(r => {
    const p = mapPagamento(r);
    if (p.commessa_id && !validCommessaIds.has(p.commessa_id)) p.commessa_id = null;
    return p;
  }), "Pagamento");
  await upsertAll("suddivisione_pagamenti", suddivisioniPagamento.map(r => {
    const s = mapSuddivisionePagamento(r);
    if (s.commessa_id && !validCommessaIds.has(s.commessa_id)) s.commessa_id = null;
    return s;
  }), "SuddivisionePagamento");
  await upsertAll("collaboratori_esterni", collaboratoriEsterni.map(mapCollaboratoreEsterno), "CollabotatoreEsterno");
  await upsertAll("collaboratori_esterni", aziendeEsterne.map(mapAziendaEsterna),        "AziendaEsterna");
  await upsertAll("costi_extra", costiExtra.map(r => {
    const c = mapCostoExtra(r);
    if (c.commessa_id && !validCommessaIds.has(c.commessa_id)) c.commessa_id = null;
    return c;
  }), "CostoExtra");
  await upsertAll("lavorazioni_gantt", lavorazioniGantt.map(r => {
    const g = mapLavorazioneGantt(r);
    if (g.project_id && !validProjectIds.has(g.project_id)) g.project_id = null;
    return g;
  }), "LavorazioneGantt");

  // ProjectContact — only if table exists
  if (projectContacts.length > 0) {
    await upsertAll("project_contacts", projectContacts.map(mapProjectContact), "ProjectContact");
  }

  // ── PHASE 3: Ricalcola importo_incassato per ogni commessa ──────
  // importo_incassato è un campo denormalizzato aggiornato dall'app quando
  // si marca una proforma come pagata. Dobbiamo ricalcolarlo dalle proforma migrate.
  // Logica identica a CommessaDetailPage.ricalcolaIncassato():
  //   somma importo_totale dove pagato=true e suddivisione_pagamento_ids.length > 0
  console.log("💰 Ricalcolo importo_incassato per ogni commessa...");
  const { data: sbProformas, error: pfErr } = await supabase
    .from("proforma")
    .select("commessa_id, importo_totale, pagato, suddivisione_pagamento_ids")
    .eq("studio", STUDIO_ID);
  if (pfErr) {
    console.warn(`  ⚠ Impossibile leggere proforma: ${pfErr.message}`);
  } else {
    // Raggruppa per commessa_id — conta tutte le proforma pagate
    // (non richiediamo suddivisione_pagamento_ids perché durante la migrazione
    //  il collegamento potrebbe non essere stato migrato lato proforma)
    const incassatoPerCommessa = new Map();
    for (const p of sbProformas || []) {
      if (!p.commessa_id) continue;
      if (p.pagato) {
        incassatoPerCommessa.set(
          p.commessa_id,
          (incassatoPerCommessa.get(p.commessa_id) || 0) + (Number(p.importo_totale) || 0)
        );
      }
    }
    // Aggiorna solo le commesse con valore > 0 (le altre rimangono a 0)
    let incOk = 0, incFail = 0;
    for (const [commessaId, totale] of incassatoPerCommessa) {
      const { error } = await supabase
        .from("commesse").update({ importo_incassato: totale }).eq("id", commessaId);
      if (error) { console.error(`  ✗ importo_incassato [${commessaId}]: ${error.message}`); incFail++; }
      else incOk++;
    }
    console.log(`  ✓ importo_incassato aggiornato: ${incOk} commesse${incFail ? `, ${incFail} failed` : ""}`);
    if (incassatoPerCommessa.size === 0) {
      console.log("  ℹ Nessuna proforma pagata con suddivisione trovata — importo_incassato rimane a 0");
    }
  }

  console.log("\n✅ Migration complete!\n");

  // Print ID map summary
  console.log(`📋 ID map summary (Base44 → Supabase UUID):`);
  let shown = 0;
  for (const [b44, uuid] of idMap.entries()) {
    if (shown++ >= 10) { console.log(`   ... and ${idMap.size - 10} more`); break; }
    console.log(`   ${b44} → ${uuid}`);
  }
}

main().catch(err => {
  console.error("\n❌ Fatal error:", err);
  process.exit(1);
});
