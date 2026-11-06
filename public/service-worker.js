const CACHE_NAME = "energia-clara-shell-__APP_VERSION__";
const APP_ROOT = new URL("./", self.registration.scope);
const APP_SHELL = [
  new URL("./", APP_ROOT).href,
  new URL("./index.html", APP_ROOT).href,
  new URL("./tutorial.html", APP_ROOT).href,
  new URL("./manifest.webmanifest", APP_ROOT).href,
  new URL("./icon.svg", APP_ROOT).href,
  new URL("./icon-192.png", APP_ROOT).href,
  new URL("./icon-512.png", APP_ROOT).href,
];

self.addEventListener("install", (event) => {
  event.waitUntil(precacheApp());
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    Promise.all([
      caches.keys().then((keys) =>
        Promise.all(keys.filter((key) => key.startsWith("energia-clara-") && key !== CACHE_NAME).map((key) => caches.delete(key))),
      ),
      self.clients.claim(),
    ]),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin) return;
  if (url.pathname.endsWith("/version.json")) {
    event.respondWith(fetch(request, { cache: "no-store" }));
    return;
  }
  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request));
    return;
  }
  event.respondWith(cacheFirst(request));
});

async function networkFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const response = await fetch(request);
    if (response.ok) await cache.put(request, response.clone());
    return response;
  } catch (error) {
    const cached = await cache.match(request) || await cache.match(new URL("./index.html", APP_ROOT).href);
    if (cached) return cached;
    throw error;
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) await cache.put(request, response.clone());
  return response;
}

async function precacheApp() {
  const response = await fetch(new URL("./build-manifest.json", APP_ROOT));
  if (!response.ok) throw new Error(`Não foi possível carregar o manifesto offline (HTTP ${response.status}).`);
  const manifest = await response.json();
  const assets = new Set(APP_SHELL);
  for (const entry of Object.values(manifest)) {
    if (entry.file) assets.add(new URL(`./${entry.file}`, APP_ROOT).href);
    for (const file of [...(entry.css ?? []), ...(entry.assets ?? [])]) {
      assets.add(new URL(`./${file}`, APP_ROOT).href);
    }
  }
  const cache = await caches.open(CACHE_NAME);
  await cache.addAll([...assets]);
}
