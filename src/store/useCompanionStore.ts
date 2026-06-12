import { create } from 'zustand';
import type { CompanionProfile, CompanionConfig, CompanionMemory, JournalEntry, CompanionMemoryCategory, CompanionMemoryBackup, JournalBackup, JournalSummary, RelationshipProfile, CompanionMilestone, PendingMemory } from '../models/companion/types';
import { CompanionStorageService } from '../services/companion/StorageService';
import { DEFAULT_COMPANION_AVATAR } from '../companion/avatar/Avatars';
import { MemoryService } from '../companion/memory/MemoryService';

function refreshRelationship() {
  window.dispatchEvent(new CustomEvent('companion-relationship-refresh'));
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

interface CompanionState {
  profile: CompanionProfile;
  config: CompanionConfig;
  memories: CompanionMemory[];
  journal: JournalEntry[];
  weeklySummaries: JournalSummary[];
  monthlySummaries: JournalSummary[];
  relationship: RelationshipProfile | null;
  milestones: CompanionMilestone[];
  pendingMemories: PendingMemory[];
  chatHistory: ChatMessage[];
  isThinking: boolean;

  // Actions
  setProfile: (profile: Partial<CompanionProfile>) => void;
  setConfig: (config: Partial<CompanionConfig>) => void;
  addMemory: (memory: { category: CompanionMemoryCategory; content: string; importance: number }) => Promise<void>;
  updateMemory: (id: string, memory: Partial<{ category: CompanionMemoryCategory; content: string; importance: number }>) => Promise<void>;
  removeMemory: (id: string) => void;
  clearMemories: () => void;
  importMemoryBackup: (backup: CompanionMemoryBackup) => Promise<void>;
  approvePendingMemory: (id: string) => Promise<void>;
  rejectPendingMemory: (id: string) => Promise<void>;
  clearExtractedMemories: () => Promise<void>;
  addJournalEntry: (entry: JournalEntry) => void;
  setJournal: (journal: JournalEntry[]) => Promise<void>;
  importJournalBackup: (backup: JournalBackup) => Promise<void>;
  addMessage: (role: 'user' | 'assistant', content: string) => void;
  clearChat: () => void;
  setThinking: (isThinking: boolean) => void;
  
  // Hydration
  hydrate: () => Promise<void>;
}

export const useCompanionStore = create<CompanionState>((set, get) => ({
  profile: {
    name: 'Luna',
    avatar: DEFAULT_COMPANION_AVATAR,
    personality: 'friendly',
    responseStyle: 'balanced',
    userDisplayName: '',
    userAddressStyle: 'bạn',
  },
  config: {
    apiKey: '',
    popupEnabled: true,
    popupPosition: 'top-right',
    popupSize: 'medium',
    popupTransparency: 0.9,
    popupDismissMs: 8000,
    backgroundStyle: 'glass',
    storagePath: 'AppConfig/companion',
    journalEnabled: true,
    weeklySummaryEnabled: true,
    monthlySummaryEnabled: true,
    memoryExtractionEnabled: true,
    memoryExtractionReviewRequired: true,
    voiceInputEnabled: true,
    voiceMode: 'push_to_talk',
    voiceLanguage: 'vi-VN',
    speechRecognitionProvider: 'browser_web_speech',
    voiceOutputEnabled: false,
    ttsProvider: 'browser_tts',
    browserVoiceURI: '',
    elevenLabsApiKey: '',
    elevenLabsVoiceId: '',
    elevenLabsModelId: 'eleven_multilingual_v2',
    voiceVolume: 0.9,
    voiceRate: 1,
    autoSpeakReplies: false,
    globalPushToTalkEnabled: false,
    globalPushToTalkHotkey: 'Alt+Space',
    globalPushToTalkMode: 'hold',
    globalPushToTalkAudioFeedback: true,
    globalPushToTalkStartSound: true,
    globalPushToTalkStopSound: true,
    globalPushToTalkInterruptSpeech: true,
    wakeWordEnabled: false,
    wakeWordAlwaysOnEnabled: false,
    wakeWordText: 'Airi',
    wakeWordListeningName: 'Airi',
    wakeWordSensitivity: 0.75,
    wakeWordVariants: ['airi', 'ai ri', 'airy', 'eri'],
    wakeWordTrainingSamples: [],
    wakeWordProvider: 'smart_vosk',
    wakeWordVoskModelPath: '',
    wakeWordShowStatus: true,
    wakeWordDisableWhileSpeaking: true,
    wakeWordDisableOnBattery: false,
    wakeWordDisableOnAppExit: true,
    wakeWordDebugPanelEnabled: false,
    wakeWordFalseTriggerCount: 0,
  },
  memories: [],
  journal: [],
  weeklySummaries: [],
  monthlySummaries: [],
  relationship: null,
  milestones: [],
  pendingMemories: [],
  chatHistory: [],
  isThinking: false,

  setProfile: (profile) => {
    const newProfile = { ...get().profile, ...profile };
    set({ profile: newProfile });
    CompanionStorageService.saveProfile(newProfile);
  },

  setConfig: (config) => {
    const newConfig = { ...get().config, ...config };
    set({ config: newConfig });
    CompanionStorageService.saveConfig(newConfig);
  },
  
  addMemory: async (memory) => {
    try {
      const newMemories = await MemoryService.createMemory(get().memories, memory);
      set({ memories: newMemories });
      refreshRelationship();
    } catch (error) {
      console.error('CompanionStore: failed to add memory', error);
    }
  },

  updateMemory: async (id, memory) => {
    try {
      const newMemories = await MemoryService.updateMemory(get().memories, id, memory);
      set({ memories: newMemories });
      refreshRelationship();
    } catch (error) {
      console.error('CompanionStore: failed to update memory', error);
    }
  },
  
  removeMemory: (id) => {
    MemoryService.deleteMemory(get().memories, id)
      .then((newMemories) => {
        set({ memories: newMemories });
        refreshRelationship();
      })
      .catch((error) => console.error('CompanionStore: failed to remove memory', error));
  },

  clearMemories: () => {
    set({ memories: [] });
    MemoryService.saveMemories([]).catch((error) => console.error('CompanionStore: failed to clear memories', error));
    refreshRelationship();
  },

  importMemoryBackup: async (backup) => {
    try {
      const memories = await MemoryService.saveMemories(backup.memory);
      set({ profile: { ...get().profile, ...backup.profile }, memories, journal: backup.journal });
      await Promise.all([
        CompanionStorageService.saveProfile({ ...get().profile, ...backup.profile }),
        CompanionStorageService.saveJournal(backup.journal),
      ]);
      refreshRelationship();
    } catch (error) {
      console.error('CompanionStore: failed to import memory backup', error);
    }
  },

  approvePendingMemory: async (id) => {
    try {
      const pending = get().pendingMemories.find(memory => memory.id === id);
      if (!pending) return;

      const newMemories = await MemoryService.createMemory(get().memories, {
        category: pending.category,
        content: pending.content,
        importance: pending.importance,
        source: 'extracted',
      });
      const pendingMemories = get().pendingMemories.filter(memory => memory.id !== id);
      set({ memories: newMemories, pendingMemories });
      await CompanionStorageService.savePendingMemories(pendingMemories);
      refreshRelationship();
    } catch (error) {
      console.error('CompanionStore: failed to approve pending memory', error);
    }
  },

  rejectPendingMemory: async (id) => {
    const pendingMemories = get().pendingMemories.filter(memory => memory.id !== id);
    set({ pendingMemories });
    await CompanionStorageService.savePendingMemories(pendingMemories);
  },

  clearExtractedMemories: async () => {
    const memories = get().memories.filter(memory => memory.source !== 'extracted');
    set({ memories, pendingMemories: [] });
    await Promise.all([
      MemoryService.saveMemories(memories),
      CompanionStorageService.savePendingMemories([]),
    ]);
    refreshRelationship();
  },
  
  addJournalEntry: (entry) => {
    const newJournal = [...get().journal.filter(item => item.date !== entry.date), entry].sort((a, b) => a.date.localeCompare(b.date));
    set({ journal: newJournal });
    CompanionStorageService.saveJournal(newJournal);
    refreshRelationship();
  },

  setJournal: async (journal) => {
    set({ journal });
    await CompanionStorageService.saveJournal(journal);
    refreshRelationship();
  },

  importJournalBackup: async (backup) => {
    try {
      set({
        journal: backup.dailyEntries,
        weeklySummaries: backup.weeklySummaries,
        monthlySummaries: backup.monthlySummaries,
      });
      await Promise.all([
        CompanionStorageService.saveJournal(backup.dailyEntries),
        CompanionStorageService.saveWeeklySummaries(backup.weeklySummaries),
        CompanionStorageService.saveMonthlySummaries(backup.monthlySummaries),
      ]);
      refreshRelationship();
    } catch (error) {
      console.error('CompanionStore: failed to import journal backup', error);
    }
  },
  
  addMessage: (role, content) => set((state) => ({
    chatHistory: [...state.chatHistory, { id: crypto.randomUUID(), role, content, timestamp: Date.now() }]
  })),
  
  clearChat: () => set({ chatHistory: [] }),
  
  setThinking: (isThinking) => set({ isThinking }),

  hydrate: async () => {
    const [profile, config, memories, journal, weeklySummaries, monthlySummaries, relationship, milestones, pendingMemories] = await Promise.all([
      CompanionStorageService.loadProfile(),
      CompanionStorageService.loadConfig(),
      MemoryService.loadMemories(),
      CompanionStorageService.loadJournal(),
      CompanionStorageService.loadWeeklySummaries(),
      CompanionStorageService.loadMonthlySummaries(),
      CompanionStorageService.loadRelationship(),
      CompanionStorageService.loadMilestones(),
      CompanionStorageService.loadPendingMemories(),
    ]);

    if (profile) set({ profile: { ...get().profile, ...profile } });
    if (config) set({ config: { ...get().config, ...config } });
    if (memories) set({ memories });
    if (journal) set({ journal });
    if (weeklySummaries) set({ weeklySummaries });
    if (monthlySummaries) set({ monthlySummaries });
    if (relationship) set({ relationship });
    if (milestones) set({ milestones });
    if (pendingMemories) set({ pendingMemories });
  }
}));
