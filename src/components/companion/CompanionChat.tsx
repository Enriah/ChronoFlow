import { useState, useRef, useEffect } from 'react';
import { useCompanionStore } from '../../store/useCompanionStore';
import { GeminiService } from '../../services/companion/GeminiService';
import { MemoryExtractionService } from '../../companion/memory/MemoryExtractionService';
import { SpeechToTextService } from '../../companion/voice/SpeechToTextService';
import { TextToSpeechService } from '../../companion/voice/TextToSpeechService';
import { CompanionVoiceController } from '../../companion/voice/CompanionVoiceController';
import { WakeWordService } from '../../companion/voice/WakeWordService';
import { ActionIntentService } from '../../companion/actions/ActionIntentService';
import { CompanionActionService } from '../../companion/actions/CompanionActionService';
import type { CompanionAction } from '../../models/companion/types';
import { Send, User, Bot, Trash2, X, Mic, MicOff, Square, RotateCcw, Volume2, ExternalLink } from 'lucide-react';
import { clsx } from 'clsx';
import { Button } from '../ui/Button';

type VoiceState = 'idle' | 'listening' | 'transcribing' | 'thinking' | 'speaking' | 'error';

export function CompanionChat({ onClose }: { onClose?: () => void }) {
  const { chatHistory, isThinking, addMessage, clearChat, setThinking, profile, config } = useCompanionStore();
  const [input, setInput] = useState('');
  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const [transcriptPreview, setTranscriptPreview] = useState('');
  const [voiceError, setVoiceError] = useState('');
  const [lastVoiceTranscript, setLastVoiceTranscript] = useState('');
  const [actions, setActions] = useState<CompanionAction[]>([]);
  const [pendingAction, setPendingAction] = useState<CompanionAction | null>(null);
  const [pendingActionFromVoice, setPendingActionFromVoice] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatHistory, isThinking]);

  useEffect(() => () => {
    SpeechToTextService.cancel();
    TextToSpeechService.stop();
    CompanionVoiceController.cancel();
  }, []);

  useEffect(() => {
    const loadActions = () => {
      CompanionActionService.loadActions()
        .then(setActions)
        .catch((error) => console.error('[CompanionActions] Failed to load action registry in chat:', error));
    };

    loadActions();
    window.addEventListener('companion-actions-updated', loadActions);
    return () => window.removeEventListener('companion-actions-updated', loadActions);
  }, []);

  useEffect(() => {
    const handleGlobalVoiceState = (event: Event) => {
      const detail = (event as CustomEvent<{ state?: VoiceState; message?: string }>).detail;
      if (!detail?.state) return;

      setVoiceState(detail.state);
      if (detail.state === 'listening') {
        setVoiceError('');
        setTranscriptPreview('');
      }
      if (detail.state === 'transcribing') {
        setVoiceError('');
        if (detail.message) setTranscriptPreview(detail.message);
      }
      if (detail.state === 'error') {
        setVoiceError(detail.message || 'Voice input failed.');
      }
      if (detail.state === 'idle') {
        setVoiceError('');
      }
    };

    window.addEventListener('companion-global-voice-state', handleGlobalVoiceState);
    return () => window.removeEventListener('companion-global-voice-state', handleGlobalVoiceState);
  }, []);

  const voiceLabels: Record<VoiceState, string> = {
    idle: 'Hold to talk',
    listening: 'Listening...',
    transcribing: 'Understanding...',
    thinking: 'Companion is thinking...',
    speaking: 'Speaking...',
    error: 'Voice error',
  };

  const speakResponse = async (response: string) => {
    if (config.voiceOutputEnabled === false || config.autoSpeakReplies === false) return;

    await TextToSpeechService.speak({
      config,
      text: response,
      onStart: () => setVoiceState('speaking'),
      onEnd: () => setVoiceState('idle'),
      onError: (message) => {
        setVoiceError(message);
        setVoiceState('error');
      },
      onFallback: (message) => {
        setVoiceError(message);
      },
    });
  };

  const companionAddress = profile.userAddressStyle?.trim() || profile.userDisplayName?.trim() || 'bạn';

  const getActionPhrase = (action: CompanionAction) => {
    if (action.internalAction === 'skip_current_session') return 'bỏ qua phiên hiện tại';
    return `mở ${action.label}`;
  };

  const respondWithActionMessage = async (response: string, fromVoice: boolean) => {
    addMessage('assistant', response);
    if (fromVoice) {
      window.dispatchEvent(new CustomEvent('companion-popup', {
        detail: { message: response.length > 140 ? `${response.slice(0, 137)}...` : response },
      }));
      await speakResponse(response);
      if (config.autoSpeakReplies === false) setVoiceState('idle');
    }
  };

  const executeCompanionAction = async (action: CompanionAction, fromVoice: boolean) => {
    try {
      console.info('[CompanionActions] Confirmation accepted', { id: action.id, label: action.label });
      await CompanionActionService.executeAction(action);
      await respondWithActionMessage(`Mình đã ${getActionPhrase(action)} rồi.`, fromVoice);
    } catch (error: any) {
      console.error('[CompanionActions] Execution failed', {
        actionId: action.id,
        label: action.label,
        error,
      });
      await respondWithActionMessage(`Mình chưa thực hiện được ${action.label}: ${error?.message || 'không rõ lỗi'}.`, fromVoice);
    } finally {
      if (fromVoice && config.autoSpeakReplies === false) setVoiceState('idle');
    }
  };

  const confirmPendingAction = async () => {
    if (!pendingAction) return;
    const action = pendingAction;
    const fromVoice = pendingActionFromVoice;
    setPendingAction(null);
    setPendingActionFromVoice(false);
    await executeCompanionAction(action, fromVoice);
  };

  const cancelPendingAction = async () => {
    const action = pendingAction;
    const fromVoice = pendingActionFromVoice;
    console.info('[CompanionActions] Confirmation cancelled', { actionId: action?.id, label: action?.label });
    setPendingAction(null);
    setPendingActionFromVoice(false);
    await respondWithActionMessage('Được, mình không mở gì cả.', fromVoice);
  };

  const sendMessage = async (message: string, fromVoice = false) => {
    if (!message.trim() || isThinking) return;

    const userMessage = message.trim();
    if (!fromVoice) setInput('');
    addMessage('user', userMessage);

    const actionIntent = ActionIntentService.detect(userMessage, actions);
    if (actionIntent.kind === 'matched') {
      const action = actionIntent.action;
      console.info('[CompanionActions] Requested action', {
        actionId: action.id,
        label: action.label,
        matchedAlias: actionIntent.matchedAlias,
        requiresConfirmation: action.requiresConfirmation !== false,
      });

      if (action.requiresConfirmation !== false) {
        setPendingAction(action);
        setPendingActionFromVoice(fromVoice);
        await respondWithActionMessage(`${companionAddress} muốn mình ${getActionPhrase(action)} đúng không?`, fromVoice);
        return;
      }

      await executeCompanionAction(action, fromVoice);
      return;
    }

    if (actionIntent.kind === 'unknown') {
      await respondWithActionMessage(`Mình chưa biết app hoặc mục "${actionIntent.requestedTarget || 'đó'}". ${companionAddress} có thể thêm nó trong Companion Actions.`, fromVoice);
      return;
    }

    MemoryExtractionService.queueChatMessage(userMessage).catch((error) => {
      console.error('Memory extraction queue failed:', error);
    });
    
    setThinking(true);
    if (fromVoice) setVoiceState('thinking');
    try {
      const response = await GeminiService.chat(userMessage);
      addMessage('assistant', response);
      if (fromVoice) {
        window.dispatchEvent(new CustomEvent('companion-popup', {
          detail: { message: response.length > 140 ? `${response.slice(0, 137)}...` : response },
        }));
      }
      await speakResponse(response);
    } catch (error) {
      console.error('Chat error:', error);
      addMessage('assistant', "I'm sorry, I lost my train of thought. Could you say that again?");
      if (fromVoice) {
        setVoiceError('Companion could not respond.');
        setVoiceState('error');
      }
    } finally {
      setThinking(false);
      if (fromVoice && config.autoSpeakReplies === false) setVoiceState('idle');
    }
  };

  const handleSend = async () => {
    await sendMessage(input);
  };

  const startVoiceInput = async () => {
    if (!config.voiceInputEnabled || voiceState === 'listening' || isThinking) return;

    setVoiceError('');
    setTranscriptPreview('');
    setVoiceState('listening');

    try {
      await WakeWordService.pause();
      const result = await SpeechToTextService.listen({
        provider: config.speechRecognitionProvider || 'browser_web_speech',
        language: config.voiceLanguage || 'vi-VN',
        timeoutMs: 12000,
        onPartial: setTranscriptPreview,
      });
      setVoiceState('transcribing');
      setTranscriptPreview(result.transcript);
      setLastVoiceTranscript(result.transcript);
      await sendMessage(result.transcript, true);
    } catch (error: any) {
      setVoiceError(error?.message || 'Voice input failed.');
      setVoiceState('error');
    } finally {
      WakeWordService.resume(useCompanionStore.getState().config).catch((error) => {
        console.error('CompanionChat: failed to resume wake word', error);
      });
    }
  };

  const stopVoiceInput = () => {
    if (voiceState === 'listening') {
      SpeechToTextService.stop();
      setVoiceState('transcribing');
    }
  };

  const cancelVoice = () => {
    CompanionVoiceController.cancel();
    setVoiceState('idle');
    setVoiceError('');
  };

  const retryVoice = () => {
    if (lastVoiceTranscript) void sendMessage(lastVoiceTranscript, true);
    else void startVoiceInput();
  };

  return (
    <div className="flex flex-col h-full bg-bg-secondary/50 backdrop-blur-xl border-l border-white/10 shadow-2xl overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-primary/30">
            <img src={profile.avatar} alt={profile.name} className="w-full h-full object-cover" />
          </div>
          <div>
            <h3 className="font-bold text-text">{profile.name}</h3>
            <p className="text-xs text-text-secondary opacity-70">Push-to-talk ready</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={clearChat} title="Clear Chat">
            <Trash2 className="w-4 h-4 opacity-50 hover:opacity-100" />
          </Button>
          {onClose && (
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
        {chatHistory.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center p-8 opacity-50">
            <Bot className="w-12 h-12 mb-4 text-primary" />
            <p className="text-sm">Hi! I'm {profile.name}, your productivity companion. How can I help you today?</p>
          </div>
        )}
        
        {chatHistory.map((msg) => (
          <div 
            key={msg.id} 
            className={clsx(
              "flex w-full gap-3",
              msg.role === 'user' ? "flex-row-reverse" : "flex-row"
            )}
          >
            <div className={clsx(
              "w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center border border-white/10",
              msg.role === 'user' ? "bg-primary/20" : "bg-bg-secondary"
            )}>
              {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
            </div>
            <div className={clsx(
              "max-w-[80%] p-3 rounded-2xl text-sm leading-relaxed",
              msg.role === 'user' 
                ? "bg-primary text-white rounded-tr-none" 
                : "bg-white/10 text-text rounded-tl-none border border-white/5"
            )}>
              {msg.content}
            </div>
          </div>
        ))}
        
        {isThinking && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-bg-secondary border border-white/10 flex items-center justify-center animate-pulse">
              <Bot className="w-4 h-4" />
            </div>
            <div className="bg-white/10 p-3 rounded-2xl rounded-tl-none border border-white/5 flex gap-1">
              <span className="w-1.5 h-1.5 bg-text/50 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
              <span className="w-1.5 h-1.5 bg-text/50 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
              <span className="w-1.5 h-1.5 bg-text/50 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-white/10 bg-white/5 space-y-3">
        {pendingAction && (
          <div className="rounded-2xl border border-primary/25 bg-primary/10 p-3 space-y-3">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 rounded-lg bg-primary/20 p-2 text-primary">
                <ExternalLink className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-text">
                  {pendingAction.type === 'internal' ? 'Run' : 'Open'} {pendingAction.label}?
                </p>
                <p className="mt-1 break-all text-xs text-text-secondary">
                  {pendingAction.type === 'internal' ? pendingAction.internalAction : pendingAction.type === 'url' ? pendingAction.url : pendingAction.path}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={confirmPendingAction}
                className="flex-1 rounded-xl bg-primary px-3 py-2 text-xs font-bold text-white hover:opacity-90"
              >
                {pendingAction.type === 'internal' ? 'Confirm' : 'Open'}
              </button>
              <button
                onClick={cancelPendingAction}
                className="flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold text-text hover:bg-white/10"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
        {config.voiceInputEnabled !== false && (
          <div className="p-3 rounded-2xl bg-bg-secondary/60 border border-white/10 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <button
                onMouseDown={startVoiceInput}
                onMouseUp={stopVoiceInput}
                onMouseLeave={stopVoiceInput}
                onTouchStart={(event) => {
                  event.preventDefault();
                  void startVoiceInput();
                }}
                onTouchEnd={stopVoiceInput}
                onClick={() => {
                  if (voiceState === 'idle' || voiceState === 'error') void startVoiceInput();
                  else stopVoiceInput();
                }}
                disabled={isThinking || voiceState === 'thinking' || voiceState === 'speaking'}
                className={clsx(
                  "flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all border",
                  voiceState === 'listening' ? "bg-red-500 text-white border-red-500" : "bg-primary text-white border-primary hover:opacity-90",
                  (isThinking || voiceState === 'thinking' || voiceState === 'speaking') && "opacity-50 cursor-not-allowed"
                )}
              >
                {voiceState === 'listening' ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                {voiceLabels[voiceState]}
              </button>
              <div className="flex gap-1">
                {(voiceState === 'listening' || voiceState === 'speaking' || voiceState === 'transcribing') && (
                  <button onClick={cancelVoice} className="p-2 rounded-lg bg-white/5 hover:bg-white/10" title="Cancel voice">
                    <Square className="w-4 h-4" />
                  </button>
                )}
                {voiceState === 'error' && (
                  <button onClick={retryVoice} className="p-2 rounded-lg bg-white/5 hover:bg-white/10" title="Retry voice">
                    <RotateCcw className="w-4 h-4" />
                  </button>
                )}
                {config.voiceOutputEnabled !== false && (
                  <button onClick={() => TextToSpeechService.stop()} className="p-2 rounded-lg bg-white/5 hover:bg-white/10" title="Stop speech">
                    <Volume2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
            {(transcriptPreview || voiceError) && (
              <p className={clsx("text-xs leading-relaxed", voiceError ? "text-red-300" : "text-text-secondary")}>
                {voiceError || `"${transcriptPreview}"`}
              </p>
            )}
          </div>
        )}
        <div className="relative flex items-center">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Talk to me..."
            className="w-full bg-bg-secondary border border-white/10 rounded-full py-3 px-6 pr-14 text-sm focus:outline-none focus:border-primary/50 transition-colors"
          />
          <button 
            onClick={handleSend}
            disabled={!input.trim() || isThinking}
            className="absolute right-2 p-2 rounded-full bg-primary text-white hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
