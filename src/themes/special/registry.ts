import type { EnvironmentConfig, ThemeConfig, VisualEffectType, WidgetStyle } from '../theme.types';

export type SpecialSidebarOrnamentKey = 'hutao-crimson-branch' | 'layla-astrolabe';
const allowedSidebarOrnaments: SpecialSidebarOrnamentKey[] = ['hutao-crimson-branch', 'layla-astrolabe'];

export interface SpecialThemeDefinition {
  themeId: string;
  allowUserBackground?: boolean;
  widgetStyleOverride?: Partial<WidgetStyle>;
  allowedEffects?: VisualEffectType[];
  exclusiveEffects?: VisualEffectType[];
  sidebarOrnament?: SpecialSidebarOrnamentKey;
  assets?: {
    sidebarChibiUrl?: string;
  };
}

export interface DownloadableSpecialTheme {
  id: string;
  name: string;
  sourceUrl?: string;
  installedAt?: string;
  previewImageUrl?: string;
  theme: ThemeConfig;
  environment: EnvironmentConfig;
  definition: SpecialThemeDefinition;
}

export interface SpecialThemeRemoteRegistry {
  version: number;
  themes: DownloadableSpecialTheme[];
}

let installedSpecialThemeRegistry: Record<string, SpecialThemeDefinition> = {};

const effectIds: VisualEffectType[] = ['aurora', 'rain', 'sakura', 'maple_leaf', 'snow', 'electricity', 'stars', 'matrix', 'fog', 'water_surface', 'crimson_blossom', 'layla_star'];
const sanitizeEffects = (effects?: VisualEffectType[]) => (effects || []).filter((effect): effect is VisualEffectType => effectIds.includes(effect));

export function normalizeSpecialThemePackage(input: any, sourceUrl?: string): DownloadableSpecialTheme | undefined {
  if (!input?.id || !input?.name || !input?.theme || !input?.environment) return undefined;
  const themeId = String(input.theme.id || input.environment.themeId || input.id);
  const definition = input.definition || {};
  const sidebarOrnament = allowedSidebarOrnaments.includes(definition.sidebarOrnament) ? definition.sidebarOrnament : undefined;
  return {
    id: String(input.id),
    name: String(input.name),
    sourceUrl: input.sourceUrl || sourceUrl,
    installedAt: input.installedAt,
    previewImageUrl: typeof input.previewImageUrl === 'string' ? input.previewImageUrl : undefined,
    theme: { ...input.theme, id: themeId, type: input.theme.type || 'custom' },
    environment: { ...input.environment, themeId },
    definition: {
      themeId,
      allowUserBackground: definition.allowUserBackground !== false,
      widgetStyleOverride: definition.widgetStyleOverride || {},
      allowedEffects: sanitizeEffects(definition.allowedEffects),
      exclusiveEffects: sanitizeEffects(definition.exclusiveEffects),
      sidebarOrnament,
      assets: {
        sidebarChibiUrl: typeof definition.assets?.sidebarChibiUrl === 'string' ? definition.assets.sidebarChibiUrl : undefined,
      },
    },
  };
}

export function setInstalledSpecialThemes(themes: DownloadableSpecialTheme[]) {
  installedSpecialThemeRegistry = Object.fromEntries(themes.map((theme) => [theme.theme.id, theme.definition]));
}

export function getInstalledSpecialThemeDefinitions() {
  return installedSpecialThemeRegistry;
}

export function getSpecialThemeDefinition(themeId?: string) {
  return themeId ? installedSpecialThemeRegistry[themeId] : undefined;
}

export function isSpecialTheme(themeId?: string) {
  return Boolean(getSpecialThemeDefinition(themeId));
}

export function canUseUserBackground(themeId?: string) {
  return Boolean(getSpecialThemeDefinition(themeId)?.allowUserBackground);
}

export function getSpecialThemeWidgetStyleOverride(themeId?: string): Partial<WidgetStyle> {
  return getSpecialThemeDefinition(themeId)?.widgetStyleOverride || {};
}

export function getSpecialEffectOwner(effectId: VisualEffectType): string | undefined {
  return Object.values(installedSpecialThemeRegistry).find((definition) => definition.exclusiveEffects?.includes(effectId))?.themeId;
}

export function isEffectAllowedForTheme(themeId: string | undefined, effectId: VisualEffectType) {
  const definition = getSpecialThemeDefinition(themeId);
  if (definition?.allowedEffects) {
    return definition.allowedEffects.includes(effectId);
  }

  const owner = getSpecialEffectOwner(effectId);
  return !owner || owner === themeId;
}
