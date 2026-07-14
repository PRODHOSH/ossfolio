const CACHE_VERSION = "v1";
const STATIC_CACHE = `ossfolio-static-${CACHE_VERSION}`;
const API_CACHE = `ossfolio-api-${CACHE_VERSION}`;
const OFFLINE_QUEUE_KEY = "ossfolio-offline-queue";

const STATIC_ASSETS = [
  "/",
  "/offline",
  "/logo.png",
  "/manifest.json",
];

const API_PATTERNS = [/\/api\//];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== STATIC_CACHE && key !== API_CACHE)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (API_PATTERNS.some((p) => p.test(url.pathname))) {
    event.respondWith(networkFirstWithQueue(request));
  } else {
    event.respondWith(cacheFirst(request));
  }
});

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return caches.match("/offline");
  }
}

async function networkFirstWithQueue(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(API_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    await addToQueue(request);
    return new Response(
      JSON.stringify({ error: "You are offline. Request will be retried." }),
      { status: 503, headers: { "Content-Type": "application/json" } }
    );
  }
}

async function addToQueue(request) {
  try {
    const client = await self.clients.get(self.clientId);
    if (client) {
      client.postMessage({
        type: "QUEUE_OFFLINE_REQUEST",
        payload: { url: request.url, method: request.method },
      });
    }
  } catch {}
}

function getQueue() {
  return JSON.parse(localStorage.getItem(OFFLINE_QUEUE_KEY) || "[]");
}

function setQueue(queue) {
  localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
}

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
  if (event.data?.type === "RETRY_QUEUE") {
    retryQueue();
  }
});

async function retryQueue() {
  const queue = getQueue();
  if (queue.length === 0) return;

  const remaining = [];
  for (const item of queue) {
    try {
      await fetch(item.url, { method: item.method });
    } catch {
      remaining.push(item);
    }
  }
  setQueue(remaining);
}
