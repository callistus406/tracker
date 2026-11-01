// Offline-first: the whole app is static, so once visited it opens instantly with no connection.
const VERSION = 'v3'
const CACHE = `shell-${VERSION}`
const PAGES = ['/', '/daily/', '/weekly/', '/history/']
const EXTRA = ['/manifest.webmanifest', '/icons/icon-192.png', '/icons/icon-512.png', '/icons/maskable-512.png']

// Pre-cache every page plus the scripts/styles they reference, so each screen works offline on first install.
async function precache() {
  const cache = await caches.open(CACHE)
  const assets = new Set(EXTRA)
  await Promise.allSettled(
    PAGES.map(async (p) => {
      const res = await fetch(p, { cache: 'reload' })
      if (!res.ok) return
      const html = await res.clone().text()
      for (const m of html.matchAll(/\/_next\/static\/[^"'\\\s)<>]+/g)) assets.add(m[0])
      await cache.put(p, res)
    }),
  )
  await Promise.allSettled([...assets].map((a) => cache.add(a)))
}

self.addEventListener('install', (e) => e.waitUntil(precache().then(() => self.skipWaiting())))

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

// Serve from cache immediately, refresh it in the background (updates show on the next launch).
async function staleWhileRevalidate(req, opts) {
  const cache = await caches.open(CACHE)
  const hit = await cache.match(req, opts)
  const refresh = fetch(req)
    .then((res) => {
      if (res.ok && !res.redirected) cache.put(req, res.clone())
      return res
    })
    .catch(() => undefined)
  return hit ?? (await refresh) ?? (await cache.match('/')) ?? Response.error()
}

async function cacheFirst(req) {
  const cache = await caches.open(CACHE)
  const hit = await cache.match(req)
  if (hit) return hit
  const res = await fetch(req)
  if (res.ok) cache.put(req, res.clone())
  return res
}

self.addEventListener('fetch', (e) => {
  const req = e.request
  const url = new URL(req.url)
  if (req.method !== 'GET' || url.origin !== location.origin) return
  if (url.pathname === '/sw.js') return

  if (req.mode === 'navigate') e.respondWith(staleWhileRevalidate(req, { ignoreSearch: true }))
  else if (url.pathname.startsWith('/_next/static/') || url.pathname.startsWith('/icons/')) e.respondWith(cacheFirst(req))
  else e.respondWith(staleWhileRevalidate(req))
})
