import { 
  exists, 
  mkdir, 
  readTextFile, 
  writeTextFile,
  BaseDirectory
} from '@tauri-apps/plugin-fs';
import { join } from '@tauri-apps/api/path';
import type { CompanionProfile, CompanionConfig, CompanionMemory, JournalEntry, JournalSummary, RelationshipProfile, CompanionMilestone, PendingMemory, MemoryExtractionQueueItem } from '../../models/companion/types';
import { DEFAULT_COMPANION_AVATAR } from '../../companion/avatar/Avatars';

const COMPANION_DIR = 'companion';

const DEFAULT_PROFILE: CompanionProfile = {
  name: 'Luna',
  avatar: DEFAULT_COMPANION_AVATAR,
  personality: 'friendly',
  responseStyle: 'balanced',
  userDisplayName: '',
  userAddressStyle: 'bạn',
};

const DEFAULT_CONFIG: CompanionConfig = {
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
};

function normalizeJournalEntry(entry: any): JournalEntry | null {
  if (!entry?.date) return null;

  const focusHours = typeof entry.stats?.focusHours === 'number'
    ? entry.stats.focusHours
    : typeof entry.stats?.focusTimeMinutes === 'number'
      ? Math.round((entry.stats.focusTimeMinutes / 60) * 10) / 10
      : 0;
  const completedTasks = typeof entry.stats?.completedTasks === 'number'
    ? entry.stats.completedTasks
    : typeof entry.stats?.tasksCompleted === 'number'
      ? entry.stats.tasksCompleted
      : 0;
  const reflection = entry.reflection || entry.content || '';

  return {
    date: entry.date,
    stats: {
      focusHours,
      completedTasks,
      streak: typeof entry.stats?.streak === 'number' ? entry.stats.streak : 0,
      focusTimeMinutes: Math.round(focusHours * 60),
      tasksCompleted: completedTasks,
      mood: entry.stats?.mood,
    },
    importantEvents: Array.isArray(entry.importantEvents) ? entry.importantEvents : [],
    reflection,
    reflectionStatus: entry.reflectionStatus || (reflection ? 'generated' : 'pending'),
    generatedAt: entry.generatedAt,
    content: reflection,
  };
}

function normalizeSummary(summary: any): JournalSummary | null {
  if (!summary?.period || !summary?.startDate || !summary?.endDate) return null;

  return {
    period: summary.period,
    startDate: summary.startDate,
    endDate: summary.endDate,
    summary: summary.summary || '',
    status: summary.status || (summary.summary ? 'generated' : 'pending'),
    generatedAt: summary.generatedAt,
  };
}

function defaultRelationship(): RelationshipProfile {
  const now = new Date().toISOString();
  return {
    firstSeenDate: now.slice(0, 10),
    daysKnown: 1,
    sharedFocusHours: 0,
    journalEntries: 0,
    memoriesCreated: 0,
    milestonesUnlocked: 0,
    updatedAt: now,
  };
}

export class CompanionStorageService {
  private static async ensureDir() {
    const dirExists = await exists(COMPANION_DIR, { baseDir: BaseDirectory.AppConfig });
    if (!dirExists) {
      await mkdir(COMPANION_DIR, { baseDir: BaseDirectory.AppConfig, recursive: true });
    }
  }

  static async saveProfile(profile: CompanionProfile) {
    await this.ensureDir();
    const path = await join(COMPANION_DIR, 'profile.json');
    await writeTextFile(path, JSON.stringify(profile, null, 2), { baseDir: BaseDirectory.AppConfig });
  }

  static async loadProfile(): Promise<CompanionProfile | null> {
    try {
      const path = await join(COMPANION_DIR, 'profile.json');
      const content = await readTextFile(path, { baseDir: BaseDirectory.AppConfig });
      return JSON.parse(content);
    } catch {
      await this.saveProfile(DEFAULT_PROFILE);
      return DEFAULT_PROFILE;
    }
  }

  static async saveConfig(config: CompanionConfig) {
    await this.ensureDir();
    const path = await join(COMPANION_DIR, 'config.json');
    await writeTextFile(path, JSON.stringify(config, null, 2), { baseDir: BaseDirectory.AppConfig });
  }

  static async loadConfig(): Promise<CompanionConfig | null> {
    try {
      const path = await join(COMPANION_DIR, 'config.json');
      const content = await readTextFile(path, { baseDir: BaseDirectory.AppConfig });
      const config = { ...DEFAULT_CONFIG, ...JSON.parse(content) };
      const oldDefaultWakeWord = !config.wakeWordText
        || config.wakeWordText === 'Alexa'
        || config.wakeWordListeningName === 'Luna';
      if (config.wakeWordProvider === 'openwakeword_builtin' && oldDefaultWakeWord) {
        config.wakeWordProvider = 'smart_vosk';
        config.wakeWordText = 'Airi';
        config.wakeWordListeningName = 'Airi';
        config.wakeWordVariants = ['airi', 'ai ri', 'airy', 'eri'];
      }
      return config;
    } catch {
      await this.saveConfig(DEFAULT_CONFIG);
      return DEFAULT_CONFIG;
    }
  }

  static async saveMemories(memories: CompanionMemory[]) {
    await this.ensureDir();
    const path = await join(COMPANION_DIR, 'memory.json');
    await writeTextFile(path, JSON.stringify(memories, null, 2), { baseDir: BaseDirectory.AppConfig });
  }

