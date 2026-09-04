import { appDataDir, BaseDirectory, join } from '@tauri-apps/api/path';
import { mkdir, readDir, readTextFile, remove, writeFile, writeTextFile } from '@tauri-apps/plugin-fs';
import { normalizeSpecialThemePackage, type DownloadableSpecialTheme } from './registry';

const ADDONS_DIRECTORY = 'special-themes';
const MANIFEST_NAME = 'theme.json';

const addonPath = (themeId: string) => `${ADDONS_DIRECTORY}/${themeId}`;
const isLocalAddonPath = (value?: string) => Boolean(value?.startsWith(`${ADDONS_DIRECTORY}/`));

function safeThemeId(themeId: string) {
  if (!/^[a-z0-9][a-z0-9_-]*$/i.test(themeId)) {
    throw new Error('Special theme package id contains unsupported characters.');
  }
  return themeId;
}

function assetExtension(url: string) {
  try {
    const extension = new URL(url).pathname.match(/\.(png|jpe?g|webp|gif|svg)$/i)?.[1];
    return extension || 'png';
  } catch {
    return 'png';
  }
}

async function resolveAssetPath(value?: string) {
  if (!value || !isLocalAddonPath(value)) return value;
  return join(await appDataDir(), value);
}

async function resolveInstalledPackage(input: DownloadableSpecialTheme) {
  return {
    ...input,
    previewImageUrl: await resolveAssetPath(input.previewImageUrl),
    definition: {
      ...input.definition,
      assets: {
        ...input.definition.assets,
        sidebarChibiUrl: await resolveAssetPath(input.definition.assets?.sidebarChibiUrl),
      },
    },
  };
}

async function storeRemoteAsset(url: string | undefined, relativePath: string) {
  if (!url || !/^https?:\/\//i.test(url)) return url;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Could not download add-on asset (${response.status}).`);
  await writeFile(relativePath, new Uint8Array(await response.arrayBuffer()), { baseDir: BaseDirectory.AppData });
  return relativePath;
}

export class SpecialThemeAddonService {
  static async listInstalled(): Promise<DownloadableSpecialTheme[]> {
    try {
      const entries = await readDir(ADDONS_DIRECTORY, { baseDir: BaseDirectory.AppData });
      const packages = await Promise.all(entries.filter((entry) => entry.isDirectory).map(async (entry) => {
        try {
          const raw = await readTextFile(`${addonPath(entry.name)}/${MANIFEST_NAME}`, { baseDir: BaseDirectory.AppData });
          const theme = normalizeSpecialThemePackage(JSON.parse(raw));
          return theme ? resolveInstalledPackage(theme) : undefined;
        } catch {
          return undefined;
        }
      }));
      return packages.filter(Boolean) as DownloadableSpecialTheme[];
    } catch {
      return [];
    }
  }

  static async install(input: unknown, sourceUrl?: string): Promise<DownloadableSpecialTheme> {
    const theme = normalizeSpecialThemePackage(input, sourceUrl);
    if (!theme) throw new Error('This file is not a valid special theme package.');

    const themeId = safeThemeId(theme.id);
    const directory = addonPath(themeId);
    const assetsDirectory = `${directory}/assets`;

    try {
      await mkdir(assetsDirectory, { baseDir: BaseDirectory.AppData, recursive: true });
      const previewImageUrl = await storeRemoteAsset(theme.previewImageUrl, `${assetsDirectory}/preview.${assetExtension(theme.previewImageUrl || '')}`).catch(() => theme.previewImageUrl);
      const sidebarChibiUrl = await storeRemoteAsset(theme.definition.assets?.sidebarChibiUrl, `${assetsDirectory}/sidebar-chibi.${assetExtension(theme.definition.assets?.sidebarChibiUrl || '')}`).catch(() => theme.definition.assets?.sidebarChibiUrl);
      const storedTheme: DownloadableSpecialTheme = {
        ...theme,
        sourceUrl: sourceUrl || theme.sourceUrl,
        installedAt: new Date().toISOString(),
        previewImageUrl,
        definition: {
          ...theme.definition,
          assets: { ...theme.definition.assets, sidebarChibiUrl },
        },
      };
      await writeTextFile(`${directory}/${MANIFEST_NAME}`, JSON.stringify(storedTheme, null, 2), { baseDir: BaseDirectory.AppData });
      return resolveInstalledPackage(storedTheme);
    } catch (error) {
      // Browser preview builds do not expose Tauri's app-data filesystem.
      return { ...theme, sourceUrl: sourceUrl || theme.sourceUrl, installedAt: new Date().toISOString() };
    }
  }

  static async remove(themeId: string) {
    try {
      await remove(addonPath(safeThemeId(themeId)), { baseDir: BaseDirectory.AppData, recursive: true });
    } catch {
      // The persisted catalog is still removed when the filesystem is unavailable.
    }
  }
}
