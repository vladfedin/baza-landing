/**
 * Service Worker — image fallback between geographically distributed hosts.
 *
 * If an image fails to load from the current host within TIMEOUT_MS,
 * retries from the mirror host.
 *
 * rolebaza.ru <-> land.rolebaza.ru
 */

const TIMEOUT_MS = 3000;

const MIRRORS = {
  'rolebaza.ru': 'land.rolebaza.ru',
  'www.rolebaza.ru': 'land.rolebaza.ru',
  'land.rolebaza.ru': 'rolebaza.ru',
};

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Only intercept same-origin image requests
  if (url.origin !== self.location.origin) return;

  const isImage = /\.(jpe?g|png|gif|webp|avif|svg|ico)(\?.*)?$/i.test(url.pathname);
  if (!isImage) return;

  const mirrorHost = MIRRORS[url.hostname];
  if (!mirrorHost) return;

  event.respondWith(fetchWithFallback(event.request, url, mirrorHost));
});

async function fetchWithFallback(request, url, mirrorHost) {
  try {
    const response = await fetchWithTimeout(request, TIMEOUT_MS);
    if (response.ok) return response;
    // Non-ok (404, 500, etc.) — try mirror
    return await fetchFromMirror(url, mirrorHost);
  } catch {
    // Timeout or network error — try mirror
    return fetchFromMirror(url, mirrorHost);
  }
}

function fetchWithTimeout(request, ms) {
  return new Promise((resolve, reject) => {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      controller.abort();
      reject(new Error('timeout'));
    }, ms);

    fetch(request, { signal: controller.signal })
      .then((res) => {
        clearTimeout(timer);
        resolve(res);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

async function fetchFromMirror(url, mirrorHost) {
  const mirrorUrl = new URL(url.pathname + url.search, `https://${mirrorHost}`);
  try {
    const response = await fetch(mirrorUrl.href);
    return response;
  } catch {
    // Both failed — return a transparent 1x1 pixel so layout doesn't break
    return new Response(
      Uint8Array.from(atob('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'), c => c.charCodeAt(0)),
      { headers: { 'Content-Type': 'image/gif' } }
    );
  }
}
