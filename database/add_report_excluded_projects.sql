-- Aggiunge la colonna per i progetti esclusi dal template report
ALTER TABLE studios
  ADD COLUMN IF NOT EXISTS report_excluded_projects uuid[] DEFAULT '{}';
