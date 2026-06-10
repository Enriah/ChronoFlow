import { useThemeStore } from '../../store/useThemeStore';
import { useAudioStore } from '../../store/useAudioStore';
import { usePlannerStore } from '../../store/usePlannerStore';
import { useAppStore } from '../../store/useAppStore';
import { LocalStorageService } from './storage';

export interface SystemPreset {
  version: string;
  timestamp: string;
  theme: {
    activeEnvironment: any;
    savedPresets: any[];
  };
  audio: {
    assignments: any;
    globalVolume: number;
    eventSettings: any;
  };
  planner: {
    tasks: any[];
  };
  app: {
    schedules: any[];
  };
}

export const PresetService = {
  exportPreset() {
    const themeState = useThemeStore.getState();
    const audioState = useAudioStore.getState();
    const plannerState = usePlannerStore.getState();
    const appState = useAppStore.getState();

    const preset: SystemPreset = {
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      theme: {
        activeEnvironment: themeState.activeEnvironment,
        savedPresets: themeState.savedPresets,
      },
      audio: {
        assignments: audioState.assignments,
        globalVolume: audioState.globalVolume,
        eventSettings: audioState.eventSettings,
      },
      planner: {
        tasks: plannerState.tasks,
      },
      app: {
        schedules: appState.schedules,
      },
    };

    const blob = new Blob([JSON.stringify(preset, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    console.log('PresetService: Exporting system preset...', preset);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `chronoflow_preset_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    
    // Clean up with delay to ensure download starts
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 1000);
  },

  async importPreset(file: File): Promise<void> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const content = e.target?.result as string;
          const preset = JSON.parse(content) as SystemPreset;

          // Validation
          if (!preset.theme || !preset.audio || !preset.planner || !preset.app) {
            throw new Error('Invalid preset format');
          }

          // Apply Theme
          useThemeStore.setState({
            activeEnvironment: preset.theme.activeEnvironment,
            savedPresets: preset.theme.savedPresets,
          });

          // Apply Audio
          useAudioStore.setState({
            assignments: preset.audio.assignments,
            globalVolume: preset.audio.globalVolume,
            eventSettings: preset.audio.eventSettings,
          });

          // Apply Planner
          usePlannerStore.setState({ tasks: preset.planner.tasks });
          LocalStorageService.savePlannedTasks(preset.planner.tasks);

          // Apply App (Schedules)
          useAppStore.setState({ schedules: preset.app.schedules });
          LocalStorageService.saveSchedules(preset.app.schedules);

          // Re-hydrate app store to ensure everything is synced
          useAppStore.getState().hydrate();
          
          resolve();
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  }
};
