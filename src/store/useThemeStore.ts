import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { 
  ThemeConfig, 
  EnvironmentConfig, 
  VisualEffectConfig, 
  OverlayConfig,
  VisualEffectType,
  WidgetStyle,
  BackgroundConfig,
} from '../themes/theme.types';
import { themes, minimalTheme } from '../themes/configs';
import { DEFAULT_WIDGET_STYLE, normalizeWidgetStyle } from '../widgets/widget-styles/widgetStyleEngine';
import {
  canUseUserBackground,
  getSpecialThemeDefinition,
  getSpecialThemeWidgetStyleOverride,
  isSpecialTheme,
  isEffectAllowedForTheme,
  normalizeSpecialThemePackage,
  setInstalledSpecialThemes,
  type DownloadableSpecialTheme,
} from '../themes/special/registry';
import { SpecialThemeAddonService } from '../themes/special/SpecialThemeAddonService';

export interface SavedPreset extends EnvironmentConfig {
  id: string;
  name: string;
  isCustom?: boolean;
}

interface ThemeState {
  // Core State
  activeEnvironment: EnvironmentConfig;
  draftEnvironment: EnvironmentConfig;
  currentThemeId: string;
  
  // Presets
  savedPresets: SavedPreset[];
  downloadedSpecialThemes: DownloadableSpecialTheme[];
  specialThemeRegistryUrl: string;
  isFetchingSpecialThemes: boolean;
  specialThemeError?: string;
  
  // UI State
  isEditing: boolean;
  hasUnsavedChanges: boolean;
  performanceMode: boolean;

  // Actions
  setTheme: (id: string) => void;
  getTheme: () => ThemeConfig;
  togglePerformanceMode: () => void;
  
  // Draft Actions
  startEditing: () => void;
  stopEditing: () => void;
  updateDraftEffect: (effectId: VisualEffectType, config: Partial<VisualEffectConfig>) => void;
  toggleDraftEffect: (effectId: VisualEffectType) => void;
  updateDraftBackground: (config: Partial<BackgroundConfig>) => void;
  clearDraftBackground: () => void;
  updateDraftOverlay: (type: string, config: Partial<OverlayConfig>) => void;
  updateDraftCountdownStyle: (config: Partial<WidgetStyle>) => void;
  updateDraftTimelineStyle: (config: Partial<WidgetStyle>) => void;
  updateDraftPlannerStyle: (config: Partial<WidgetStyle>) => void;
  updateDraftStatsStyle: (config: Partial<WidgetStyle>) => void;
  updateDraftRankingStyle: (config: Partial<WidgetStyle>) => void;
  
  // Workflow Actions
  applyEnvironment: () => void;
  resetDraft: () => void;
  savePreset: (name: string) => void;
  loadPreset: (presetId: string) => void;
  deletePreset: (presetId: string) => void;
  setSpecialThemeRegistryUrl: (url: string) => void;
  hydrateSpecialThemes: () => Promise<void>;
  fetchSpecialThemes: () => Promise<void>;
  removeDownloadedSpecialTheme: (themeId: string) => Promise<void>;
}

export const DEFAULT_SPECIAL_THEME_REGISTRY_URL = 'https://raw.githubusercontent.com/Enriah/ChronoFlow/main/special-themes/registry.json';

const STANDARD_EFFECTS: VisualEffectConfig[] = [
  { id: 'aurora', enabled: false, intensity: 0.55, speed: 0.35, opacity: 0.45 },
  { id: 'rain', enabled: false, intensity: 0.5, speed: 0.5, opacity: 0.5 },
  { id: 'sakura', enabled: false, intensity: 0.5, speed: 0.5, opacity: 0.5 },
  { id: 'maple_leaf', enabled: false, intensity: 0.5, speed: 0.4, opacity: 0.65 },
  { id: 'snow', enabled: false, intensity: 0.5, speed: 0.5, opacity: 0.5 },
  { id: 'electricity', enabled: false, intensity: 0.5, speed: 0.5, opacity: 0.5 },
  { id: 'stars', enabled: false, intensity: 0.5, speed: 0.5, opacity: 0.5 },
  { id: 'matrix', enabled: false, intensity: 0.5, speed: 0.5, opacity: 0.5 },
  { id: 'fog', enabled: false, intensity: 0.5, speed: 0.5, opacity: 0.5 },
  { id: 'water_surface', enabled: false, intensity: 0.62, speed: 0.48, opacity: 0.72 },
];

