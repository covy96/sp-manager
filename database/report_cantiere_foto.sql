-- Foto allegate ai report di cantiere
CREATE TABLE IF NOT EXISTS report_cantiere_foto (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  studio     uuid NOT NULL REFERENCES studios(id) ON DELETE CASCADE,
  report_id  uuid NOT NULL REFERENCES report_cantiere(id) ON DELETE CASCADE,
  url        text NOT NULL,
  ordine     integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rcfoto_report ON report_cantiere_foto(report_id);

ALTER TABLE report_cantiere_foto ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rcfoto_select" ON report_cantiere_foto FOR SELECT
  USING (studio IN (SELECT studio FROM team_members WHERE user_account = auth.uid()));

CREATE POLICY "rcfoto_insert" ON report_cantiere_foto FOR INSERT
  WITH CHECK (studio IN (SELECT studio FROM team_members WHERE user_account = auth.uid()));

CREATE POLICY "rcfoto_delete" ON report_cantiere_foto FOR DELETE
  USING (studio IN (SELECT studio FROM team_members WHERE user_account = auth.uid()));

-- Bucket report-foto: creare manualmente su Supabase Storage (Public: true)
-- Poi eseguire le policy storage:

CREATE POLICY "rcfoto_storage_upload" ON storage.objects FOR INSERT
  TO authenticated WITH CHECK (bucket_id = 'report-foto');

CREATE POLICY "rcfoto_storage_read" ON storage.objects FOR SELECT
  TO public USING (bucket_id = 'report-foto');

CREATE POLICY "rcfoto_storage_delete" ON storage.objects FOR DELETE
  TO authenticated USING (bucket_id = 'report-foto');
