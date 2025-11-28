import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class LockManagerService {
  private locks = new Map<string, boolean>();

  constructor() {}

  /**
   * Limpiar todos los locks de Supabase
   */
  clearSupabaseLocks(): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        // Limpiar locks específicos de Supabase
        const keysToRemove = [];
        for (let i = 0; i < window.localStorage.length; i++) {
          const key = window.localStorage.key(i);
          if (!key) continue;
          const isAuthToken = key.includes('sb-') && key.endsWith('-auth-token');
          const isCodeVerifier = key.includes('code-verifier');
          if (isAuthToken && !isCodeVerifier) {
            keysToRemove.push(key);
          }
        }
        
        keysToRemove.forEach(key => {
          window.localStorage.removeItem(key);
          window.localStorage.removeItem(key + '-lock');
        });

        // Limpiar locks internos
        this.locks.clear();
        
        console.log('Locks de Supabase limpiados exitosamente');
      }
    } catch (error) {
      console.warn('Error limpiando locks de Supabase:', error);
    }
  }

  /**
   * Verificar si existe un lock
   */
  hasLock(key: string): boolean {
    return this.locks.has(key);
  }

  /**
   * Crear un lock temporal
   */
  createLock(key: string, timeout: number = 5000): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.locks.has(key)) {
        reject(new Error(`Lock ${key} already exists`));
        return;
      }

      this.locks.set(key, true);
      
      // Auto-limpiar el lock después del timeout
      setTimeout(() => {
        this.locks.delete(key);
      }, timeout);

      resolve();
    });
  }

  /**
   * Liberar un lock
   */
  releaseLock(key: string): void {
    this.locks.delete(key);
  }

  /**
   * Limpiar todos los locks
   */
  clearAllLocks(): void {
    this.locks.clear();
    this.clearSupabaseLocks();
  }
}
