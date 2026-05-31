import type { NotificationSound } from './audio.types';

class AudioStorageClass {
  private dbName = 'chronoflow_audio_db';
  private storeName = 'custom_sounds';
  private db: IDBDatabase | null = null;

  init(): Promise<void> {
    if (this.db) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);

      request.onerror = () => {
        console.error('IndexedDB open error:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName, { keyPath: 'id' });
        }
      };
    });
  }

  async saveSound(sound: Omit<NotificationSound, 'url'>): Promise<void> {
    await this.init();
    return new Promise((resolve, reject) => {
      if (!this.db) {
        return reject(new Error('IndexedDB not initialized'));
      }
      const transaction = this.db.transaction(this.storeName, 'readwrite');
      const store = transaction.objectStore(this.storeName);
      
      // Store raw buffer, name, mimeType, and id
      const request = store.put({
        id: sound.id,
        name: sound.name,
        isDefault: false,
        mimeType: sound.mimeType,
        data: sound.data
      });

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async getAllSounds(): Promise<Omit<NotificationSound, 'url'>[]> {
    await this.init();
    return new Promise((resolve, reject) => {
      if (!this.db) {
        return resolve([]);
      }
      const transaction = this.db.transaction(this.storeName, 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.getAll();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        resolve(request.result || []);
      };
    });
  }

  async deleteSound(id: string): Promise<void> {
    await this.init();
    return new Promise((resolve, reject) => {
      if (!this.db) {
        return reject(new Error('IndexedDB not initialized'));
      }
      const transaction = this.db.transaction(this.storeName, 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.delete(id);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }
}

export const AudioStorage = new AudioStorageClass();
