-- Feature: "Registro voci" del Gantt.
-- Libreria di lavorazioni salvate dallo studio (descrizione, impresa, durata)
-- da riusare in qualsiasi Gantt di qualsiasi progetto.
--
-- Esegui UNA VOLTA nel SQL Editor di Supabase.

CREATE TABLE IF NOT EXISTS gantt_voci_registro (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  studio        uuid NOT NULL REFERENCES studios(id) ON DELETE CASCADE,
  descrizione   text NOT NULL,
  operatore     text,
  durata_giorni integer NOT NULL DEFAULT 7 CHECK (durata_giorni > 0),
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS gantt_voci_registro_studio_idx ON gantt_voci_registro (studio);

ALTER TABLE gantt_voci_registro ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "gantt_voci_registro_select" ON gantt_voci_registro;
DROP POLICY IF EXISTS "gantt_voci_registro_insert" ON gantt_voci_registro;
DROP POLICY IF EXISTS "gantt_voci_registro_update" ON gantt_voci_registro;
DROP POLICY IF EXISTS "gantt_voci_registro_delete" ON gantt_voci_registro;

CREATE POLICY "gantt_voci_registro_select" ON gantt_voci_registro FOR SELECT
USING (studio IN (SELECT tm.studio FROM team_members tm WHERE tm.user_account = auth.uid() AND tm.studio IS NOT NULL));

CREATE POLICY "gantt_voci_registro_insert" ON gantt_voci_registro FOR INSERT
WITH CHECK (studio IN (SELECT tm.studio FROM team_members tm WHERE tm.user_account = auth.uid() AND tm.studio IS NOT NULL));

CREATE POLICY "gantt_voci_registro_update" ON gantt_voci_registro FOR UPDATE
USING (studio IN (SELECT tm.studio FROM team_members tm WHERE tm.user_account = auth.uid() AND tm.studio IS NOT NULL))
WITH CHECK (studio IN (SELECT tm.studio FROM team_members tm WHERE tm.user_account = auth.uid() AND tm.studio IS NOT NULL));

CREATE POLICY "gantt_voci_registro_delete" ON gantt_voci_registro FOR DELETE
USING (studio IN (SELECT tm.studio FROM team_members tm WHERE tm.user_account = auth.uid() AND tm.studio IS NOT NULL));
