-- Aggiunge le categorie "Paesaggistica" e "Monumentale" al pannello Pratiche.
-- Estende il CHECK su pratiche_edilizie.tipo_pratica con i due nuovi tipi.
-- Eseguire su Supabase beta.

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
    'Altro',
    -- Paesaggistica
    'Autorizzazione paesaggistica',
    -- Monumentale
    'Autorizzazione monumentale'
  ));
