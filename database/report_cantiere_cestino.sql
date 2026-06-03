-- Funzione cestino per report_cantiere
CREATE OR REPLACE FUNCTION cestino_report_cantiere(p_studio_id uuid)
RETURNS TABLE(
  id uuid, numero integer, titolo text, nome_interno text,
  luogo text, data_ora timestamptz, deleted_at timestamptz,
  project_name text
) LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT
    rc.id, rc.numero, rc.titolo, rc.nome_interno,
    rc.luogo, rc.data_ora, rc.deleted_at,
    p.name AS project_name
  FROM report_cantiere rc
  LEFT JOIN projects p ON p.id = rc.project_id
  WHERE rc.studio = p_studio_id
    AND rc.deleted_at IS NOT NULL
  ORDER BY rc.deleted_at DESC;
$$;

-- Funzione ripristino
CREATE OR REPLACE FUNCTION ripristina_report_cantiere(p_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_studio uuid;
BEGIN
  SELECT studio INTO v_studio FROM report_cantiere WHERE id = p_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Report non trovato'; END IF;
  PERFORM _check_studio_member(v_studio);
  UPDATE report_cantiere SET deleted_at = NULL WHERE id = p_id;
END; $$;
