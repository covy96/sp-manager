-- Nasconde automaticamente il progetto creato INSIEME a un'offerta quando
-- l'offerta viene rifiutata, e lo fa ricomparire quando l'offerta viene
-- ripristinata / riaccettata.
--
-- Solo i progetti creati contestualmente a un'offerta (offerta_origine_id
-- valorizzato) vengono toccati: i progetti pre-esistenti collegati a mano
-- restano sempre visibili.
--
-- Esegui UNA VOLTA nel SQL Editor di Supabase Dashboard.

-- 1. Colonne di supporto su projects
--    offerta_origine_id : l'offerta che ha creato il progetto (marker + link)
--    nascosto_offerta   : true se il progetto è nascosto perché l'offerta è rifiutata
ALTER TABLE projects ADD COLUMN IF NOT EXISTS offerta_origine_id uuid REFERENCES offerte(id) ON DELETE SET NULL;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS nascosto_offerta boolean NOT NULL DEFAULT false;

-- 2. Trigger: sincronizza la visibilità del progetto con lo stato dell'offerta.
--    Riusa il flag `archived` così il progetto sparisce da tutte le viste che
--    già filtrano archived=false; `nascosto_offerta` distingue questo stato da
--    un archiviazione manuale (così non compare neanche fra i Progetti Archiviati).
CREATE OR REPLACE FUNCTION sync_progetto_offerta_rifiutata()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.stato IS DISTINCT FROM OLD.stato THEN
    IF NEW.stato = 'rifiutata' THEN
      -- Offerta rifiutata → nascondi il progetto creato con essa
      UPDATE projects
        SET archived = true, nascosto_offerta = true
        WHERE offerta_origine_id = NEW.id AND nascosto_offerta = false;
    ELSIF OLD.stato = 'rifiutata' THEN
      -- Offerta ripristinata / riaccettata → fai ricomparire il progetto
      UPDATE projects
        SET archived = false, nascosto_offerta = false
        WHERE offerta_origine_id = NEW.id AND nascosto_offerta = true;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_progetto_offerta ON offerte;
CREATE TRIGGER trg_sync_progetto_offerta
AFTER UPDATE OF stato ON offerte
FOR EACH ROW
EXECUTE FUNCTION sync_progetto_offerta_rifiutata();
