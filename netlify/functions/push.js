const { initializeApp, cert, getApps } = require("firebase-admin/app");
const { getFirestore }                                    = require("firebase-admin/firestore");
const { getMessaging }                                    = require("firebase-admin/messaging");

// ── Init Firebase Admin (una sola vez) ──
if (!getApps().length) {
  const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  initializeApp({ credential: cert(sa) });
}

const db = getFirestore();

exports.handler = async (event) => {
  // Solo POST
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, body: "Invalid JSON" };
  }

  const { edificioId, deptoId, sesionId, edificioNombre, deptoEtiqueta } = body;

  if (!edificioId || !deptoId || !sesionId) {
    return { statusCode: 400, body: "Faltan campos: edificioId, deptoId, sesionId" };
  }

  try {
    // 1 — Leer el FCM token del departamento
    const deptoSnap = await db
      .collection("edificios").doc(edificioId)
      .collection("departamentos").doc(deptoId)
      .get();

    if (!deptoSnap.exists) {
      return { statusCode: 404, body: "Departamento no encontrado" };
    }

    const fcmToken = deptoSnap.data()?.fcmToken;

    if (!fcmToken) {
      return {
        statusCode: 200,
        body: JSON.stringify({ ok: false, motivo: "Residente sin token FCM — app no activada" })
      };
    }

    // 2 — Enviar push via FCM
    const mensaje = {
      token: fcmToken,
      notification: {
        title: "🔔 ¡Alguien en tu puerta!",
        body:  `Depto ${deptoEtiqueta || deptoId} — ${edificioNombre || edificioId}`
      },
      data: {
        sesionId,
        edificioId,
        deptoId,
        tipo: "llamada"
      },
      android: {
        priority: "high",
        notification: {
          sound:       "default",
          channelId:   "timbrear_llamadas",
          priority:    "max",
          visibility:  "public"
        }
      },
      apns: {
        payload: {
          aps: {
            sound:            "default",
            contentAvailable: true,
            mutableContent:   true
          }
        }
      },
      webpush: {
        headers: { Urgency: "high" },
        notification: {
          requireInteraction: true,
          vibrate: [200, 100, 200, 100, 400]
        }
      }
    };

    const resultado = await getMessaging().send(mensaje);
    console.log("✅ Push enviado:", resultado);

    return {
      statusCode: 200,
      body: JSON.stringify({ ok: true, messageId: resultado })
    };

  } catch (e) {
    console.error("❌ Error push:", e.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ ok: false, error: e.message })
    };
  }
};
