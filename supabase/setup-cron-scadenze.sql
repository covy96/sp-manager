-- Esegui questo script UNA VOLTA nel SQL Editor di Supabase Dashboard
-- per attivare il cron giornaliero che controlla le scadenze.
--
-- Prerequisiti:
-- 1. Estensione pg_cron abilitata (Database → Extensions → pg_cron)
-- 2. Estensione pg_net abilitata  (Database → Extensions → pg_net)
-- 3. Variabile CRON_SECRET impostata nelle Edge Function secrets
--    (Dashboard → Functions → check-scadenze → Secrets)

-- Imposta qui il tuo CRON_SECRET (deve corrispondere a quello nella funzione)
-- Sostituisci 'CAMBIA_QUESTA_STRINGA' con un valore casuale sicuro
-- es. openssl rand -hex 32

SELECT cron.schedule(
  'check-scadenze-daily',            -- nome job (univoco)
  '0 7 * * *',                       -- ogni giorno alle 07:00 UTC (= 08:00/09:00 ora italiana)
  $$
  SELECT net.http_post(
    url    := 'https://rwysezttfgdicpvymeiw.supabase.co/functions/v1/check-scadenze',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer CAMBIA_QUESTA_STRINGA'
    ),
    body   := '{}'::jsonb
  );
  $$
);

-- Per verificare che il job sia registrato:
-- SELECT * FROM cron.job;

-- Per rimuoverlo in futuro se serve:
-- SELECT cron.unschedule('check-scadenze-daily');
