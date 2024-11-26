import { openDB } from 'https://cdn.jsdelivr.net/npm/idb@7/+esm';

const DB_NAME = 'ious-db';
const DB_VERSION = 1;

let db;

export async function initDB() {
  db = await openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Create stores
      if (!db.objectStoreNames.contains('debts')) {
        const debtStore = db.createObjectStore('debts', { keyPath: 'id' });
        debtStore.createIndex('userId', 'userId');
      }
      if (!db.objectStoreNames.contains('pending-changes')) {
        db.createObjectStore('pending-changes', { keyPath: 'id', autoIncrement: true });
      }
    },
  });
}

export async function getDebts(userId) {
  await initDBIfNeeded();
  return db.getAllFromIndex('debts', 'userId', userId);
}

export async function addDebt(debt) {
  await initDBIfNeeded();
  await db.put('debts', debt);
}

export async function deleteDebt(id) {
  await initDBIfNeeded();
  await db.delete('debts', id);
}

export async function addPendingChange(change) {
  await initDBIfNeeded();
  return db.add('pending-changes', change);
}

export async function getPendingChanges() {
  await initDBIfNeeded();
  return db.getAll('pending-changes');
}

export async function deletePendingChange(id) {
  await initDBIfNeeded();
  await db.delete('pending-changes', id);
}

async function initDBIfNeeded() {
  if (!db) {
    await initDB();
  }
}

// Network status
let isOnline = navigator.onLine;
const onlineListeners = new Set();
const offlineListeners = new Set();

export function addOnlineListener(callback) {
  onlineListeners.add(callback);
}

export function addOfflineListener(callback) {
  offlineListeners.add(callback);
}

window.addEventListener('online', () => {
  isOnline = true;
  onlineListeners.forEach(callback => callback());
});

window.addEventListener('offline', () => {
  isOnline = false;
  offlineListeners.forEach(callback => callback());
});

export function getNetworkStatus() {
  return isOnline;
}
