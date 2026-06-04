-- STEP 1: ANTEPRIMA — esegui prima questo per vedere cosa verrà eliminato
SELECT id, nome_commessa, cliente, data_commessa
FROM commesse
WHERE EXTRACT(YEAR FROM data_commessa) = 2026
  AND deleted_at IS NULL
ORDER BY data_commessa;

-- STEP 2: ELIMINA — solo dopo aver verificato l'anteprima, esegui questo blocco
/*
DO $$
DECLARE
  ids uuid[];
BEGIN
  -- Raccoglie gli ID delle commesse 2026
  SELECT ARRAY_AGG(id) INTO ids
  FROM commesse
  WHERE EXTRACT(YEAR FROM data_commessa) = 2026
    AND deleted_at IS NULL;

  IF ids IS NULL THEN
    RAISE NOTICE 'Nessuna commessa 2026 trovata';
    RETURN;
  END IF;

  -- Soft-delete suddivisione_pagamenti (rate)
  UPDATE suddivisione_pagamenti SET deleted_at = now() WHERE commessa_id = ANY(ids) AND deleted_at IS NULL;

  -- Soft-delete collaboratori_esterni
  UPDATE collaboratori_esterni SET deleted_at = now() WHERE commessa_id = ANY(ids) AND deleted_at IS NULL;

  -- Soft-delete proforma collegate
  UPDATE proforma SET deleted_at = now() WHERE commessa_id = ANY(ids) AND deleted_at IS NULL;

  -- Soft-delete fatture collegate
  UPDATE fatture SET deleted_at = now() WHERE commessa_id = ANY(ids) AND deleted_at IS NULL;

  -- Soft-delete costi_interni collegati (se hanno commessa_id)
  UPDATE costi_interni SET deleted_at = now() WHERE commessa_id = ANY(ids) AND deleted_at IS NULL;

  -- Soft-delete commesse
  UPDATE commesse SET deleted_at = now() WHERE id = ANY(ids);

  RAISE NOTICE 'Eliminate % commesse 2026 e relativi dati', ARRAY_LENGTH(ids, 1);
END;
$$;
*/
