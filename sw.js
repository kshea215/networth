// Caches the app shell so it opens offline. Your data is never cached here.
// Network first (so updates show up right away), but if the network is slow or down,
// the cached copy is used after 3.5 seconds.
const CACHE = "networth-v16";
const SHELL = ["./", "index.html", "manifest.webmanifest", "icon-180.png", "icon-192.png", "msal-browser.min.js"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

async function fromCache(req) {
  return (await caches.match(req, { ignoreSearch: true })) ||
    (req.mode === "navigate" ? ((await caches.match("./")) || (await caches.match("index.html"))) : undefined);
}

function respond(req) {
  return new Promise(resolve => {
    let settled = false;
    const done = r => { if (!settled) { settled = true; resolve(r); } };
    const timer = setTimeout(async () => { const c = await fromCache(req); if (c) done(c); }, 3500);
    fetch(req).then(res => {
      clearTimeout(timer);
      if (res && (res.ok || res.type === "opaque")) {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
      }
      done(res);
    }).catch(async () => { clearTimeout(timer); done((await fromCache(req)) || Response.error()); });
  });
}

self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);
  // Never touch Microsoft sign-in or OneDrive traffic
  if (url.hostname.includes("microsoft") || url.hostname.includes("live.com") || url.hostname.includes("sharepoint") || url.hostname.includes("1drv")) return;
  if (e.request.method !== "GET") return;
  e.respondWith(respond(e.request));
});
