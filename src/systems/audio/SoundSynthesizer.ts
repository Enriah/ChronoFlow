import type { AudioEventType } from './audio.types';

export class SoundSynthesizer {
  private static ctx: AudioContext | null = null;

  private static getContext(): AudioContext {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return this.ctx;
  }

  static playChime(type: AudioEventType, volume: number = 0.5) {
    try {
      const ctx = this.getContext();
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const now = ctx.currentTime;
      
      // Master Gain for final mix volume controls
      const masterGain = ctx.createGain();
      // Keep master gain slightly scaled to avoid any possibility of digital clipping
      masterGain.gain.setValueAtTime(volume * 0.25, now);
      masterGain.connect(ctx.destination);

      /**
       * Synthesizes a single high-quality chime note
       */
      const playTone = (freq: number, start: number, duration: number, oscType: OscillatorType = 'sine') => {
        const osc = ctx.createOscillator();
        const oscGain = ctx.createGain();
        
        osc.type = oscType;
        osc.frequency.setValueAtTime(freq, start);
        
        // Attack/Decay envelope for a soft, immersive acoustic instrument sound
        oscGain.gain.setValueAtTime(0, start);
        // Soft linear ramp up to avoid sudden clicks (attack: 30ms)
        oscGain.gain.linearRampToValueAtTime(0.6, start + 0.03);
        // Smooth exponential ramp down to silence (decay/release)
        oscGain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

        osc.connect(oscGain);
        oscGain.connect(masterGain);
        
        osc.start(start);
        osc.stop(start + duration);
      };

      if (type === 'taskStarted') {
        // A gorgeous ascending pentatonic chime cascade (C5 -> E5 -> G5 -> C6)
        playTone(523.25, now, 1.5);        // C5
        playTone(659.25, now + 0.12, 1.5); // E5
        playTone(783.99, now + 0.24, 1.8); // G5
        playTone(1046.50, now + 0.36, 2.2); // C6
      } 
      else if (type === 'taskEndingSoon') {
        // A calm, double-caution tone (A4 -> F4) with soft triangle wave
        playTone(440.00, now, 1.0, 'triangle'); // A4
        playTone(349.23, now + 0.20, 1.2, 'triangle'); // F4
      } 
      else if (type === 'taskCompleted') {
        // A deeply relaxing resolving major 7th chord sweep (C4 -> E4 -> G4 -> B4)
        playTone(261.63, now, 2.0);        // C4
        playTone(329.63, now + 0.10, 2.0); // E4
        playTone(392.00, now + 0.20, 2.0); // G4
        playTone(493.88, now + 0.30, 2.5); // B4 (forming Cmaj7)
      } 
      else if (type === 'nextTaskStarting') {
        // A clear, upward focus chime transition (G4 -> C5 -> E5)
        playTone(392.00, now, 1.2);        // G4
        playTone(523.25, now + 0.15, 1.2); // C5
        playTone(659.25, now + 0.30, 1.8); // E5
      } 
      else if (type === 'plannerReminder') {
        // A warm, friendly double chime (D5 -> A5)
        playTone(587.33, now, 0.8);        // D5
        playTone(880.00, now + 0.10, 1.4); // A5
      } 
      else if (type === 'warningNotification') {
        // A subtle, polite alert warning
        playTone(493.88, now, 0.5, 'sine'); // B4
        playTone(493.88, now + 0.12, 0.8, 'sine'); // B4
      }
    } catch (error) {
      console.warn('SoundSynthesizer failed to synthesize sound:', error);
    }
  }
}
export default SoundSynthesizer;
