-- Disposizione della libreria voci per studio: ordine e sezione (categoria) di
-- ogni voce, separati dai testi. Così uno studio può riordinare le voci e
-- spostarle da una sezione all'altra (Regolazione capitolato) anche per le voci
-- del template globale, che restano in sola lettura e non vengono duplicate.
--   voce_key = "k:<categoria_code originale>||<codice>" per voci del template
--              (e per i loro override dello studio: l'id globale cambia a ogni
--              reseed), "id:<uuid>" per le voci create dallo studio.
-- Esegui nel SQL Editor di Supabase.
create table if not exists capitolato_voci_layout (
  studio uuid not null references studios(id) on delete cascade,
  voce_key text not null,
  categoria_code text not null,
  ordine int not null default 0,
  updated_at timestamptz default now(),
  primary key (studio, voce_key)
);

alter table capitolato_voci_layout enable row level security;

drop policy if exists "capitolato_voci_layout_all" on capitolato_voci_layout;
create policy "capitolato_voci_layout_all"
on capitolato_voci_layout for all
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
