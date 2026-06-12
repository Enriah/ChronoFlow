import { invoke } from '@tauri-apps/api/core';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';
import type { CompanionConfig } from '../../models/companion/types';
import { SpeechToTextService } from './SpeechToTextService';
import { CompanionVoiceController } from './CompanionVoiceController';
import type { WakeWordDebugStatus, WakeWordDetection, WakeWordProvider } from './WakeWordTypes';

type NativeWakeDetectedPayload = {
  engine: string;
  keyword: string;
  confidence: number;
  detected_at: string;
};

type NativeWakeStatusPayload = {
  state: string;
  engine: string;
  microphone_level: number;
  detection_confidence: number;
  last_detection_time?: string;
  false_trigger_count: number;
  cpu_warning?: string;
  message?: string;
};

type NativeWakeDebugPayload = {
  engine: string;
  last_partial_transcript?: string | null;
  last_final_transcript?: string | null;
  matched_variant?: string | null;
  detection_confidence?: number;
  trigger_reason?: string | null;
  ignored_reason?: string | null;
};

const STATE_MAP: Record<string, WakeWordDebugStatus['state']> = {
  off: 'off',
  initializing: 'requesting_permission',
  listening_for_wake_word: 'wake_listening',
  wake_detected: 'wake_detected',
  paused: 'off',
  error: 'error',
};

export const normalizeWakePhrase = (phrase: string) => phrase
  .toLowerCase()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/[^\p{L}\p{N}\s]/gu, ' ')
  .replace(/\s+/g, ' ')
  .trim();

export const getWakeWordVariants = (config: CompanionConfig) => {
  const variants = [
    config.wakeWordText || 'Alexa',
    config.wakeWordListeningName || '',
    ...(config.wakeWordVariants || []),
    ...(config.wakeWordTrainingSamples || []),
  ]
    .map(normalizeWakePhrase)
    .filter(Boolean);

  return Array.from(new Set(variants));
};

export const detectWakeWordInTranscript = (transcript: string, config: CompanionConfig): WakeWordDetection | null => {
  const normalizedTranscript = normalizeWakePhrase(transcript);
  if (!normalizedTranscript) return null;

  const compactTranscript = normalizedTranscript.replace(/\s+/g, '');
  const sensitivity = config.wakeWordSensitivity ?? 0.75;
  const variants = getWakeWordVariants(config);
  const match = variants.find((variant) => {
    const compactVariant = variant.replace(/\s+/g, '');
    const exactOrWordMatch = normalizedTranscript === variant
      || normalizedTranscript.startsWith(`${variant} `)
      || normalizedTranscript.includes(` ${variant} `)
      || normalizedTranscript.endsWith(` ${variant}`);
    if (sensitivity >= 0.9) return exactOrWordMatch;

    return exactOrWordMatch || compactTranscript.includes(compactVariant);
  });

  return match ? { transcript, matchedVariant: match } : null;
};

const emitWakeState = (status: Partial<WakeWordDebugStatus>) => {
  window.dispatchEvent(new CustomEvent('companion-wake-word-state', { detail: status }));
};

const emitPopup = (message: string) => {
  window.dispatchEvent(new CustomEvent('companion-popup', { detail: { message } }));
};

const keywordSupportedByOpenWakeWord = (keyword?: string) => {
  const normalized = normalizeWakePhrase(keyword || '').replace(/\s+/g, '');
  return normalized === 'alexa' || normalized === 'heymycroft' || normalized === 'mycroft';
};

class SmartVoskNativeProvider implements WakeWordProvider {
  private callback: ((detection: WakeWordDetection) => void) | null = null;
  private unlistenDetected: UnlistenFn | null = null;
  private unlistenStatus: UnlistenFn | null = null;
  private unlistenDebug: UnlistenFn | null = null;

  isAvailable() {
    return true;
  }

  onDetected(callback: (detection: WakeWordDetection) => void) {
    this.callback = callback;
  }

