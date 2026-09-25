-- Feature: orario preciso nelle task (promemoria puntuale).
-- Aggiunge la colonna ora_pianificata alle task: orario opzionale "HH:MM"
-- (fuso Europe/Rome) usato dall'Edge Function check-promemoria per inviare
-- una notifica all'ora esatta impostata.
--
-- Esegui UNA VOLTA nel SQL Editor di Supabase (ambiente giusto: prod e/o beta).

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS ora_pianificata text;

COMMENT ON COLUMN tasks.ora_pianificata IS
  'Orario "HH:MM" opzionale (Europe/Rome) per il promemoria puntuale. NULL = solo data (flusso scadenze giornaliero). Usato da check-promemoria.';
