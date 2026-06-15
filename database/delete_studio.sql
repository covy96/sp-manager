-- ════════════════════════════════════════════════════════════════
-- Cancellazione studio: soft-delete con retention di 30 giorni
-- Esegui nel SQL Editor di Supabase Dashboard.
-- ════════════════════════════════════════════════════════════════

-- ── 1. Colonne per il soft-delete dello studio ───────────────────
ALTER TABLE studios ADD COLUMN IF NOT EXISTS deleted_at   timestamptz DEFAULT NULL;
ALTER TABLE studios ADD COLUMN IF NOT EXISTS delete_after timestamptz DEFAULT NULL;

-- Indice per il job di purge
CREATE INDEX IF NOT EXISTS idx_studios_delete_after
  ON studios (delete_after) WHERE deleted_at IS NOT NULL;

-- ── 2. Purge definitivo degli studi scaduti (oltre 30 giorni) ────
-- Da invocare periodicamente (es. pg_cron giornaliero).
-- IMPORTANTE: molte foreign key verso studios sono ON DELETE NO ACTION,
-- quindi un semplice DELETE FROM studios fallirebbe. Qui eliminiamo
-- esplicitamente tutte le entità collegate nell'ordine corretto
-- (figli → genitori), senza dipendere dai CASCADE.
CREATE OR REPLACE FUNCTION purge_deleted_studios()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_count integer := 0;
  v_id uuid;
BEGIN
  FOR v_id IN
    SELECT id FROM studios
    WHERE deleted_at IS NOT NULL
      AND delete_after IS NOT NULL
      AND delete_after <= now()
  LOOP
    -- ── Foglie / figli di commesse/progetti/report ──────────────
    DELETE FROM report_cantiere_foto    WHERE studio = v_id;
    DELETE FROM suddivisione_pagamenti  WHERE studio = v_id;
    DELETE FROM costi_extra             WHERE studio = v_id;
    DELETE FROM costi_interni           WHERE studio = v_id;
    DELETE FROM collaboratori_esterni   WHERE studio = v_id;
    DELETE FROM fatture                 WHERE studio = v_id;
    DELETE FROM pagamenti               WHERE studio = v_id;
    DELETE FROM proforma                WHERE studio = v_id;
    DELETE FROM lavorazioni_gantt       WHERE studio = v_id;
    DELETE FROM report_cantiere         WHERE studio = v_id;
    DELETE FROM pratiche_edilizie       WHERE studio = v_id;
    DELETE FROM timesheet               WHERE studio = v_id;
    DELETE FROM tasks                   WHERE studio = v_id;
    DELETE FROM activity_log            WHERE studio = v_id;
    DELETE FROM notifications           WHERE studio = v_id;
    DELETE FROM notes                   WHERE studio = v_id;

    -- Tabelle senza colonna studio: scoping tramite i progetti dello studio
    DELETE FROM project_contacts   WHERE project_id IN (SELECT id FROM projects WHERE studio = v_id);
    DELETE FROM project_user_views WHERE project_id IN (SELECT id FROM projects WHERE studio = v_id);

    -- Offerte e template (referenziano commesse/contatti già gestiti)
    DELETE FROM offerte                 WHERE studio = v_id;
    DELETE FROM voci_offerta_template   WHERE studio = v_id;
    DELETE FROM service_task_templates  WHERE studio = v_id;
    DELETE FROM global_contacts         WHERE studio = v_id;

    -- ── Genitori: prima projects (referenzia commesse), poi commesse ──
    DELETE FROM projects   WHERE studio = v_id;
    DELETE FROM commesse   WHERE studio = v_id;

    -- ── Membri del team ────────────────────────────────────────
    DELETE FROM team_members WHERE studio = v_id;

    -- ── Lo studio ──────────────────────────────────────────────
    DELETE FROM studios WHERE id = v_id;

    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END; $$;

-- ── 3. (Opzionale) Schedulazione giornaliera con pg_cron ─────────
-- Richiede l'estensione pg_cron abilitata nel progetto Supabase.
-- SELECT cron.schedule('purge-deleted-studios', '0 3 * * *', $$SELECT purge_deleted_studios();$$);
