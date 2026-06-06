-- Tabella voci preset per offerte
CREATE TABLE IF NOT EXISTS voci_offerta_template (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  studio        UUID REFERENCES studios(id) ON DELETE CASCADE,
  nome          TEXT NOT NULL,
  prezzo_default NUMERIC(12,2) DEFAULT 0,
  "order"       INT DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE voci_offerta_template ENABLE ROW LEVEL SECURITY;
CREATE POLICY "studio members" ON voci_offerta_template
  USING (studio IN (SELECT studio FROM team_members WHERE user_id = auth.uid()));

-- Colonna voci su offerte (array JSONB: [{id, nome, prezzo, attiva}])
ALTER TABLE offerte ADD COLUMN IF NOT EXISTS voci JSONB DEFAULT '[]'::jsonb;