  static async loadMemories(): Promise<CompanionMemory[]> {
    try {
      const path = await join(COMPANION_DIR, 'memory.json');
      const content = await readTextFile(path, { baseDir: BaseDirectory.AppConfig });
      return JSON.parse(content);
    } catch {
      await this.saveMemories([]);
      return [];
    }
  }

  static async saveJournal(journal: JournalEntry[]) {
    await this.ensureDir();
    const path = await join(COMPANION_DIR, 'journal.json');
    await writeTextFile(path, JSON.stringify(journal, null, 2), { baseDir: BaseDirectory.AppConfig });
  }

  static async loadJournal(): Promise<JournalEntry[]> {
    try {
      const path = await join(COMPANION_DIR, 'journal.json');
      const content = await readTextFile(path, { baseDir: BaseDirectory.AppConfig });
      const parsed = JSON.parse(content);
      return Array.isArray(parsed) ? parsed.map(normalizeJournalEntry).filter(Boolean) as JournalEntry[] : [];
    } catch {
      await this.saveJournal([]);
      return [];
    }
  }

  static async saveWeeklySummaries(summaries: JournalSummary[]) {
    await this.ensureDir();
    const path = await join(COMPANION_DIR, 'weekly_summary.json');
    await writeTextFile(path, JSON.stringify(summaries, null, 2), { baseDir: BaseDirectory.AppConfig });
  }

  static async loadWeeklySummaries(): Promise<JournalSummary[]> {
    try {
      const path = await join(COMPANION_DIR, 'weekly_summary.json');
      const content = await readTextFile(path, { baseDir: BaseDirectory.AppConfig });
      const parsed = JSON.parse(content);
      return Array.isArray(parsed) ? parsed.map(normalizeSummary).filter(Boolean) as JournalSummary[] : [];
    } catch {
      await this.saveWeeklySummaries([]);
      return [];
    }
  }

  static async saveMonthlySummaries(summaries: JournalSummary[]) {
    await this.ensureDir();
    const path = await join(COMPANION_DIR, 'monthly_summary.json');
    await writeTextFile(path, JSON.stringify(summaries, null, 2), { baseDir: BaseDirectory.AppConfig });
  }

  static async loadMonthlySummaries(): Promise<JournalSummary[]> {
    try {
      const path = await join(COMPANION_DIR, 'monthly_summary.json');
      const content = await readTextFile(path, { baseDir: BaseDirectory.AppConfig });
      const parsed = JSON.parse(content);
      return Array.isArray(parsed) ? parsed.map(normalizeSummary).filter(Boolean) as JournalSummary[] : [];
    } catch {
      await this.saveMonthlySummaries([]);
      return [];
    }
  }

  static async saveRelationship(profile: RelationshipProfile) {
    await this.ensureDir();
    const path = await join(COMPANION_DIR, 'relationship.json');
    await writeTextFile(path, JSON.stringify(profile, null, 2), { baseDir: BaseDirectory.AppConfig });
  }

  static async loadRelationship(): Promise<RelationshipProfile> {
    try {
      const path = await join(COMPANION_DIR, 'relationship.json');
      const content = await readTextFile(path, { baseDir: BaseDirectory.AppConfig });
      const parsed = JSON.parse(content);
      return { ...defaultRelationship(), ...parsed };
    } catch {
      const profile = defaultRelationship();
      await this.saveRelationship(profile);
      return profile;
    }
  }

  static async saveMilestones(milestones: CompanionMilestone[]) {
    await this.ensureDir();
    const path = await join(COMPANION_DIR, 'milestones.json');
    await writeTextFile(path, JSON.stringify(milestones, null, 2), { baseDir: BaseDirectory.AppConfig });
  }

  static async loadMilestones(): Promise<CompanionMilestone[]> {
    try {
      const path = await join(COMPANION_DIR, 'milestones.json');
      const content = await readTextFile(path, { baseDir: BaseDirectory.AppConfig });
      const parsed = JSON.parse(content);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      await this.saveMilestones([]);
      return [];
    }
  }

  static async savePendingMemories(pendingMemories: PendingMemory[]) {
    await this.ensureDir();
    const path = await join(COMPANION_DIR, 'pending_memories.json');
    await writeTextFile(path, JSON.stringify(pendingMemories, null, 2), { baseDir: BaseDirectory.AppConfig });
  }

  static async loadPendingMemories(): Promise<PendingMemory[]> {
    try {
      const path = await join(COMPANION_DIR, 'pending_memories.json');
      const content = await readTextFile(path, { baseDir: BaseDirectory.AppConfig });
      const parsed = JSON.parse(content);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      await this.savePendingMemories([]);
      return [];
    }
  }

  static async saveMemoryExtractionQueue(queue: MemoryExtractionQueueItem[]) {
    await this.ensureDir();
    const path = await join(COMPANION_DIR, 'memory_extraction_queue.json');
    await writeTextFile(path, JSON.stringify(queue, null, 2), { baseDir: BaseDirectory.AppConfig });
  }

  static async loadMemoryExtractionQueue(): Promise<MemoryExtractionQueueItem[]> {
    try {
      const path = await join(COMPANION_DIR, 'memory_extraction_queue.json');
      const content = await readTextFile(path, { baseDir: BaseDirectory.AppConfig });
      const parsed = JSON.parse(content);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      await this.saveMemoryExtractionQueue([]);
      return [];
    }
  }
}
