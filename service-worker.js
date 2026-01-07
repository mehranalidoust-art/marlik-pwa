```javascript
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

const SW_VERSION = 'v5';
const PRECACHE = 'marlik-precache-v5';
const RUNTIME = 'marlik-runtime-v5';
const BG_SYNC_TAG = 'marlik-sync';

const PRECACHE_URLS = [
  './',
  './index.html',
  './offline.html',
  './favicon.ico',
  './manifest.json',
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
  } catch (error) {
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
const opened = clientList.find(client => new URL(client.url).pathname === new URL(targetUrl, self.location.origin).pathname);
if (opened) {
return opened.focus();
}
return clients.openWindow(targetUrl);
})
  );
});

self.addEventListener('install', event => {
  event.waitUntil(
caches.open(PRECACHE).then(cache => cache.addAll(PRECACHE_URLS))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
(async () => {
const keys = await caches.keys();
await Promise.all(
keys.map(key => {
if (![PRECACHE, RUNTIME].includes(key)) {
return caches.delete(key);
}
return undefined;
})
);

await clients.claim();

const allClients = await clients.matchAll({ includeUncontrolled: true });
for (const client of allClients) {
client.postMessage({
type: 'SW_ACTIVATED',
version: SW_VERSION,
toast: 'اپلیکیشن با موفقیت بروزرسانی شد.'
});
}
})()
  );
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

self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') {
console.info('[SW] SKIP_WAITING received → activating new worker');
self.skipWaiting();
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
  } catch (error) {
const cached = await caches.match(request);
if (cached) return cached;
if (request.mode === 'navigate') {
return caches.match('./offline.html');
}
throw error;
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


---

## نسخهٔ جدید `app.js`
1. مدیریت کامل چرخهٔ ثبت سرویس‌ورکر و تشخیص حالت `waiting`.
2. نمایش مودال بکاپ (ساختار DOM ساده در همین فایل پیاده‌سازی شده است؛ اگر نسخهٔ اختصاصی مودال دارید، کافیست توابع `renderBackupModal`/`closeBackupModal` را با پیاده‌سازی خودتان جایگزین کنید).
3. ایجاد اسنیپت بکاپ از `localStorage` (در صورت نیاز می‌توانید منبع داده را تغییر دهید).
4. کپی خودکار به Clipboard و کنترل نمایش Toast.
5. عدم اجرای `skipWaiting` تا بعد از تأیید کاربر.

```javascript
```javascript
(() => {
  if (!('serviceWorker' in navigator)) {
console.warn('[PWA] Service workers are not supported in this browser.');
return;
  }

  let refreshPending = false;
  let activeModal = null;
  let pendingBackup = null;
  let waitingWorker = null;

  window.addEventListener('load', async () => {
try {
const registration = await navigator.serviceWorker.register('./service-worker.js');
console.info('[PWA] Service worker registered:', registration.scope);

navigator.serviceWorker.addEventListener('controllerchange', () => {
if (refreshPending) return;
refreshPending = true;
console.info('[PWA] Controller changed → reloading in 400 ms');
setTimeout(() => window.location.reload(), 400);
});

navigator.serviceWorker.addEventListener('message', event => {
const { type, toast, version } = event.data || {};
if (type === 'SW_ACTIVATED') {
showToast(toast || 'اپلیکیشن بروزرسانی شد.');
console.info('[PWA] Activated version:', version);
closeBackupModal();
}
if (type === 'NEW_VERSION_READY' && !waitingWorker) {
console.info('[PWA] NEW_VERSION_READY message received.');
if (registration.waiting) {
waitingWorker = registration.waiting;
promptForUpdate();
}
}
});

if (registration.waiting) {
waitingWorker = registration.waiting;
promptForUpdate();
}

registration.addEventListener('updatefound', () => {
const installing = registration.installing;
installing?.addEventListener('statechange', () => {
if (installing.state === 'installed' && navigator.serviceWorker.controller) {
console.info('[PWA] New service worker installed and waiting.');
waitingWorker = installing;
promptForUpdate();
}
});
});
} catch (error) {
console.error('[PWA] Failed to register service worker:', error);
}
  });

  function promptForUpdate() {
if (!waitingWorker) return;
if (activeModal) return;

pendingBackup = createBackupSnapshot();
activeModal = renderBackupModal({
backupString: pendingBackup.encoded,
onCopy: () => copyBackupToClipboard(pendingBackup.encoded),
onDownload: () => downloadBackupFile(pendingBackup.json),
onProceed: () => {
if (waitingWorker) {
console.info('[PWA] User confirmed update → requesting skipWaiting');
waitingWorker.postMessage({ type: 'SKIP_WAITING' });
}
closeBackupModal();
},
onDismiss: () => {
console.info('[PWA] Update postponed by user.');
closeBackupModal();
}
});
  }

  function createBackupSnapshot() {
const snapshot = {};
for (let i = 0; i < localStorage.length; i += 1) {
const key = localStorage.key(i);
try {
snapshot[key] = JSON.parse(localStorage.getItem(key));
} catch (error) {
snapshot[key] = localStorage.getItem(key);
}
}

const json = JSON.stringify({
timestamp: new Date().toISOString(),
data: snapshot
});

const encoded = btoa(unescape(encodeURIComponent(json)));
return { json, encoded };
  }

  async function copyBackupToClipboard(text) {
try {
await navigator.clipboard.writeText(text);
showToast('کد پشتیبان در کلیپ‌بورد ذخیره شد.');
} catch (error) {
console.error('[Backup] Clipboard copy failed:', error);
showToast('خطا در کپی به کلیپ‌بورد. لطفاً دستی کپی کنید.');
}
  }

  function downloadBackupFile(jsonString) {
try {
const blob = new Blob([jsonString], { type: 'application/json' });
const url = URL.createObjectURL(blob);
const anchor = document.createElement('a');
anchor.href = url;
anchor.download = `marlik-backup-${Date.now()}.json`;
anchor.click();
URL.revokeObjectURL(url);
showToast('فایل پشتیبان دانلود شد.');
} catch (error) {
console.error('[Backup] Download failed:', error);
showToast('دانلود فایل پشتیبان ناموفق بود.');
}
  }

  function renderBackupModal({ backupString, onCopy, onDownload, onProceed, onDismiss }) {
const overlay = document.createElement('div');
overlay.className = 'pwa-backup-overlay';
overlay.innerHTML = `
<div class="pwa-backup-modal">
<h2>بروزرسانی در دسترس است</h2>
<p>پیش از بروزرسانی، لطفاً از اطلاعات خود نسخه پشتیبان تهیه کنید.</p>
<textarea readonly class="pwa-backup-textarea">${backupString}</textarea>
<div class="pwa-backup-actions">
<button type="button" class="pwa-btn copy">کپی بکاپ</button>
<button type="button" class="pwa-btn download">دانلود فایل</button>
</div>
<div class="pwa-backup-footer">
<button type="button" class="pwa-btn cancel">بعداً</button>
<button type="button" class="pwa-btn primary proceed">بروزرسانی و ورود</button>
</div>
</div>
`;

overlay.querySelector('.copy')?.addEventListener('click', onCopy);
overlay.querySelector('.download')?.addEventListener('click', onDownload);
overlay.querySelector('.proceed')?.addEventListener('click', onProceed);
overlay.querySelector('.cancel')?.addEventListener('click', onDismiss);

document.body.appendChild(overlay);
document.body.classList.add('pwa-backup-open');
return overlay;
  }

  function closeBackupModal() {
if (activeModal?.parentNode) {
activeModal.parentNode.removeChild(activeModal);
}
document.body.classList.remove('pwa-backup-open');
activeModal = null;
waitingWorker = null;
pendingBackup = null;
  }

  function showToast(message) {
if (!message) return;
let toast = document.querySelector('.pwa-toast');
if (!toast) {
toast = document.createElement('div');
toast.className = 'pwa-toast';
document.body.appendChild(toast);
}
toast.textContent = message;
toast.classList.add('visible');
setTimeout(() => toast.classList.remove('visible'), 4000);
  }
})();


> **نکته:** برای زیباسازی مودال و Toast، استایل‌های زیر (یا مشابه آن‌ها) را به استایل اصلی اضافه کنید:
```css
```css
.pwa-backup-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 32, 45, 0.65);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  padding: 1.5rem;
}

.pwa-backup-modal {
  max-width: 520px;
  width: 100%;
  background: #fff;
  border-radius: 16px;
  padding: 1.75rem;
  box-shadow: 0 24px 68px rgba(9, 28, 45, 0.25);
  font-family: inherit;
}

.pwa-backup-modal h2 {
  margin-top: 0;
  margin-bottom: 0.75rem;
  font-size: 1.4rem;
  font-weight: 700;
  color: #10263b;
}

.pwa-backup-modal p {
  margin-bottom: 1rem;
  color: #294152;
  line-height: 1.65;
}

.pwa-backup-textarea {
  width: 100%;
  min-height: 140px;
  border-radius: 12px;
  border: 1px solid #d5dde5;
  background: #f7fafd;
  padding: 1rem;
  resize: vertical;
  font-family: 'Vazirmatn', monospace;
  direction: ltr;
  margin-bottom: 1rem;
  color: #0f2b3f;
  font-size: 0.92rem;
}

.pwa-backup-actions,
.pwa-backup-footer {
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
  flex-wrap: wrap;
}

.pwa-backup-footer {
  margin-top: 0.5rem;
}

.pwa-btn {
  border: none;
  padding: 0.7rem 1.2rem;
  border-radius: 10px;
  cursor: pointer;
  font-weight: 600;
  transition: transform 120ms ease, box-shadow 120ms ease;
}

.pwa-btn.copy,
.pwa-btn.download {
  background: #eff4fc;
  color: #204a70;
}

.pwa-btn.primary {
  background: linear-gradient(135deg, #1b74d6, #1357a1);
  color: #fff;
}

.pwa-btn.cancel {
  background: #fff;
  border: 1px solid #d6dee8;
  color: #3a4f63;
}

.pwa-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 8px 18px rgba(20, 43, 63, 0.12);
}

.pwa-toast {
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%) translateY(150%);
  background: rgba(12, 38, 61, 0.92);
  color: #fff;
  padding: 0.85rem 1.6rem;
  border-radius: 999px;
  font-weight: 600;
  pointer-events: none;
  transition: transform 200ms ease;
  z-index: 10000;
}

.pwa-toast.visible {
  transform: translateX(-50%) translateY(0);
}


---

## تنظیم Push (Firebase Messaging)
- خطای فعلی فقط با جایگزین‌کردن **کلید VAPID معتبر** حل می‌شود.
- از کنسول Firebase مسیر **Cloud Messaging → Web Push certificates** را باز کنید و اگر کلیدی وجود ندارد روی “Generate key pair” کلیک کنید.
- مقدار Public Key جدید را در `messaging.getToken({ vapidKey: '...' })` قرار دهید (مطمئن شوید کاراکترهای اضافی یا فاصله ایجاد نکرده‌اید).
- اگر فعلاً نمی‌خواهید Push را فعال کنید، برای جلوگیری از خطا می‌توانید فراخوانی `getToken` را موقتاً کامنت کنید یا فقط در صورت `Notification.permission === 'granted'` اجرا کنید.

---

## چک‌لیست انتشار و تست
1. **جایگزینی فایل‌ها:** `service-worker.js` و `app.js` را با نسخه‌های جدید در سرور/گیت به‌روزرسانی کنید.
2. **Clean install:** در مرورگر DevTools → Application:
   - `Unregister` برای SW فعلی.
   - `Clear storage` (all site data).
   - با `Ctrl/Cmd + Shift + R` بارگذاری سخت انجام دهید.
3. **تست سناریوی waiting:**
   - صفحه را باز نگه دارید.
   - نسخه جدیدتان را دوباره منتشر کنید (مثلاً تغییری کوچک در HTML).
   - در تب قدیمی باید مودال بکاپ ظاهر شود، بکاپ را کپی/دانلود کنید و با دکمه «بروزرسانی و ورود» ادامه دهید.
   - بعد از ارسال `SKIP_WAITING` سرویس‌ورکر فعال شده و Toast موفقیت نمایش داده می‌شود؛ صفحه هم خودکار رفرش خواهد شد.
4. **Push:** بعد از تنظیم VAPID مجدد تست کنید؛ در کنسول نباید خطای `InvalidAccessError` دیده شود.

با انجام این تغییرات جریان بروزرسانی اجباری PWA مطابق سناریوی بکاپ→تأیید کاربر→بروزرسانی عمل خواهد کرد و Push نیز با کلید معتبر پایدار می‌شود. هرگونه لاگ یا رفتار غیر منتظره را ثبت کنید تا در مرحله بعد بررسی دقیق‌تری انجام دهیم. موفق باشید!
