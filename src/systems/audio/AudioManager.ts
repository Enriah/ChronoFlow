import type { AudioEventType, NotificationSound } from './audio.types';
import { SoundSynthesizer } from './SoundSynthesizer';

class AudioManagerClass {
  // Map of eventType -> currently playing Audio element
  private activeAudios: Map<string, HTMLAudioElement> = new Map();
  
  // Rate-limiting tracker to prevent overlapping sound spam (timestamp of last played event)
  private lastPlayedTimestamps: Map<string, number> = new Map();
  
  // Global preview sound instance
  private currentPreviewAudio: HTMLAudioElement | null = null;

  /**
   * Plays a specific sound for an event type, factoring in global and per-event volumes.
   */
  play(
    eventType: AudioEventType,
    sound: NotificationSound,
    options: {
      globalVolume: number;
      eventVolume: number;
      enabled: boolean;
    }
  ) {
    if (!options.enabled) return;

    // Rate-limiting check: Prevent playing the same event type within 500ms to avoid audio spam
    const now = Date.now();
    const lastPlayed = this.lastPlayedTimestamps.get(eventType) || 0;
    if (now - lastPlayed < 500) {
      return;
    }
    this.lastPlayedTimestamps.set(eventType, now);

    const volume = options.globalVolume * options.eventVolume;

    // If it's a default synthesized sound, trigger the synthesizer
    if (sound.isDefault || !sound.url) {
      SoundSynthesizer.playChime(eventType, volume);
      return;
    }

    try {
      // Stop and clean up any existing sound for this specific event type
      this.stopEventAudio(eventType);

      const audio = new Audio(sound.url);
      audio.volume = volume;
      
      // Store in active audios map
      this.activeAudios.set(eventType, audio);

      // Play sound and handle play promises
      audio.play().catch((err) => {
        console.warn(`AudioManager: Failed to play custom sound for event ${eventType}`, err);
        // Fallback to synthesizer if custom play fails
        SoundSynthesizer.playChime(eventType, volume);
      });

      // Cleanup when done playing
      audio.onended = () => {
        this.activeAudios.delete(eventType);
      };
    } catch (error) {
      console.warn(`AudioManager: Error setting up audio for event ${eventType}`, error);
      // Fail-safe default chime fallback
      SoundSynthesizer.playChime(eventType, volume);
    }
  }

  /**
   * Dedicated preview play method that automatically kills previous previews
   */
  preview(sound: NotificationSound, volume: number = 0.5, eventType?: AudioEventType) {
    // 1. Stop any currently playing preview
    this.stopPreview();

    // 2. Play default using synthesizer
    if (sound.isDefault || !sound.url) {
      // Map event type if provided, otherwise default to a lovely task completion or planner chime
      const previewEvent = eventType || 'taskStarted';
      SoundSynthesizer.playChime(previewEvent, volume);
      return;
    }

    try {
      // 3. Play custom sound using HTML5 Audio
      const audio = new Audio(sound.url);
      audio.volume = volume;
      this.currentPreviewAudio = audio;

      audio.play().catch((err) => {
        console.warn('AudioManager: Failed to play preview sound', err);
      });

      audio.onended = () => {
        if (this.currentPreviewAudio === audio) {
          this.currentPreviewAudio = null;
        }
      };
    } catch (error) {
      console.warn('AudioManager: Error previewing custom sound', error);
    }
  }

  /**
   * Stops audio for a specific event type
   */
  stopEventAudio(eventType: string) {
    const existing = this.activeAudios.get(eventType);
    if (existing) {
      try {
        existing.pause();
        existing.currentTime = 0;
      } catch (e) {
        // Silently catch pausing errors
      }
      this.activeAudios.delete(eventType);
    }
  }

  /**
   * Stops any currently playing preview sound
   */
  stopPreview() {
    if (this.currentPreviewAudio) {
      try {
        this.currentPreviewAudio.pause();
        this.currentPreviewAudio.currentTime = 0;
      } catch (e) {
        // Silently catch
      }
      this.currentPreviewAudio = null;
    }
  }

  /**
   * Stops all playing sounds (e.g. on application exit or reset)
   */
  stopAll() {
    this.stopPreview();
    this.activeAudios.forEach((audio) => {
      try {
        audio.pause();
      } catch (e) {}
    });
    this.activeAudios.clear();
  }
}

export const AudioManager = new AudioManagerClass();
