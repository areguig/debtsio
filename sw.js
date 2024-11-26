const CACHE_NAME = 'ious-v1';

// Determine the base path based on the location
const BASE_PATH = self.location.pathname.includes('/debtsio/') ? '/debtsio' : '';

const STATIC_RESOURCES = [
  `${BASE_PATH}/`,
  `${BASE_PATH}/index.html`,
  `${BASE_PATH}/app.js`,
  `${BASE_PATH}/styles.css`,
  `${BASE_PATH}/translations.js`,
  `${BASE_PATH}/manifest.json`,
  `${BASE_PATH}/icons/icon-72x72.png`,
  `${BASE_PATH}/icons/icon-96x96.png`,
  `${BASE_PATH}/icons/icon-128x128.png`,
  `${BASE_PATH}/icons/icon-144x144.png`,
  `${BASE_PATH}/icons/icon-152x152.png`,
  `${BASE_PATH}/icons/icon-192x192.png`,
  `${BASE_PATH}/icons/icon-384x384.png`,
  `${BASE_PATH}/icons/icon-512x512.png`,
  'https://fonts.googleapis.com/icon?family=Material+Icons',
  'https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_RESOURCES);
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  // Handle navigation requests
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match(`${BASE_PATH}/index.html`);
      })
    );
    return;
  }

  // Handle other requests
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).then(response => {
        // Cache successful responses
        if (response && response.status === 200) {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseToCache);
          });
        }
        return response;
      });
    })
  );
});

// Handle background sync for offline changes
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-debts') {
    event.waitUntil(syncDebts());
  }
});

async function syncDebts() {
  try {
    const db = await idb.openDB('ious-db', 1);
    const pendingChanges = await db.getAll('pending-changes');
    
    for (const change of pendingChanges) {
      try {
        const response = await fetch(change.url, {
          method: change.method,
          headers: change.headers,
          body: change.body
        });
        
        if (response.ok) {
          await db.delete('pending-changes', change.id);
        }
      } catch (error) {
        console.error('Error syncing change:', error);
      }
    }
  } catch (error) {
    console.error('Error in syncDebts:', error);
  }
}
