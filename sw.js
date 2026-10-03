// Service worker: saves your games so they work offline.
// Games update automatically: users get the new version the next time
// they open a game after being online (the second open, to be exact).

const CACHE = "boardgames-v5";

// 1) Your own files. Add any new game files to this list when you upload them.
const FILES = [
  "./",
  "./index.html",
  "./ClueJuniorScorecard.html",
  "./ClueJuniorScorecard2.html",
  "./Clue-Original.html",
  "./Sorry_Mobile_Deck.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
  "./manifest-clue-junior.json",
  "./icon-clue-junior-192.png",
  "./icon-clue-junior-512.png",
  "./manifest-clue-original.json",
  "./icon-clue-original-192.png",
  "./icon-clue-original-512.png",
  "./manifest-sorry.json",
  "./icon-sorry-192.png",
  "./icon-sorry-512.png",
  "./Dice_Roller.html",
  "./manifest-dice.json",
  "./icon-dice-192.png",
  "./icon-dice-512.png"
];

// 2) Outside files your games use (scripts and icons).
const EXTERNAL_FILES = [
  "https://cdn.tailwindcss.com"
];

// 3) Outside stylesheets. Their font files are found and saved automatically.
const EXTERNAL_CSS = [
  "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css",
  "https://fonts.googleapis.com/css2?family=Fredoka+One&family=Plus+Jakarta+Sans:wght@600;700;800&display=swap"
];

// Only these outside websites are ever saved.
const ALLOWED_HOSTS = [
  "cdn.tailwindcss.com",
  "cdnjs.cloudflare.com",
  "fonts.googleapis.com",
  "fonts.gstatic.com"
];

// Fetch an outside file and store it. Tries the normal way first,
// then a fallback for sites that don't allow it.
function saveExternal(cache, url) {
  return fetch(url)
    .catch(() => fetch(url, { mode: "no-cors" }))
    .then((res) => cache.put(url, res.clone()).then(() => res))
    .catch(() => null);
}

// Save a stylesheet, then find and save the font files inside it.
function saveCssAndFonts(cache, cssUrl) {
  return fetch(cssUrl)
    .then((res) => {
      cache.put(cssUrl, res.clone());
      return res.text();
    })
    .then((css) => {
      const urls = [];
      const re = /url\(\s*['"]?([^'")]+)['"]?\s*\)/g;
      let m;
      while ((m = re.exec(css))) {
        let abs;
        try { abs = new URL(m[1], cssUrl).href; } catch (e) { continue; }
        if (/\.woff2(\?|$)/.test(abs)) urls.push(abs);
      }
      return Promise.all(urls.map((u) => saveExternal(cache, u)));
    })
    .catch(() => {});
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) =>
      Promise.all([
        ...FILES.map((f) => cache.add(encodeURI(f)).catch(() => {})),
        ...EXTERNAL_FILES.map((u) => saveExternal(cache, u)),
        ...EXTERNAL_CSS.map((u) => saveCssAndFonts(cache, u))
      ])
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
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  const sameSite = url.origin === location.origin;
  if (!sameSite && !ALLOWED_HOSTS.includes(url.hostname)) return;

  event.respondWith(
    caches.open(CACHE).then((cache) =>
      cache.match(req, { ignoreSearch: sameSite }).then((cached) => {
        const network = fetch(req)
          .then((res) => {
            if (res && (res.ok || res.type === "opaque")) cache.put(req, res.clone());
            return res;
          })
          .catch(() => cached);
        return cached || network;
      })
    )
  );
});
