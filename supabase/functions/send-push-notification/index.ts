// supabase/functions/send-push-notification/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import webPush from "https://esm.sh/web-push@3.6.7";

const FCM_URL = "https://fcm.googleapis.com/v1/projects/asm-studio-35538/messages:send";

async function getAccessToken(serviceAccount: any): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const payload = {
    iss: serviceAccount.client_email,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  };

  const enc = (obj: any) =>
    btoa(JSON.stringify(obj)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  const signingInput = `${enc(header)}.${enc(payload)}`;

  const pemKey = serviceAccount.private_key.replace(/\\n/g, "\n");
  const keyData = pemKey
    .replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\n/g, "");
  const binaryKey = Uint8Array.from(atob(keyData), (c) => c.charCodeAt(0));

  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    binaryKey.buffer,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    cryptoKey,
    new TextEncoder().encode(signingInput),
  );

  const jwt = `${signingInput}.${
    btoa(String.fromCharCode(...new Uint8Array(signature)))
      .replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_")
  }`;

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });
  const tokenData = await tokenRes.json();
  return tokenData.access_token;
}

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const body = await req.json();
    const { title, message, body: bodyText, link, notification_id } = body;
    const notifTitle = title || "ASM";
    const notifBody = message || bodyText || "";

    // ── WEB PUSH NATIVO (Safari, Firefox) ──────────────────────────
    if (body.web_push_subscription) {
      const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY");
      const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY");

      if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
        return new Response(
          JSON.stringify({ error: "VAPID keys not configured" }),
          { status: 500 },
        );
      }

      webPush.setVapidDetails(
        "mailto:noreply@sp-manager.app",
        VAPID_PUBLIC_KEY,
        VAPID_PRIVATE_KEY,
      );

      const payload = JSON.stringify({
        title: notifTitle,
        body: notifBody,
        icon: "/icon-192.png",
        link: link || "/",
        notification_id: notification_id || "",
      });

      await webPush.sendNotification(body.web_push_subscription, payload);

      return new Response(
        JSON.stringify({ success: true, via: "webpush" }),
        { headers: { "Content-Type": "application/json" } },
      );
    }

    // ── FCM (Chrome, Edge, Android) ─────────────────────────────────
    const { fcm_token } = body;
    if (!fcm_token) {
      return new Response(
        JSON.stringify({ error: "No FCM token or Web Push subscription" }),
        { status: 400 },
      );
    }

    const serviceAccountJson = Deno.env.get("FIREBASE_SERVICE_ACCOUNT");
    if (!serviceAccountJson) throw new Error("FIREBASE_SERVICE_ACCOUNT secret not set");
    const serviceAccount = JSON.parse(serviceAccountJson);
    const accessToken = await getAccessToken(serviceAccount);

    const fcmPayload = {
      message: {
        token: fcm_token,
        notification: { title: notifTitle, body: notifBody },
        webpush: {
          fcm_options: { link: link || "/" },
          notification: {
            icon: "/icon-192.png",
            badge: "/icon-192.png",
            requireInteraction: false,
          },
        },
        data: { notification_id: notification_id || "", link: link || "/" },
      },
    };

    const fcmRes = await fetch(FCM_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${accessToken}`,
      },
      body: JSON.stringify(fcmPayload),
    });

    const fcmData = await fcmRes.json();
    if (!fcmRes.ok) {
      console.error("FCM error:", fcmData);
      return new Response(JSON.stringify({ error: fcmData }), { status: 500 });
    }

    return new Response(
      JSON.stringify({ success: true, via: "fcm", fcmData }),
      { headers: { "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("Error:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
});
