// Service worker unico per le notifiche push di ASM.
//
// Gestiamo noi l'evento "push", come nell'app nido: ogni push mostra SUBITO una
// notifica dentro event.waitUntil(). È fondamentale su iPhone/Safari: se una push
// arriva e il service worker non mostra una notifica in quel modo, iOS la considera
// "silenziosa" e dopo poche volte revoca l'iscrizione → le notifiche si perdono e
// bisognava spegnerle e riaccenderle.
//
// Dal passaggio a Web Push standard (come nido) Firebase non c'è più; il nome del file
// resta per non perdere i dispositivi già registrati. Legge sia il Web Push (payload
// diretto) sia gli ultimi messaggi FCM dei dispositivi non ancora passati (payload.data).

self.addEventListener("push", (event) => {
  let raw = {};
  try { raw = event.data ? event.data.json() : {}; } catch (e) {
    try { raw = { body: event.data ? event.data.text() : "" }; } catch (_) { raw = {}; }
  }
  const p = raw.data || raw.notification || raw;
  const title = p.title || "ASM";
  const link = p.link || p.url || raw.fcmOptions?.link || "/";

  event.waitUntil(
    self.registration.showNotification(title, {
      body: p.body || p.message || "",
      icon: p.icon || "/icon-192.png",
      badge: "/icon-192.png",
      tag: p.notification_id || undefined,
      data: { url: link },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if ("focus" in client) {
          client.focus();
          if ("navigate" in client && url !== "/") client.navigate(url).catch(() => {});
          return;
        }
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
