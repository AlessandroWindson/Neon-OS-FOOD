/**
 * NEON FOOD OS - Motor de Operação Offline & Sincronização em Segundo Plano
 * 
 * Gerencia a fila de mutações e pedidos realizados durante instabilidade na internet
 * do restaurante, garantindo tolerância a falhas via Service Worker + IndexedDB / LocalStorage.
 */

export type OfflineActionType = 
  | 'CREATE_ORDER'
  | 'UPDATE_ORDER_STATUS'
  | 'CANCEL_ORDER'
  | 'CASH_MOVEMENT'
  | 'UPDATE_TABLE'
  | 'UPDATE_STOCK';

export interface OfflinePendingAction {
  id: string;
  type: OfflineActionType;
  description: string;
  payload: any;
  timestamp: string;
  clientTimestamp: number;
  status: 'pending' | 'syncing' | 'synced' | 'failed';
  retries: number;
  errorMessage?: string;
}

const STORAGE_KEY = 'neon_offline_sync_queue';
const DB_NAME = 'NeonFoodOS_OfflineDB';
const STORE_NAME = 'pending_actions';

// IndexedDB Helper with fallback to LocalStorage
class OfflineStorage {
  private dbPromise: Promise<IDBDatabase> | null = null;
  private isIndexedDBAvailable: boolean = typeof window !== 'undefined' && 'indexedDB' in window;

  constructor() {
    if (this.isIndexedDBAvailable) {
      this.initDB();
    }
  }

  private initDB() {
    this.dbPromise = new Promise((resolve, reject) => {
      try {
        const request = indexedDB.open(DB_NAME, 1);
        request.onupgradeneeded = () => {
          const db = request.result;
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => {
          console.warn('[OfflineDB] IndexedDB error, falling back to localStorage');
          this.isIndexedDBAvailable = false;
          resolve(null as any);
        };
      } catch (e) {
        this.isIndexedDBAvailable = false;
        resolve(null as any);
      }
    });
  }

  async getAll(): Promise<OfflinePendingAction[]> {
    if (this.isIndexedDBAvailable && this.dbPromise) {
      try {
        const db = await this.dbPromise;
        if (db) {
          return new Promise((resolve) => {
            const transaction = db.transaction(STORE_NAME, 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => resolve(this.getFromLocalStorage());
          });
        }
      } catch (e) {
        // Fallback below
      }
    }
    return this.getFromLocalStorage();
  }

  async save(action: OfflinePendingAction): Promise<void> {
    if (this.isIndexedDBAvailable && this.dbPromise) {
      try {
        const db = await this.dbPromise;
        if (db) {
          await new Promise<void>((resolve, reject) => {
            const transaction = db.transaction(STORE_NAME, 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.put(action);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
          });
          // Also mirror in localStorage for redundancy
          this.mirrorToLocalStorage(action);
          return;
        }
      } catch (e) {
        // Fallback
      }
    }
    this.mirrorToLocalStorage(action);
  }

  async remove(id: string): Promise<void> {
    if (this.isIndexedDBAvailable && this.dbPromise) {
      try {
        const db = await this.dbPromise;
        if (db) {
          await new Promise<void>((resolve) => {
            const transaction = db.transaction(STORE_NAME, 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.delete(id);
            request.onsuccess = () => resolve();
            request.onerror = () => resolve();
          });
        }
      } catch (e) {
        // Ignore
      }
    }
    const current = this.getFromLocalStorage().filter(item => item.id !== id);
    this.saveToLocalStorage(current);
  }

  async clear(): Promise<void> {
    if (this.isIndexedDBAvailable && this.dbPromise) {
      try {
        const db = await this.dbPromise;
        if (db) {
          await new Promise<void>((resolve) => {
            const transaction = db.transaction(STORE_NAME, 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.clear();
            request.onsuccess = () => resolve();
            request.onerror = () => resolve();
          });
        }
      } catch (e) {
        // Ignore
      }
    }
    localStorage.removeItem(STORAGE_KEY);
  }

  private getFromLocalStorage(): OfflinePendingAction[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  private saveToLocalStorage(items: OfflinePendingAction[]): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch (e) {
      console.warn('[OfflineStorage] LocalStorage quota exceeded', e);
    }
  }

  private mirrorToLocalStorage(action: OfflinePendingAction): void {
    const list = this.getFromLocalStorage();
    const index = list.findIndex(i => i.id === action.id);
    if (index >= 0) {
      list[index] = action;
    } else {
      list.push(action);
    }
    this.saveToLocalStorage(list);
  }
}

export const offlineStorage = new OfflineStorage();

/**
 * Registra o Background Sync no Service Worker do navegador
 */
export async function registerServiceWorkerSync(): Promise<boolean> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    if ('sync' in registration) {
      await (registration as any).sync.register('sync-offline-restaurant-data');
      console.log('[OfflineSync] Background Sync registrado no Service Worker com sucesso');
      return true;
    }
  } catch (err) {
    console.log('[OfflineSync] Background Sync indisponível ou não suportado:', err);
  }
  return false;
}

/**
 * Testa conectividade real com ping HTTP de baixa latência
 */
export async function pingServerHealth(): Promise<{ online: boolean; latencyMs: number }> {
  if (typeof window === 'undefined' || !navigator.onLine) {
    return { online: false, latencyMs: 0 };
  }

  const start = performance.now();
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    const res = await fetch('/api/health?t=' + Date.now(), {
      method: 'GET',
      headers: { 'Cache-Control': 'no-cache' },
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    const latency = Math.round(performance.now() - start);
    return { online: res.ok, latencyMs: latency };
  } catch (e) {
    return { online: false, latencyMs: 0 };
  }
}

/**
 * Envia lote de ações pendentes para a API de Sincronização do Servidor
 */
export async function syncBatchWithServer(actions: OfflinePendingAction[]): Promise<{
  success: boolean;
  syncedCount: number;
  processedIds: string[];
  error?: string;
}> {
  if (!actions || actions.length === 0) {
    return { success: true, syncedCount: 0, processedIds: [] };
  }

  try {
    const response = await fetch('/api/sync/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ actions })
    });

    if (!response.ok) {
      throw new Error(`Falha no servidor HTTP: ${response.status}`);
    }

    const data = await response.json();
    return {
      success: true,
      syncedCount: data.syncedCount || actions.length,
      processedIds: data.processedIds || actions.map(a => a.id)
    };
  } catch (err: any) {
    console.warn('[Sync Error]', err);
    return {
      success: false,
      syncedCount: 0,
      processedIds: [],
      error: err.message || 'Erro de conexão com o servidor'
    };
  }
}
