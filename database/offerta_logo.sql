-- Logo dedicato alla copertina del documento d'offerta, per studio.
-- Se impostato, in copertina (PDF/Word) si usa questo al posto del logo report.
-- Caricato dalla pagina "Regolazione offerta" nel bucket storage "report-logos".
ALTER TABLE studios ADD COLUMN IF NOT EXISTS offerta_logo_url TEXT;
