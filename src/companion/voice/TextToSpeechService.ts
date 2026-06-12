import type { CompanionConfig } from '../../models/companion/types';
import { ElevenLabsTTSProvider } from './providers/ElevenLabsTTSProvider';

export type TextToSpeechProvider = 'browser_tts' | 'elevenlabs';

export type SpeakOptions = {
  config: CompanionConfig;
  text: string;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (message: string) => void;
  onFallback?: (message: string) => void;
};

export class TextToSpeechService {
  private static activeAudio: HTMLAudioElement | null = null;
  private static activeObjectUrl: string | null = null;

  static getBrowserVoices() {
    if (!('speechSynthesis' in window)) return [];
    return window.speechSynthesis.getVoices();
  }

  static isBrowserTtsAvailable() {
    return 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
  }

  static stop() {
    try {
      window.speechSynthesis?.cancel();
    } catch {
      // Browser TTS may be unavailable.
    }

    if (this.activeAudio) {
      this.activeAudio.pause();
      this.activeAudio.src = '';
      this.activeAudio = null;
    }

    if (this.activeObjectUrl) {
      URL.revokeObjectURL(this.activeObjectUrl);
      this.activeObjectUrl = null;
    }
  }

  static async speak(options: SpeakOptions) {
    const text = options.text.trim();
    if (!text || options.config.voiceOutputEnabled === false) return;

    this.stop();
    const selectedProvider = options.config.ttsProvider || 'browser_tts';
    console.info('[TextToSpeechService] Selected TTS provider', {
      provider: selectedProvider,
      voiceOutputEnabled: options.config.voiceOutputEnabled,
      elevenLabsApiKeyExists: Boolean(options.config.elevenLabsApiKey?.trim()),
      elevenLabsVoiceIdExists: Boolean(options.config.elevenLabsVoiceId?.trim()),
      browserVoiceURI: options.config.browserVoiceURI || 'system-default',
    });

    if (selectedProvider === 'elevenlabs') {
      try {
        await this.speakWithElevenLabs(options);
        return;
      } catch (error: any) {
        console.error('[TextToSpeechService] ElevenLabs failed before Browser TTS fallback', error);
        if (error?.noBrowserFallback) {
          options.onError?.(error?.message || 'ElevenLabs speech failed.');
          return;
        }
        if (!this.isBrowserTtsAvailable()) {
          options.onError?.(error?.message || 'ElevenLabs speech failed.');
          return;
        }
        options.onFallback?.(
          error?.message
            ? `ElevenLabs failed, using Browser TTS fallback: ${error.message}`
            : 'ElevenLabs failed, using Browser TTS fallback.'
        );
      }
    }

    console.info('[TextToSpeechService] Playing Browser TTS', {
      selectedProvider,
      fallbackFromElevenLabs: selectedProvider === 'elevenlabs',
    });
    await this.speakWithBrowser(options);
  }

  static async speakWithBrowser(options: SpeakOptions) {
    if (!this.isBrowserTtsAvailable()) {
      options.onError?.('Browser text-to-speech is not available.');
      return;
    }

    return new Promise<void>((resolve) => {
      const utterance = new SpeechSynthesisUtterance(options.text);
      const voices = this.getBrowserVoices();
      const selectedVoice = voices.find(voice => voice.voiceURI === options.config.browserVoiceURI);
      if (selectedVoice) utterance.voice = selectedVoice;
      utterance.lang = options.config.voiceLanguage || selectedVoice?.lang || 'vi-VN';
      utterance.volume = Math.max(0, Math.min(1, options.config.voiceVolume ?? 0.9));
      utterance.rate = Math.max(0.5, Math.min(1.5, options.config.voiceRate ?? 1));
      utterance.onstart = () => options.onStart?.();
      utterance.onerror = () => {
        options.onError?.('Browser speech playback failed.');
        resolve();
      };
      utterance.onend = () => {
        options.onEnd?.();
        resolve();
      };
      window.speechSynthesis.speak(utterance);
    });
  }

  static async speakWithElevenLabs(options: SpeakOptions) {
    console.info('[TextToSpeechService] Playing ElevenLabs TTS', {
      endpoint: `https://api.elevenlabs.io/v1/text-to-speech/${options.config.elevenLabsVoiceId ? '[voice_id]' : '[missing_voice_id]'}`,
      apiKeyExists: Boolean(options.config.elevenLabsApiKey?.trim()),
      voiceIdExists: Boolean(options.config.elevenLabsVoiceId?.trim()),
      modelId: options.config.elevenLabsModelId || 'eleven_multilingual_v2',
    });
    const blob = await ElevenLabsTTSProvider.synthesize({
      apiKey: options.config.elevenLabsApiKey || '',
      voiceId: options.config.elevenLabsVoiceId || '',
      modelId: options.config.elevenLabsModelId,
      text: options.text,
    });

    return new Promise<void>((resolve, reject) => {
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      this.activeObjectUrl = url;
      this.activeAudio = audio;
      audio.volume = Math.max(0, Math.min(1, options.config.voiceVolume ?? 0.9));
      audio.onplay = () => options.onStart?.();
      audio.onerror = () => {
        this.stop();
        reject(new Error('Audio playback failed.'));
      };
      audio.onended = () => {
        this.stop();
        options.onEnd?.();
        resolve();
      };
      audio.play().catch((error) => {
        this.stop();
        reject(error);
      });
    });
  }

  static async preview(config: CompanionConfig, callbacks?: Pick<SpeakOptions, 'onError' | 'onFallback'>) {
    await this.speak({
      config: { ...config, voiceOutputEnabled: true },
      text: config.voiceLanguage === 'en-US' ? 'Hello. I am here with you.' : 'Xin chao. Minh dang o day voi ban.',
      onError: callbacks?.onError,
      onFallback: callbacks?.onFallback,
    });
  }
}