const ADDON_EFFECT_DEFAULTS: Partial<Record<VisualEffectType, VisualEffectConfig>> = {
  crimson_blossom: { id: 'crimson_blossom', enabled: false, intensity: 0.58, speed: 0.44, opacity: 0.76 },
  layla_star: { id: 'layla_star', enabled: false, intensity: 0.42, speed: 0.42, opacity: 0.74 },
};

const effectDefaultsForTheme = (themeId: string): VisualEffectConfig[] => {
  const addonEffects = getSpecialThemeDefinition(themeId)?.allowedEffects || [];
  const addonDefaults = addonEffects
    .map((effectId) => ADDON_EFFECT_DEFAULTS[effectId])
    .filter(Boolean) as VisualEffectConfig[];
  return [...STANDARD_EFFECTS, ...addonDefaults];
};

const DEFAULT_ENVIRONMENT: EnvironmentConfig = {
  themeId: 'minimal',
  background: {
    type: 'none',
    opacity: 1,
    blur: 0,
    brightness: 1,
  },
  effects: STANDARD_EFFECTS,
  overlays: [
    { type: 'scanlines', enabled: false, intensity: 0.2 },
    { type: 'blur', enabled: false, intensity: 5 },
    { type: 'vignette', enabled: false, intensity: 0.5 },
    { type: 'bloom', enabled: false, intensity: 0.5 },
    { type: 'crt', enabled: false, intensity: 0.5 },
  ],
  countdownStyle: { ...DEFAULT_WIDGET_STYLE, borderRadius: 32 },
  timelineStyle: { ...DEFAULT_WIDGET_STYLE },
  plannerStyle: { ...DEFAULT_WIDGET_STYLE },
  statsStyle: { ...DEFAULT_WIDGET_STYLE },
  rankingStyle: { ...DEFAULT_WIDGET_STYLE },
};

const normalizeBackground = (themeId?: string, background?: Partial<BackgroundConfig>): BackgroundConfig => {
  if (!canUseUserBackground(themeId)) {
    return { ...DEFAULT_ENVIRONMENT.background };
  }

  const merged = {
    ...DEFAULT_ENVIRONMENT.background,
    ...(background || {}),
  };

  if (merged.url?.startsWith('/themes/')) {
    return { ...DEFAULT_ENVIRONMENT.background };
  }

  if (merged.type !== 'image' || !merged.url) {
    return { ...DEFAULT_ENVIRONMENT.background };
  }

  return {
    type: 'image',
    url: merged.url,
    opacity: merged.opacity ?? 0.48,
    blur: Math.min(merged.blur ?? 0, 12),
    brightness: merged.brightness ?? 0.82,
  };
};

const normalizeThemeWidgetStyle = (themeId: string, style?: Partial<WidgetStyle>): WidgetStyle => normalizeWidgetStyle({
  ...style,
  ...getSpecialThemeWidgetStyleOverride(themeId),
});

const withWidgetStyles = (style: Partial<WidgetStyle>) => {
  const widgetStyle = normalizeWidgetStyle(style);
  return {
    countdownStyle: widgetStyle,
    timelineStyle: widgetStyle,
    plannerStyle: widgetStyle,
    statsStyle: widgetStyle,
    rankingStyle: widgetStyle,
  };
};

const normalizeEnvironment = (environment?: Partial<EnvironmentConfig>): EnvironmentConfig => {
  const requestedThemeId = environment?.themeId || DEFAULT_ENVIRONMENT.themeId;
  const themeId = themes.some((theme) => theme.id === requestedThemeId) || isSpecialTheme(requestedThemeId) ? requestedThemeId : DEFAULT_ENVIRONMENT.themeId;

  return {
    ...DEFAULT_ENVIRONMENT,
    ...(environment || {}),
    themeId,
    background: normalizeBackground(themeId, environment?.background),
    effects: effectDefaultsForTheme(themeId).map((fallback) => {
      const effect = { ...fallback, ...(environment?.effects?.find((item) => item.id === fallback.id) || {}) };
      return isEffectAllowedForTheme(themeId, effect.id) ? effect : { ...effect, enabled: false };
    }),
    overlays: environment?.overlays || DEFAULT_ENVIRONMENT.overlays,
    countdownStyle: normalizeThemeWidgetStyle(themeId, environment?.countdownStyle),
    timelineStyle: normalizeThemeWidgetStyle(themeId, environment?.timelineStyle),
    plannerStyle: normalizeThemeWidgetStyle(themeId, environment?.plannerStyle),
    statsStyle: normalizeThemeWidgetStyle(themeId, environment?.statsStyle),
    rankingStyle: normalizeThemeWidgetStyle(themeId, environment?.rankingStyle),
  };
};

