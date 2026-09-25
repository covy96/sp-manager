-- Esegui UNA VOLTA nel SQL Editor di Supabase Dashboard per attivare il cron
-- ogni 5 minuti che invia i promemoria PUNTUALI delle task con orario preciso.
--
-- Prerequisiti (già presenti se hai attivato check-scadenze):
-- 1. Estensione pg_cron abilitata (Database → Extensions → pg_cron)
-- 2. Estensione pg_net abilitata  (Database → Extensions → pg_net)
-- 3. Edge Function `check-promemoria` deployata
-- 4. Secret CRON_SECRET impostato sulla funzione (stesso valore di check-scadenze)
-- 5. Migration `database/add_ora_pianificata.sql` già eseguita

-- Sostituisci 'CAMBIA_QUESTA_STRINGA' con il tuo CRON_SECRET (quello della funzione)
SELECT cron.schedule(
  'check-promemoria-5min',           -- nome job (univoco)
  '*/5 * * * *',                     -- ogni 5 minuti
  $$
  SELECT net.http_post(
    url    := 'https://rwysezttfgdicpvymeiw.supabase.co/functions/v1/check-promemoria',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer CAMBIA_QUESTA_STRINGA'
    ),
    body   := '{}'::jsonb
  );
  $$
);

-- Verifica job registrati:
-- SELECT * FROM cron.job;

-- Per rimuoverlo in futuro:
-- SELECT cron.unschedule('check-promemoria-5min');
