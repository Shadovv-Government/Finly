/// <reference lib="webworker" />
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { CacheFirst, NetworkFirst } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';
import { clientsClaim } from 'workbox-core';

declare const self: ServiceWorkerGlobalScope & { __WB_MANIFEST: any[] };

clientsClaim();
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

// Model assets are immutable once deployed — serve from cache for a year
registerRoute(
  ({ url }) => url.pathname.startsWith('/model/'),
  new CacheFirst({
    cacheName: 'finly-model-v4',
    plugins: [
      new ExpirationPlugin({ maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 * 365 }),
      new CacheableResponsePlugin({ statuses: [0, 200] }),
    ],
  }),
);

registerRoute(
  ({ url }) => url.origin === 'https://fonts.googleapis.com',
  new CacheFirst({
    cacheName: 'google-fonts-cache',
    plugins: [
      new ExpirationPlugin({ maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 }),
      new CacheableResponsePlugin({ statuses: [0, 200] }),
    ],
  }),
);

registerRoute(
  ({ request }) => request.mode === 'navigate',
  new NetworkFirst({ cacheName: 'pages-cache', networkTimeoutSeconds: 3 }),
);

// vite-plugin-pwa autoUpdate sends this to trigger SW swap
self.addEventListener('message', (event: ExtendableMessageEvent) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

// Background Sync: fires when device is idle + online.
// Fine-tuning runs in the main thread (WebGL available there),
// so we just message open clients. If none are open the sync tag
// stays registered and retries when the app is next opened.
self.addEventListener('sync', async (event: any) => {
  if (event.tag !== 'finly-fine-tune') return;
  event.waitUntil((async () => {
    const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    if (clients.length === 0) return; // no open tabs, will retry
    for (const client of clients) {
      client.postMessage({ type: 'RUN_FINE_TUNE', minSamples: 10, epochs: 5 });
    }
  })());
});
