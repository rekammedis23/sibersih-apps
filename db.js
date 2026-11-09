/* ============================================================
   Si B3RSIH - IndexedDB Helper for Offline Support & Sync
   ============================================================ */

const DB_NAME = 'SiB3RSIH_DB';
const DB_VERSION = 1;

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (e) => {
      const db = e.target.result;

      // Store untuk caching data dari GAS
      if (!db.objectStoreNames.contains('cache')) {
        db.createObjectStore('cache', { keyPath: 'key' });
      }

      // Store untuk antrean data yang di-submit saat offline
      if (!db.objectStoreNames.contains('pending_sync')) {
        db.createObjectStore('pending_sync', { keyPath: 'id', autoIncrement: true });
      }
    };

    request.onsuccess = (e) => resolve(e.target.result);
    request.onerror = (e) => reject(e.target.error);
  });
}

// SIMPAN & BACA CACHE
async function setCacheData(key, data) {
  try {
    const db = await openDB();
    const tx = db.transaction('cache', 'readwrite');
    tx.objectStore('cache').put({ key: key, data: data, timestamp: Date.now() });
  } catch (err) {
    console.error('Failed to set cache:', err);
  }
}

async function getCacheData(key) {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction('cache', 'readonly');
      const req = tx.objectStore('cache').get(key);
      req.onsuccess = () => resolve(req.result ? req.result.data : null);
      req.onerror = () => resolve(null);
    });
  } catch (err) {
    return null;
  }
}

// PENDING SYNC (ANTREAN OFFLINE)
async function addPendingSync(action, payload) {
  const db = await openDB();
  const tx = db.transaction('pending_sync', 'readwrite');
  tx.objectStore('pending_sync').add({
    action: action,
    payload: payload,
    createdAt: new Date().toISOString()
  });
  return new Promise((resolve) => tx.oncomplete = () => resolve(true));
}

async function getPendingSyncList() {
  const db = await openDB();
  return new Promise((resolve) => {
    const tx = db.transaction('pending_sync', 'readonly');
    const req = tx.objectStore('pending_sync').getAll();
    req.onsuccess = () => resolve(req.result || []);
  });
}

async function removePendingSync(id) {
  const db = await openDB();
  const tx = db.transaction('pending_sync', 'readwrite');
  tx.objectStore('pending_sync').delete(id);
  return new Promise((resolve) => tx.oncomplete = () => resolve(true));
}
