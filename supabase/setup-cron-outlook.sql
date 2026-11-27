-- Esegui UNA VOLTA nel SQL Editor di Supabase per attivare la lettura automatica
-- delle mail Outlook ogni 15 minuti.
--
-- Prerequisiti (già presenti se hai attivato check-scadenze / check-promemoria):
-- 1. Estensioni pg_cron e pg_net abilitate
-- 2. Edge Function `outlook` deployata
-- 3. Secret CRON_SECRET impostato (stesso valore di check-scadenze)
-- 4. Migration `database/outlook_auto_sync.sql` già eseguita

-- Sostituisci 'CAMBIA_QUESTA_STRINGA' con il tuo CRON_SECRET
SELECT cron.schedule(
  'outlook-sync-15min',
  '*/15 * * * *',
  $$
  SELECT net.http_post(
    url    := 'https://rwysezttfgdicpvymeiw.supabase.co/functions/v1/outlook',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer CAMBIA_QUESTA_STRINGA'
    ),
    body   := '{"action":"sync-all"}'::jsonb
  );
  $$
);

-- Per rimuoverlo: SELECT cron.unschedule('outlook-sync-15min');
