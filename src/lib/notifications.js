import { supabase } from "./supabase";

/**
 * Crea una notifica nel DB — il trigger Supabase invierà automaticamente la push
 * @param {Object} opts
 * @param {string} opts.studioId
 * @param {string} opts.userEmail — email del destinatario
 * @param {string} opts.type — tipo notifica (task_assegnata, task_scadenza_oggi, ecc.)
 * @param {string} opts.title
 * @param {string} opts.message
 * @param {string} [opts.link] — path relativo es. /progetti/123
 * @param {string} [opts.projectId]
 * @param {string} [opts.taskId]
 * @param {number} [opts.dedupMinutes] — se valorizzato, non invia se esiste già una notifica
 *                                        dello stesso tipo per lo stesso destinatario entro questa finestra
 *                                        (stile "note condivise" Apple: un solo avviso per sessione)
 */
export async function createNotification({ studioId, userEmail, type, title, message, link, projectId, taskId, dedupMinutes }) {
  if (!studioId || !userEmail) return;

  // Cooldown: evita lo spam di notifiche ravvicinate dello stesso tipo
  if (dedupMinutes) {
    const since = new Date(Date.now() - dedupMinutes * 60 * 1000).toISOString();
    const { count } = await supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("studio", studioId)
      .eq("user_email", userEmail)
      .eq("type", type)
      .gte("created_at", since);
    if (count && count > 0) return; // già notificato di recente
  }

  // Controlla le preferenze del destinatario
  const { data: member } = await supabase
    .from("team_members")
    .select("notification_preferences, fcm_token, fcm_tokens, web_push_subscription")
    .eq("user_email", userEmail)
    .eq("studio", studioId)
    .single();

  // Se ha le preferenze e il tipo è disabilitato, non inviare
  if (member?.notification_preferences && member.notification_preferences[type] === false) return;

  const { data: notif, error } = await supabase.from("notifications").insert({
    studio: studioId,
    user_email: userEmail,
    type,
    title,
    message,
    link: link || null,
    project_id: projectId || null,
    task_id: taskId || null,
    read: false,
  }).select("id").single();

  if (error) { console.error("Errore creazione notifica:", error.message); return; }

  // Invia a tutti i dispositivi FCM registrati
  const tokens = (member?.fcm_tokens?.length ? member.fcm_tokens : member?.fcm_token ? [member.fcm_token] : []);
  tokens.forEach(fcm_token => {
    supabase.functions.invoke("send-push-notification", {
      body: { fcm_token, title, message, link: link || "/", notification_id: notif?.id || "" },
    }).catch(e => console.warn("Push send error (FCM):", e.message));
  });

  // Invia via Web Push nativo (Safari, Firefox)
  if (member?.web_push_subscription) {
    supabase.functions.invoke("send-push-notification", {
      body: { web_push_subscription: member.web_push_subscription, title, body: message, link: link || "/", notification_id: notif?.id || "" },
    }).catch(e => console.warn("Push send error (WebPush):", e.message));
  }
}

/**
 * Notifica assegnazione task
 */
export async function notifyTaskAssigned({ studioId, assignedEmail, taskTitle, projectName, taskId, projectId }) {
  await createNotification({
    studioId, userEmail: assignedEmail,
    type: "task_assegnata",
    title: "Task assegnata",
    message: `Ti è stata assegnata la task "${taskTitle}" nel progetto ${projectName || ""}`,
    link: projectId ? `/progetti/${projectId}` : "/scrivania",
    projectId, taskId,
  });
}

/**
 * Notifica nuovo membro
 */
export async function notifyNewMember({ studioId, adminEmail, newMemberName }) {
  await createNotification({
    studioId, userEmail: adminEmail,
    type: "nuovo_membro",
    title: "Nuovo membro",
    message: `${newMemberName} si è unito allo studio`,
    link: "/team",
  });
}

/**
 * Notifica proforma in scadenza
 */
export async function notifyProformaScadenza({ studioId, userEmail, proformaNum, commessaNome, daysLeft, commessaId }) {
  await createNotification({
    studioId, userEmail,
    type: "proforma_in_scadenza",
    title: "Proforma in scadenza",
    message: `La proforma ${proformaNum} (${commessaNome}) scade tra ${daysLeft} giorni`,
    link: commessaId ? `/commesse/${commessaId}` : "/proforma",
  });
}

/**
 * Notifica scadenza pratica edilizia
 */
export async function notifyPraticaScadenza({ studioId, userEmail, tipoPratica, eventLabel, daysLeft, projectName, projectId }) {
  await createNotification({
    studioId, userEmail,
    type: "pratica_scadenza",
    title: `Scadenza pratica: ${tipoPratica}`,
    message: `${eventLabel} di "${tipoPratica}"${projectName ? ` (${projectName})` : ""} ${daysLeft === 0 ? "è oggi" : `tra ${daysLeft} giorni`}`,
    link: projectId ? `/progetti/${projectId}` : null,
    projectId,
  });
}

/**
 * Leggi notifiche non lette per un utente
 */
export async function getUnreadNotifications(studioId, userEmail) {
  const { data } = await supabase
    .from("notifications")
    .select("*")
    .eq("studio", studioId)
    .eq("user_email", userEmail)
    .eq("read", false)
    .order("created_at", { ascending: false })
    .limit(50);
  return data ?? [];
}

/**
 * Segna tutte le notifiche non lette come lette
 */
export async function markAllRead(studioId, userEmail) {
  const { error } = await supabase
    .from("notifications")
    .update({ read: true })
    .eq("studio", studioId)
    .eq("user_email", userEmail)
    .eq("read", false);
  if (error) console.error("Errore markAllRead:", error.message);
}

/**
 * Notifica condivisione nota della scrivania
 */
export async function notifyNotaCondivisa({ studioId, recipientEmail, authorName }) {
  await createNotification({
    studioId, userEmail: recipientEmail,
    type: "nota_condivisa",
    title: "Nota condivisa",
    message: `${authorName} ha condiviso una nota con te`,
    link: "/scrivania",
  });
}

/**
 * Notifica aggiornamento nota condivisa
 */
export async function notifyNotaAggiornata({ studioId, recipientEmail, editorName }) {
  await createNotification({
    studioId, userEmail: recipientEmail,
    type: "nota_aggiornata",
    title: "Nota aggiornata",
    message: `${editorName} ha modificato una nota condivisa con te`,
    link: "/scrivania",
    dedupMinutes: 60, // un solo avviso per sessione di editing (stile note condivise Apple)
  });
}

/**
 * Segna una singola notifica come letta
 */
export async function markOneRead(notifId) {
  const { error } = await supabase
    .from("notifications")
    .update({ read: true })
    .eq("id", notifId);
  if (error) console.error("Errore markOneRead:", error.message);
}
