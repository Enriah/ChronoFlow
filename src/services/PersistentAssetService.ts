import { convertFileSrc } from '@tauri-apps/api/core';

export class PersistentAssetService {
  static getAssetUrl(path: string): string {
    if (!path) return '';
    if (path.startsWith('blob:') || path.startsWith('http') || path.startsWith('data:')) {
      return path;
    }
    if (path.startsWith('/')) {
      return path;
    }
    return convertFileSrc(path);
  }
}
