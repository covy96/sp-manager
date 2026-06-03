-- ── REPORT DI CANTIERE ──────────────────────────────────────────────────────
-- Ogni report è legato a un progetto e contiene:
--   numero progressivo, titolo, sopralluogo N., luogo, data_ora, contenuto
--   presenti: JSONB array [ { figura, azienda, referente, email, telefono } ]

CREATE TABLE IF NOT EXISTS report_cantiere (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  studio        uuid NOT NULL REFERENCES studios(id) ON DELETE CASCADE,
  project_id    uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  numero        integer NOT NULL DEFAULT 1,
  titolo        text NOT NULL DEFAULT '',
  luogo         text NOT NULL DEFAULT '',
  data_ora      timestamptz NOT NULL DEFAULT now(),
  contenuto     text NOT NULL DEFAULT '',
  presenti      jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_by    uuid REFERENCES team_members(id),
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  deleted_at    timestamptz
);

-- Indici
CREATE INDEX IF NOT EXISTS idx_report_cantiere_project  ON report_cantiere(project_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_report_cantiere_studio   ON report_cantiere(studio)     WHERE deleted_at IS NULL;

-- RLS
ALTER TABLE report_cantiere ENABLE ROW LEVEL SECURITY;

CREATE POLICY "report_cantiere_select" ON report_cantiere FOR SELECT
  USING (
    studio IN (
      SELECT studio FROM team_members
      WHERE user_account = auth.uid()
        OR user_email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
  );

CREATE POLICY "report_cantiere_insert" ON report_cantiere FOR INSERT
  WITH CHECK (
    studio IN (
      SELECT studio FROM team_members
      WHERE user_account = auth.uid()
        OR user_email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
  );

CREATE POLICY "report_cantiere_update" ON report_cantiere FOR UPDATE
  USING (
    studio IN (
      SELECT studio FROM team_members
      WHERE user_account = auth.uid()
        OR user_email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
  );

-- Funzione soft-delete
CREATE OR REPLACE FUNCTION elimina_report_cantiere(p_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_studio uuid;
BEGIN
  SELECT studio INTO v_studio FROM report_cantiere WHERE id = p_id AND deleted_at IS NULL;
  IF NOT FOUND THEN RAISE EXCEPTION 'Report non trovato'; END IF;
  PERFORM _check_studio_member(v_studio);
  UPDATE report_cantiere SET deleted_at = now() WHERE id = p_id;
END; $$;
