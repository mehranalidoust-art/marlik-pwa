document.addEventListener('DOMContentLoaded', async () => {
  if (!('serviceWorker' in navigator)) return;

  try {
    const registration = await navigator.serviceWorker.ready;

    const token = await messaging.getToken({
      serviceWorkerRegistration: registration,
      vapidKey: 'YOUR_VAPID_KEY_HERE' // همان کلید قبلی را قرار دهید
    });

    if (token) {
      console.log('[Push] Token fetched:', token);
      // ارسال توکن به سرور خودتان
    } else {
      console.warn('[Push] No registration token available. Ask user for permission.');
    }
  } catch (error) {
    console.error('[Push] Failed to get token:', error);
  }
});
