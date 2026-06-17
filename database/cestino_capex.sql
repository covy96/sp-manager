-- Cestino per i preventivi CAPEX (capex_voci): elenco, ripristino ed
-- eliminazione definitiva. capex_voci non ha colonna studio → si scopa
-- tramite project_id -> projects.studio. Esegui nel SQL Editor di Supabase.

-- ── Elenco capex eliminati per il cestino ─────────────────────────
CREATE OR REPLACE FUNCTION cestino_capex(p_studio_id uuid)
RETURNS TABLE (id uuid, categoria text, fornitore text, deleted_at timestamptz, project_name text)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT v.id, v.categoria, v.fornitore, v.deleted_at, p.name
  FROM capex_voci v
  JOIN projects p ON p.id = v.project_id
  WHERE p.studio = p_studio_id AND v.deleted_at IS NOT NULL
  ORDER BY v.deleted_at DESC
  LIMIT 50;
$$;

-- ── Ripristino (aggiunge il supporto a capex_voci) ────────────────
CREATE OR REPLACE FUNCTION ripristina_item(p_tabella text, p_id uuid, p_studio_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF    p_tabella = 'projects'               THEN UPDATE projects               SET deleted_at = NULL WHERE id = p_id AND studio = p_studio_id;
  ELSIF p_tabella = 'commesse'               THEN UPDATE commesse               SET deleted_at = NULL WHERE id = p_id AND studio = p_studio_id;
  ELSIF p_tabella = 'offerte'                THEN UPDATE offerte                SET deleted_at = NULL WHERE id = p_id AND studio = p_studio_id;
  ELSIF p_tabella = 'proforma'               THEN UPDATE proforma               SET deleted_at = NULL WHERE id = p_id AND studio = p_studio_id;
  ELSIF p_tabella = 'suddivisione_pagamenti' THEN UPDATE suddivisione_pagamenti SET deleted_at = NULL WHERE id = p_id AND studio = p_studio_id;
  ELSIF p_tabella = 'costi_extra'            THEN UPDATE costi_extra            SET deleted_at = NULL WHERE id = p_id AND studio = p_studio_id;
  ELSIF p_tabella = 'lavorazioni_gantt'      THEN UPDATE lavorazioni_gantt      SET deleted_at = NULL WHERE id = p_id AND studio = p_studio_id;
  ELSIF p_tabella = 'tasks'                  THEN UPDATE tasks                  SET deleted_at = NULL WHERE id = p_id AND studio = p_studio_id;
  ELSIF p_tabella = 'collaboratori_esterni'  THEN UPDATE collaboratori_esterni  SET deleted_at = NULL WHERE id = p_id;
  ELSIF p_tabella = 'costi_interni'          THEN UPDATE costi_interni          SET deleted_at = NULL WHERE id = p_id;
  ELSIF p_tabella = 'timesheet'              THEN UPDATE timesheet              SET deleted_at = NULL WHERE id = p_id AND studio = p_studio_id;
  ELSIF p_tabella = 'global_contacts'        THEN UPDATE global_contacts        SET deleted_at = NULL WHERE id = p_id AND studio = p_studio_id;
  ELSIF p_tabella = 'fatture'                THEN UPDATE fatture                SET deleted_at = NULL WHERE id = p_id AND studio = p_studio_id;
  ELSIF p_tabella = 'notes'                  THEN UPDATE notes                  SET deleted_at = NULL WHERE id = p_id AND studio = p_studio_id;
  ELSIF p_tabella = 'report_cantiere'        THEN UPDATE report_cantiere        SET deleted_at = NULL WHERE id = p_id AND studio = p_studio_id;
  ELSIF p_tabella = 'capex_voci'             THEN UPDATE capex_voci             SET deleted_at = NULL WHERE id = p_id AND project_id IN (SELECT id FROM projects WHERE studio = p_studio_id);
  ELSE RAISE EXCEPTION 'Tabella non supportata: %', p_tabella;
  END IF;
END; $$;

-- ── Eliminazione definitiva (cascade FK + supporto capex_voci) ────
CREATE OR REPLACE FUNCTION elimina_definitivo(p_tabella text, p_id uuid, p_studio_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM _check_studio_member(p_studio_id);

  IF p_tabella = 'projects' THEN
    DELETE FROM lavorazioni_gantt  WHERE project_id = p_id;
    DELETE FROM project_contacts   WHERE project_id = p_id;
    DELETE FROM project_user_views WHERE project_id = p_id;
    DELETE FROM timesheet          WHERE project_id = p_id;
    UPDATE commesse SET project_id = NULL WHERE project_id = p_id;
    DELETE FROM projects WHERE id = p_id AND studio = p_studio_id;

  ELSIF p_tabella = 'commesse' THEN
    DELETE FROM collaboratori_esterni WHERE commessa_id = p_id;
    DELETE FROM pagamenti             WHERE commessa_id = p_id;
    UPDATE projects SET commessa_id = NULL WHERE commessa_id = p_id;
    DELETE FROM commesse WHERE id = p_id AND studio = p_studio_id;

  ELSIF p_tabella = 'capex_voci' THEN
    -- capex_pagamenti si elimina in cascata (FK ON DELETE CASCADE)
    DELETE FROM capex_voci WHERE id = p_id AND project_id IN (SELECT id FROM projects WHERE studio = p_studio_id);

  ELSIF p_tabella = 'offerte'                THEN DELETE FROM offerte                WHERE id = p_id AND studio = p_studio_id;
  ELSIF p_tabella = 'proforma'               THEN DELETE FROM proforma               WHERE id = p_id AND studio = p_studio_id;
  ELSIF p_tabella = 'suddivisione_pagamenti' THEN DELETE FROM suddivisione_pagamenti WHERE id = p_id AND studio = p_studio_id;
  ELSIF p_tabella = 'costi_extra'            THEN DELETE FROM costi_extra            WHERE id = p_id AND studio = p_studio_id;
  ELSIF p_tabella = 'lavorazioni_gantt'      THEN DELETE FROM lavorazioni_gantt      WHERE id = p_id AND studio = p_studio_id;
  ELSIF p_tabella = 'tasks'                  THEN DELETE FROM tasks                  WHERE id = p_id AND studio = p_studio_id;
  ELSIF p_tabella = 'collaboratori_esterni'  THEN DELETE FROM collaboratori_esterni  WHERE id = p_id;
  ELSIF p_tabella = 'costi_interni'          THEN DELETE FROM costi_interni          WHERE id = p_id;
  ELSIF p_tabella = 'timesheet'              THEN DELETE FROM timesheet              WHERE id = p_id AND studio = p_studio_id;
  ELSIF p_tabella = 'global_contacts'        THEN DELETE FROM global_contacts        WHERE id = p_id AND studio = p_studio_id;
  ELSIF p_tabella = 'fatture'                THEN DELETE FROM fatture                WHERE id = p_id AND studio = p_studio_id;
  ELSIF p_tabella = 'notes'                  THEN DELETE FROM notes                  WHERE id = p_id AND studio = p_studio_id;
  ELSIF p_tabella = 'report_cantiere'        THEN
    DELETE FROM report_cantiere_foto WHERE report_id = p_id;
    DELETE FROM report_cantiere      WHERE id = p_id AND studio = p_studio_id;
  ELSE RAISE EXCEPTION 'Tabella non supportata: %', p_tabella;
  END IF;
END; $$;
