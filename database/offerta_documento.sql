-- Configurazione del documento d'offerta (sezioni attive, prezzi, campi compilati)
-- Struttura: {
--   copertina: bool, firma: bool,
--   destinatario: { nome, indirizzo, sede, cf, piva },
--   oggetto: string, data: 'YYYY-MM-DD', luogo: string,
--   necessita: string,
--   inquadramento: { attivo: bool, campi: { f0.. } },
--   sezioni: { <sezioneId>: { attiva, prezzo, voci: { <voceId>: { attiva, prezzo, campi } } } },
--   blocchi: { <bloccoId>: bool },
--   pagamento: { opzioni: ['A'], testoLibero: '' }
-- }
ALTER TABLE offerte ADD COLUMN IF NOT EXISTS documento JSONB DEFAULT '{}'::jsonb;

-- Storico versioni del documento: ogni salvataggio aggiunge uno snapshot.
-- Struttura: [ { n: 1, ts: '2026-01-01T10:00:00.000Z', doc: { ...documento } }, … ]
-- (ordine dal più recente al più vecchio)
ALTER TABLE offerte ADD COLUMN IF NOT EXISTS documento_versioni JSONB DEFAULT '[]'::jsonb;
