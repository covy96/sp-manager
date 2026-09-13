-- CAPITOLATO — computo metrico (non estimativo) legato al PROGETTO.
-- Tre tabelle:
--   capitolato_voci   → libreria voci standard. studio = NULL ⇒ template GLOBALE
--                       (condiviso da tutti); studio valorizzato ⇒ voce custom di
--                       quello studio. Seed globale in database/capitolato_seed.sql.
--   capitolati        → un capitolato salvato per progetto (copertina + meta).
--   capitolato_righe  → voci inserite nel capitolato, con misurazioni (snapshot).
-- Scoping per studio come le altre tabelle (project_id -> projects.studio ->
-- team_members). Esegui nel SQL Editor di Supabase Dashboard.

-- ── LIBRERIA VOCI ─────────────────────────────────────────────────────
create table if not exists capitolato_voci (
  id uuid primary key default gen_random_uuid(),
  studio uuid references studios(id) on delete cascade,   -- NULL = template globale
  categoria_code text not null,                           -- A, B, C, ...
  categoria_nome text not null,                           -- "Demolizioni", ...
  codice text not null,                                   -- A01, B02, ...
  titolo text not null,
  descrizione text not null default '',
  unita text not null default '',                         -- '', 'mq', 'cad', 'ml', 'a corpo'
  tipo text not null default 'singolo',                   -- 'singolo' | 'fornitura_posa'
  sommano_labels jsonb not null default '[]'::jsonb,      -- es. ["SOMMANO mq"] o ["FORNITURA - sommano mq","POSA - sommano mq"]
  ordine int not null default 0,
  attiva boolean not null default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists capitolato_voci_studio_idx on capitolato_voci (studio);
create index if not exists capitolato_voci_cat_idx on capitolato_voci (categoria_code, ordine);
-- ricerca testuale semplice su titolo + descrizione
create index if not exists capitolato_voci_search_idx
  on capitolato_voci using gin (to_tsvector('italian', coalesce(titolo,'') || ' ' || coalesce(descrizione,'')));

-- ── CAPITOLATO PER PROGETTO ───────────────────────────────────────────
create table if not exists capitolati (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  nome text not null default 'Capitolato',
  committente text,
  localita text,
  data date,
  revisione text,
  deleted_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists capitolati_project_idx on capitolati (project_id);

-- ── RIGHE (voci inserite, con misurazioni) ────────────────────────────
create table if not exists capitolato_righe (
  id uuid primary key default gen_random_uuid(),
  capitolato_id uuid not null references capitolati(id) on delete cascade,
  voce_id uuid references capitolato_voci(id) on delete set null,  -- origine (può essere NULL se libreria modificata)
  categoria_code text not null,
  categoria_nome text not null default '',
  codice text not null default '',
  titolo text not null default '',
  descrizione text not null default '',
  unita text not null default '',
  tipo text not null default 'singolo',
  sommano_labels jsonb not null default '[]'::jsonb,
  -- misurazioni: [{ descrizione, lung, larg, hpeso, qta }]
  misurazioni jsonb not null default '[]'::jsonb,
  note text,
  ordine int not null default 0,
  created_at timestamptz default now()
);
create index if not exists capitolato_righe_cap_idx on capitolato_righe (capitolato_id, ordine);

-- ── RLS capitolato_voci ───────────────────────────────────────────────
alter table capitolato_voci enable row level security;

drop policy if exists "capitolato_voci_select" on capitolato_voci;
drop policy if exists "capitolato_voci_insert" on capitolato_voci;
drop policy if exists "capitolato_voci_update" on capitolato_voci;
drop policy if exists "capitolato_voci_delete" on capitolato_voci;

-- SELECT: template globale (studio null) + voci del proprio studio
create policy "capitolato_voci_select"
on capitolato_voci for select
using (
  studio is null
  or studio in (
    select tm.studio from team_members tm
    where tm.user_account = auth.uid() and tm.studio is not null
  )
);

-- INSERT/UPDATE/DELETE: solo voci custom del proprio studio (il template globale è seed-only)
create policy "capitolato_voci_insert"
on capitolato_voci for insert
with check (
  studio in (
    select tm.studio from team_members tm
    where tm.user_account = auth.uid() and tm.studio is not null
  )
);
create policy "capitolato_voci_update"
on capitolato_voci for update
using (
  studio in (
    select tm.studio from team_members tm
    where tm.user_account = auth.uid() and tm.studio is not null
  )
)
with check (
  studio in (
    select tm.studio from team_members tm
    where tm.user_account = auth.uid() and tm.studio is not null
  )
);
create policy "capitolato_voci_delete"
on capitolato_voci for delete
using (
  studio in (
    select tm.studio from team_members tm
    where tm.user_account = auth.uid() and tm.studio is not null
  )
);

-- ── RLS capitolati (scoping via project_id -> projects.studio) ─────────
alter table capitolati enable row level security;

drop policy if exists "capitolati_select" on capitolati;
drop policy if exists "capitolati_insert" on capitolati;
drop policy if exists "capitolati_update" on capitolati;
drop policy if exists "capitolati_delete" on capitolati;

create policy "capitolati_select"
on capitolati for select
using (
  project_id in (
    select p.id from projects p
    join team_members tm on tm.studio = p.studio
    where tm.user_account = auth.uid() and tm.studio is not null
  )
);
create policy "capitolati_insert"
on capitolati for insert
with check (
  project_id in (
    select p.id from projects p
    join team_members tm on tm.studio = p.studio
    where tm.user_account = auth.uid() and tm.studio is not null
  )
);
create policy "capitolati_update"
on capitolati for update
using (
  project_id in (
    select p.id from projects p
    join team_members tm on tm.studio = p.studio
    where tm.user_account = auth.uid() and tm.studio is not null
  )
)
with check (
  project_id in (
    select p.id from projects p
    join team_members tm on tm.studio = p.studio
    where tm.user_account = auth.uid() and tm.studio is not null
  )
);
create policy "capitolati_delete"
on capitolati for delete
using (
  project_id in (
    select p.id from projects p
    join team_members tm on tm.studio = p.studio
    where tm.user_account = auth.uid() and tm.studio is not null
  )
);

-- ── RLS capitolato_righe (scoping via capitolato_id -> capitolati -> projects) ──
alter table capitolato_righe enable row level security;

drop policy if exists "capitolato_righe_select" on capitolato_righe;
drop policy if exists "capitolato_righe_insert" on capitolato_righe;
drop policy if exists "capitolato_righe_update" on capitolato_righe;
drop policy if exists "capitolato_righe_delete" on capitolato_righe;

create policy "capitolato_righe_select"
on capitolato_righe for select
using (
  capitolato_id in (
    select c.id from capitolati c
    join projects p on p.id = c.project_id
    join team_members tm on tm.studio = p.studio
    where tm.user_account = auth.uid() and tm.studio is not null
  )
);
create policy "capitolato_righe_insert"
on capitolato_righe for insert
with check (
  capitolato_id in (
    select c.id from capitolati c
    join projects p on p.id = c.project_id
    join team_members tm on tm.studio = p.studio
    where tm.user_account = auth.uid() and tm.studio is not null
  )
);
create policy "capitolato_righe_update"
on capitolato_righe for update
using (
  capitolato_id in (
    select c.id from capitolati c
    join projects p on p.id = c.project_id
    join team_members tm on tm.studio = p.studio
    where tm.user_account = auth.uid() and tm.studio is not null
  )
)
with check (
  capitolato_id in (
    select c.id from capitolati c
    join projects p on p.id = c.project_id
    join team_members tm on tm.studio = p.studio
    where tm.user_account = auth.uid() and tm.studio is not null
  )
);
create policy "capitolato_righe_delete"
on capitolato_righe for delete
using (
  capitolato_id in (
    select c.id from capitolati c
    join projects p on p.id = c.project_id
    join team_members tm on tm.studio = p.studio
    where tm.user_account = auth.uid() and tm.studio is not null
  )
);
