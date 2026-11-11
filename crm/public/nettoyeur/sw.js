/* ProClean Nettoyeur : reçoit les notifications de nouveaux ménages, même application fermée. */
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));
self.addEventListener("push", (event) => {
  let d = {};
  try { d = event.data ? event.data.json() : {}; } catch (e) { d = { title: "Nouveau ménage", body: event.data ? event.data.text() : "" }; }
  event.waitUntil(self.registration.showNotification(d.title || "Nouveau ménage près de vous", {
    body: d.body || "Ouvrez ProClean pour l'accepter.", tag: d.tag || "menage", renotify: true, icon: "/icons/icon-192.png", badge: "/icons/favicon-64.png", vibrate: [200, 100, 200], data: { url: d.url || "/nettoyeur" }
  }));
});
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/nettoyeur";
  event.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
    for (const c of list) if (c.url.includes("/nettoyeur") && "focus" in c) return c.focus();
    return self.clients.openWindow(url);
  }));
});
