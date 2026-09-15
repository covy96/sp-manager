-- Storico versioni del capitolato: ogni salvataggio aggiunge uno snapshot.
-- Struttura: [ { n: 1, ts: '2026-01-01T10:00:00.000Z', snapshot: { nome, committente,
--   localita, data, revisione, righe: [ ... ] } }, … ]  (dal più recente al più vecchio)
-- Esegui nel SQL Editor di Supabase.
alter table capitolati add column if not exists versioni jsonb not null default '[]'::jsonb;
