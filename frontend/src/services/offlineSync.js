import api from './api';
import { toast } from '../store/toastStore';

const QUEUE_KEY = 'notitas-offline-queue';
const CACHE_KEY = 'notitas-cached-notes';

class OfflineSyncManager {
  constructor() {
    this.isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
    this.listeners = new Set();
    this.isSyncing = false;

    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.handleNetworkChange(true));
      window.addEventListener('offline', () => this.handleNetworkChange(false));
    }
  }

  handleNetworkChange(status) {
    this.isOnline = status;
    this.notify();
    if (status) {
      this.syncPendingQueue();
    } else {
      toast.info('Modo sin conexión. Los cambios se guardarán localmente.', { duration: 4000 });
    }
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notify() {
    const state = {
      isOnline: this.isOnline,
      isSyncing: this.isSyncing,
      pendingCount: this.getPendingQueue().length,
    };
    this.listeners.forEach((fn) => fn(state));
  }

  getPendingQueue() {
    try {
      const raw = localStorage.getItem(QUEUE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  savePendingQueue(queue) {
    try {
      localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
    } catch (e) {
      console.warn('Error saving offline queue:', e);
    }
    this.notify();
  }

  saveDraft(noteId, data) {
    if (!noteId) return;
    try {
      // 1. Guardar en caché local de notas
      const rawCache = localStorage.getItem(CACHE_KEY);
      const cache = rawCache ? JSON.parse(rawCache) : {};
      cache[noteId] = {
        ...cache[noteId],
        ...data,
        updatedAt: new Date().toISOString(),
      };
      localStorage.setItem(CACHE_KEY, JSON.stringify(cache));

      // 2. Si estamos offline o la petición falló, agregar a la cola
      if (!this.isOnline) {
        const queue = this.getPendingQueue().filter((item) => item.noteId !== noteId);
        queue.push({
          noteId,
          payload: data,
          timestamp: Date.now(),
        });
        this.savePendingQueue(queue);
      }
    } catch (e) {
      console.warn('Error saving offline draft:', e);
    }
  }

  getCachedNote(noteId) {
    try {
      const rawCache = localStorage.getItem(CACHE_KEY);
      const cache = rawCache ? JSON.parse(rawCache) : {};
      return cache[noteId] || null;
    } catch {
      return null;
    }
  }

  async syncPendingQueue(queryClient) {
    const queue = this.getPendingQueue();
    if (queue.length === 0 || this.isSyncing || !this.isOnline) return;

    this.isSyncing = true;
    this.notify();

    const remaining = [];
    let syncedCount = 0;

    for (const item of queue) {
      try {
        await api.put(`/notes/${item.noteId}`, item.payload);
        syncedCount++;
      } catch (err) {
        console.error(`Error syncing note ${item.noteId}:`, err);
        remaining.push(item);
      }
    }

    this.savePendingQueue(remaining);
    this.isSyncing = false;
    this.notify();

    if (syncedCount > 0) {
      toast.success(`${syncedCount} ${syncedCount === 1 ? 'nota sincronizada' : 'notas sincronizadas'} con el servidor.`);
      if (queryClient) {
        queryClient.invalidateQueries({ queryKey: ['notes'] });
      }
    }
  }
}

export const offlineSync = new OfflineSyncManager();
