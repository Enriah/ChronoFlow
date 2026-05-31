import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { 
  ThemeConfig, 
  EnvironmentConfig, 
  BackgroundConfig, 
  VisualEffectConfig, 
  OverlayConfig,
  VisualEffectType,
  WidgetStyle
} from '../themes/theme.types';
import { themes, minimalTheme } from '../themes/configs';

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
  updateDraftBackground: (config: Partial<BackgroundConfig>) => void;
  updateDraftEffect: (effectId: VisualEffectType, config: Partial<VisualEffectConfig>) => void;
  toggleDraftEffect: (effectId: VisualEffectType) => void;
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
}

const DEFAULT_WIDGET_STYLE: WidgetStyle = {
  backgroundType: "glass",
  opacity: 0.15,
  blur: 20,
  borderRadius: 24,
  glowIntensity: 0.5,
  borderStyle: "minimal",
  shadowIntensity: 0.2,
};

const DEFAULT_ENVIRONMENT: EnvironmentConfig = {
  themeId: 'minimal',
  background: {
    type: 'none',
    opacity: 1,
    blur: 0,
    brightness: 1,
  },
  effects: [
    { id: 'rain', enabled: false, intensity: 0.5, speed: 0.5, opacity: 0.5 },
    { id: 'sakura', enabled: false, intensity: 0.5, speed: 0.5, opacity: 0.5 },
    { id: 'snow', enabled: false, intensity: 0.5, speed: 0.5, opacity: 0.5 },
    { id: 'electricity', enabled: false, intensity: 0.5, speed: 0.5, opacity: 0.5 },
    { id: 'stars', enabled: false, intensity: 0.5, speed: 0.5, opacity: 0.5 },
    { id: 'matrix', enabled: false, intensity: 0.5, speed: 0.5, opacity: 0.5 },
    { id: 'fog', enabled: false, intensity: 0.5, speed: 0.5, opacity: 0.5 },
  ],
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

const INITIAL_PRESETS: SavedPreset[] = [
  { ...DEFAULT_ENVIRONMENT, id: 'minimal', name: 'Minimal', themeId: 'minimal' },
  { ...DEFAULT_ENVIRONMENT, id: 'neon', name: 'Neon', themeId: 'neon', effects: DEFAULT_ENVIRONMENT.effects.map(e => e.id === 'electricity' ? { ...e, enabled: true } : e), countdownStyle: { ...DEFAULT_WIDGET_STYLE, borderStyle: 'neon', glowIntensity: 1 } },
  { ...DEFAULT_ENVIRONMENT, id: 'terminal', name: 'Terminal', themeId: 'terminal', overlays: DEFAULT_ENVIRONMENT.overlays.map(o => o.type === 'scanlines' ? { ...o, enabled: true } : o), countdownStyle: { ...DEFAULT_WIDGET_STYLE, borderStyle: 'terminal', borderRadius: 0 } },
  { ...DEFAULT_ENVIRONMENT, id: 'soft', name: 'Soft', themeId: 'soft', effects: DEFAULT_ENVIRONMENT.effects.map(e => e.id === 'sakura' ? { ...e, enabled: true } : e), countdownStyle: { ...DEFAULT_WIDGET_STYLE, borderStyle: 'soft', borderRadius: 40 } },
];

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      activeEnvironment: DEFAULT_ENVIRONMENT,
      draftEnvironment: DEFAULT_ENVIRONMENT,
      currentThemeId: 'minimal',
      savedPresets: INITIAL_PRESETS,
      isEditing: false,
      hasUnsavedChanges: false,
      performanceMode: false,

      setTheme: (id: string) => {
        set({ currentThemeId: id });
        // Also update themeId in draft if editing
        if (get().isEditing) {
          set((state) => ({
            draftEnvironment: { ...state.draftEnvironment, themeId: id },
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
        return themes.find((t) => t.id === themeId) || minimalTheme;
      },

      startEditing: () => set({ 
        isEditing: true, 
        draftEnvironment: JSON.parse(JSON.stringify(get().activeEnvironment)),
        hasUnsavedChanges: false 
      }),

      stopEditing: () => set({ isEditing: false, hasUnsavedChanges: false }),

      updateDraftBackground: (config) => set((state) => ({
        draftEnvironment: {
          ...state.draftEnvironment,
          background: { ...state.draftEnvironment.background, ...config }
        },
        hasUnsavedChanges: true
      })),

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
          activeEnvironment: JSON.parse(JSON.stringify(state.draftEnvironment)),
          hasUnsavedChanges: false
        }));
      },

      resetDraft: () => set((state) => ({
        draftEnvironment: JSON.parse(JSON.stringify(state.activeEnvironment)),
        hasUnsavedChanges: false
      })),

      savePreset: (name: string) => {
        const newPreset: SavedPreset = {
          ...JSON.parse(JSON.stringify(get().draftEnvironment)),
          id: crypto.randomUUID(),
          name,
          isCustom: true
        };
        set((state) => ({
          savedPresets: [...state.savedPresets, newPreset]
        }));
      },

      loadPreset: (presetId: string) => {
        const preset = get().savedPresets.find(p => p.id === presetId);
        if (preset) {
          set({ 
            draftEnvironment: JSON.parse(JSON.stringify(preset)),
            hasUnsavedChanges: true 
          });
        }
      },

      deletePreset: (presetId: string) => {
        set((state) => ({
          savedPresets: state.savedPresets.filter(p => p.id !== presetId || !p.isCustom)
        }));
      },
    }),
    {
      name: 'chronoflow-theme-v5', // Incremented version to v5
      // Only persist active environment and custom presets
      partialize: (state) => ({
        activeEnvironment: state.activeEnvironment,
        savedPresets: state.savedPresets,
        performanceMode: state.performanceMode,
      }),
      version: 5,
      merge: (persistedState: any, currentState: ThemeState) => {
        if (!persistedState) return currentState;
        return {
          ...currentState,
          ...persistedState,
          activeEnvironment: {
            ...currentState.activeEnvironment,
            ...(persistedState.activeEnvironment || {}),
            background: {
              ...currentState.activeEnvironment.background,
              ...(persistedState.activeEnvironment?.background || {}),
            },
            effects: persistedState.activeEnvironment?.effects || currentState.activeEnvironment.effects,
            overlays: persistedState.activeEnvironment?.overlays || currentState.activeEnvironment.overlays,
            countdownStyle: {
              ...currentState.activeEnvironment.countdownStyle,
              ...(persistedState.activeEnvironment?.countdownStyle || {}),
            },
            timelineStyle: {
              ...currentState.activeEnvironment.timelineStyle,
              ...(persistedState.activeEnvironment?.timelineStyle || {}),
            },
            plannerStyle: {
              ...currentState.activeEnvironment.plannerStyle,
              ...(persistedState.activeEnvironment?.plannerStyle || {}),
            },
            statsStyle: {
              ...currentState.activeEnvironment.statsStyle,
              ...(persistedState.activeEnvironment?.statsStyle || {}),
            },
            rankingStyle: {
              ...currentState.activeEnvironment.rankingStyle,
              ...(persistedState.activeEnvironment?.rankingStyle || {}),
            },
          },
          savedPresets: Array.isArray(persistedState.savedPresets)
            ? persistedState.savedPresets
            : currentState.savedPresets,
        };
      },
      migrate: (persistedState: any, version: number) => {
        if (version < 5) {
          // If we are migrating from an older version, ensure all new style fields exist
          const state = persistedState as ThemeState;
          if (state.activeEnvironment) {
            state.activeEnvironment.plannerStyle = state.activeEnvironment.plannerStyle || { ...DEFAULT_WIDGET_STYLE };
            state.activeEnvironment.statsStyle = state.activeEnvironment.statsStyle || { ...DEFAULT_WIDGET_STYLE };
            state.activeEnvironment.rankingStyle = state.activeEnvironment.rankingStyle || { ...DEFAULT_WIDGET_STYLE };
          }
          if (state.savedPresets) {
            state.savedPresets = state.savedPresets.map(p => ({
              ...p,
              plannerStyle: p.plannerStyle || { ...DEFAULT_WIDGET_STYLE },
              statsStyle: p.statsStyle || { ...DEFAULT_WIDGET_STYLE },
              rankingStyle: p.rankingStyle || { ...DEFAULT_WIDGET_STYLE },
            }));
          }
        }
        return persistedState;
      }
    }
  )
);
