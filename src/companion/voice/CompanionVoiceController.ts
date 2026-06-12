import { useCompanionStore } from '../../store/useCompanionStore';
import { GeminiService } from '../../services/companion/GeminiService';
import { MemoryExtractionService } from '../memory/MemoryExtractionService';
import { ActionIntentService } from '../actions/ActionIntentService';
import { CompanionActionService } from '../actions/CompanionActionService';
import type { CompanionAction } from '../../models/companion/types';
import { SpeechToTextService } from './SpeechToTextService';
import { TextToSpeechService } from './TextToSpeechService';

type GlobalVoiceState = 'idle' | 'listening' | 'transcribing' | 'thinking' | 'speaking' | 'error';
type VoiceStartOptions = {
  source?: 'global_push_to_talk' | 'wake_word' | 'chat_button';
  requireGlobalEnabled?: boolean;
};

const emitPopup = (message: string) => {
  window.dispatchEvent(new CustomEvent('companion-popup', { detail: { message } }));
};

const emitState = (state: GlobalVoiceState, message?: string) => {
  window.dispatchEvent(new CustomEvent('companion-global-voice-state', { detail: { state, message } }));
};

const playFeedbackTone = (kind: 'start' | 'stop') => {
  try {
    const AudioContextCtor = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextCtor) return;

    const context = new AudioContextCtor();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.value = kind === 'start' ? 720 : 420;
    gain.gain.value = 0.05;
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.08);
    oscillator.onended = () => {
      void context.close();
    };
  } catch (error) {
    console.error('CompanionVoiceController: audio feedback failed', error);
  }
};

export class CompanionVoiceController {
  private static isListening = false;
  private static isProcessing = false;
  private static isSpeaking = false;
  private static pendingAction: CompanionAction | null = null;

  static start(options: VoiceStartOptions = {}) {
    const { config } = useCompanionStore.getState();
    if (config.voiceInputEnabled === false) return false;
    if (options.requireGlobalEnabled !== false && config.globalPushToTalkEnabled === false) return false;
    if (this.isListening || this.isProcessing) return false;

    if (this.isSpeaking) {
      if (config.globalPushToTalkInterruptSpeech !== false) {
        TextToSpeechService.stop();
        this.isSpeaking = false;
      } else {
        emitPopup('🔊 Speaking...');
        return false;
      }
    }

    this.isListening = true;
    emitState('listening');
    emitPopup(options.source === 'wake_word' ? "I'm listening." : '🎤 Listening...');
    if (config.globalPushToTalkAudioFeedback !== false && config.globalPushToTalkStartSound !== false) {
      playFeedbackTone('start');
    }

    SpeechToTextService.listen({
      provider: config.speechRecognitionProvider || 'browser_web_speech',
      language: config.voiceLanguage || 'vi-VN',
      timeoutMs: 30000,
    })
      .then((result) => {
        emitState('transcribing', result.transcript);
        return this.processTranscript(result.transcript);
      })
      .catch((error: any) => {
        this.isListening = false;
        this.isProcessing = false;
        const message = error?.message || 'Voice input failed.';
        console.error('CompanionVoiceController: voice input failed', error);
        emitState('error', message);
        emitPopup(message);
      });
    return true;
  }

  static stop() {
    const { config } = useCompanionStore.getState();
    if (!this.isListening) return;

    emitState('transcribing');
    emitPopup('📝 Understanding...');
    if (config.globalPushToTalkAudioFeedback !== false && config.globalPushToTalkStopSound !== false) {
      playFeedbackTone('stop');
    }
    SpeechToTextService.stop();
  }

  static toggle() {
    if (this.isListening) this.stop();
    else this.start();
  }

  static cancel() {
    SpeechToTextService.cancel();
    TextToSpeechService.stop();
    this.isListening = false;
    this.isProcessing = false;
    this.isSpeaking = false;
    this.pendingAction = null;
    emitState('idle');
  }

