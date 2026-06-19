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

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  // I messaggi sono data-only (vedi send-push-notification): leggi da payload.data.
  // Così mostriamo UNA sola notifica, senza il doppione dell'auto-display di FCM.
  const { title, body, icon, link } = payload.data ?? {};
  self.registration.showNotification(title || "SP Manager", {
    body: body || "",
    icon: icon || "/icon-192.png",
    badge: "/icon-192.png",
    data: { url: link || "/" },
  });
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data?.url || "/")
  );
});
