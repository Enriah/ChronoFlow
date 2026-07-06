import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type WidgetType = 'countdown';

interface WidgetState {
  openWidgets: WidgetType[];
  settings: {
    alwaysOnTop: boolean;
    opacity: number;
    blurAmount: number;
  };

  // Actions
  registerWidget: (type: WidgetType) => void;
  unregisterWidget: (type: WidgetType) => void;
  updateSettings: (settings: Partial<WidgetState['settings']>) => void;
}

export const useWidgetStore = create<WidgetState>()(
  persist(
    (set) => ({
      openWidgets: [],
      settings: {
        alwaysOnTop: true,
        opacity: 0.9,
        blurAmount: 10,
      },

      registerWidget: (type) => set((state) => ({
        openWidgets: state.openWidgets.includes(type) 
          ? state.openWidgets 
          : [...state.openWidgets, type]
      })),

      unregisterWidget: (type) => set((state) => ({
        openWidgets: state.openWidgets.filter(w => w !== type)
      })),

      updateSettings: (newSettings) => set((state) => ({
        settings: { ...state.settings, ...newSettings }
      })),
    }),
    {
      name: 'chronoflow-widget-store',
    }
  )
);
