-- RPC per il cestino: legge i record soft-deleted bypassando RLS
-- Esegui nel SQL Editor di Supabase Dashboard.

CREATE OR REPLACE FUNCTION cestino_projects(p_studio_id uuid)
RETURNS TABLE (id uuid, name text, deleted_at timestamptz)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT id, name, deleted_at FROM projects
  WHERE studio = p_studio_id AND deleted_at IS NOT NULL
  ORDER BY deleted_at DESC LIMIT 50;
$$;

CREATE OR REPLACE FUNCTION cestino_commesse(p_studio_id uuid)
RETURNS TABLE (id uuid, nome_commessa text, deleted_at timestamptz, project_name text)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT c.id, c.nome_commessa, c.deleted_at, p.name
  FROM commesse c LEFT JOIN projects p ON p.id = c.project_id
  WHERE c.studio = p_studio_id AND c.deleted_at IS NOT NULL
  ORDER BY c.deleted_at DESC LIMIT 50;
$$;

CREATE OR REPLACE FUNCTION cestino_offerte(p_studio_id uuid)
RETURNS TABLE (id uuid, nome_offerta text, deleted_at timestamptz)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT id, nome_offerta, deleted_at FROM offerte
  WHERE studio = p_studio_id AND deleted_at IS NOT NULL
  ORDER BY deleted_at DESC LIMIT 50;
$$;

CREATE OR REPLACE FUNCTION cestino_proforma(p_studio_id uuid)
RETURNS TABLE (id uuid, numero_proforma text, deleted_at timestamptz, commessa_nome text, project_name text)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT pf.id, pf.numero_proforma, pf.deleted_at, c.nome_commessa, p.name
  FROM proforma pf
  LEFT JOIN commesse c ON c.id = pf.commessa_id
  LEFT JOIN projects p ON p.id = c.project_id
  WHERE pf.studio = p_studio_id AND pf.deleted_at IS NOT NULL
  ORDER BY pf.deleted_at DESC LIMIT 50;
$$;

CREATE OR REPLACE FUNCTION cestino_rate(p_studio_id uuid)
RETURNS TABLE (id uuid, numero_rata integer, deleted_at timestamptz, commessa_nome text, project_name text)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT r.id, r.numero_rata, r.deleted_at, c.nome_commessa, p.name
  FROM suddivisione_pagamenti r
  LEFT JOIN commesse c ON c.id = r.commessa_id
  LEFT JOIN projects p ON p.id = c.project_id
  WHERE r.studio = p_studio_id AND r.deleted_at IS NOT NULL
  ORDER BY r.deleted_at DESC LIMIT 50;
$$;

CREATE OR REPLACE FUNCTION cestino_costi_extra(p_studio_id uuid)
RETURNS TABLE (id uuid, description text, deleted_at timestamptz, commessa_nome text, project_name text)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT ce.id, ce.description, ce.deleted_at, c.nome_commessa, p.name
  FROM costi_extra ce
  LEFT JOIN commesse c ON c.id = ce.commessa_id
  LEFT JOIN projects p ON p.id = c.project_id
  WHERE ce.studio = p_studio_id AND ce.deleted_at IS NOT NULL
  ORDER BY ce.deleted_at DESC LIMIT 50;
$$;

CREATE OR REPLACE FUNCTION cestino_gantt(p_studio_id uuid)
RETURNS TABLE (id uuid, descrizione text, deleted_at timestamptz, project_name text)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT lg.id, lg.descrizione, lg.deleted_at, p.name
  FROM lavorazioni_gantt lg
  LEFT JOIN projects p ON p.id = lg.project_id
  WHERE lg.studio = p_studio_id AND lg.deleted_at IS NOT NULL
  ORDER BY lg.deleted_at DESC LIMIT 50;
$$;

CREATE OR REPLACE FUNCTION cestino_tasks(p_studio_id uuid)
RETURNS TABLE (id uuid, title text, deleted_at timestamptz, project_name text)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT t.id, t.title, t.deleted_at, p.name
  FROM tasks t
  LEFT JOIN projects p ON p.id = t.project_id
  WHERE t.studio = p_studio_id AND t.deleted_at IS NOT NULL
  ORDER BY t.deleted_at DESC LIMIT 50;
$$;
