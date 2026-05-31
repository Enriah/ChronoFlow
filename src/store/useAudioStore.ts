import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AudioEventType, NotificationSound } from '../systems/audio/audio.types';
import { AudioStorage } from '../systems/audio/AudioStorage';
import { AudioManager } from '../systems/audio/AudioManager';

interface AudioState {
  // Configured sound assets (built-in + uploaded)
  sounds: NotificationSound[];
  
  // Mapping of event type -> sound ID
  assignments: Record<AudioEventType, string>;
  
  // Global master volume (0.0 to 1.0)
  globalVolume: number;
  
  // Per-event volume and mute settings
  eventSettings: Record<AudioEventType, { volume: number; enabled: boolean }>;

  // Actions
  hydrate: () => Promise<void>;
  importSoundFile: (file: File) => Promise<NotificationSound>;
  deleteCustomSound: (id: string) => Promise<void>;
  assignSound: (event: AudioEventType, soundId: string) => void;
  updateEventVolume: (event: AudioEventType, vol: number) => void;
  toggleEvent: (event: AudioEventType, enabled: boolean) => void;
  setGlobalVolume: (vol: number) => void;
  previewSound: (soundId: string, eventType?: AudioEventType) => void;
  stopPreview: () => void;
}

const DEFAULT_SOUNDS: NotificationSound[] = [
  { id: 'default_taskStarted', name: 'Ambient Chime (Default)', isDefault: true },
  { id: 'default_taskEndingSoon', name: 'Gentle Reminder (Default)', isDefault: true },
  { id: 'default_taskCompleted', name: 'Relaxing Resolve (Default)', isDefault: true },
  { id: 'default_nextTaskStarting', name: 'Rising Focus (Default)', isDefault: true },
  { id: 'default_plannerReminder', name: 'Planner Alert (Default)', isDefault: true },
  { id: 'default_warningNotification', name: 'Subtle Warning (Default)', isDefault: true },
];

const DEFAULT_ASSIGNMENTS: Record<AudioEventType, string> = {
  taskStarted: 'default_taskStarted',
  taskEndingSoon: 'default_taskEndingSoon',
  taskCompleted: 'default_taskCompleted',
  nextTaskStarting: 'default_nextTaskStarting',
  plannerReminder: 'default_plannerReminder',
  warningNotification: 'default_warningNotification',
};

const DEFAULT_EVENT_SETTINGS: Record<AudioEventType, { volume: number; enabled: boolean }> = {
  taskStarted: { volume: 0.8, enabled: true },
  taskEndingSoon: { volume: 0.6, enabled: true },
  taskCompleted: { volume: 0.8, enabled: true },
  nextTaskStarting: { volume: 0.7, enabled: true },
  plannerReminder: { volume: 0.6, enabled: true },
  warningNotification: { volume: 0.5, enabled: true },
};

