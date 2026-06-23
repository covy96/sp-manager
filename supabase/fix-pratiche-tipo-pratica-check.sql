-- Fix: il CHECK su pratiche_edilizie.tipo_pratica era limitato ai soli tipi
-- "edilizia" originari, ma il frontend ora invia anche valori per le categorie
-- OSAP, Insegne, SCIA Commerciale e Catasto.
-- Errore corretto:
--   new row for relation "pratiche_edilizie" violates check constraint
--   "pratiche_edilizie_tipo_pratica_check"

ALTER TABLE pratiche_edilizie
  DROP CONSTRAINT IF EXISTS pratiche_edilizie_tipo_pratica_check;

ALTER TABLE pratiche_edilizie
  ADD CONSTRAINT pratiche_edilizie_tipo_pratica_check
  CHECK (tipo_pratica IN (
    -- Edilizia
    'CILA',
    'SCIA art. 22',
    'SCIA art. 23',
    'Permesso a Costruire',
    -- OSAP
    'OSAP',
    -- Insegne
    'Insegna',
    -- SCIA Commerciale
    'SCIA Commerciale',
    -- Catasto
    'Variazione catastale',
    'Aggiornamento planimetria',
    'Fusione / Frazionamento',
    'Altro'
  ));
