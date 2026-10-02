// Minimal IndexedDB key-value store (replaces Dexie, ~30 KB gzipped).
// Schema is compatible with databases created by the previous Dexie version
// (Dexie v1 == IndexedDB v10, object store "snapshots" keyed by "key").
const DB_NAME = 'stats_app_db';
const DB_VERSION = 10;
const STORE = 'snapshots';

let dbPromise = null;

function openDb() {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        if (!req.result.objectStoreNames.contains(STORE)) {
          req.result.createObjectStore(STORE, { keyPath: 'key' });
        }
      };
      req.onsuccess = () => {
        const db = req.result;
        db.onversionchange = () => { db.close(); dbPromise = null; };
        resolve(db);
      };
      req.onerror = () => { dbPromise = null; reject(req.error); };
      req.onblocked = () => reject(new Error('IndexedDB upgrade blocked by another tab'));
    });
  }
  return dbPromise;
}

async function run(mode, fn) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const req = fn(tx.objectStore(STORE));
    tx.oncomplete = () => resolve(req?.result);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

const db = {
  snapshots: {
    get: (key) => run('readonly', (s) => s.get(key)),
    put: (value) => run('readwrite', (s) => s.put(value)),
  },
};

export default db;
