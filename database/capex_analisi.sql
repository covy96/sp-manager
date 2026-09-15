-- CAPEX · ANALISI PREVENTIVI (AI) — legata al PROGETTO.
-- Conserva i preventivi caricati (PDF/Excel) delle imprese, l'estrazione fatta
-- dall'LLM (fornitore, categoria, importo, righe) e — in fase 2 — il riscontro
-- voce-per-voce col capitolato del progetto. L'estrazione è solo una PROPOSTA:
-- l'utente rivede/corregge e poi crea la voce CAPEX (capex_voci).
-- Scoping per studio via project_id -> projects.studio -> team_members
-- (stesso pattern di capex_voci). Esegui nel SQL Editor di Supabase.

-- ── TABELLA ───────────────────────────────────────────────────────────
create table if not exists capex_analisi (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,

  -- file caricato
  file_name text,
  file_kind text,                     -- 'pdf' | 'xlsx'
  storage_path text,                  -- percorso nel bucket 'capex-preventivi' (best-effort)

  -- esito estrazione
  stato text not null default 'completato',  -- 'completato' | 'errore'
  error text,

  -- dati estratti (proposta AI, rivedibili)
  fornitore text,
  categoria text,
  data_preventivo date,
  importo_totale numeric(12,2),
  valuta text default 'EUR',
  confidence text,                    -- 'alta' | 'media' | 'bassa'
  righe jsonb not null default '[]'::jsonb,   -- [{descrizione, quantita, unita, prezzo_unitario, importo}]
  match jsonb not null default '[]'::jsonb,   -- fase 2: riscontro col capitolato
  raw jsonb,                          -- risposta completa del modello (debug)

  -- collegamento alla voce CAPEX creata dall'utente (quando conferma)
  capex_voce_id uuid references capex_voci(id) on delete set null,

  created_by uuid default auth.uid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists capex_analisi_project_idx on capex_analisi (project_id);
create index if not exists capex_analisi_voce_idx    on capex_analisi (capex_voce_id);

-- ── RLS capex_analisi (scoping via project_id -> projects.studio) ──────
alter table capex_analisi enable row level security;

drop policy if exists "capex_analisi_select" on capex_analisi;
drop policy if exists "capex_analisi_insert" on capex_analisi;
drop policy if exists "capex_analisi_update" on capex_analisi;
drop policy if exists "capex_analisi_delete" on capex_analisi;

create policy "capex_analisi_select"
on capex_analisi for select
using (
  project_id in (
    select p.id from projects p
    join team_members tm on tm.studio = p.studio
    where tm.user_account = auth.uid()
      and tm.studio is not null
  )
);

create policy "capex_analisi_insert"
on capex_analisi for insert
with check (
  project_id in (
    select p.id from projects p
    join team_members tm on tm.studio = p.studio
    where tm.user_account = auth.uid()
      and tm.studio is not null
  )
);

create policy "capex_analisi_update"
on capex_analisi for update
using (
  project_id in (
    select p.id from projects p
    join team_members tm on tm.studio = p.studio
    where tm.user_account = auth.uid()
      and tm.studio is not null
  )
)
with check (
  project_id in (
    select p.id from projects p
    join team_members tm on tm.studio = p.studio
    where tm.user_account = auth.uid()
      and tm.studio is not null
  )
);

create policy "capex_analisi_delete"
on capex_analisi for delete
using (
  project_id in (
    select p.id from projects p
    join team_members tm on tm.studio = p.studio
    where tm.user_account = auth.uid()
      and tm.studio is not null
  )
);

-- ── STORAGE: bucket privato per i file dei preventivi ─────────────────
-- Convenzione percorso: '<project_id>/<timestamp>-<nome file>'.
-- Lo scoping usa la prima cartella del path (= project_id).
insert into storage.buckets (id, name, public)
values ('capex-preventivi', 'capex-preventivi', false)
on conflict (id) do nothing;

drop policy if exists "capex_preventivi_select" on storage.objects;
drop policy if exists "capex_preventivi_insert" on storage.objects;
drop policy if exists "capex_preventivi_delete" on storage.objects;

create policy "capex_preventivi_select"
on storage.objects for select
using (
  bucket_id = 'capex-preventivi'
  and (storage.foldername(name))[1] in (
    select p.id::text from projects p
    join team_members tm on tm.studio = p.studio
    where tm.user_account = auth.uid()
      and tm.studio is not null
  )
);

create policy "capex_preventivi_insert"
on storage.objects for insert
with check (
  bucket_id = 'capex-preventivi'
  and (storage.foldername(name))[1] in (
    select p.id::text from projects p
    join team_members tm on tm.studio = p.studio
    where tm.user_account = auth.uid()
      and tm.studio is not null
  )
);

create policy "capex_preventivi_delete"
on storage.objects for delete
using (
  bucket_id = 'capex-preventivi'
  and (storage.foldername(name))[1] in (
    select p.id::text from projects p
    join team_members tm on tm.studio = p.studio
    where tm.user_account = auth.uid()
      and tm.studio is not null
  )
);
