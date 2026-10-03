// Service worker: saves your games so they work offline.
// Games update automatically: users get the new version the next time
// they open a game after being online (the second open, to be exact).

const CACHE = "boardgames-v1";

// Add any new game files to this list when you upload them.
const FILES = [
  "./",
  "./index.html",
  "./Clue Junior Scorecard - v2.html",
  "./Clue Junior Scorecard.html",
  "./Clue-Original.html",
  "./Sorry! Mobile Deck.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) =>
      // Add files one at a time so one typo in the list doesn't break everything
      Promise.all(FILES.map((f) => cache.add(encodeURI(f)).catch(() => {})))
    )
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Show the saved copy immediately, and refresh it in the background.
self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET" || new URL(req.url).origin !== location.origin) return;
  event.respondWith(
    caches.open(CACHE).then((cache) =>
      cache.match(req, { ignoreSearch: true }).then((cached) => {
        const network = fetch(req)
          .then((res) => {
            if (res && res.ok) cache.put(req, res.clone());
            return res;
          })
          .catch(() => cached);
        return cached || network;
      })
    )
  );
});
