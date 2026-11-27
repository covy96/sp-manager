// Service worker unico per le notifiche push di ASM.
//
// Gestiamo noi l'evento "push", come nell'app nido: ogni push mostra SUBITO una
// notifica dentro event.waitUntil(). È fondamentale su iPhone/Safari: se una push
// arriva e il service worker non mostra una notifica in quel modo, iOS la considera
// "silenziosa" e dopo poche volte revoca l'iscrizione → le notifiche si perdono e
// bisognava spegnerle e riaccenderle.
//
// Questo listener è registrato PRIMA di Firebase e ferma la propagazione, così il
// gestore di Firebase non mostra una seconda notifica (niente doppioni).
// Vale sia per i messaggi FCM (payload.data) sia per il Web Push nativo (payload diretto).

self.addEventListener("push", (event) => {
  event.stopImmediatePropagation();

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

// Firebase serve solo per ottenere il token FCM sul dispositivo (getToken).
// La visualizzazione delle notifiche la fa il listener "push" qui sopra.
importScripts("https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyApe81xh3lMl5JogK5YX6jLOIgLcaAV9MM",
  authDomain: "asm-studio-35538.firebaseapp.com",
  projectId: "asm-studio-35538",
  storageBucket: "asm-studio-35538.firebasestorage.app",
  messagingSenderId: "796367917123",
  appId: "1:796367917123:web:4ec7322ea1dca19b72c4f6",
});

firebase.messaging();

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