  async start(config: CompanionConfig) {
    if (!config.wakeWordVoskModelPath?.trim()) {
      throw new Error('Smart Wake Vosk needs a local Vosk model folder path before it can listen.');
    }

    await this.stop();
    emitWakeState({
      state: 'requesting_permission',
      engine: 'smart_vosk',
      message: 'Initializing Smart Wake Vosk.',
    });

    this.unlistenDetected = await listen<NativeWakeDetectedPayload>('wake_word_detected', (event) => {
      const payload = event.payload;
      if (payload.engine !== 'smart_vosk') return;
      this.callback?.({
        transcript: payload.keyword,
        matchedVariant: payload.keyword,
      });
    });

    this.unlistenStatus = await listen<NativeWakeStatusPayload>('wake_word_status', (event) => {
      const payload = event.payload;
      if (payload.engine !== 'smart_vosk') return;
      emitWakeState({
        state: STATE_MAP[payload.state] || 'error',
        engine: 'smart_vosk',
        microphoneLevel: payload.microphone_level,
        detectionConfidence: payload.detection_confidence,
        lastDetectionTime: payload.last_detection_time,
        falseTriggerCount: payload.false_trigger_count,
        cpuWarning: payload.cpu_warning,
        message: payload.message,
      });
    });

    this.unlistenDebug = await listen<NativeWakeDebugPayload>('wake_word_debug', (event) => {
      const payload = event.payload;
      if (payload.engine !== 'smart_vosk') return;
      emitWakeState({
        engine: 'smart_vosk',
        lastPartialTranscript: payload.last_partial_transcript || undefined,
        lastFinalTranscript: payload.last_final_transcript || undefined,
        matchedVariant: payload.matched_variant || undefined,
        detectionConfidence: payload.detection_confidence ?? undefined,
        triggerReason: payload.trigger_reason || undefined,
        ignoredReason: payload.ignored_reason || undefined,
      });
    });

    await invoke('wake_word_start', {
      config: {
        engine: 'smart_vosk',
        keyword: config.wakeWordText || config.wakeWordListeningName || 'Airi',
        sensitivity: config.wakeWordSensitivity ?? 0.75,
        variants: getWakeWordVariants(config),
        voskModelPath: config.wakeWordVoskModelPath.trim(),
      },
    });
  }

  async stop() {
    await this.unlistenDetected?.();
    await this.unlistenStatus?.();
    await this.unlistenDebug?.();
    this.unlistenDetected = null;
    this.unlistenStatus = null;
    this.unlistenDebug = null;
    await invoke('wake_word_stop').catch(() => undefined);
  }

  async pause() {
    await invoke('wake_word_pause').catch(() => undefined);
  }
}

class OpenWakeWordNativeProvider implements WakeWordProvider {
  private callback: ((detection: WakeWordDetection) => void) | null = null;
  private unlistenDetected: UnlistenFn | null = null;
  private unlistenStatus: UnlistenFn | null = null;

  isAvailable() {
    return true;
  }

  onDetected(callback: (detection: WakeWordDetection) => void) {
    this.callback = callback;
  }

  async start(config: CompanionConfig) {
    if (!keywordSupportedByOpenWakeWord(config.wakeWordText)) {
      throw new Error('Real OpenWakeWord detection currently supports built-in wake words: Alexa or Hey Mycroft. Custom wake words are saved for future custom ONNX model training.');
    }

    await this.stop();
    emitWakeState({
      state: 'requesting_permission',
      engine: 'openwakeword_builtin',
      message: 'Initializing OpenWakeWord.',
    });

    this.unlistenDetected = await listen<NativeWakeDetectedPayload>('wake_word_detected', (event) => {
      const payload = event.payload;
      if (payload.engine !== 'openwakeword_builtin') return;
      this.callback?.({
        transcript: payload.keyword,
        matchedVariant: payload.keyword,
      });
    });

    this.unlistenStatus = await listen<NativeWakeStatusPayload>('wake_word_status', (event) => {
      const payload = event.payload;
      if (payload.engine !== 'openwakeword_builtin') return;
      emitWakeState({
        state: STATE_MAP[payload.state] || 'error',
        engine: 'openwakeword_builtin',
        microphoneLevel: payload.microphone_level,
        detectionConfidence: payload.detection_confidence,
        lastDetectionTime: payload.last_detection_time,
        falseTriggerCount: payload.false_trigger_count,
        cpuWarning: payload.cpu_warning,
        message: payload.message,
      });
    });

    await invoke('wake_word_start', {
      config: {
        engine: 'openwakeword_builtin',
        keyword: config.wakeWordText || 'Alexa',
        sensitivity: config.wakeWordSensitivity ?? 0.75,
      },
    });
  }

  async stop() {
    await this.unlistenDetected?.();
    await this.unlistenStatus?.();
    this.unlistenDetected = null;
    this.unlistenStatus = null;
    await invoke('wake_word_stop').catch(() => undefined);
  }

  async pause() {
    await invoke('wake_word_pause').catch(() => undefined);
  }
}

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

class TranscriptMatchDebugProvider implements WakeWordProvider {
  private recognition: BrowserSpeechRecognition | null = null;
  private callback: ((detection: WakeWordDetection) => void) | null = null;
  private shouldRestart = false;
  private config: CompanionConfig | null = null;

  isAvailable() {
    return Boolean(SpeechRecognitionCtor());
  }

  onDetected(callback: (detection: WakeWordDetection) => void) {
    this.callback = callback;
  }

