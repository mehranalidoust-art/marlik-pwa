
const firebaseConfig = {
  apiKey: "AIzaSyC617j51ohyge5sc-BhmMz_3l6jpYctQ40",
  authDomain: "marlik-managers-project.firebaseapp.com",
  projectId: "marlik-managers-project",
  storageBucket: "marlik-managers-project.firebasestorage.app",
  messagingSenderId: "671050825520",
  appId: "1:671050825520:web:b2c32d726accc3f70092f5",
  measurementId: "G-1C4GLV4Z88"
};

document.addEventListener('DOMContentLoaded', async () => {
  if (!('Notification' in window) || !('serviceWorker' in navigator)) return;

  const app = firebase.initializeApp(firebaseConfig);
  const messaging = firebase.messaging();

  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return;

    const registration = await navigator.serviceWorker.ready;
    messaging.useServiceWorker(registration);

    const token = await messaging.getToken({
      vapidKey: 'YOUR_WEB_PUSH_CERTIFICATE_KEY_PAIR'
    });

    await fetch('https://api.example.com/save-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token })
    });

    console.log('Push token registered:', token);
  } catch (err) {
    console.error('Push registration failed', err);
  }
});
