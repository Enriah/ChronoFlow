import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { useCompanionStore } from '../../store/useCompanionStore';
import { SectionHeader } from '../ui/SectionHeader';
import { BookOpen, Bot, CalendarDays, Check, Database, Download, ExternalLink, FolderOpen, Upload, RotateCcw, X } from 'lucide-react';
import { appConfigDir, join as joinPath } from '@tauri-apps/api/path';
import { clsx } from 'clsx';
import { PERSONALITIES, type CompanionPersonality } from '../../companion/personality/Personalities';
import { BUILT_IN_COMPANION_AVATARS } from '../../companion/avatar/Avatars';
import { MemoryService } from '../../companion/memory/MemoryService';
import { JournalService } from '../../companion/journal/JournalService';
import { SpeechToTextService } from '../../companion/voice/SpeechToTextService';
import { TextToSpeechService } from '../../companion/voice/TextToSpeechService';
import { ElevenLabsTTSProvider, type ElevenLabsVoice } from '../../companion/voice/providers/ElevenLabsTTSProvider';
import { CompanionMemoryViewer } from './CompanionMemoryViewer';
import { CompanionJournalViewer } from './CompanionJournalViewer';
import { CompanionRelationshipTimeline } from './CompanionRelationshipTimeline';
import { CompanionActionsSettings } from './CompanionActionsSettings';
import { WakeWordSettings } from './WakeWordSettings';
import { RelationshipService } from '../../companion/relationship/RelationshipService';
import type { CompanionConfig, CompanionProfile } from '../../models/companion/types';
import { ToggleSwitch } from '../ui/ToggleSwitch';