  async start(config: CompanionConfig) {
    if (!this.isAvailable()) {
      throw new Error('Experimental transcript wake word mode is unavailable. Use Push-to-Talk or typed chat.');
    }

    await this.stop();
    this.config = config;
    this.shouldRestart = true;
    this.startRecognition();
  }

  async stop() {
    this.shouldRestart = false;
    try {
      this.recognition?.abort();
    } catch {
      // Ignore browser races.
    }
    this.recognition = null;
  }

  async pause() {
    await this.stop();
  }

  private startRecognition() {
    const Recognition = SpeechRecognitionCtor();
    if (!Recognition || !this.config || !this.shouldRestart) return;

    const recognition = new Recognition() as BrowserSpeechRecognition;
    recognition.lang = this.config.voiceLanguage || 'vi-VN';
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: any) => {
      if (!this.config) return;
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const transcript = event.results[index][0]?.transcript || '';
        const detection = detectWakeWordInTranscript(transcript, this.config);
        if (detection) {
          this.shouldRestart = false;
          this.callback?.(detection);
          recognition.stop();
          return;
        }
      }
    };

    recognition.onend = () => {
      if (this.shouldRestart) window.setTimeout(() => this.startRecognition(), 350);
    };

    this.recognition = recognition;
    recognition.start();
  }
}

const createProvider = (config: CompanionConfig): WakeWordProvider => (
  config.wakeWordProvider === 'smart_vosk'
    ? new SmartVoskNativeProvider()
    : config.wakeWordProvider === 'transcript_match_debug'
    ? new TranscriptMatchDebugProvider()
    : new OpenWakeWordNativeProvider()
);

export class WakeWordService {
  private static provider: WakeWordProvider | null = null;
  private static active = false;
  private static paused = false;
  private static currentConfig: CompanionConfig | null = null;
  private static lastWakeTriggerAt = 0;
  private static resumeTimer: number | null = null;
  private static debugStatus: WakeWordDebugStatus = {
    state: 'off',
    engine: 'smart_vosk',
    microphoneLevel: 0,
    detectionConfidence: 0,
    falseTriggerCount: 0,
  };

  static async isAvailable() {
    return invoke<boolean>('wake_word_is_available').catch(() => false);
  }

  static getDebugStatus() {
    return this.debugStatus;
  }

  static async start(config: CompanionConfig) {
    if (config.wakeWordEnabled !== true || config.wakeWordAlwaysOnEnabled !== true) return;
    if (this.active) await this.stop();

    this.provider = createProvider(config);
    this.provider.onDetected((detection) => {
      void this.handleDetected(detection);
    });

    this.currentConfig = config;
    try {
      await this.provider.start(config);
      this.active = true;
      this.paused = false;
      this.updateDebugStatus({
        state: 'wake_listening',
        engine: config.wakeWordProvider || 'smart_vosk',
        message: 'Wake Word Active',
      });
      if (config.wakeWordShowStatus !== false) emitPopup('Wake Word Active');
    } catch (error: any) {
      this.active = false;
      this.paused = false;
      this.updateDebugStatus({
        state: 'error',
        engine: config.wakeWordProvider || 'smart_vosk',
        message: error?.message || 'Real wake word detection is unavailable on this system.',
      });
    }
  }

  static async stop() {
    this.active = false;
    this.paused = false;
    if (this.resumeTimer !== null) {
      window.clearTimeout(this.resumeTimer);
      this.resumeTimer = null;
    }
    await this.provider?.stop();
    this.provider = null;
    this.currentConfig = null;
    this.updateDebugStatus({ state: 'off', message: 'Wake Word Off' });
  }

  static async pause() {
    if (!this.active || this.paused) return;
    this.paused = true;
    await this.provider?.pause();
    this.updateDebugStatus({ state: 'off', message: 'Wake word paused.' });
  }

  static async resume(config: CompanionConfig) {
    if (!this.active || !this.paused || config.wakeWordEnabled !== true || config.wakeWordAlwaysOnEnabled !== true) return;
    const remainingCooldown = Math.max(0, 7000 - (Date.now() - this.lastWakeTriggerAt));
    if (remainingCooldown > 0) {
      if (this.resumeTimer !== null) window.clearTimeout(this.resumeTimer);
      this.resumeTimer = window.setTimeout(() => {
        this.resumeTimer = null;
        this.resume(config).catch((error) => {
          console.error('WakeWordService: failed to resume after cooldown', error);
        });
      }, remainingCooldown);
      this.updateDebugStatus({
        state: 'off',
        message: `Wake word cooldown ${Math.ceil(remainingCooldown / 1000)}s.`,
      });
      return;
    }
    this.paused = false;
    await this.start(config);
  }

