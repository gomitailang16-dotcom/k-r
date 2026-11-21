// ページ本体とCDNのライブラリをキャッシュして、オフラインでも起動できるようにする
const CACHE = "offline-ai-v3";
const CORE = ["./", "index.html", "manifest.webmanifest"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  // Googleログイン関連・モデル重み(WebLLM自身がキャッシュ管理)は触らない
  // 自分以外のlocalhost(Ollama / LM Studio)への通信は素通し
  if ((url.hostname === "localhost" || url.hostname === "127.0.0.1") && url.origin !== self.location.origin) return;
  if (url.hostname.endsWith("google.com") || url.hostname.endsWith("gstatic.com") || url.hostname.endsWith("huggingface.co") || url.hostname.endsWith("githubusercontent.com")) return;
  e.respondWith(
    caches.match(req).then(hit => {
      const net = fetch(req).then(res => {
        if (res && (res.ok || res.type === "opaque")) caches.open(CACHE).then(c => c.put(req, res.clone()));
        return res;
      }).catch(() => hit);
      return hit || net;
    })
  );
});
