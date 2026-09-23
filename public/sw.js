// The kill switch for the service worker openplate.de no longer has.
//
// Until the M194 cutover this origin served the app, and the app registered a
// service worker here that answers every image cache first, with no expiry.
// The origin now serves the website, and nginx used to redirect /sw.js to the
// app's host. A browser never follows a redirect when it checks a service
// worker for an update, so the old worker stayed installed and kept serving
// the site's pre-redesign screenshots to anyone who had used the app here.
//
// A browser that still runs the old worker fetches this file on its next
// update check, installs it, and it removes every cache on the origin,
// unregisters itself, and reloads the tabs it controlled so they load from
// the network. Nothing on the website registers it; it only replaces.

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(names.map((name) => caches.delete(name)));
      await self.registration.unregister();
      const tabs = await self.clients.matchAll({ type: 'window' });
      for (const tab of tabs) tab.navigate(tab.url);
    })(),
  );
});
