/**
 * NEON FOOD OS • Data Storage & Database Architecture Adapter
 * 
 * This module provides an abstracted, type-safe Data Access Layer (DAL).
 * It enables instant local persistence (LocalStorage / IndexedDB) with an
 * interface ready for direct connection to Cloud Databases (Firestore, PostgreSQL, Supabase, Cloud SQL, REST API).
 */

export interface DatabaseConfig {
  driver: 'local_storage' | 'firestore' | 'postgres' | 'supabase';
  endpoint?: string;
  isOnline: boolean;
  lastSyncAt: string | null;
  pendingSyncCount: number;
}

class DatabaseAdapter {
  private config: DatabaseConfig = {
    driver: 'local_storage',
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    lastSyncAt: new Date().toISOString(),
    pendingSyncCount: 0,
  };

  private listeners: Set<(config: DatabaseConfig) => void> = new Set();

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.updateOnlineStatus(true));
      window.addEventListener('offline', () => this.updateOnlineStatus(false));
    }
  }

  private updateOnlineStatus(online: boolean) {
    this.config.isOnline = online;
    this.notifyListeners();
  }

  public getConfig(): DatabaseConfig {
    return { ...this.config };
  }

  public subscribe(callback: (config: DatabaseConfig) => void): () => void {
    this.listeners.add(callback);
    callback(this.getConfig());
    return () => this.listeners.delete(callback);
  }

  private notifyListeners() {
    const cfg = this.getConfig();
    this.listeners.forEach((cb) => cb(cfg));
  }

  /**
   * Generic Fetch / Get Collection
   */
  public async get<T>(collection: string, defaultValue: T): Promise<T> {
    try {
      const data = localStorage.getItem(`neon_db_${collection}`);
      if (data) {
        return JSON.parse(data) as T;
      }
    } catch (err) {
      console.warn(`[NeonDB] Error reading collection "${collection}":`, err);
    }
    return defaultValue;
  }

  /**
   * Generic Save / Set Collection
   */
  public async set<T>(collection: string, value: T): Promise<void> {
    try {
      localStorage.setItem(`neon_db_${collection}`, JSON.stringify(value));
      this.config.lastSyncAt = new Date().toISOString();
      this.notifyListeners();
    } catch (err) {
      console.error(`[NeonDB] Error writing collection "${collection}":`, err);
    }
  }

  /**
   * Clear all stored application collections
   */
  public async clearAll(): Promise<void> {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('neon_') || key.startsWith('neon_db_'))) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k));
    this.config.lastSyncAt = new Date().toISOString();
    this.notifyListeners();
  }

  /**
   * Export database backup as JSON
   */
  public async exportBackup(): Promise<string> {
    const dump: Record<string, any> = {
      _meta: {
        exportedAt: new Date().toISOString(),
        version: '2026.1',
        driver: this.config.driver,
      },
    };

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('neon_') || key.startsWith('neon_db_'))) {
        try {
          dump[key] = JSON.parse(localStorage.getItem(key) || 'null');
        } catch {
          dump[key] = localStorage.getItem(key);
        }
      }
    }
    return JSON.stringify(dump, null, 2);
  }
}

export const db = new DatabaseAdapter();
