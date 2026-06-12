export type SpeechToTextProvider = 'browser_web_speech' | 'browser_web_speech_en' | 'future_whisper' | 'future_gemini_stt';

export type SpeechToTextResult = {
  transcript: string;
};

export type SpeechToTextOptions = {
  provider: SpeechToTextProvider;
  language: string;
  timeoutMs?: number;
  onPartial?: (transcript: string) => void;
};

type BrowserSpeechRecognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: any) => void) | null;
  onerror: ((event: any) => void) | null;
  onend: (() => void) | null;
};

const SpeechRecognitionCtor = () => (
  (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
);

const normalizeSpeechProvider = (provider: SpeechToTextProvider) => {
  if (provider === 'browser_web_speech' || provider === 'browser_web_speech_en') return provider;
  console.warn('[SpeechToTextService] Unsupported speech recognition provider saved; falling back to Browser Web Speech.', {
    provider,
  });
  return 'browser_web_speech';
};

export class SpeechToTextService {
  private static activeRecognition: BrowserSpeechRecognition | null = null;
  private static activeTimeout: number | null = null;

  static isBrowserSpeechAvailable() {
    return Boolean(SpeechRecognitionCtor());
  }

  static async requestMicrophonePermission() {
    if (!navigator.mediaDevices?.getUserMedia) {
      return { ok: false, message: 'Microphone permissions are not available in this environment.' };
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
      return { ok: true, message: 'Microphone permission is available.' };
    } catch (error: any) {
      return { ok: false, message: error?.name === 'NotAllowedError' ? 'Microphone permission was denied.' : 'Could not access the microphone.' };
    }
  }

  static listen(options: SpeechToTextOptions): Promise<SpeechToTextResult> {
    const provider = normalizeSpeechProvider(options.provider);

    const Recognition = SpeechRecognitionCtor();
    if (!Recognition) {
      return Promise.reject(new Error('Browser speech recognition is not available. Please type your message instead.'));
    }

    this.cancel();

    return new Promise((resolve, reject) => {
      const recognition = new Recognition() as BrowserSpeechRecognition;
      let finalTranscript = '';
      let settled = false;

      const finish = (callback: () => void) => {
        if (settled) return;
        settled = true;
        if (this.activeTimeout) window.clearTimeout(this.activeTimeout);
        this.activeTimeout = null;
        this.activeRecognition = null;
        callback();
      };

      recognition.lang = provider === 'browser_web_speech_en' ? 'en-US' : options.language || 'vi-VN';
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      recognition.onresult = (event: any) => {
        let interim = '';
        for (let index = event.resultIndex; index < event.results.length; index += 1) {
          const transcript = event.results[index][0]?.transcript || '';
          if (event.results[index].isFinal) finalTranscript += transcript;
          else interim += transcript;
        }
        options.onPartial?.((finalTranscript || interim).trim());
      };

      recognition.onerror = (event: any) => {
        const message = event?.error === 'not-allowed'
          ? 'Microphone permission was denied.'
          : event?.error === 'no-speech'
            ? 'No speech was detected.'
            : 'Speech recognition failed.';
        finish(() => reject(new Error(message)));
      };

      recognition.onend = () => {
        finish(() => {
          const transcript = finalTranscript.trim();
          if (transcript) resolve({ transcript });
          else reject(new Error('No speech was detected.'));
        });
      };

      this.activeRecognition = recognition;
      this.activeTimeout = window.setTimeout(() => {
        try {
          recognition.stop();
        } catch {
          finish(() => reject(new Error('Speech recognition timed out.')));
        }
      }, options.timeoutMs || 12000);

      try {
        recognition.start();
      } catch {
        finish(() => reject(new Error('Could not start speech recognition.')));
      }
    });
  }

  static stop() {
    try {
      this.activeRecognition?.stop();
    } catch (error) {
      console.error('SpeechToTextService: stop failed', error);
    }
  }

  static cancel() {
    if (this.activeTimeout) window.clearTimeout(this.activeTimeout);
    this.activeTimeout = null;
    try {
      this.activeRecognition?.abort();
    } catch {
      // Ignore abort races from browser engines.
    }
    this.activeRecognition = null;
  }
}