const normalizePreset = (preset: SavedPreset): SavedPreset => ({
  ...normalizeEnvironment(preset),
  id: preset.id,
  name: preset.name,
  isCustom: preset.isCustom,
});

const INITIAL_PRESETS: SavedPreset[] = [
  { ...DEFAULT_ENVIRONMENT, id: 'minimal', name: 'Minimal Dark', themeId: 'minimal' },
  {
    ...DEFAULT_ENVIRONMENT,
    ...withWidgetStyles({
      borderStyle: 'halo',
      borderEffect: 'glow',
      borderWidth: 2,
      borderOpacity: 0.75,
      glowIntensity: 0.9,
      shadowIntensity: 0.45,
      surfaceEffect: 'sheen',
    }),
    id: 'neon',
    name: 'Cyber Dev',
    themeId: 'neon',
    effects: DEFAULT_ENVIRONMENT.effects.map(e => e.id === 'electricity' ? { ...e, enabled: true } : e),
  },
  {
    ...DEFAULT_ENVIRONMENT,
    ...withWidgetStyles({
      borderStyle: 'terminal',
      borderEffect: 'scan',
      borderRadius: 0,
      borderWidth: 1,
      borderOpacity: 0.9,
      glowIntensity: 0.35,
      shadowIntensity: 0,
      surfaceEffect: 'grid',
    }),
    id: 'terminal',
    name: 'Terminal',
    themeId: 'terminal',
    overlays: DEFAULT_ENVIRONMENT.overlays.map(o => o.type === 'scanlines' ? { ...o, enabled: true } : o),
  },
  {
    ...DEFAULT_ENVIRONMENT,
    ...withWidgetStyles({
      borderStyle: 'double',
      borderEffect: 'corners',
      borderRadius: 40,
      borderWidth: 2,
      borderOpacity: 0.42,
      glowIntensity: 0.3,
      shadowIntensity: 0.22,
      surfaceEffect: 'sheen',
    }),
    id: 'soft',
    name: 'Soft Focus',
    themeId: 'soft',
    effects: DEFAULT_ENVIRONMENT.effects.map(e => e.id === 'sakura' ? { ...e, enabled: true } : e),
  },
  {
    ...DEFAULT_ENVIRONMENT,
    ...withWidgetStyles({
      borderStyle: 'halo',
      borderEffect: 'glow',
      backgroundType: 'glass',
      opacity: 0.88,
      blur: 12,
      borderRadius: 28,
      borderWidth: 2,
      borderOpacity: 0.72,
      glowIntensity: 0.42,
      shadowIntensity: 0.32,
      surfaceEffect: 'none',
    }),
    id: 'fantasy',
    name: 'Enchanted Realm',
    themeId: 'fantasy',
    effects: DEFAULT_ENVIRONMENT.effects.map(e => ['aurora', 'stars', 'fog'].includes(e.id) ? { ...e, enabled: true } : e),
  },
  {
    ...DEFAULT_ENVIRONMENT,
    ...withWidgetStyles({ backgroundType: 'glass', opacity: 0.9, blur: 10, borderStyle: 'soft', borderRadius: 16, borderWidth: 1, borderOpacity: 0.7, glowIntensity: 0.15, shadowIntensity: 0.35, surfaceEffect: 'none' }),
    id: 'maple', name: 'Maple Forest', themeId: 'maple',
    effects: DEFAULT_ENVIRONMENT.effects.map(e => ['maple_leaf', 'rain'].includes(e.id) ? { ...e, enabled: true } : e),
  },
  {
    ...DEFAULT_ENVIRONMENT,
    ...withWidgetStyles({ backgroundType: 'glass', opacity: 0.86, blur: 12, borderStyle: 'soft', borderRadius: 22, borderWidth: 1, borderOpacity: 0.62, glowIntensity: 0.18, shadowIntensity: 0.32, surfaceEffect: 'none' }),
    id: 'sakura', name: 'Sakura Evening', themeId: 'sakura',
    effects: DEFAULT_ENVIRONMENT.effects.map(e => e.id === 'sakura' ? { ...e, enabled: true, intensity: 0.65 } : e),
  },
  {
    ...DEFAULT_ENVIRONMENT,
    ...withWidgetStyles({ backgroundType: 'glass', opacity: 0.82, blur: 14, borderStyle: 'halo', borderEffect: 'glow', borderRadius: 18, borderWidth: 1, borderOpacity: 0.68, glowIntensity: 0.5, shadowIntensity: 0.45, surfaceEffect: 'none' }),
    id: 'galaxy', name: 'Deep Galaxy', themeId: 'galaxy',
    effects: DEFAULT_ENVIRONMENT.effects.map(e => ['stars', 'aurora'].includes(e.id) ? { ...e, enabled: true } : e),
  },
  {
    ...DEFAULT_ENVIRONMENT,
    ...withWidgetStyles({ backgroundType: 'glass', opacity: 0.84, blur: 16, borderStyle: 'halo', borderEffect: 'glow', borderRadius: 20, borderWidth: 1, borderOpacity: 0.64, glowIntensity: 0.38, shadowIntensity: 0.42, surfaceEffect: 'sheen' }),
    id: 'ocean', name: 'Ocean Depth', themeId: 'ocean',
    effects: DEFAULT_ENVIRONMENT.effects.map(e => e.id === 'water_surface' ? { ...e, enabled: true, intensity: 0.68, speed: 0.46, opacity: 0.78 } : e),
  },
];

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      activeEnvironment: DEFAULT_ENVIRONMENT,
      draftEnvironment: DEFAULT_ENVIRONMENT,
      currentThemeId: 'minimal',
      savedPresets: INITIAL_PRESETS,
      downloadedSpecialThemes: [],
      specialThemeRegistryUrl: DEFAULT_SPECIAL_THEME_REGISTRY_URL,
      isFetchingSpecialThemes: false,
      isEditing: false,
      hasUnsavedChanges: false,
      performanceMode: false,

      setTheme: (id: string) => {
        set({ currentThemeId: id });
        // Also update themeId in draft if editing
        if (get().isEditing) {
          set((state) => ({
            draftEnvironment: { ...state.draftEnvironment, themeId: id, background: normalizeBackground(id, state.draftEnvironment.background) },
            hasUnsavedChanges: true
          }));
        }
      },
      
      togglePerformanceMode: () => set((state) => ({ performanceMode: !state.performanceMode })),
      
      getTheme: () => {
        const draftEnv = get().draftEnvironment;
        const activeEnv = get().activeEnvironment;
        const themeId = get().isEditing 
          ? (draftEnv?.themeId || 'minimal') 
          : (activeEnv?.themeId || 'minimal');
        return [...themes, ...get().downloadedSpecialThemes.map((item) => item.theme)].find((t) => t.id === themeId) || minimalTheme;
      },

      startEditing: () => set({ 
        isEditing: true, 
        draftEnvironment: JSON.parse(JSON.stringify(normalizeEnvironment(get().activeEnvironment))),
        hasUnsavedChanges: false 
      }),

      stopEditing: () => set({ isEditing: false, hasUnsavedChanges: false }),

      updateDraftEffect: (effectId, config) => set((state) => ({
        draftEnvironment: {
          ...state.draftEnvironment,
          effects: state.draftEnvironment.effects.map(e => 
            e.id === effectId ? { ...e, ...config } : e
          )
        },
        hasUnsavedChanges: true
      })),

      toggleDraftEffect: (effectId) => set((state) => ({
        draftEnvironment: {
          ...state.draftEnvironment,
          effects: state.draftEnvironment.effects.map(e => 
            e.id === effectId ? { ...e, enabled: !e.enabled } : e
          )
        },
        hasUnsavedChanges: true
      })),

      updateDraftBackground: (config) => set((state) => ({
        draftEnvironment: {
          ...state.draftEnvironment,
          background: normalizeBackground(state.draftEnvironment.themeId, {
            ...state.draftEnvironment.background,
            ...config,
          }),
        },
        hasUnsavedChanges: true
      })),

      clearDraftBackground: () => set((state) => ({
        draftEnvironment: {
          ...state.draftEnvironment,
          background: { ...DEFAULT_ENVIRONMENT.background },
        },
        hasUnsavedChanges: true
      })),

      updateDraftOverlay: (type, config) => set((state) => ({
        draftEnvironment: {
          ...state.draftEnvironment,
          overlays: state.draftEnvironment.overlays.map(o => 
            o.type === type ? { ...o, ...config } : o
          )
        },
        hasUnsavedChanges: true
      })),

      updateDraftCountdownStyle: (config) => set((state) => ({
        draftEnvironment: {
          ...state.draftEnvironment,
          countdownStyle: { ...state.draftEnvironment.countdownStyle, ...config }
        },
        hasUnsavedChanges: true
      })),

      updateDraftTimelineStyle: (config) => set((state) => ({
        draftEnvironment: {
          ...state.draftEnvironment,
          timelineStyle: { ...state.draftEnvironment.timelineStyle, ...config }
        },
        hasUnsavedChanges: true
      })),

      updateDraftPlannerStyle: (config) => set((state) => ({
        draftEnvironment: {
          ...state.draftEnvironment,
          plannerStyle: { ...state.draftEnvironment.plannerStyle, ...config }
        },
        hasUnsavedChanges: true
      })),

      updateDraftStatsStyle: (config) => set((state) => ({
        draftEnvironment: {
          ...state.draftEnvironment,
          statsStyle: { ...state.draftEnvironment.statsStyle, ...config }
        },
        hasUnsavedChanges: true
      })),

      updateDraftRankingStyle: (config) => set((state) => ({
        draftEnvironment: {
          ...state.draftEnvironment,
          rankingStyle: { ...state.draftEnvironment.rankingStyle, ...config }
        },
        hasUnsavedChanges: true
      })),

      applyEnvironment: () => {
        set((state) => ({
          activeEnvironment: JSON.parse(JSON.stringify(normalizeEnvironment(state.draftEnvironment))),
          hasUnsavedChanges: false
        }));
      },

      resetDraft: () => set((state) => ({
        draftEnvironment: JSON.parse(JSON.stringify(normalizeEnvironment(state.activeEnvironment))),
        hasUnsavedChanges: false
      })),

      savePreset: (name: string) => {
        const id = typeof crypto.randomUUID === 'function' 
          ? crypto.randomUUID() 
          : Math.random().toString(36).substring(2, 15);
          
        const newPreset: SavedPreset = {
          ...JSON.parse(JSON.stringify(get().draftEnvironment)),
          id,
          name,
          isCustom: true
        };
        set((state) => ({
          savedPresets: [...state.savedPresets, newPreset]
        }));
      },

      loadPreset: (presetId: string) => {
        const downloadedPreset = get().downloadedSpecialThemes.find((theme) => theme.id === presetId || theme.theme.id === presetId);
        const preset = downloadedPreset ? { ...downloadedPreset.environment, id: downloadedPreset.id, name: downloadedPreset.name } : get().savedPresets.find(p => p.id === presetId);
        if (preset) {
          const normalizedPreset = normalizePreset(preset);
          set({ 
            draftEnvironment: JSON.parse(JSON.stringify(normalizedPreset)),
            hasUnsavedChanges: true 
          });
        }
      },

      deletePreset: (presetId: string) => {
        set((state) => ({
          savedPresets: state.savedPresets.filter(p => p.id !== presetId || !p.isCustom)
        }));
      },

      setSpecialThemeRegistryUrl: (url) => set({ specialThemeRegistryUrl: url.trim() || DEFAULT_SPECIAL_THEME_REGISTRY_URL }),

      hydrateSpecialThemes: async () => {
        const installedThemes = await SpecialThemeAddonService.listInstalled();
        if (!installedThemes.length) {
          setInstalledSpecialThemes(get().downloadedSpecialThemes);
          return;
        }

        setInstalledSpecialThemes(installedThemes);
        set((state) => ({
          downloadedSpecialThemes: installedThemes,
          activeEnvironment: normalizeEnvironment(state.activeEnvironment),
          draftEnvironment: normalizeEnvironment(state.draftEnvironment),
        }));
      },

      fetchSpecialThemes: async () => {
        set({ isFetchingSpecialThemes: true, specialThemeError: undefined });
        try {
          const response = await fetch(get().specialThemeRegistryUrl);
          if (!response.ok) throw new Error(`Could not load the special theme catalog (${response.status}).`);
          const registry = await response.json() as { themes?: unknown[] } | unknown[];
          const packages = (Array.isArray(registry) ? registry : registry.themes || [])
            .map((theme) => normalizeSpecialThemePackage(theme, get().specialThemeRegistryUrl))
            .filter(Boolean) as DownloadableSpecialTheme[];
          if (!packages.length) throw new Error('The special theme catalog did not contain valid add-on packages.');

          const installedThemes = await Promise.all(packages.map((theme) => SpecialThemeAddonService.install(theme, get().specialThemeRegistryUrl)));
          setInstalledSpecialThemes(installedThemes);
          set({ downloadedSpecialThemes: installedThemes, isFetchingSpecialThemes: false, specialThemeError: undefined });
        } catch (error) {
          set({
            isFetchingSpecialThemes: false,
            specialThemeError: error instanceof Error ? error.message : 'Could not install special themes.',
          });
        }
      },

      removeDownloadedSpecialTheme: async (themeId) => {
        await SpecialThemeAddonService.remove(themeId);
        const downloadedSpecialThemes = get().downloadedSpecialThemes.filter((theme) => theme.id !== themeId && theme.theme.id !== themeId);
        setInstalledSpecialThemes(downloadedSpecialThemes);
        set((state) => ({
          downloadedSpecialThemes,
          activeEnvironment: normalizeEnvironment(state.activeEnvironment),
          draftEnvironment: normalizeEnvironment(state.draftEnvironment),
        }));
      },
    }),
    {
      name: 'chronoflow-theme-v5',
      // Only persist active environment and custom presets
      partialize: (state) => ({
        activeEnvironment: state.activeEnvironment,
        savedPresets: state.savedPresets,
        downloadedSpecialThemes: state.downloadedSpecialThemes,
        specialThemeRegistryUrl: state.specialThemeRegistryUrl,
        performanceMode: state.performanceMode,
      }),
      version: 11,
      merge: (persistedState: any, currentState: ThemeState) => {
        if (!persistedState) return currentState;
        const downloadedSpecialThemes = (Array.isArray(persistedState.downloadedSpecialThemes) ? persistedState.downloadedSpecialThemes : [])
          .map((theme: any) => normalizeSpecialThemePackage(theme, theme?.sourceUrl))
          .filter(Boolean) as DownloadableSpecialTheme[];
        setInstalledSpecialThemes(downloadedSpecialThemes);
        return {
          ...currentState,
          ...persistedState,
          downloadedSpecialThemes,
          specialThemeRegistryUrl: persistedState.specialThemeRegistryUrl || DEFAULT_SPECIAL_THEME_REGISTRY_URL,
          activeEnvironment: normalizeEnvironment(persistedState.activeEnvironment),
          savedPresets: [
            ...INITIAL_PRESETS,
            ...(Array.isArray(persistedState.savedPresets) ? persistedState.savedPresets.filter((preset: SavedPreset) => preset.isCustom).map(normalizePreset) : []),
          ],
        };
      },
      migrate: (persistedState: any, version: number) => {
        if (version < 11) {
          // If we are migrating from an older version, ensure all new style fields exist
          const state = persistedState as ThemeState;
          state.downloadedSpecialThemes = [];
          state.specialThemeRegistryUrl = DEFAULT_SPECIAL_THEME_REGISTRY_URL;
          if (state.activeEnvironment) {
            state.activeEnvironment = normalizeEnvironment(state.activeEnvironment);
          }
          if (state.savedPresets) {
            state.savedPresets = state.savedPresets.map(normalizePreset);
          }
        }
        return persistedState;
      }
    }
  )
);