export const useAudioStore = create<AudioState>()(
  persist(
    (set, get) => ({
      sounds: DEFAULT_SOUNDS,
      assignments: DEFAULT_ASSIGNMENTS,
      globalVolume: 0.5,
      eventSettings: DEFAULT_EVENT_SETTINGS,

      hydrate: async () => {
        try {
          // Initialize IndexedDB
          await AudioStorage.init();
          
          // Load custom sounds from IndexedDB
          const customSounds = await AudioStorage.getAllSounds();
          
          // Generate active Object URLs for the session
          const mappedCustomSounds: NotificationSound[] = customSounds.map(cs => {
            let url = '';
            if (cs.data && cs.mimeType) {
              const blob = new Blob([cs.data], { type: cs.mimeType });
              url = URL.createObjectURL(blob);
            }
            return {
              ...cs,
              url
            };
          });

          // Combine defaults and custom sounds
          set({
            sounds: [...DEFAULT_SOUNDS, ...mappedCustomSounds]
          });
        } catch (error) {
          console.error('AudioStore hydrate failed:', error);
        }
      },

      importSoundFile: async (file: File): Promise<NotificationSound> => {
        // Validate MIME type
        const supported = ['audio/mp3', 'audio/mpeg', 'audio/wav', 'audio/x-wav', 'audio/ogg', 'audio/x-png'];
        // Double-check extension just in case MIME type is empty or generic
        const extension = file.name.split('.').pop()?.toLowerCase();
        const isSupportedExt = ['mp3', 'wav', 'ogg'].includes(extension || '');
        
        if (!isSupportedExt && !supported.some(mime => file.type.toLowerCase().includes(mime))) {
          throw new Error('Unsupported audio format. Please upload .mp3, .wav, or .ogg.');
        }

        // Validate File Size (limit to 10MB to keep application snappy)
        if (file.size > 10 * 1024 * 1024) {
          throw new Error('Audio file exceeds the 10MB limit.');
        }

        // Read file as ArrayBuffer
        return new Promise<NotificationSound>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = async () => {
            try {
              const buffer = reader.result as ArrayBuffer;
              const soundId = crypto.randomUUID();
              
              const soundData = {
                id: soundId,
                name: file.name.substring(0, file.name.lastIndexOf('.')) || file.name,
                mimeType: file.type || `audio/${extension}`,
                data: buffer
              };

              // Persist in IndexedDB
              await AudioStorage.saveSound(soundData);

              // Generate object URL for this session
              const blob = new Blob([buffer], { type: soundData.mimeType });
              const url = URL.createObjectURL(blob);

              const newSound: NotificationSound = {
                id: soundId,
                name: soundData.name,
                isDefault: false,
                mimeType: soundData.mimeType,
                url
              };

              // Update store sounds list
              set((state) => ({
                sounds: [...state.sounds, newSound]
              }));

              resolve(newSound);
            } catch (error) {
              reject(error);
            }
          };
          
          reader.onerror = () => reject(new Error('Failed to read file.'));
          reader.readAsArrayBuffer(file);
        });
      },

      deleteCustomSound: async (id: string) => {
        const { sounds, assignments } = get();
        const soundToDelete = sounds.find(s => s.id === id);
        
        if (!soundToDelete || soundToDelete.isDefault) return;

        // Revoke object URL to prevent memory leaks
        if (soundToDelete.url) {
          URL.revokeObjectURL(soundToDelete.url);
        }

        // Delete from IndexedDB
        await AudioStorage.deleteSound(id);

        // Update assignments (if an event used this sound, fallback to default)
        const updatedAssignments = { ...assignments };

        Object.keys(updatedAssignments).forEach((key) => {
          const evt = key as AudioEventType;
          if (updatedAssignments[evt] === id) {
            // Assign back to the respective default sound
            updatedAssignments[evt] = `default_${evt}`;
          }
        });

        set((state) => ({
          sounds: state.sounds.filter(s => s.id !== id),
          assignments: updatedAssignments
        }));
      },

      assignSound: (event: AudioEventType, soundId: string) => {
        set((state) => ({
          assignments: {
            ...state.assignments,
            [event]: soundId
          }
        }));
      },

      updateEventVolume: (event: AudioEventType, vol: number) => {
        set((state) => ({
          eventSettings: {
            ...state.eventSettings,
            [event]: {
              ...state.eventSettings[event],
              volume: Math.max(0, Math.min(1, vol))
            }
          }
        }));
      },

      toggleEvent: (event: AudioEventType, enabled: boolean) => {
        set((state) => ({
          eventSettings: {
            ...state.eventSettings,
            [event]: {
              ...state.eventSettings[event],
              enabled
            }
          }
        }));
      },

      setGlobalVolume: (vol: number) => {
        set({
          globalVolume: Math.max(0, Math.min(1, vol))
        });
      },

      previewSound: (soundId: string, eventType?: AudioEventType) => {
        const { sounds, globalVolume, eventSettings } = get();
        const sound = sounds.find(s => s.id === soundId);
        if (!sound) return;

        // Compute volume based on global and specific event settings (if matching event provided)
        const eventVolume = eventType ? eventSettings[eventType].volume : 0.8;
        const volumeMix = globalVolume * eventVolume;

        AudioManager.preview(sound, volumeMix, eventType);
      },

      stopPreview: () => {
        AudioManager.stopPreview();
      }
    }),
    {
      name: 'chronoflow-audio-v1',
      // Only persist volumes, settings, and assignments in LocalStorage
      partialize: (state) => ({
        assignments: state.assignments,
        globalVolume: state.globalVolume,
        eventSettings: state.eventSettings
      }),
      version: 1
    }
  )
);
export default useAudioStore;
