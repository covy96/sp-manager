-- Esegui questo script UNA VOLTA nel SQL Editor di Supabase Dashboard
-- per attivare il cron giornaliero che elimina definitivamente gli studi scaduti.
--
-- Prerequisiti:
-- 1. Estensione pg_cron abilitata (Database → Extensions → pg_cron)
-- 2. Estensione pg_net abilitata  (Database → Extensions → pg_net)
-- 3. Edge Function "purge-studios" deployata
-- 4. Stesso CRON_SECRET usato per check-scadenze

SELECT cron.schedule(
  'purge-studios-daily',              -- nome job (univoco)
  '0 3 * * *',                        -- ogni giorno alle 03:00 UTC (= 04:00/05:00 ora italiana)
  $$
  SELECT net.http_post(
    url     := 'https://rwysezttfgdicpvymeiw.supabase.co/functions/v1/purge-studios',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer CAMBIA_QUESTA_STRINGA'
    ),
    body    := '{}'::jsonb
  );
  $$
);

-- Per verificare che il job sia registrato:
-- SELECT * FROM cron.job;

-- Per rimuoverlo in futuro:
-- SELECT cron.unschedule('purge-studios-daily');
