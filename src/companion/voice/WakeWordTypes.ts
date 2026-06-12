import type { CompanionConfig } from '../../models/companion/types';

export type WakeWordProviderId = 'smart_vosk' | 'openwakeword_builtin' | 'transcript_match_debug' | 'future_openwakeword_custom' | 'future_porcupine_provider';

export type WakeWordState =
  | 'off'
  | 'requesting_permission'
  | 'wake_listening'
  | 'wake_detected'
  | 'companion_listening'
  | 'transcribing'
  | 'thinking'
  | 'speaking'
  | 'error';

export type WakeWordDetection = {
  transcript: string;
  matchedVariant: string;
};

export type WakeWordProvider = {
  start: (config: CompanionConfig) => Promise<void>;
  stop: () => Promise<void>;
  pause: () => Promise<void>;
  onDetected: (callback: (detection: WakeWordDetection) => void) => void;
  isAvailable: () => boolean;
};

export type WakeWordDebugStatus = {
  state: WakeWordState;
  engine: WakeWordProviderId;
  microphoneLevel: number;
  detectionConfidence: number;
  lastDetectionTime?: string;
  falseTriggerCount: number;
  cpuWarning?: string;
  message?: string;
  lastPartialTranscript?: string;
  lastFinalTranscript?: string;
  matchedVariant?: string;
  triggerReason?: string;
  ignoredReason?: string;
};