  static async test(config: CompanionConfig) {
    if ((config.wakeWordProvider || 'smart_vosk') === 'smart_vosk') {
      if (!config.wakeWordVoskModelPath?.trim()) {
        return {
          transcript: '',
          detected: null,
          message: 'Smart Wake Vosk needs a local Vosk model folder path.',
        };
      }

      return this.runWakeEngineTest(config);
    }

    if ((config.wakeWordProvider || 'smart_vosk') !== 'transcript_match_debug') {
      return {
        transcript: '',
        detected: null,
        message: keywordSupportedByOpenWakeWord(config.wakeWordText)
          ? 'Real OpenWakeWord test is active. Say the selected built-in wake word and watch the status panel.'
          : 'Custom wake word text needs a trained OpenWakeWord ONNX model. Built-ins available now: Alexa, Hey Mycroft.',
      };
    }

    const result = await SpeechToTextService.listen({
      provider: config.speechRecognitionProvider || 'browser_web_speech',
      language: config.voiceLanguage || 'vi-VN',
      timeoutMs: 8000,
    });
    return {
      transcript: result.transcript,
      detected: detectWakeWordInTranscript(result.transcript, config),
      message: undefined,
    };
  }

  private static async runWakeEngineTest(config: CompanionConfig) {
    const previousActive = this.active;
    const previousPaused = this.paused;
    const previousConfig = this.currentConfig;
    await this.stop();

    const provider = createProvider({
      ...config,
      wakeWordEnabled: true,
      wakeWordAlwaysOnEnabled: true,
    });

    return new Promise<{ transcript: string; detected: WakeWordDetection | null; message?: string }>((resolve) => {
      let settled = false;
      const finish = async (result: { transcript: string; detected: WakeWordDetection | null; message?: string }) => {
        if (settled) return;
        settled = true;
        window.clearTimeout(timeout);
        window.removeEventListener('companion-wake-word-state', handleState);
        await provider.stop();
        this.active = previousActive;
        this.paused = previousPaused;
        this.currentConfig = previousConfig;
        if (previousActive && previousConfig?.wakeWordEnabled === true && previousConfig.wakeWordAlwaysOnEnabled === true) {
          await this.start(previousConfig);
        }
        resolve(result);
      };

      const handleState = (event: Event) => {
        const detail = (event as CustomEvent<Partial<WakeWordDebugStatus>>).detail;
        if (detail?.state === 'error') {
          void finish({
            transcript: '',
            detected: null,
            message: detail.message || 'Smart Wake Vosk test failed.',
          });
        }
      };

      const timeout = window.setTimeout(() => {
        void finish({
          transcript: '',
          detected: null,
          message: 'No wake word detected during the test window.',
        });
      }, 12000);

      window.addEventListener('companion-wake-word-state', handleState);
      provider.onDetected((detection) => {
        void finish({
          transcript: detection.transcript,
          detected: detection,
          message: `Detected wake word: ${detection.matchedVariant}`,
        });
      });

      provider.start({
        ...config,
        wakeWordEnabled: true,
        wakeWordAlwaysOnEnabled: true,
      }).catch((error: any) => {
        void finish({
          transcript: '',
          detected: null,
          message: error?.message || 'Smart Wake Vosk test failed.',
        });
      });
    });
  }

  static async recordTrainingSample(config: CompanionConfig) {
    const result = await SpeechToTextService.listen({
      provider: config.speechRecognitionProvider || 'browser_web_speech',
      language: config.voiceLanguage || 'vi-VN',
      timeoutMs: 8000,
    });
    return normalizeWakePhrase(result.transcript);
  }

  private static async handleDetected(detection: WakeWordDetection) {
    if (!this.active) return;

    this.lastWakeTriggerAt = Date.now();
    if (this.resumeTimer !== null) {
      window.clearTimeout(this.resumeTimer);
      this.resumeTimer = null;
    }
    await this.pause();
    this.updateDebugStatus({
      state: 'wake_detected',
      lastDetectionTime: new Date().toISOString(),
      detectionConfidence: this.debugStatus.detectionConfidence,
      message: `Wake word detected: ${detection.matchedVariant}`,
    });

    const started = CompanionVoiceController.start({ source: 'wake_word', requireGlobalEnabled: false });
    this.updateDebugStatus({ state: started ? 'companion_listening' : 'error' });
    if (!started && this.currentConfig?.wakeWordEnabled === true) {
      await this.resume(this.currentConfig);
    }
  }

  private static updateDebugStatus(patch: Partial<WakeWordDebugStatus>) {
    this.debugStatus = {
      ...this.debugStatus,
      ...patch,
      falseTriggerCount: patch.falseTriggerCount ?? this.debugStatus.falseTriggerCount,
      microphoneLevel: patch.microphoneLevel ?? this.debugStatus.microphoneLevel,
      detectionConfidence: patch.detectionConfidence ?? this.debugStatus.detectionConfidence,
    };
    emitWakeState(this.debugStatus);
  }
}
