import { supabase } from "./supabase";

/**
 * Scrive un evento nel log attività.
 * Fire-and-forget: non blocca l'UI in caso di errore.
 *
 * @param {object} opts
 * @param {string}  opts.studioId
 * @param {string}  [opts.projectId]
 * @param {string}  [opts.memberId]
 * @param {string}  opts.action      – es. "task.created", "task.completed", "project.edited"
 * @param {string}  [opts.entityType] – es. "task", "project", "pratica"
 * @param {string}  [opts.entityId]
 * @param {object}  [opts.meta]      – dati extra liberi (titolo, etc.)
 */
export async function logActivity({ studioId, projectId, memberId, action, entityType, entityId, meta }) {
  if (!studioId || !action) return;
  try {
    await supabase.from("activity_log").insert({
      studio:      studioId,
      project_id:  projectId  || null,
      member_id:   memberId   || null,
      action,
      entity_type: entityType || null,
      entity_id:   entityId   || null,
      meta:        meta       || null,
    });
  } catch (_) {
    // silenzioso — il log non deve mai bloccare l'utente
  }
}

// ── AZIONI PREDEFINITE ────────────────────────────────────────────

/** Etichetta leggibile per un'azione */
export function actionLabel(action) {
  const MAP = {
    "task.created":      "Task creata",
    "task.completed":    "Task completata",
    "task.reopened":     "Task riaperta",
    "task.deleted":      "Task eliminata",
    "task.assigned":     "Task assegnata",
    "project.edited":    "Progetto modificato",
    "project.archived":  "Progetto archiviato",
    "pratica.created":   "Pratica aggiunta",
    "pratica.updated":   "Pratica aggiornata",
    "pratica.deleted":   "Pratica eliminata",
    "ore.logged":        "Ore registrate",
    "comment.added":     "Commento aggiunto",
  };
  return MAP[action] || action;
}
