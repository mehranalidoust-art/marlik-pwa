(() => {
  if (!('serviceWorker' in navigator)) {
    return;
  }

  const shouldRequireBackup =
    window.__MARLIK_REQUIRE_BACKUP_BEFORE_UPDATE__ !== undefined
      ? Boolean(window.__MARLIK_REQUIRE_BACKUP_BEFORE_UPDATE__)
      : true;

  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('./service-worker.js');
      initializeUpdateFlow(registration);
    } catch (err) {
      console.error('[App] Service worker registration failed', err);
    }
  });

  function initializeUpdateFlow(registration) {
    if (registration.waiting) {
      promptUserForUpdate(registration.waiting);
    }

    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      if (!newWorker) return;

      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          promptUserForUpdate(newWorker);
        }
      });
    });

    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (window.__marlikReloading) return;
      window.__marlikReloading = true;
      window.location.reload();
    });

    navigator.serviceWorker.addEventListener('message', event => {
      if (event.data?.type === 'SW_ACTIVATED') {
        showToast('اپلیکیشن با موفقیت بروزرسانی شد.', 'success');
      }
    });
  }

  function promptUserForUpdate(waitingWorker) {
    if (!waitingWorker) return;

    if (!shouldRequireBackup) {
      showToast('نسخه جدید آماده شد، بروزرسانی در حال تکمیل است.', 'info');
      waitingWorker.postMessage({ type: 'SKIP_WAITING' });
      return;
    }

    if (window.__marlikUpdateModalOpen) return;
    window.__marlikUpdateModalOpen = true;

    openBackupModal({
      onConfirm: async closeModal => {
        const backupPayload = await buildBackupPayload();
        const copied = await copyToClipboard(backupPayload);

        if (copied) {
          showToast('آخرین اطلاعات به حافظه موقت منتقل شد. در جای مناسبی ذخیره کنید.', 'success');
        } else {
          showToast('کپی خودکار انجام نشد. لطفاً به صورت دستی از بخش بکاپ استفاده کنید.', 'warning');
        }

        waitingWorker.postMessage({ type: 'SKIP_WAITING' });
        closeModal();
        window.__marlikUpdateModalOpen = false;
      },
      onCancel: closeModal => {
        closeModal();
        window.__marlikUpdateModalOpen = false;
        showToast('بروزرسانی به تعویق افتاد. برای دریافت نسخه جدید بعداً صفحه را تازه‌سازی کنید.', 'info');
      }
    });
  }

  async function buildBackupPayload() {
    try {
      if (typeof window.generateBackupCode === 'function') {
        const result = window.generateBackupCode();
        return typeof result?.then === 'function' ? await result : result;
      }

      if (typeof window.buildBackupSnapshot === 'function') {
        const snapshot = window.buildBackupSnapshot();
        return typeof snapshot?.then === 'function' ? await snapshot : snapshot;
      }

      if (window.localStorage) {
        const snapshot = {};
        for (let i = 0; i < localStorage.length; i += 1) {
          const key = localStorage.key(i);
          snapshot[key] = localStorage.getItem(key);
        }
        return JSON.stringify(snapshot, null, 2);
      }
    } catch (err) {
      console.warn('[App] Backup payload generation failed', err);
    }

    return '';
  }

  async function copyToClipboard(text) {
    if (!text) return false;

    if (navigator.clipboard && navigator.clipboard.writeText) {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch (err) {
        console.warn('[App] Clipboard API failed', err);
      }
    }

    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    textarea.style.pointerEvents = 'none';
    document.body.appendChild(textarea);
    textarea.select();

    let copied = false;
    try {
      copied = document.execCommand('copy');
    } catch (err) {
      console.warn('[App] execCommand copy failed', err);
    }

    document.body.removeChild(textarea);
    return copied;
  }

  function openBackupModal({ onConfirm, onCancel }) {
    ensureModalStyles();

    const overlay = document.createElement('div');
    overlay.className = 'marlik-update-overlay';

    const dialog = document.createElement('div');
    dialog.className = 'marlik-update-dialog';

    const title = document.createElement('h2');
    title.textContent = 'نسخه جدید آماده نصب است';

    const description = document.createElement('p');
    description.textContent =
      'قبل از بروزرسانی، از بخش بکاپ نسخه‌ای از اطلاعات خود تهیه کنید. با انتخاب دکمه زیر، آخرین اطلاعات شما در حافظهٔ موقت ذخیره می‌شود. سپس آن را در مکانی امن پیست کنید.';

    const actions = document.createElement('div');
    actions.className = 'marlik-update-actions';

    const cancelButton = document.createElement('button');
    cancelButton.type = 'button';
    cancelButton.className = 'marlik-update-btn marlik-update-btn-secondary';
    cancelButton.textContent = 'بعداً یادآوری کن';
    cancelButton.addEventListener('click', () => onCancel(closeModal));

    const confirmButton = document.createElement('button');
    confirmButton.type = 'button';
    confirmButton.className = 'marlik-update-btn marlik-update-btn-primary';
    confirmButton.textContent = 'کپی بکاپ و بروزرسانی';
    confirmButton.addEventListener('click', () => onConfirm(closeModal), { once: true });

    actions.appendChild(cancelButton);
    actions.appendChild(confirmButton);

    dialog.appendChild(title);
    dialog.appendChild(description);
    dialog.appendChild(actions);
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);

    requestAnimationFrame(() => overlay.classList.add('marlik-update-overlay--visible'));

    function closeModal() {
      overlay.classList.remove('marlik-update-overlay--visible');
      setTimeout(() => {
        if (overlay.parentNode) {
          overlay.parentNode.removeChild(overlay);
        }
      }, 200);
    }

    return closeModal;
  }

  function ensureModalStyles() {
    if (document.getElementById('marlik-update-styles')) return;

    const style = document.createElement('style');
    style.id = 'marlik-update-styles';
    style.textContent = `
      .marlik-update-overlay {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.4);
        display: flex;
        align-items: center;
        justify-content: center;
        backdrop-filter: blur(2px);
        opacity: 0;
        transition: opacity 0.2s ease;
        z-index: 9999;
      }
      .marlik-update-overlay--visible {
        opacity: 1;
      }
      .marlik-update-dialog {
        max-width: 420px;
        width: 90%;
        background: #121212;
        color: #f5f5f5;
        border-radius: 16px;
        padding: 24px;
        box-shadow: 0 18px 36px rgba(0, 0, 0, 0.35);
        font-family: inherit;
        text-align: right;
        direction: rtl;
      }
      .marlik-update-dialog h2 {
        font-size: 1.2rem;
        margin: 0 0 12px;
      }
      .marlik-update-dialog p {
        font-size: 0.95rem;
        margin: 0 0 20px;
        line-height: 1.6;
      }
      .marlik-update-actions {
        display: flex;
        gap: 12px;
        justify-content: flex-end;
      }
      .marlik-update-btn {
        border: none;
        border-radius: 10px;
        padding: 10px 16px;
        font-size: 0.95rem;
        cursor: pointer;
        transition: transform 0.15s ease, box-shadow 0.15s ease;
        font-family: inherit;
      }
      .marlik-update-btn:active {
        transform: scale(0.97);
      }
      .marlik-update-btn-primary {
        background: linear-gradient(135deg, #5b8cff, #3f6bd6);
        color: #ffffff;
        box-shadow: 0 8px 20px rgba(91, 140, 255, 0.35);
      }
      .marlik-update-btn-secondary {
        background: rgba(255, 255, 255, 0.08);
        color: #e0e0e0;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
      }
      .marlik-toast-container {
        position: fixed;
        bottom: 24px;
        left: 50%;
        transform: translateX(-50%);
        display: flex;
        flex-direction: column;
        gap: 12px;
        z-index: 9999;
      }
      .marlik-toast {
        min-width: 260px;
        max-width: 360px;
        direction: rtl;
        background: rgba(18, 18, 18, 0.9);
        color: #f1f1f1;
        padding: 14px 18px;
        border-radius: 12px;
        box-shadow: 0 12px 24px rgba(0, 0, 0, 0.25);
        opacity: 0;
        transform: translateY(12px);
        transition: opacity 0.25s ease, transform 0.25s ease;
        font-size: 0.95rem;
      }
      .marlik-toast--visible {
        opacity: 1;
        transform: translateY(0);
      }
      .marlik-toast-success {
        border-right: 4px solid #4caf50;
      }
      .marlik-toast-info {
        border-right: 4px solid #2196f3;
      }
      .marlik-toast-warning {
        border-right: 4px solid #ff9800;
      }
      .marlik-toast-error {
        border-right: 4px solid #f44336;
      }
    `;
    document.head.appendChild(style);
  }

  function showToast(message, variant = 'info') {
    ensureModalStyles();

    let container = document.querySelector('.marlik-toast-container');
    if (!container) {
      container = document.createElement('div');
      container.className = 'marlik-toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `marlik-toast marlik-toast-${variant}`;
    toast.textContent = message;

    container.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('marlik-toast--visible'));

    setTimeout(() => {
      toast.classList.remove('marlik-toast--visible');
      setTimeout(() => {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
        if (!container.hasChildNodes()) {
          container.parentNode?.removeChild(container);
        }
      }, 250);
    }, 4200);
  }
})();
