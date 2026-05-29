-- RPC per il cestino: legge i record soft-deleted bypassando RLS
-- Esegui nel SQL Editor di Supabase Dashboard.

CREATE OR REPLACE FUNCTION cestino_commesse(p_studio_id uuid)
RETURNS TABLE (
  id uuid,
  nome_commessa text,
  deleted_at timestamptz,
  project_name text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.id, c.nome_commessa, c.deleted_at, p.name AS project_name
  FROM commesse c
  LEFT JOIN projects p ON p.id = c.project_id
  WHERE c.studio = p_studio_id
    AND c.deleted_at IS NOT NULL
  ORDER BY c.deleted_at DESC
  LIMIT 50;
$$;

CREATE OR REPLACE FUNCTION cestino_projects(p_studio_id uuid)
RETURNS TABLE (
  id uuid,
  name text,
  deleted_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, name, deleted_at
  FROM projects
  WHERE studio = p_studio_id
    AND deleted_at IS NOT NULL
  ORDER BY deleted_at DESC
  LIMIT 50;
$$;
