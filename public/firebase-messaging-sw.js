importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js");

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
  const { title, body } = payload.notification ?? {};
  self.registration.showNotification(title ?? "SP Manager", {
    body: body ?? "",
    icon: "/favicon.ico",
  });
});
