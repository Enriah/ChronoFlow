import { PersistentAssetService } from '../../services/PersistentAssetService';

export type AssetType = 'image' | 'video' | 'gif';

export interface Asset {
  id: string;
  url: string;
  type: AssetType;
  name: string;
  blob?: Blob;
  path?: string; // Real file path for persistence
}

export class AssetManager {
  private assets: Map<string, Asset> = new Map();
  private cache: Map<string, string> = new Map(); // url to local object url

  async loadLocalAsset(file: File): Promise<Asset> {
    const type = this.getAssetType(file.type);
    const id = crypto.randomUUID();
    
    // Save to persistent storage
    const path = await PersistentAssetService.saveBackground(file);
    
    const asset: Asset = {
      id,
      url: path, // Store path in url field for persistence
      type,
      name: file.name,
      path
    };

    this.assets.set(id, asset);
    this.cache.set(file.name, path);
    
    return asset;
  }

  private getAssetType(mimeType: string): AssetType {
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType === 'image/gif') return 'gif';
    return 'image';
  }

  getAsset(id: string): Asset | undefined {
    return this.assets.get(id);
  }

  releaseAsset(id: string) {
    const asset = this.assets.get(id);
    if (asset && asset.url.startsWith('blob:')) {
      URL.revokeObjectURL(asset.url);
      this.assets.delete(id);
    } else {
      this.assets.delete(id);
    }
  }

  clearAll() {
    this.assets.forEach(asset => {
      if (asset.url.startsWith('blob:')) {
        URL.revokeObjectURL(asset.url);
      }
    });
    this.assets.clear();
    this.cache.clear();
  }
}

export const assetManager = new AssetManager();
