import { initializeApp } from "firebase/app";
import { getMessaging, getToken, onMessage } from "firebase/messaging";

let messaging = null;

try {
  const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
  };

  if (firebaseConfig.apiKey && firebaseConfig.projectId) {
    const app = initializeApp(firebaseConfig);
    messaging = getMessaging(app);
  }
} catch (error) {
  console.warn("Firebase non configurato:", error);
}

export { messaging };

export async function richiediFCMToken(vapidKey) {
  if (!messaging) return null;
  try {
    // Registra esplicitamente il service worker
    const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');

    const token = await getToken(messaging, {
      vapidKey,
      serviceWorkerRegistration: registration
    });
    return token;
  } catch (error) {
    console.warn('Errore FCM token:', error);
    return null;
  }
}

export { onMessage };
