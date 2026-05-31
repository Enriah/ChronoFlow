import { writeFile, mkdir } from '@tauri-apps/plugin-fs';
import { appDataDir, join } from '@tauri-apps/api/path';
import { convertFileSrc } from '@tauri-apps/api/core';

export class PersistentAssetService {
  private static BACKGROUNDS_DIR = 'assets/backgrounds';
  private static _appDataDir: string | null = null;

  private static async getAppDataDir(): Promise<string> {
    if (!this._appDataDir) {
      this._appDataDir = await appDataDir();
    }
    return this._appDataDir;
  }

  static async saveBackground(file: File): Promise<string> {
    const appData = await this.getAppDataDir();
    const backgroundsDir = await join(appData, this.BACKGROUNDS_DIR);

    // Ensure directory exists
    try {
      await mkdir(backgroundsDir, { recursive: true });
    } catch (e) {
      // Ignore if exists
    }

    const fileName = `${crypto.randomUUID()}-${file.name}`;
    const filePath = await join(backgroundsDir, fileName);

    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    await writeFile(filePath, uint8Array);

    return filePath;
  }

  static getAssetUrl(path: string): string {
    if (!path) return '';
    if (path.startsWith('blob:') || path.startsWith('http') || path.startsWith('data:')) {
      return path;
    }
    return convertFileSrc(path);
  }
}
