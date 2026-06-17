-- Normalizzazione clienti: stessa grafia ovunque (case/spazi).
-- "Mario Rossi", "mario rossi", "MARIO ROSSI" → un'unica grafia canonica.
-- ⚠️ MODIFICA I DATI. Esegui un export/backup prima. Rivedi prima di lanciare.
-- Esegui nel SQL Editor di Supabase Dashboard.
--
-- Canonica = la grafia più usata (per studio) tra progetti, commesse e offerte.

-- ── Mappa canonica ────────────────────────────────────────────────
create temp table _canon_clienti as
with all_names as (
  select studio, client  as name from projects where client  is not null and btrim(client)  <> '' and studio is not null
  union all
  select studio, cliente as name from commesse where cliente is not null and btrim(cliente) <> '' and studio is not null
  union all
  select studio, cliente as name from offerte  where cliente is not null and btrim(cliente) <> '' and studio is not null
),
counts as (
  select studio, lower(btrim(name)) as key, btrim(name) as spelling, count(*) as n
  from all_names group by 1, 2, 3
),
ranked as (
  select *, row_number() over (partition by studio, key order by n desc, spelling asc) as rn
  from counts
)
select studio, key, spelling as canonical from ranked where rn = 1;

-- ── PARTE A — Allinea le grafie (sicura, nessuna cancellazione) ────
update projects p set client = c.canonical
  from _canon_clienti c
  where p.studio = c.studio and lower(btrim(p.client)) = c.key and p.client <> c.canonical;

update commesse m set cliente = c.canonical
  from _canon_clienti c
  where m.studio = c.studio and lower(btrim(m.cliente)) = c.key and m.cliente <> c.canonical;

update offerte o set cliente = c.canonical
  from _canon_clienti c
  where o.studio = c.studio and lower(btrim(o.cliente)) = c.key and o.cliente <> c.canonical;

-- Allinea anche la rubrica (global_contacts) alla grafia canonica
update global_contacts g set full_name = c.canonical
  from _canon_clienti c
  where g.studio = c.studio and lower(btrim(g.full_name)) = c.key
    and g.deleted_at is null and g.full_name <> c.canonical;

-- ── PARTE B — Unisci i contatti duplicati in rubrica (OPZIONALE) ───
-- Ripunta i collegamenti dei contatti duplicati a uno solo e mette gli
-- altri nel cestino (soft-delete). Decommenta per eseguirla.
--
-- create temp table _gc_dups as
-- with ranked as (
--   select id, studio,
--     row_number() over (
--       partition by studio, lower(btrim(full_name))
--       order by ((case when btrim(coalesce(email,''))   <> '' then 1 else 0 end)
--               + (case when btrim(coalesce(phone,''))   <> '' then 1 else 0 end)
--               + (case when btrim(coalesce(company,'')) <> '' then 1 else 0 end)) desc,
--               created_at asc) as rn,
--     first_value(id) over (
--       partition by studio, lower(btrim(full_name))
--       order by ((case when btrim(coalesce(email,''))   <> '' then 1 else 0 end)
--               + (case when btrim(coalesce(phone,''))   <> '' then 1 else 0 end)
--               + (case when btrim(coalesce(company,'')) <> '' then 1 else 0 end)) desc,
--               created_at asc) as keep_id
--   from global_contacts
--   where deleted_at is null and full_name is not null and btrim(full_name) <> '' and studio is not null
-- )
-- select id, keep_id from ranked where rn > 1;
--
-- update project_contacts pc set global_contact_id = d.keep_id
--   from _gc_dups d where pc.global_contact_id = d.id;
--
-- update global_contacts set deleted_at = now() where id in (select id from _gc_dups);
--
-- drop table _gc_dups;

drop table _canon_clienti;
