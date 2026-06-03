-- Aggiunge nome_interno al report (nome nell'app, separato dal titolo PDF)
ALTER TABLE report_cantiere ADD COLUMN IF NOT EXISTS nome_interno text NOT NULL DEFAULT '';

-- Aggiunge impostazioni intestazione PDF allo studio
ALTER TABLE studios ADD COLUMN IF NOT EXISTS report_header_text text DEFAULT '';
ALTER TABLE studios ADD COLUMN IF NOT EXISTS report_logo_url text;

-- Bucket storage per i loghi (eseguire solo se non esiste)
-- Andare su Supabase > Storage > New bucket: "report-logos", Public: true
