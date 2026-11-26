-- Avvisi offerte "In attesa" da 30 e 60 giorni
-- Chi li riceve si sceglie in Team (card "Avvisi offerte in attesa").
-- Esegui una volta nel SQL Editor di Supabase.

alter table public.team_members
  add column if not exists alert_offerte boolean not null default false;

-- Di partenza li riceve il titolare (Owner) di ogni studio; poi si cambia da Team.
update public.team_members
   set alert_offerte = true
 where role_internal = 'Owner'
   and alert_offerte = false;
