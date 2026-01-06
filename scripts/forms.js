import { addPendingAction } from './idb-helpers.js';
const endpoint = 'https://api.example.com/report'; // آدرس حقیقی API شما

async function submitReport(payload) {
  if (navigator.onLine) {
    await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    alert('گزارش ثبت شد ✅');
  } else if ('serviceWorker' in navigator && 'SyncManager' in window) {
    await addPendingAction({ endpoint, payload });
    const registration = await navigator.serviceWorker.ready;
    await registration.sync.register('marlik-sync');
    alert('آفلاین هستید. گزارش در اولین اتصال ارسال می‌شود 📡');
  } else {
    alert('اتصال برقرار نیست و Sync پشتیبانی نمی‌شود ❌');
  }
}
