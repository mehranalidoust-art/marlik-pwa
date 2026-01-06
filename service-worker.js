importScripts('https://www.gstatic.com/firebasejs/12.7.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/12.7.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'AIzaSyC617j51ohyge5sc-BhmMz_3l6jpYctQ40',
  authDomain: 'marlik-managers-project.firebaseapp.com',
  projectId: 'marlik-managers-project',
  storageBucket: 'marlik-managers-project.firebasestorage.app',
  messagingSenderId: '671050825520',
  appId: '1:671050825520:web:b2c32d726accc3f70092f5'
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage(payload => {
  const notification = payload.notification || {};
  const title = notification.title || 'پیام جدید مارلیک';
  const options = {
    body: notification.body || 'اعلان جدید برای شما وجود دارد.',
    icon: notification.icon || './icons/icon-192.png',
    badge: './icons/icon-120.png',
    data: { url: notification.click_action || './' }
  };
  self.registration.showNotification(title, options);
});

self.addEventListener('push', event => {
  if (!event.data) return;
  let payload = {};
  try {
    payload = event.data.json();
  } catch (e) {
    payload = { notification: { title: 'پیام جدید مارلیک', body: event.data.text() } };
  }

  const notification = payload.notification || payload;
  const title = notification.title || 'پیام جدید مارلیک';
  const options = {
    body: notification.body || '',
    icon: notification.icon || './icons/icon-192.png',
    badge: './icons/icon-120.png',
    data: { url: notification.click_action || notification.data?.url || './' }
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || './';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      const opened = clientList.find(client => client.url === targetUrl);
      if (opened) {
        return opened.focus();
      }
      return clients.openWindow(targetUrl);
    })
  );
});

const PRECACHE = 'marlik-precache-v4';
const RUNTIME = 'marlik-runtime-v4';
const BG_SYNC_TAG = 'marlik-sync';

const PRECACHE_URLS = [
  './',
  './index.html',
  './offline.html',
  './manifest.json',
  './styles.css',
  './scripts/app.js',
  './scripts/forms.js',
  './scripts/idb-helpers.js',
  './scripts/push.js',
  './icons/icon-120.png',
  './icons/icon-152.png',
  './icons/icon-180.png',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(PRECACHE).then(cache => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  const allowlist = [PRECACHE, RUNTIME];
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.map(key => (!allowlist.includes(key) ? caches.delete(key) : null))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  const requestURL = new URL(event.request.url);

  if (requestURL.origin !== self.location.origin) {
    return;
  }

  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then(response => cacheRuntime(event.request, response))
        .catch(async () => (await caches.match(event.request)) || caches.match('./offline.html'))
    );
    return;
  }

  const isStatic = /\.(css|js|png|jpg|jpeg|svg|webp|woff2?|json)$/i.test(requestURL.pathname);

  if (isStatic) {
    event.respondWith(staleWhileRevalidate(event.request));
  } else {
    event.respondWith(networkFirst(event.request));
  }
});

self.addEventListener('sync', event => {
  if (event.tag === BG_SYNC_TAG) {
    event.waitUntil(sendPendingActions());
  }
});

async function sendPendingActions() {
  const db = await openDB();
  const tx = db.transaction('pending-actions', 'readonly');
  const actions = await tx.objectStore('pending-actions').getAll();

  for (const action of actions) {
    await fetch(action.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(action.payload)
    });
  }

  const clearTx = db.transaction('pending-actions', 'readwrite');
  clearTx.objectStore('pending-actions').clear();
  return clearTx.complete;
}

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('marlik-offline', 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('pending-actions')) {
        db.createObjectStore('pending-actions', { autoIncrement: true });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function cacheRuntime(request, response) {
  const cache = await caches.open(RUNTIME);
  cache.put(request, response.clone());
  return response;
}

async function networkFirst(request) {
  try {
    const fresh = await fetch(request);
    cacheRuntime(request, fresh.clone());
    return fresh;
  } catch (err) {
    const cached = await caches.match(request);
    if (cached) return cached;
    if (request.mode === 'navigate') return caches.match('./offline.html');
    throw err;
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(RUNTIME);
  const cached = await cache.match(request);
  const networkPromise = fetch(request)
    .then(response => {
      cache.put(request, response.clone());
      return response;
    })
    .catch(() => cached);
  return cached || networkPromise;
}

self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
