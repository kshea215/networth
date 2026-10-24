// Caches the app shell so it opens offline. Your data is never cached here.
const CACHE = "networth-v15";
const SHELL = ["./", "index.html", "manifest.webmanifest", "icon-180.png", "icon-192.png",
  "msal-browser.min.js"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);
  // Never touch Microsoft sign-in or OneDrive traffic
  if (url.hostname.includes("microsoft") || url.hostname.includes("live.com") || url.hostname.includes("sharepoint") || url.hostname.includes("1drv")) return;
  if (e.request.method !== "GET") return;
  // Network first, fall back to cache (so updates show up when online)
  e.respondWith(fetch(e.request).then(res => {
    const copy = res.clone();
    caches.open(CACHE).then(c => c.put(e.request, copy)).catch(() => {});
    return res;
  }).catch(() => caches.match(e.request)));
});