export function CompanionSettings() {
  const {
    profile,
    config,
    setProfile,
    setConfig,
    memories,
    journal,
    weeklySummaries,
    monthlySummaries,
    relationship,
    milestones,
    pendingMemories,
    clearMemories,
    approvePendingMemory,
    rejectPendingMemory,
    clearExtractedMemories,
    importMemoryBackup,
    importJournalBackup,
  } = useCompanionStore();
  const [isSaved, setIsSaved] = useState(false);
  const [hasCompanionChanges, setHasCompanionChanges] = useState(false);
  const [draftProfile, setDraftProfile] = useState<CompanionProfile>(profile);
  const [draftConfig, setDraftConfig] = useState<CompanionConfig>(config);
  const [avatarPreviewFailed, setAvatarPreviewFailed] = useState(false);
  const [isMemoryViewerOpen, setIsMemoryViewerOpen] = useState(false);
  const [isJournalViewerOpen, setIsJournalViewerOpen] = useState(false);
  const [isRelationshipTimelineOpen, setIsRelationshipTimelineOpen] = useState(false);
  const [memoryStatus, setMemoryStatus] = useState<string | null>(null);
  const [journalStatus, setJournalStatus] = useState<string | null>(null);
  const [voiceStatus, setVoiceStatus] = useState<string | null>(null);
  const [browserVoices, setBrowserVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [elevenLabsVoices, setElevenLabsVoices] = useState<ElevenLabsVoice[]>([]);
  const [isLoadingElevenLabsVoices, setIsLoadingElevenLabsVoices] = useState(false);
  const [elevenLabsVoiceListError, setElevenLabsVoiceListError] = useState<string | null>(null);
  const [isCapturingHotkey, setIsCapturingHotkey] = useState(false);
  const lastElevenLabsVoiceFetchKeyRef = useRef('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);
  const journalImportInputRef = useRef<HTMLInputElement>(null);
  const storageSizeBytes = MemoryService.getStorageSizeBytes(profile, memories, journal);

  useEffect(() => {
    if (hasCompanionChanges) return;
    setDraftProfile(profile);
    setDraftConfig(config);
  }, [config, hasCompanionChanges, profile]);

  useEffect(() => {
    const loadVoices = () => setBrowserVoices(TextToSpeechService.getBrowserVoices());
    loadVoices();
    window.speechSynthesis?.addEventListener?.('voiceschanged', loadVoices);
    return () => window.speechSynthesis?.removeEventListener?.('voiceschanged', loadVoices);
  }, []);

  const updateDraftProfile = (patch: Partial<CompanionProfile>) => {
    setDraftProfile((current) => ({ ...current, ...patch }));
    setHasCompanionChanges(true);
    setIsSaved(false);
  };

  const updateDraftConfig = (patch: Partial<CompanionConfig>) => {
    setDraftConfig((current) => ({ ...current, ...patch }));
    setHasCompanionChanges(true);
    setIsSaved(false);
  };

  const normalizeShortcutKey = (key: string) => {
    const keyMap: Record<string, string> = {
      ' ': 'Space',
      Spacebar: 'Space',
      Escape: 'Esc',
      Esc: 'Esc',
      Control: '',
      Shift: '',
      Alt: '',
      Meta: '',
      ArrowUp: 'ArrowUp',
      ArrowDown: 'ArrowDown',
      ArrowLeft: 'ArrowLeft',
      ArrowRight: 'ArrowRight',
    };

    if (keyMap[key] !== undefined) return keyMap[key];
    if (/^F\d{1,2}$/.test(key)) return key;
    if (key.length === 1) return key.toUpperCase();
    return key;
  };

  const formatShortcutFromKeyboardEvent = (event: KeyboardEvent<HTMLInputElement>) => {
    const key = normalizeShortcutKey(event.key);
    if (!key) return '';

    const parts: string[] = [];
    if (event.ctrlKey || event.metaKey) parts.push('CommandOrControl');
    if (event.altKey) parts.push('Alt');
    if (event.shiftKey) parts.push('Shift');
    if (!parts.includes(key)) parts.push(key);

    return parts.join('+');
  };

  const handleHotkeyCapture = (event: KeyboardEvent<HTMLInputElement>) => {
    event.preventDefault();
    event.stopPropagation();

    if (event.key === 'Escape') {
      setIsCapturingHotkey(false);
      setTransientVoiceStatus('Hotkey capture cancelled.');
      return;
    }

    if (event.key === 'Backspace' || event.key === 'Delete') {
      updateDraftConfig({ globalPushToTalkHotkey: 'Alt+Space' });
      setIsCapturingHotkey(false);
      setTransientVoiceStatus('Hotkey reset to Alt+Space.');
      return;
    }

    const shortcut = formatShortcutFromKeyboardEvent(event);
    if (!shortcut) {
      setTransientVoiceStatus('Press one more key to finish the shortcut.');
      return;
    }

    updateDraftConfig({ globalPushToTalkHotkey: shortcut });
    setIsCapturingHotkey(false);
    setTransientVoiceStatus(`Hotkey set to ${shortcut}. Save to apply it.`);
  };

  const handleSaveCompanionSettings = () => {
    const speechRecognitionProvider: CompanionConfig['speechRecognitionProvider'] =
      draftConfig.speechRecognitionProvider === 'browser_web_speech_en'
        ? 'browser_web_speech_en'
        : 'browser_web_speech';
    const wakeWordProvider: CompanionConfig['wakeWordProvider'] =
      draftConfig.wakeWordProvider === 'transcript_match_debug'
        ? 'transcript_match_debug'
        : draftConfig.wakeWordProvider === 'openwakeword_builtin'
          ? 'openwakeword_builtin'
          : 'smart_vosk';
    const configToSave = {
      ...draftConfig,
      speechRecognitionProvider,
      globalPushToTalkHotkey: draftConfig.globalPushToTalkHotkey?.trim() || 'Alt+Space',
      globalPushToTalkMode: draftConfig.globalPushToTalkMode || 'hold',
      wakeWordText: draftConfig.wakeWordText?.trim() || 'Airi',
      wakeWordListeningName: draftConfig.wakeWordListeningName?.trim() || draftProfile.name,
      wakeWordProvider,
      wakeWordVoskModelPath: draftConfig.wakeWordVoskModelPath?.trim() || '',
      wakeWordVariants: Array.from(new Set((draftConfig.wakeWordVariants || []).map((item) => item.trim()).filter(Boolean))),
      wakeWordTrainingSamples: Array.from(new Set((draftConfig.wakeWordTrainingSamples || []).map((item) => item.trim()).filter(Boolean))),
    };
    console.info('[CompanionSettings] Saving Companion settings', {
      ttsProvider: configToSave.ttsProvider || 'browser_tts',
      speechRecognitionProvider: configToSave.speechRecognitionProvider,
      elevenLabsApiKeyExists: Boolean(configToSave.elevenLabsApiKey?.trim()),
      elevenLabsVoiceIdExists: Boolean(configToSave.elevenLabsVoiceId?.trim()),
      voiceOutputEnabled: configToSave.voiceOutputEnabled === true,
      autoSpeakReplies: configToSave.autoSpeakReplies === true,
    });
    setProfile(draftProfile);
    setConfig(configToSave);
    setDraftConfig(configToSave);
    setHasCompanionChanges(false);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const handleUnchangeCompanionSettings = () => {
    setDraftProfile(profile);
    setDraftConfig(config);
    setAvatarPreviewFailed(false);
    setHasCompanionChanges(false);
    setIsSaved(false);
    setTransientVoiceStatus('Unsaved Companion changes discarded.');
  };

  const handleAvatarUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setAvatarPreviewFailed(false);
        updateDraftProfile({ avatar: reader.result });
      }
    };
    reader.onerror = () => console.error('CompanionSettings: failed to read avatar file');
    reader.readAsDataURL(file);
  };

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    return `${(bytes / 1024).toFixed(1)} KB`;
  };

  const setTransientMemoryStatus = (status: string) => {
    setMemoryStatus(status);
    setTimeout(() => setMemoryStatus(null), 2500);
  };

  const setTransientJournalStatus = (status: string) => {
    setJournalStatus(status);
    setTimeout(() => setJournalStatus(null), 3000);
  };

  const setTransientVoiceStatus = (status: string) => {
    setVoiceStatus(status);
    setTimeout(() => setVoiceStatus(null), 3000);
  };

  const formatElevenLabsVoice = (voice: ElevenLabsVoice) => {
    const labels = voice.labels
      ? Object.entries(voice.labels)
          .filter(([, value]) => Boolean(value))
          .map(([key, value]) => `${key}: ${value}`)
          .join(', ')
      : '';
    return [voice.name, voice.category, labels].filter(Boolean).join(' - ');
  };

  const handleExportMemory = () => {
    try {
      const backup = MemoryService.createBackup(profile, memories, journal);
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'mymemory.json';
      link.click();
      URL.revokeObjectURL(url);
      setTransientMemoryStatus('Memory exported.');
    } catch (error) {
      console.error('CompanionSettings: failed to export memory', error);
      setTransientMemoryStatus('Export failed.');
    }
  };

  const handleImportMemory = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const backup = MemoryService.normalizeBackup(JSON.parse(String(reader.result)));
        if (!backup) {
          setTransientMemoryStatus('Invalid memory file.');
          return;
        }

        await importMemoryBackup(backup);
        setTransientMemoryStatus('Memory imported.');
      } catch (error) {
        console.error('CompanionSettings: failed to import memory', error);
        setTransientMemoryStatus('Import failed.');
      } finally {
        event.target.value = '';
      }
    };
    reader.onerror = () => setTransientMemoryStatus('Import failed.');
    reader.readAsText(file);
  };

  const handleExportJournal = () => {
    try {
      const backup = JournalService.createBackup(journal, weeklySummaries, monthlySummaries);
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'myjournal.json';
      link.click();
      URL.revokeObjectURL(url);
      setTransientJournalStatus('Journal exported.');
    } catch (error) {
      console.error('CompanionSettings: failed to export journal', error);
      setTransientJournalStatus('Export failed.');
    }
  };

  const handleImportJournal = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const backup = JournalService.normalizeBackup(JSON.parse(String(reader.result)));
        if (!backup) {
          setTransientJournalStatus('Invalid journal file.');
          return;
        }

        await importJournalBackup(backup);
        setTransientJournalStatus('Journal imported.');
      } catch (error) {
        console.error('CompanionSettings: failed to import journal', error);
        setTransientJournalStatus('Import failed.');
      } finally {
        event.target.value = '';
      }
    };
    reader.onerror = () => setTransientJournalStatus('Import failed.');
    reader.readAsText(file);
  };

  const handleOpenJournalFolder = async () => {
    try {
      const path = await joinPath(await appConfigDir(), 'companion');
      window.open(`file://${path}`);
      setTransientJournalStatus(`Journal folder: ${path}`);
    } catch (error) {
      console.error('CompanionSettings: failed to open journal folder', error);
      setTransientJournalStatus('Could not open journal folder.');
    }
  };

  const handleMicPermissionTest = async () => {
    const result = await SpeechToTextService.requestMicrophonePermission();
    setTransientVoiceStatus(result.message);
  };

  const handleRefreshElevenLabsVoices = async () => {
    const apiKey = draftConfig.elevenLabsApiKey?.trim() || '';
    if (!apiKey) {
      setElevenLabsVoiceListError('Enter an ElevenLabs API key first.');
      setTransientVoiceStatus('Enter an ElevenLabs API key first.');
      return;
    }

    setIsLoadingElevenLabsVoices(true);
    setElevenLabsVoiceListError(null);
    try {
      const voices = await ElevenLabsTTSProvider.listVoices(apiKey);
      setElevenLabsVoices(voices);
      if (voices.length === 0) {
        setElevenLabsVoiceListError('No ElevenLabs voices were returned for this account.');
        setTransientVoiceStatus('No ElevenLabs voices found.');
        return;
      }

      if (!voices.some((voice) => voice.voiceId === draftConfig.elevenLabsVoiceId)) {
        updateDraftConfig({ elevenLabsVoiceId: voices[0].voiceId });
      }
      setTransientVoiceStatus(`Loaded ${voices.length} ElevenLabs voices.`);
    } catch (error: any) {
      console.error('CompanionSettings: failed to load ElevenLabs voices', error);
      const message = error?.message || 'Could not load ElevenLabs voices.';
      setElevenLabsVoiceListError(`${message} Browser TTS fallback is still available.`);
      setTransientVoiceStatus('Could not load ElevenLabs voices.');
    } finally {
      setIsLoadingElevenLabsVoices(false);
    }
  };

  useEffect(() => {
    const apiKey = draftConfig.elevenLabsApiKey?.trim() || '';
    if ((draftConfig.ttsProvider || 'browser_tts') !== 'elevenlabs' || !apiKey) return;
    if (lastElevenLabsVoiceFetchKeyRef.current === apiKey) return;

    lastElevenLabsVoiceFetchKeyRef.current = apiKey;
    const timeout = window.setTimeout(() => {
      void handleRefreshElevenLabsVoices();
    }, 600);

    return () => window.clearTimeout(timeout);
  }, [draftConfig.elevenLabsApiKey, draftConfig.ttsProvider]);

  const handleTestVoice = async () => {
    try {
      let fallbackMessage = '';
      let errorMessage = '';
      await TextToSpeechService.preview(draftConfig, {
        onError: (message) => {
          errorMessage = message;
          setTransientVoiceStatus(message);
        },
        onFallback: (message) => {
          fallbackMessage = message;
          setTransientVoiceStatus(message);
        },
      });
      if (!fallbackMessage && !errorMessage) setTransientVoiceStatus('Voice test started.');
    } catch (error: any) {
      console.error('CompanionSettings: voice test failed', error);
      setTransientVoiceStatus(error?.message || 'Voice test failed.');
    }
  };

  return (
    <div className="companion-settings-root space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {isMemoryViewerOpen && (
        <CompanionMemoryViewer onClose={() => setIsMemoryViewerOpen(false)} />
      )}
      {isJournalViewerOpen && (
        <CompanionJournalViewer onClose={() => setIsJournalViewerOpen(false)} />
      )}
      {isRelationshipTimelineOpen && (
        <CompanionRelationshipTimeline onClose={() => setIsRelationshipTimelineOpen(false)} />
      )}

      <section className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <p className="text-base font-black text-text">AI Companion Settings</p>
          <p className="text-xs text-text-secondary">
            Changes stay as a draft here. Use Save Changes at the bottom to apply the whole Companion configuration.
          </p>
        </div>
        <div className={clsx(
          "rounded-xl border px-4 py-2 text-xs font-bold",
          hasCompanionChanges
            ? "border-amber-500/30 bg-amber-500/10 text-amber-300"
            : isSaved
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
              : "border-border bg-surface/50 text-text-secondary"
        )}>
          {hasCompanionChanges ? 'Unsaved draft' : isSaved ? 'Saved' : 'No pending changes'}
        </div>
      </section>

      <section className="space-y-4">
        <SectionHeader title="LLM Configuration" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-text-secondary">Gemini API Key</label>
            <div className="flex gap-2">
              <input
                type="password"
                value={draftConfig.apiKey}
                onChange={(e) => updateDraftConfig({ apiKey: e.target.value })}
                placeholder="Enter your API key..."
                className="flex-1 bg-bg-secondary border border-white/10 rounded-lg p-2 text-sm focus:outline-none focus:border-primary/50"
              />
            </div>
            <a 
              href="https://aistudio.google.com/app/apikey" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-xs text-primary flex items-center gap-1 hover:underline"
            >
              Get a free API key <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <SectionHeader title="Personality & Identity" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-text-secondary">Companion Name</label>
            <input
              type="text"
              value={draftProfile.name}
              onChange={(e) => updateDraftProfile({ name: e.target.value })}
              className="w-full bg-bg-secondary border border-white/10 rounded-lg p-2 text-sm focus:outline-none focus:border-primary/50"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-text-secondary">Personality</label>
            <select
              value={draftProfile.personality}
              onChange={(e) => updateDraftProfile({ personality: e.target.value as CompanionPersonality })}
              className="w-full bg-bg-secondary border border-white/10 rounded-lg p-2 text-sm focus:outline-none focus:border-primary/50"
            >
              {Object.values(PERSONALITIES).map((personality) => (
                <option key={personality.id} value={personality.id}>{personality.label}</option>
              ))}
            </select>
          </div>
          {draftProfile.personality === 'custom' && (
            <div className="md:col-span-2 space-y-2">
              <label className="text-sm font-medium text-text-secondary">Custom Tone Instruction</label>
              <textarea
                value={draftProfile.customPrompt}
                onChange={(e) => updateDraftProfile({ customPrompt: e.target.value })}
                placeholder="Speak like a gentle anime study partner, but keep messages short."
                className="w-full h-24 bg-bg-secondary border border-white/10 rounded-lg p-2 text-sm focus:outline-none focus:border-primary/50"
              />
            </div>
          )}
          <div className="space-y-2">
            <label className="text-sm font-medium text-text-secondary">Response Style</label>
            <div className="flex gap-2">
              {(['short', 'balanced', 'detailed'] as const).map((style) => (
                <button
                  key={style}
                  onClick={() => updateDraftProfile({ responseStyle: style })}
                  className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-all ${
                    draftProfile.responseStyle === style 
                      ? 'bg-primary text-white shadow-lg' 
                      : 'bg-white/5 text-text-secondary hover:bg-white/10'
                  }`}
                >
                  {style.charAt(0).toUpperCase() + style.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <SectionHeader title="Avatar" />
        <div className="grid grid-cols-1 md:grid-cols-[auto_1fr] gap-6 items-start">
          <div className="w-20 h-20 rounded-2xl overflow-hidden border border-white/10 bg-primary/10 flex items-center justify-center">
            {avatarPreviewFailed ? (
              <Bot className="w-8 h-8 text-primary" />
            ) : (
              <img
                src={draftProfile.avatar}
                alt={draftProfile.name}
                className="w-full h-full object-cover"
                onError={() => setAvatarPreviewFailed(true)}
              />
            )}
          </div>
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {BUILT_IN_COMPANION_AVATARS.map((avatar) => (
                <button
                  key={avatar.id}
                  onClick={() => {
                    setAvatarPreviewFailed(false);
                    updateDraftProfile({ avatar: avatar.value });
                  }}
                  className={clsx(
                    "px-4 py-2 rounded-lg text-xs font-bold border transition-all",
                    draftProfile.avatar === avatar.value ? "bg-primary text-white border-primary" : "bg-white/5 text-text-secondary border-white/10 hover:bg-white/10"
                  )}
                >
                  {avatar.label}
                </button>
              ))}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarUpload}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white text-xs font-bold hover:opacity-90 transition-opacity"
            >
              <Upload className="w-4 h-4" />
              Upload Image
            </button>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <SectionHeader title="Popup Appearance" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <ToggleSwitch
            checked={draftConfig.popupEnabled}
            onChange={() => updateDraftConfig({ popupEnabled: !draftConfig.popupEnabled })}
            label="Popup"
            description="Show short Companion messages in the app window."
          />
          <div className="space-y-2">
            <label className="text-sm font-medium text-text-secondary">Position</label>
            <select
              value={draftConfig.popupPosition}
              onChange={(e) => updateDraftConfig({ popupPosition: e.target.value as any })}
              className="w-full bg-bg-secondary border border-white/10 rounded-lg p-2 text-sm focus:outline-none focus:border-primary/50"
            >
              <option value="top-right">Top Right</option>
              <option value="top-left">Top Left</option>
              <option value="bottom-right">Bottom Right</option>
              <option value="bottom-left">Bottom Left</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-text-secondary">Size</label>
            <select
              value={draftConfig.popupSize}
              onChange={(e) => updateDraftConfig({ popupSize: e.target.value as any })}
              className="w-full bg-bg-secondary border border-white/10 rounded-lg p-2 text-sm focus:outline-none focus:border-primary/50"
            >
              <option value="small">Small</option>
              <option value="medium">Medium</option>
              <option value="large">Large</option>
            </select>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between text-sm font-medium text-text-secondary">
              <label>Opacity</label>
              <span>{Math.round((draftConfig.popupTransparency ?? 0.9) * 100)}%</span>
            </div>
            <input
              type="range"
              min="0.35"
              max="1"
              step="0.05"
              value={draftConfig.popupTransparency ?? 0.9}
              onChange={(e) => updateDraftConfig({ popupTransparency: Number(e.target.value) })}
              className="w-full accent-primary"
            />
          </div>
          <div className="space-y-3">
            <div className="flex justify-between text-sm font-medium text-text-secondary">
              <label>Auto-dismiss</label>
              <span>{Math.round((draftConfig.popupDismissMs || 8000) / 1000)}s</span>
            </div>
            <input
              type="range"
              min="3000"
              max="15000"
              step="1000"
              value={draftConfig.popupDismissMs || 8000}
              onChange={(e) => updateDraftConfig({ popupDismissMs: Number(e.target.value) })}
              className="w-full accent-primary"
            />
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <SectionHeader title="Voice" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { label: 'Voice Input', key: 'voiceInputEnabled', value: draftConfig.voiceInputEnabled !== false },
            { label: 'Spoken Responses', key: 'voiceOutputEnabled', value: draftConfig.voiceOutputEnabled === true },
            { label: 'Auto-speak Replies', key: 'autoSpeakReplies', value: draftConfig.autoSpeakReplies === true },
          ].map((option) => (
            <ToggleSwitch
              key={option.key}
              checked={option.value}
              onChange={() => updateDraftConfig({ [option.key]: !option.value } as Partial<CompanionConfig>)}
              label={option.label}
            />
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-text-secondary">Input Language</label>
            <select
              value={draftConfig.voiceLanguage || 'vi-VN'}
              onChange={(e) => updateDraftConfig({ voiceLanguage: e.target.value as any })}
              className="w-full bg-bg-secondary border border-white/10 rounded-lg p-2 text-sm focus:outline-none focus:border-primary/50"
            >
              <option value="vi-VN">Vietnamese</option>
              <option value="en-US">English</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-text-secondary">Speech Recognition Provider</label>
            <select
              value={draftConfig.speechRecognitionProvider === 'browser_web_speech_en' ? 'browser_web_speech_en' : 'browser_web_speech'}
              onChange={(e) => updateDraftConfig({ speechRecognitionProvider: e.target.value as any })}
              className="w-full bg-bg-secondary border border-white/10 rounded-lg p-2 text-sm focus:outline-none focus:border-primary/50"
            >
              <option value="browser_web_speech">Browser Web Speech</option>
              <option value="browser_web_speech_en">Browser Web Speech - English</option>
            </select>
          </div>
          <button
            onClick={handleMicPermissionTest}
            className="px-4 py-2 rounded-lg bg-white/5 text-text border border-white/10 text-xs font-bold hover:bg-white/10 transition-colors"
          >
            Test Microphone Permission
          </button>
          <div className="text-xs text-text-secondary opacity-70 flex items-center">
            Microphone is only active while Push-to-Talk is active.
          </div>
        </div>

        <div className="space-y-4 pt-4 border-t border-white/10">
          <ToggleSwitch
            checked={draftConfig.globalPushToTalkEnabled === true}
            onChange={() => updateDraftConfig({ globalPushToTalkEnabled: !draftConfig.globalPushToTalkEnabled })}
            label="Global Push-To-Talk"
            description="Works while ChronoFlow is in the background when Tauri global shortcuts are available."
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-text-secondary">Hotkey Selection</label>
              <div className="flex gap-2">
                <input
                  value={isCapturingHotkey ? 'Press shortcut...' : draftConfig.globalPushToTalkHotkey || 'Alt+Space'}
                  readOnly
                  onFocus={() => setIsCapturingHotkey(true)}
                  onClick={() => setIsCapturingHotkey(true)}
                  onKeyDown={handleHotkeyCapture}
                  onBlur={() => setIsCapturingHotkey(false)}
                  placeholder="Alt+Space"
                  className={clsx(
                    "flex-1 bg-bg-secondary border rounded-lg p-2 text-sm focus:outline-none transition-colors cursor-pointer",
                    isCapturingHotkey ? "border-primary/70 text-primary" : "border-white/10 focus:border-primary/50"
                  )}
                />
                <button
                  onClick={() => {
                    updateDraftConfig({ globalPushToTalkHotkey: 'Alt+Space' });
                    setIsCapturingHotkey(false);
                    setTransientVoiceStatus('Hotkey reset to Alt+Space.');
                  }}
                  className="px-3 py-2 rounded-lg bg-white/5 text-text border border-white/10 text-xs font-bold hover:bg-white/10 transition-colors"
                >
                  Reset
                </button>
              </div>
              <p className="text-[11px] text-text-secondary opacity-60">
                Click the field, press your shortcut, then Save. Escape cancels; Backspace resets to Alt+Space.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-text-secondary">Activation Mode</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'Hold Mode', value: 'hold' },
                  { label: 'Toggle Mode', value: 'toggle' },
                ].map((mode) => (
                  <button
                    key={mode.value}
                    onClick={() => updateDraftConfig({ globalPushToTalkMode: mode.value as any })}
                    className={clsx(
                      "px-4 py-2 rounded-lg text-xs font-bold border transition-all",
                      (draftConfig.globalPushToTalkMode || 'hold') === mode.value
                        ? "bg-primary text-white border-primary"
                        : "bg-white/5 text-text-secondary border-white/10 hover:bg-white/10"
                    )}
                  >
                    {mode.label}
                  </button>
                ))}
              </div>
            </div>

            {[
              { label: 'Enable Audio Feedback', key: 'globalPushToTalkAudioFeedback', value: draftConfig.globalPushToTalkAudioFeedback !== false },
              { label: 'Start Sound', key: 'globalPushToTalkStartSound', value: draftConfig.globalPushToTalkStartSound !== false },
              { label: 'Stop Sound', key: 'globalPushToTalkStopSound', value: draftConfig.globalPushToTalkStopSound !== false },
              { label: 'Interrupt Speech On Hotkey', key: 'globalPushToTalkInterruptSpeech', value: draftConfig.globalPushToTalkInterruptSpeech !== false },
            ].map((option) => (
              <ToggleSwitch
                key={option.key}
                checked={option.value}
                onChange={() => updateDraftConfig({ [option.key]: !option.value } as Partial<CompanionConfig>)}
                label={option.label}
              />
            ))}
          </div>
        </div>

        <WakeWordSettings
          config={draftConfig}
          profile={draftProfile}
          updateConfig={updateDraftConfig}
          updateProfile={updateDraftProfile}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-white/10">
          <div className="space-y-2">
            <label className="text-sm font-medium text-text-secondary">TTS Provider</label>
            <select
              value={draftConfig.ttsProvider || 'browser_tts'}
              onChange={(e) => updateDraftConfig({ ttsProvider: e.target.value as any })}
              className="w-full bg-bg-secondary border border-white/10 rounded-lg p-2 text-sm focus:outline-none focus:border-primary/50"
            >
              <option value="browser_tts">Browser TTS</option>
              <option value="elevenlabs">ElevenLabs</option>
            </select>
          </div>
          {(draftConfig.ttsProvider || 'browser_tts') === 'browser_tts' ? (
            <div className="space-y-2">
              <label className="text-sm font-medium text-text-secondary">Browser Voice</label>
              <select
                value={draftConfig.browserVoiceURI || ''}
                onChange={(e) => updateDraftConfig({ browserVoiceURI: e.target.value })}
                className="w-full bg-bg-secondary border border-white/10 rounded-lg p-2 text-sm focus:outline-none focus:border-primary/50"
              >
                <option value="">System Default</option>
                {browserVoices.map((voice) => (
                  <option key={voice.voiceURI} value={voice.voiceURI}>{voice.name} ({voice.lang})</option>
                ))}
              </select>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <label className="text-sm font-medium text-text-secondary">ElevenLabs Voice</label>
                <button
                  onClick={handleRefreshElevenLabsVoices}
                  disabled={isLoadingElevenLabsVoices || !draftConfig.elevenLabsApiKey?.trim()}
                  className={clsx(
                    "px-3 py-1.5 rounded-lg text-[11px] font-bold border transition-all",
                    isLoadingElevenLabsVoices || !draftConfig.elevenLabsApiKey?.trim()
                      ? "bg-white/5 text-text-secondary border-white/10 cursor-not-allowed opacity-60"
                      : "bg-white/5 text-text border-white/10 hover:bg-white/10"
                  )}
                >
                  {isLoadingElevenLabsVoices ? 'Loading...' : 'Refresh Voices'}
                </button>
              </div>
              <select
                value={draftConfig.elevenLabsVoiceId || ''}
                onChange={(e) => updateDraftConfig({ elevenLabsVoiceId: e.target.value })}
                disabled={elevenLabsVoices.length === 0}
                className="w-full bg-bg-secondary border border-white/10 rounded-lg p-2 text-sm focus:outline-none focus:border-primary/50 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <option value="">
                  {elevenLabsVoices.length === 0 ? 'Refresh voices to select one' : 'Select a voice'}
                </option>
                {draftConfig.elevenLabsVoiceId && !elevenLabsVoices.some((voice) => voice.voiceId === draftConfig.elevenLabsVoiceId) && (
                  <option value={draftConfig.elevenLabsVoiceId}>Saved voice (not loaded)</option>
                )}
                {elevenLabsVoices.map((voice) => (
                  <option key={voice.voiceId} value={voice.voiceId}>
                    {formatElevenLabsVoice(voice)}
                  </option>
                ))}
              </select>
              {elevenLabsVoiceListError && (
                <p className="text-xs text-red-300 leading-relaxed">{elevenLabsVoiceListError}</p>
              )}
            </div>
          )}
          {(draftConfig.ttsProvider || 'browser_tts') === 'elevenlabs' && (
            <>
              <div className="space-y-2">
                <label className="text-sm font-medium text-text-secondary">ElevenLabs API Key</label>
                <input
                  type="password"
                  value={draftConfig.elevenLabsApiKey || ''}
                  onChange={(e) => updateDraftConfig({ elevenLabsApiKey: e.target.value })}
                  className="w-full bg-bg-secondary border border-white/10 rounded-lg p-2 text-sm focus:outline-none focus:border-primary/50"
                  placeholder="Only stored locally"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-text-secondary">ElevenLabs Model</label>
                <input
                  value={draftConfig.elevenLabsModelId || 'eleven_multilingual_v2'}
                  onChange={(e) => updateDraftConfig({ elevenLabsModelId: e.target.value })}
                  className="w-full bg-bg-secondary border border-white/10 rounded-lg p-2 text-sm focus:outline-none focus:border-primary/50"
                />
              </div>
            </>
          )}
          <button
            onClick={handleTestVoice}
            className="self-end px-4 py-2 rounded-lg bg-primary text-white text-xs font-bold hover:opacity-90 transition-opacity"
          >
            Test Voice
          </button>
          <div className="space-y-3">
            <div className="flex justify-between text-sm font-medium text-text-secondary">
              <label>Volume</label>
              <span>{Math.round((draftConfig.voiceVolume ?? 0.9) * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={draftConfig.voiceVolume ?? 0.9}
              onChange={(e) => updateDraftConfig({ voiceVolume: Number(e.target.value) })}
              className="w-full accent-primary"
            />
          </div>
          <div className="space-y-3">
            <div className="flex justify-between text-sm font-medium text-text-secondary">
              <label>Speaking Speed</label>
              <span>{(draftConfig.voiceRate ?? 1).toFixed(2)}x</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="1.5"
              step="0.05"
              value={draftConfig.voiceRate ?? 1}
              onChange={(e) => updateDraftConfig({ voiceRate: Number(e.target.value) })}
              className="w-full accent-primary"
            />
          </div>
        </div>

        {voiceStatus && (
          <p className="text-xs text-text-secondary opacity-70">{voiceStatus}</p>
        )}
      </section>

      <CompanionActionsSettings />

      <section className="space-y-4">
        <SectionHeader title="Memory" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-white/5 border border-white/10 rounded-xl">
            <p className="text-[10px] uppercase tracking-widest text-text-secondary font-black opacity-60">Entries</p>
            <p className="text-2xl font-black text-text mt-1">{memories.length}</p>
          </div>
          <div className="p-4 bg-white/5 border border-white/10 rounded-xl">
            <p className="text-[10px] uppercase tracking-widest text-text-secondary font-black opacity-60">Storage</p>
            <p className="text-2xl font-black text-text mt-1">{formatBytes(storageSizeBytes)}</p>
          </div>
          <div className="p-4 bg-white/5 border border-white/10 rounded-xl">
            <p className="text-[10px] uppercase tracking-widest text-text-secondary font-black opacity-60">Path</p>
            <p className="text-sm font-bold text-text mt-2 break-all">{draftConfig.storagePath || 'AppConfig/companion'}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => setIsMemoryViewerOpen(true)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-primary text-white text-xs font-bold hover:opacity-90 transition-opacity"
          >
            <Database className="w-4 h-4" />
            Open Memory Viewer
          </button>
          <button
            onClick={handleExportMemory}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-white/5 text-text border border-white/10 text-xs font-bold hover:bg-white/10 transition-colors"
          >
            <Download className="w-4 h-4" />
            Export Memory
          </button>
          <input
            ref={importInputRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={handleImportMemory}
          />
          <button
            onClick={() => importInputRef.current?.click()}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-white/5 text-text border border-white/10 text-xs font-bold hover:bg-white/10 transition-colors"
          >
            <Upload className="w-4 h-4" />
            Import Memory
          </button>
          <button
            onClick={() => {
              clearMemories();
              setTransientMemoryStatus('Memory reset.');
            }}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-red-500/10 text-red-300 border border-red-500/20 text-xs font-bold hover:bg-red-500/20 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            Reset Memory
          </button>
        </div>

        {memoryStatus && (
          <p className="text-xs text-text-secondary opacity-70">{memoryStatus}</p>
        )}
      </section>

      <section className="space-y-4">
        <SectionHeader title="Memory Extraction" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { label: 'Automatic Extraction', key: 'memoryExtractionEnabled', value: draftConfig.memoryExtractionEnabled !== false },
            { label: 'Review Before Saving', key: 'memoryExtractionReviewRequired', value: draftConfig.memoryExtractionReviewRequired !== false },
          ].map((option) => (
            <ToggleSwitch
              key={option.key}
              checked={option.value}
              onChange={() => updateDraftConfig({ [option.key]: !option.value } as Partial<CompanionConfig>)}
              label={option.label}
            />
          ))}
          <button
            onClick={() => {
              clearExtractedMemories();
              setTransientMemoryStatus('Pending extracted memories cleared.');
            }}
            className="px-4 py-3 rounded-xl text-sm font-bold border transition-all text-left bg-red-500/10 text-red-300 border-red-500/20 hover:bg-red-500/20"
          >
            Delete Extracted Memories
          </button>
        </div>

        <div className="p-4 bg-white/5 border border-white/10 rounded-xl space-y-3">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-bold text-text">Pending Review</p>
              <p className="text-xs text-text-secondary opacity-70">{pendingMemories.length} extracted memories waiting for review</p>
            </div>
          </div>

          {pendingMemories.length === 0 ? (
            <p className="text-sm text-text-secondary opacity-50 italic">No pending extracted memories.</p>
          ) : (
            <div className="space-y-2 max-h-56 overflow-y-auto custom-scrollbar">
              {pendingMemories.map((memory) => (
                <div key={memory.id} className="flex items-start justify-between gap-3 p-3 rounded-lg bg-bg-secondary/70 border border-white/10">
                  <div className="min-w-0">
                    <div className="flex flex-wrap gap-2 mb-1">
                      <span className="text-[10px] uppercase tracking-wider font-bold text-primary">{memory.category.replace('_', ' ')}</span>
                      <span className="text-[10px] text-text-secondary opacity-60">{memory.source}</span>
                      <span className="text-[10px] text-text-secondary opacity-60">{Math.round(memory.importance * 100)}%</span>
                    </div>
                    <p className="text-sm text-text leading-relaxed">{memory.content}</p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button
                      onClick={() => approvePendingMemory(memory.id)}
                      className="p-2 rounded-lg bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20"
                      title="Approve memory"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => rejectPendingMemory(memory.id)}
                      className="p-2 rounded-lg bg-red-500/10 text-red-300 hover:bg-red-500/20"
                      title="Reject memory"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="space-y-4">
        <SectionHeader title="Journal" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { label: 'Enable Journal', key: 'journalEnabled', value: draftConfig.journalEnabled !== false },
            { label: 'Weekly Summary', key: 'weeklySummaryEnabled', value: draftConfig.weeklySummaryEnabled !== false },
            { label: 'Monthly Summary', key: 'monthlySummaryEnabled', value: draftConfig.monthlySummaryEnabled !== false },
          ].map((option) => (
            <ToggleSwitch
              key={option.key}
              checked={option.value}
              onChange={() => updateDraftConfig({ [option.key]: !option.value } as Partial<CompanionConfig>)}
              label={option.label}
            />
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-white/5 border border-white/10 rounded-xl">
            <p className="text-[10px] uppercase tracking-widest text-text-secondary font-black opacity-60">Daily Entries</p>
            <p className="text-2xl font-black text-text mt-1">{journal.length}</p>
          </div>
          <div className="p-4 bg-white/5 border border-white/10 rounded-xl">
            <p className="text-[10px] uppercase tracking-widest text-text-secondary font-black opacity-60">Weekly Summaries</p>
            <p className="text-2xl font-black text-text mt-1">{weeklySummaries.length}</p>
          </div>
          <div className="p-4 bg-white/5 border border-white/10 rounded-xl">
            <p className="text-[10px] uppercase tracking-widest text-text-secondary font-black opacity-60">Monthly Summaries</p>
            <p className="text-2xl font-black text-text mt-1">{monthlySummaries.length}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => setIsJournalViewerOpen(true)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-primary text-white text-xs font-bold hover:opacity-90 transition-opacity"
          >
            <BookOpen className="w-4 h-4" />
            Open Journal
          </button>
          <button
            onClick={handleExportJournal}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-white/5 text-text border border-white/10 text-xs font-bold hover:bg-white/10 transition-colors"
          >
            <Download className="w-4 h-4" />
            Export Journal
          </button>
          <input
            ref={journalImportInputRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={handleImportJournal}
          />
          <button
            onClick={() => journalImportInputRef.current?.click()}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-white/5 text-text border border-white/10 text-xs font-bold hover:bg-white/10 transition-colors"
          >
            <Upload className="w-4 h-4" />
            Import Journal
          </button>
          <button
            onClick={handleOpenJournalFolder}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-white/5 text-text border border-white/10 text-xs font-bold hover:bg-white/10 transition-colors"
          >
            <FolderOpen className="w-4 h-4" />
            Open Journal Folder
          </button>
        </div>

        {journalStatus && (
          <p className="text-xs text-text-secondary opacity-70">{journalStatus}</p>
        )}
      </section>

      <section className="space-y-4">
        <SectionHeader title="Relationship" />
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            { label: 'Days Together', value: relationship?.daysKnown || 1 },
            { label: 'Focus Hours', value: relationship?.sharedFocusHours || 0 },
            { label: 'Journals', value: relationship?.journalEntries || journal.length },
            { label: 'Memories', value: relationship?.memoriesCreated || memories.length },
            { label: 'Milestones', value: relationship?.milestonesUnlocked || milestones.length },
          ].map((stat) => (
            <div key={stat.label} className="p-4 bg-white/5 border border-white/10 rounded-xl">
              <p className="text-[10px] uppercase tracking-widest text-text-secondary font-black opacity-60">{stat.label}</p>
              <p className="text-2xl font-black text-text mt-1">{stat.value}</p>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => setIsRelationshipTimelineOpen(true)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-primary text-white text-xs font-bold hover:opacity-90 transition-opacity"
          >
            <CalendarDays className="w-4 h-4" />
            View Milestones
          </button>
          <button
            onClick={() => setIsRelationshipTimelineOpen(true)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-white/5 text-text border border-white/10 text-xs font-bold hover:bg-white/10 transition-colors"
          >
            <BookOpen className="w-4 h-4" />
            Open Relationship History
          </button>
          <button
            onClick={() => RelationshipService.refreshRelationship()}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-white/5 text-text border border-white/10 text-xs font-bold hover:bg-white/10 transition-colors"
          >
            Refresh Relationship
          </button>
        </div>
      </section>

      <section className="sticky bottom-0 z-20 flex flex-col gap-4 border-primary/20 bg-surface/95 backdrop-blur-xl md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-black text-text">Apply Companion Changes</p>
          <p className="text-xs text-text-secondary">
            Saves profile, voice, memory, journal, wake word, and popup settings together.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <button
            onClick={handleUnchangeCompanionSettings}
            disabled={!hasCompanionChanges}
            className={clsx(
              "inline-flex items-center justify-center rounded-xl border px-5 py-3 text-xs font-black uppercase tracking-widest transition-all",
              hasCompanionChanges
                ? "border-border bg-surface-hover/70 text-text hover:border-primary/40 hover:bg-surface-hover"
                : "border-border/60 bg-surface-hover/35 text-text-secondary opacity-60 cursor-not-allowed"
            )}
          >
            Discard Draft
          </button>
          <button
            onClick={handleSaveCompanionSettings}
            disabled={!hasCompanionChanges}
            className={clsx(
              "inline-flex items-center justify-center rounded-xl px-6 py-3 text-xs font-black uppercase tracking-widest transition-all",
              isSaved
                ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/25"
                : hasCompanionChanges
                  ? "bg-primary text-primary-fg shadow-xl shadow-primary/25 hover:-translate-y-0.5"
                  : "bg-surface-hover/45 text-text-secondary border border-border/60 opacity-60 cursor-not-allowed"
            )}
          >
            {isSaved ? 'Saved' : 'Save Changes'}
          </button>
        </div>
      </section>
    </div>
  );
}
