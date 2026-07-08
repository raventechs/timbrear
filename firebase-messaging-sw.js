// ═══════════════════════════════════════════════════════
//  TIMBREAR — Service Worker para notificaciones push
//  Este archivo DEBE estar en la raíz del sitio (mismo
//  nivel que index.html) para que funcionen las push.
// ═══════════════════════════════════════════════════════

importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey:            "AIzaSyCvD2dC6Fw976Bi_O2OZmhKFQ7mm1uVp40",
  authDomain:        "timbrear-cdc41.firebaseapp.com",
  projectId:         "timbrear-cdc41",
  storageBucket:     "timbrear-cdc41.firebasestorage.app",
  messagingSenderId: "707107985985",
  appId:             "1:707107985985:web:39126f161b9bb719f904c0"
});

const messaging = firebase.messaging();

// ── Notificación push cuando la app está en BACKGROUND o cerrada ──
messaging.onBackgroundMessage((payload) => {
  console.log("TimbreAr SW: push recibido en background", payload);

  const titulo = payload.notification?.title || "🔔 ¡Alguien en tu puerta!";
  const cuerpo = payload.notification?.body  || "Abrí TimbreAr para atender";
  const datos  = payload.data || {};

  self.registration.showNotification(titulo, {
    body:    cuerpo,
    icon:    "/icon-192.png",
    badge:   "/icon-192.png",
    tag:     "timbrear-llamada",          // reemplaza notif anterior
    renotify: true,                        // suena aunque ya haya una
    requireInteraction: true,              // no desaparece sola
    vibrate: [200, 100, 200, 100, 400],   // patrón de vibración
    data:    datos,
    actions: [
      { action: "atender",  title: "📞 Atender" },
      { action: "rechazar", title: "📵 Rechazar" }
    ]
  });
});

// ── Click en la notificación ──
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const sesionId = event.notification.data?.sesionId || "";
  const url      = `/timbrear-residente.html?sesion=${sesionId}`;

  if (event.action === "rechazar") {
    // En el futuro: llamar a Firebase para marcar como rechazada
    return;
  }

  // Atender o click general → abrir/enfocar la app
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((lista) => {
      for (const cliente of lista) {
        if (cliente.url.includes("timbrear-residente") && "focus" in cliente) {
          return cliente.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
