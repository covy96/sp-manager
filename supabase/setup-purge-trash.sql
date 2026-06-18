-- Pulizia automatica del CESTINO: elimina definitivamente gli elementi
-- soft-deleted (deleted_at valorizzato) più vecchi di N giorni (default 30).
--
-- NB: la cancellazione definitiva degli STUDI scaduti è gestita separatamente
-- dalla funzione SQL esistente purge_deleted_studios() + cron 'purge-deleted-studios'.
-- Qui ci occupiamo solo dei singoli elementi cestinati dentro studi attivi.
--
-- Eseguire UNA VOLTA nel SQL Editor di Supabase.

CREATE OR REPLACE FUNCTION public.purge_old_trash(p_days integer DEFAULT 30)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_tables text[] := ARRAY[
    'projects','commesse','offerte','proforma','fatture',
    'pagamenti','suddivisione_pagamenti','costi_extra','costi_interni',
    'collaboratori_esterni','lavorazioni_gantt','tasks','timesheet',
    'global_contacts','notes','report_cantiere','report_cantiere_foto',
    'capex_voci','capex_pagamenti','pratiche_edilizie'
  ];
  v_t text; v_total integer := 0; v_n integer;
BEGIN
  FOREACH v_t IN ARRAY v_tables LOOP
    -- salta le tabelle che non hanno la colonna deleted_at
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name=v_t AND column_name='deleted_at'
    ) THEN
      EXECUTE format(
        'DELETE FROM %I WHERE deleted_at IS NOT NULL AND deleted_at < now() - ($1 || '' days'')::interval',
        v_t
      ) USING p_days;
      GET DIAGNOSTICS v_n = ROW_COUNT;
      v_total := v_total + v_n;
    END IF;
  END LOOP;
  RETURN v_total;
END; $function$;

-- Cron giornaliero alle 03:30 UTC (sfasato rispetto al purge studi delle 03:00)
SELECT cron.schedule('purge-trash-daily', '30 3 * * *', $$ SELECT purge_old_trash(30); $$);

-- Per rimuovere il vecchio job ridondante basato su Edge Function:
-- SELECT cron.unschedule('purge-studios-daily');

-- Verifica:
-- SELECT jobname, schedule, command FROM cron.job;
-- SELECT purge_old_trash(30);  -- esecuzione manuale, ritorna n. righe eliminate
