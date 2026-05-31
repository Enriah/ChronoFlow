import useAudioStore from '../../store/useAudioStore';
import { AudioManager } from '../../systems/audio/AudioManager';
import type { AudioEventType } from '../../systems/audio/audio.types';

export type SoundType = 'start' | 'end' | 'warning';

/**
 * AudioService acts as a bridge between the legacy SoundType system 
 * and the new granular AudioEventType system.
 */
class AudioServiceClass {
  init() {
    // Hydrate the audio store to load custom sounds and assignments
    useAudioStore.getState().hydrate();
  }

  /**
   * Legacy play method for backward compatibility
   */
  play(type: SoundType) {
    let eventType: AudioEventType;
    
    switch (type) {
      case 'start':
        eventType = 'taskStarted';
        break;
      case 'end':
        eventType = 'taskCompleted';
        break;
      case 'warning':
        eventType = 'taskEndingSoon';
        break;
      default:
        return;
    }

    this.trigger(eventType);
  }

  /**
   * New direct trigger method for granular events
   */
  trigger(eventType: AudioEventType) {
    const state = useAudioStore.getState();
    const { assignments, sounds, globalVolume, eventSettings } = state;
    
    const soundId = assignments[eventType];
    const sound = sounds.find(s => s.id === soundId);
    const settings = eventSettings[eventType];

    if (sound && settings) {
      AudioManager.play(eventType, sound, {
        globalVolume,
        eventVolume: settings.volume,
        enabled: settings.enabled
      });
    }
  }
}

export const AudioService = new AudioServiceClass();
