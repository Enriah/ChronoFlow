import type {
  CompanionMemory,
  CompanionMemoryBackup,
  CompanionMemoryCategory,
  CompanionProfile,
  JournalEntry,
} from '../../models/companion/types';
import { CompanionStorageService } from '../../services/companion/StorageService';

const MAX_MEMORY_COUNT = 200;
const MAX_RELEVANT_MEMORIES = 10;
const LEGACY_CATEGORY_MAP: Record<string, CompanionMemoryCategory> = {
  goal: 'goal',
  project: 'project',
  habit: 'habit',
  interest: 'interest',
  preference: 'preference',
  milestone: 'milestone',
  personal_note: 'personal_note',
  fact: 'personal_note',
};

export type MemoryDraft = {
  category: CompanionMemoryCategory;
  content: string;
  importance: number;
  source?: 'manual' | 'extracted';
};

export type MemoryQuery = {
  text?: string;
  categories?: CompanionMemoryCategory[];
  limit?: number;
};

function nowIso() {
  return new Date().toISOString();
}

function clampImportance(value: number | undefined) {
  if (typeof value !== 'number' || Number.isNaN(value)) return 0.5;
  if (value > 1) return Math.min(1, Math.max(0, value / 5));
  return Math.min(1, Math.max(0, value));
}

export function tokenizeMemoryText(text: string) {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/i)
    .map(token => token.trim())
    .filter(token => token.length > 2);
}

function priority(memory: CompanionMemory) {
  const lastAccessedMs = Date.parse(memory.lastAccessed) || Date.parse(memory.createdAt) || 0;
  const ageDays = Math.max(0, (Date.now() - lastAccessedMs) / 86400000);
  const recencyScore = 1 / (1 + ageDays / 30);
  const referenceScore = Math.min(1, memory.timesReferenced / 10);

  return memory.importance * 0.6 + recencyScore * 0.25 + referenceScore * 0.15;
}

export class MemoryService {
  static normalizeMemory(raw: unknown): CompanionMemory | null {
    if (!raw || typeof raw !== 'object') return null;

    const candidate = raw as Partial<CompanionMemory> & {
      timestamp?: number;
      category?: string;
    };
    const content = typeof candidate.content === 'string' ? candidate.content.trim() : '';
    if (!content) return null;

    const createdAt =
      typeof candidate.createdAt === 'string'
        ? candidate.createdAt
        : typeof candidate.timestamp === 'number'
          ? new Date(candidate.timestamp).toISOString()
          : nowIso();

    return {
      id: typeof candidate.id === 'string' && candidate.id ? candidate.id : `memory_${crypto.randomUUID()}`,
      category: LEGACY_CATEGORY_MAP[candidate.category || ''] || 'personal_note',
      content,
      importance: clampImportance(candidate.importance),
      createdAt,
      lastAccessed: typeof candidate.lastAccessed === 'string' ? candidate.lastAccessed : createdAt,
      timesReferenced: typeof candidate.timesReferenced === 'number' ? Math.max(0, candidate.timesReferenced) : 0,
      source: candidate.source || 'manual',
    };
  }

  static normalizeMemories(raw: unknown): CompanionMemory[] {
    if (!Array.isArray(raw)) return [];

    return this.cleanup(raw.map(memory => this.normalizeMemory(memory)).filter(Boolean) as CompanionMemory[]);
  }

  static cleanup(memories: CompanionMemory[]) {
    if (memories.length <= MAX_MEMORY_COUNT) return memories;

    return [...memories]
      .sort((a, b) => priority(b) - priority(a))
      .slice(0, MAX_MEMORY_COUNT);
  }

  static async loadMemories() {
    try {
      const memories = this.normalizeMemories(await CompanionStorageService.loadMemories());
      await CompanionStorageService.saveMemories(memories);
      return memories;
    } catch (error) {
      console.error('MemoryService: failed to load memories', error);
      await CompanionStorageService.saveMemories([]);
      return [];
    }
  }

  static async saveMemories(memories: CompanionMemory[]) {
    const cleaned = this.cleanup(this.normalizeMemories(memories));
    await CompanionStorageService.saveMemories(cleaned);
    return cleaned;
  }

  static async createMemory(memories: CompanionMemory[], draft: MemoryDraft) {
    const memory: CompanionMemory = {
      id: `memory_${crypto.randomUUID()}`,
      category: draft.category,
      content: draft.content.trim(),
      importance: clampImportance(draft.importance),
      createdAt: nowIso(),
      lastAccessed: nowIso(),
      timesReferenced: 0,
      source: draft.source || 'manual',
    };

    return this.saveMemories([...memories, memory]);
  }

  static async updateMemory(memories: CompanionMemory[], id: string, updates: Partial<MemoryDraft>) {
    return this.saveMemories(memories.map(memory => (
      memory.id === id
        ? {
            ...memory,
            ...updates,
            content: updates.content?.trim() || memory.content,
            importance: updates.importance === undefined ? memory.importance : clampImportance(updates.importance),
          }
        : memory
    )));
  }

  static async deleteMemory(memories: CompanionMemory[], id: string) {
    return this.saveMemories(memories.filter(memory => memory.id !== id));
  }

  static findByCategory(memories: CompanionMemory[], category: CompanionMemoryCategory) {
    return memories.filter(memory => memory.category === category);
  }

  static getMostImportantMemories(memories: CompanionMemory[], limit = MAX_RELEVANT_MEMORIES) {
    return [...memories]
      .sort((a, b) => priority(b) - priority(a))
      .slice(0, limit);
  }

  static getRelevantMemories(memories: CompanionMemory[], query: MemoryQuery = {}) {
    const queryTokens = tokenizeMemoryText(query.text || '');
    const categories = new Set(query.categories || []);
    const limit = query.limit || MAX_RELEVANT_MEMORIES;

    return [...memories]
      .map(memory => {
        const memoryTokens = tokenizeMemoryText(memory.content);
        const keywordMatches = queryTokens.filter(token => memoryTokens.some(memoryToken => memoryToken.includes(token) || token.includes(memoryToken))).length;
        const categoryScore = categories.size > 0 && categories.has(memory.category) ? 0.35 : 0;
        const keywordScore = queryTokens.length > 0 ? Math.min(0.4, keywordMatches * 0.12) : 0;
        const importanceScore = memory.importance * 0.25;

        return {
          memory,
          score: categoryScore + keywordScore + importanceScore + priority(memory) * 0.2,
        };
      })
      .filter(result => result.score > 0 || queryTokens.length === 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(result => result.memory);
  }

  static getStorageSizeBytes(profile: CompanionProfile, memories: CompanionMemory[], journal: JournalEntry[]) {
    return new Blob([JSON.stringify({ profile, memory: memories, journal })]).size;
  }

  static createBackup(profile: CompanionProfile, memories: CompanionMemory[], journal: JournalEntry[]): CompanionMemoryBackup {
    return {
      version: 1,
      exportedAt: nowIso(),
      profile,
      memory: this.cleanup(memories),
      journal,
    };
  }

  static normalizeBackup(raw: unknown): CompanionMemoryBackup | null {
    if (!raw || typeof raw !== 'object') return null;

    const backup = raw as Partial<CompanionMemoryBackup>;
    if (!backup.profile || !Array.isArray(backup.memory) || !Array.isArray(backup.journal)) return null;

    return {
      version: 1,
      exportedAt: typeof backup.exportedAt === 'string' ? backup.exportedAt : nowIso(),
      profile: backup.profile,
      memory: this.normalizeMemories(backup.memory),
      journal: backup.journal,
    };
  }
}
