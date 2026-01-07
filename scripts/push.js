/* scripts/push.js */

document.addEventListener('DOMContentLoaded', async () => {
  if (!('serviceWorker' in navigator)) return;

  const firebaseConfig = {
    apiKey: 'AIzaSyC617j51ohyge5sc-BhmMz_3l6jpYctQ40',
    authDomain: 'marlik-managers-project.firebaseapp.com',
    projectId: 'marlik-managers-project',
    storageBucket: 'marlik-managers-project.firebasestorage.app',
    messagingSenderId: '671050825520',
    appId: '1:671050825520:web:b2c32d726accc3f70092f5'
  };

  if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
  }

  const messaging = firebase.messaging();

  try {
    const registration = await navigator.serviceWorker.ready;
    const token = await messaging.getToken({
      serviceWorkerRegistration: registration,
      vapidKey: 'YOUR_VAPID_KEY_HERE'
    });

    if (token) {
      console.log('[Push] Token fetched:', token);
      // TODO: ارسال توکن به سرور
    } else {
      console.warn('[Push] No token available. Request permission if needed.');
    }
  } catch (error) {
    console.error('[Push] Failed to get token:', error);
  }
});
