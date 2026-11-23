/**
 * Keeps the customer's uploaded picture in this browser (IndexedDB) while they pay, because
 * the SnapScan round trip reloads the page. The picture is never uploaded to Occentra's server.
 */
const DB = 'occentra-gif';
const STORE = 'backgrounds';

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => { req.result.createObjectStore(STORE); };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveBackground(key: string, blob: Blob): Promise<boolean> {
  try {
    const db = await open();
    return await new Promise(resolve => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(blob, key);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    });
  } catch { return false; }
}

export async function loadBackground(key: string): Promise<Blob | null> {
  try {
    const db = await open();
    return await new Promise(resolve => {
      const req = db.transaction(STORE, 'readonly').objectStore(STORE).get(key);
      req.onsuccess = () => resolve(req.result instanceof Blob ? req.result : null);
      req.onerror = () => resolve(null);
    });
  } catch { return null; }
}