  private static normalizeText(input: string) {
    return input
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private static isConfirmation(text: string) {
    const normalized = this.normalizeText(text);
    return [
      'yes',
      'confirm',
      'ok',
      'okay',
      'do it',
      'run it',
      'open it',
      'sure',
      'xac nhan',
      'dong y',
      'dung',
      'mo di',
      'lam di',
      'bo qua di',
    ].some((phrase) => normalized === phrase || normalized.includes(phrase));
  }

  private static isCancellation(text: string) {
    const normalized = this.normalizeText(text);
    return [
      'no',
      'cancel',
      'stop',
      'never mind',
      'khong',
      'huy',
      'thoi',
      'dung lai',
    ].some((phrase) => normalized === phrase || normalized.includes(phrase));
  }

  private static getActionPhrase(action: CompanionAction) {
    if (action.internalAction === 'skip_current_session') return 'skip the current session';
    return action.type === 'internal' ? action.label : `open ${action.label}`;
  }

  private static async addAssistantActionMessage(message: string, speak = true) {
    useCompanionStore.getState().addMessage('assistant', message);
    emitPopup(message.length > 140 ? `${message.slice(0, 137)}...` : message);

    const latestConfig = useCompanionStore.getState().config;
    if (speak && latestConfig.voiceOutputEnabled !== false) {
      await TextToSpeechService.speak({
        config: latestConfig,
        text: message,
        onStart: () => {
          this.isSpeaking = true;
          emitState('speaking');
          emitPopup('Speaking...');
        },
        onEnd: () => {
          this.isSpeaking = false;
          emitState('idle');
        },
        onError: (errorMessage) => {
          this.isSpeaking = false;
          emitState('error', errorMessage);
          emitPopup(errorMessage);
        },
        onFallback: (fallbackMessage) => emitPopup(fallbackMessage),
      });
    } else {
      emitState('idle');
    }
  }

  private static async executeAction(action: CompanionAction) {
    try {
      console.info('[CompanionActions] Voice action execution accepted', {
        actionId: action.id,
        label: action.label,
        internalAction: action.internalAction,
      });
      await CompanionActionService.executeAction(action);
      await this.addAssistantActionMessage(`Done. I ${this.getActionPhrase(action)}.`);
    } catch (error: any) {
      console.error('[CompanionActions] Voice action execution failed', {
        actionId: action.id,
        label: action.label,
        error,
      });
      await this.addAssistantActionMessage(`I could not run ${action.label}: ${error?.message || 'unknown error'}.`);
    }
  }

  private static async tryHandleAction(userMessage: string) {
    if (this.pendingAction) {
      if (this.isConfirmation(userMessage)) {
        const action = this.pendingAction;
        this.pendingAction = null;
        await this.executeAction(action);
        return true;
      }

      if (this.isCancellation(userMessage)) {
        console.info('[CompanionActions] Voice action confirmation cancelled', {
          actionId: this.pendingAction.id,
          label: this.pendingAction.label,
        });
        this.pendingAction = null;
        await this.addAssistantActionMessage('Cancelled. I did not run anything.');
        return true;
      }
    }

    const actions = await CompanionActionService.loadActions();
    const actionIntent = ActionIntentService.detect(userMessage, actions);
    if (actionIntent.kind === 'matched') {
      const action = actionIntent.action;
      console.info('[CompanionActions] Voice action intent matched', {
        actionId: action.id,
        label: action.label,
        matchedAlias: actionIntent.matchedAlias,
        requiresConfirmation: action.requiresConfirmation !== false,
      });

      if (action.requiresConfirmation !== false) {
        this.pendingAction = action;
        await this.addAssistantActionMessage(`Do you want me to ${this.getActionPhrase(action)}? Say confirm or cancel.`);
        return true;
      }

      await this.executeAction(action);
      return true;
    }

    if (actionIntent.kind === 'unknown') {
      await this.addAssistantActionMessage(`I do not know that action yet. Add it in Companion Actions first.`);
      return true;
    }

    return false;
  }

  private static async processTranscript(transcript: string) {
    const userMessage = transcript.trim();
    this.isListening = false;
    if (!userMessage || this.isProcessing) return;

    const store = useCompanionStore.getState();
    this.isProcessing = true;
    emitState('thinking');
    emitPopup('🤔 Thinking...');

    store.addMessage('user', userMessage);

    if (await this.tryHandleAction(userMessage)) {
      this.isProcessing = false;
      store.setThinking(false);
      return;
    }

    MemoryExtractionService.queueChatMessage(userMessage).catch((error) => {
      console.error('CompanionVoiceController: memory extraction queue failed', error);
    });

    store.setThinking(true);
    try {
      const response = await GeminiService.chat(userMessage);
      useCompanionStore.getState().addMessage('assistant', response);

      const latestConfig = useCompanionStore.getState().config;
      if (latestConfig.voiceOutputEnabled !== false) {
        await TextToSpeechService.speak({
          config: latestConfig,
          text: response,
          onStart: () => {
            this.isSpeaking = true;
            emitState('speaking');
            emitPopup('🔊 Speaking...');
          },
          onEnd: () => {
            this.isSpeaking = false;
            emitState('idle');
          },
          onError: (message) => {
            this.isSpeaking = false;
            emitState('error', message);
            emitPopup(message);
          },
          onFallback: (message) => {
            emitPopup(message);
          },
        });
      } else {
        emitPopup(response.length > 140 ? `${response.slice(0, 137)}...` : response);
        emitState('idle');
      }
    } catch (error) {
      console.error('CompanionVoiceController: chat failed', error);
      const message = 'Companion could not respond.';
      useCompanionStore.getState().addMessage('assistant', "I'm sorry, I lost my train of thought. Could you say that again?");
      emitState('error', message);
      emitPopup(message);
    } finally {
      useCompanionStore.getState().setThinking(false);
      this.isProcessing = false;
    }
  }
}
