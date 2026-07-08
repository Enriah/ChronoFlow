import type { VisualEffectType, WidgetStyle } from '../theme.types';

export type SpecialSidebarOrnamentKey = 'hutao-crimson-branch' | 'layla-astrolabe';

export interface SpecialThemeDefinition {
  themeId: string;
  allowUserBackground?: boolean;
  widgetStyleOverride?: Partial<WidgetStyle>;
  allowedEffects?: VisualEffectType[];
  exclusiveEffects?: VisualEffectType[];
  sidebarOrnament?: SpecialSidebarOrnamentKey;
}

export const specialThemeRegistry: Record<string, SpecialThemeDefinition> = {
  layla: {
    themeId: 'layla',
    allowUserBackground: true,
    widgetStyleOverride: {
      backgroundType: 'glass',
      opacity: 0.58,
      blur: 14,
      borderStyle: 'halo',
      borderEffect: 'none',
      borderOpacity: 0.5,
      glowIntensity: 0.32,
      shadowIntensity: 0.34,
      surfaceEffect: 'sheen',
    },
    allowedEffects: ['layla_star'],
    exclusiveEffects: ['layla_star'],
    sidebarOrnament: 'layla-astrolabe',
  },
  hutao: {
    themeId: 'hutao',
    allowUserBackground: true,
    widgetStyleOverride: {
      backgroundType: 'glass',
      opacity: 0.56,
      blur: 18,
      borderEffect: 'none',
      borderOpacity: 0.52,
      glowIntensity: 0.28,
      shadowIntensity: 0.34,
    },
    allowedEffects: ['crimson_blossom'],
    exclusiveEffects: ['crimson_blossom'],
    sidebarOrnament: 'hutao-crimson-branch',
  },
};

export function getSpecialThemeDefinition(themeId?: string) {
  return themeId ? specialThemeRegistry[themeId] : undefined;
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
  return Object.values(specialThemeRegistry).find((definition) => definition.exclusiveEffects?.includes(effectId))?.themeId;
}

export function isEffectAllowedForTheme(themeId: string | undefined, effectId: VisualEffectType) {
  const definition = getSpecialThemeDefinition(themeId);
  if (definition?.allowedEffects) {
    return definition.allowedEffects.includes(effectId);
  }

  const owner = getSpecialEffectOwner(effectId);
  return !owner || owner === themeId;
}
