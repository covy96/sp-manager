import { initializeApp } from "firebase/app";
import { getMessaging, getToken, onMessage } from "firebase/messaging";

const firebaseConfig = {
  apiKey: "AIzaSyApe81xh3lMl5JogK5YX6jLOIgLcaAV9MM",
  authDomain: "asm-studio-35538.firebaseapp.com",
  projectId: "asm-studio-35538",
  storageBucket: "asm-studio-35538.firebasestorage.app",
  messagingSenderId: "796367917123",
  appId: "1:796367917123:web:4ec7322ea1dca19b72c4f6",
};

const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);

const VAPID_KEY =
  "BBNxzIEXDhRM7hrdzKDiEmuC4ltAJyBOTNKhODfPWorOaecf7ARHmVSmG29ESUNgYyNlHh5v7hFOODiDXi3O8-U";

export { messaging, VAPID_KEY, getToken, onMessage };
