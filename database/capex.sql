-- CAPEX — quadro economico del cantiere (legato al PROGETTO).
-- Raccoglie i preventivi di imprese/fornitori, accettazione e registro pagamenti.
-- Soft delete su capex_voci (come le altre tabelle). Scoping per studio via
-- project_id -> projects.studio -> team_members (stesso pattern di
-- suddivisione_pagamenti). Esegui nel SQL Editor di Supabase Dashboard.

-- ── TABELLE ───────────────────────────────────────────────────────────
create table if not exists capex_voci (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  parent_id uuid references capex_voci(id) on delete cascade, -- voce "extra" dello stesso operatore
  categoria text not null,            -- edile, elettricista, idraulico, illuminotecnica, ...
  fornitore text,
  data_preventivo date,
  importo numeric(12,2) not null default 0,
  note text,
  accettato boolean not null default false,
  deleted_at timestamptz,             -- soft delete, come le altre tabelle
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists capex_pagamenti (
  id uuid primary key default gen_random_uuid(),
  voce_id uuid not null references capex_voci(id) on delete cascade,
  data_pagamento date not null default current_date,
  importo numeric(12,2) not null,
  note text,
  created_at timestamptz default now()
);

-- ── MIGRAZIONE da versione precedente (capex_voci basata su commessa_id) ──
-- Idempotente: porta una tabella già esistente allo schema target senza
-- perdere dati. Su un'installazione pulita questi ALTER non hanno effetto.
alter table capex_voci add column if not exists project_id uuid references projects(id) on delete cascade;
alter table capex_voci add column if not exists deleted_at timestamptz;
-- parent_id: una voce "extra" punta al preventivo principale dello stesso
-- operatore/fornitore (eredita categoria/fornitore, ha importo e pagamenti propri).
alter table capex_voci add column if not exists parent_id uuid references capex_voci(id) on delete cascade;
-- commessa_id non è più usato dall'app: rendilo opzionale (le righe vecchie
-- restano, con project_id da assegnare manualmente).
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'capex_voci' and column_name = 'commessa_id'
  ) then
    alter table capex_voci alter column commessa_id drop not null;
  end if;
end $$;

create index if not exists capex_voci_project_idx on capex_voci (project_id);
create index if not exists capex_voci_parent_idx on capex_voci (parent_id);
create index if not exists capex_pagamenti_voce_idx on capex_pagamenti (voce_id);

-- ── RLS capex_voci (scoping via project_id -> projects.studio) ─────────
alter table capex_voci enable row level security;

drop policy if exists "capex_voci_select" on capex_voci;
drop policy if exists "capex_voci_insert" on capex_voci;
drop policy if exists "capex_voci_update" on capex_voci;
drop policy if exists "capex_voci_delete" on capex_voci;

create policy "capex_voci_select"
on capex_voci for select
using (
  project_id in (
    select p.id from projects p
    join team_members tm on tm.studio = p.studio
    where tm.user_account = auth.uid()
      and tm.studio is not null
  )
);

create policy "capex_voci_insert"
on capex_voci for insert
with check (
  project_id in (
    select p.id from projects p
    join team_members tm on tm.studio = p.studio
    where tm.user_account = auth.uid()
      and tm.studio is not null
  )
);

-- UPDATE: il WITH CHECK NON vincola deleted_at, altrimenti il soft-delete fallisce
create policy "capex_voci_update"
on capex_voci for update
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

create policy "capex_voci_delete"
on capex_voci for delete
using (
  project_id in (
    select p.id from projects p
    join team_members tm on tm.studio = p.studio
    where tm.user_account = auth.uid()
      and tm.studio is not null
  )
);

-- ── RLS capex_pagamenti (scoping via voce_id -> capex_voci -> projects) ─
alter table capex_pagamenti enable row level security;

drop policy if exists "capex_pagamenti_select" on capex_pagamenti;
drop policy if exists "capex_pagamenti_insert" on capex_pagamenti;
drop policy if exists "capex_pagamenti_update" on capex_pagamenti;
drop policy if exists "capex_pagamenti_delete" on capex_pagamenti;

create policy "capex_pagamenti_select"
on capex_pagamenti for select
using (
  voce_id in (
    select v.id from capex_voci v
    join projects p on p.id = v.project_id
    join team_members tm on tm.studio = p.studio
    where tm.user_account = auth.uid()
      and tm.studio is not null
  )
);

create policy "capex_pagamenti_insert"
on capex_pagamenti for insert
with check (
  voce_id in (
    select v.id from capex_voci v
    join projects p on p.id = v.project_id
    join team_members tm on tm.studio = p.studio
    where tm.user_account = auth.uid()
      and tm.studio is not null
  )
);

create policy "capex_pagamenti_update"
on capex_pagamenti for update
using (
  voce_id in (
    select v.id from capex_voci v
    join projects p on p.id = v.project_id
    join team_members tm on tm.studio = p.studio
    where tm.user_account = auth.uid()
      and tm.studio is not null
  )
)
with check (
  voce_id in (
    select v.id from capex_voci v
    join projects p on p.id = v.project_id
    join team_members tm on tm.studio = p.studio
    where tm.user_account = auth.uid()
      and tm.studio is not null
  )
);

create policy "capex_pagamenti_delete"
on capex_pagamenti for delete
using (
  voce_id in (
    select v.id from capex_voci v
    join projects p on p.id = v.project_id
    join team_members tm on tm.studio = p.studio
    where tm.user_account = auth.uid()
      and tm.studio is not null
  )
);
