import type { CompanionMemory, CompanionMemoryCategory, MemoryExtractionQueueItem, PendingMemorySource } from '../../models/companion/types';
import { GeminiService } from '../../services/companion/GeminiService';
import { CompanionStorageService } from '../../services/companion/StorageService';
import { useCompanionStore } from '../../store/useCompanionStore';
import { MemoryService, tokenizeMemoryText } from './MemoryService';

type ExtractedMemoryDraft = {
  category: CompanionMemoryCategory;
  content: string;
  importance: number;
};

const EXTRACTION_COOLDOWN_MS = 10 * 60 * 1000;
const MIN_CHAT_QUEUE_SIZE = 5;
const MAX_QUEUE_ITEMS = 30;
let lastExtractionAt = 0;
let isExtracting = false;

const SENSITIVE_PATTERNS = [
  /password/i,
  /api[_\s-]?key/i,
  /secret/i,
  /token/i,
  /credential/i,
  /private key/i,
];

const MEANINGFUL_PATTERNS = [
  /\bi am learning\b/i,
  /\bi'm learning\b/i,
  /\bi am studying\b/i,
  /\bi'm studying\b/i,
  /\bmy goal\b/i,
  /\bi want to\b/i,
  /\bi usually\b/i,
  /\bi prefer\b/i,
  /\bi like\b/i,
  /\bi struggle\b/i,
  /\bi keep\b/i,
  /\bproject\b/i,
  /\bhabit\b/i,
  /\bmilestone\b/i,
  /\bcompleted\b/i,
];

function nowIso() {
  return new Date().toISOString();
}

function isSensitive(content: string) {
  return SENSITIVE_PATTERNS.some(pattern => pattern.test(content));
}

function isMeaningful(content: string) {
  const normalized = content.trim();
  return normalized.length >= 24 && MEANINGFUL_PATTERNS.some(pattern => pattern.test(normalized));
}

function similarity(a: string, b: string) {
  const aTokens = new Set(tokenizeMemoryText(a));
  const bTokens = new Set(tokenizeMemoryText(b));
  if (aTokens.size === 0 || bTokens.size === 0) return 0;

  const intersection = [...aTokens].filter(token => bTokens.has(token)).length;
  const union = new Set([...aTokens, ...bTokens]).size;
  return intersection / union;
}

function normalizeDraft(raw: unknown): ExtractedMemoryDraft | null {
  if (!raw || typeof raw !== 'object') return null;
  const candidate = raw as Partial<ExtractedMemoryDraft>;
  const validCategories: CompanionMemoryCategory[] = ['goal', 'project', 'habit', 'interest', 'preference', 'milestone', 'personal_note'];

  if (!candidate.content || !candidate.category || !validCategories.includes(candidate.category)) return null;
  const importance = typeof candidate.importance === 'number' ? Math.max(0, Math.min(1, candidate.importance)) : 0;
  if (importance < 0.5 || isSensitive(candidate.content)) return null;

  return {
    category: candidate.category,
    content: candidate.content.trim(),
    importance,
  };
}

export class MemoryExtractionService {
  static async queueChatMessage(content: string) {
    if (!isMeaningful(content) || isSensitive(content)) return;
    await this.enqueue('chat', content);
  }

  static async queueJournalEntry(content: string, source: PendingMemorySource = 'journal') {
    if (!content.trim() || isSensitive(content)) return;
    await this.enqueue(source, content);
  }

  private static async enqueue(source: PendingMemorySource, content: string) {
    try {
      const config = useCompanionStore.getState().config;
      if (config.memoryExtractionEnabled === false) return;

      const queue = await CompanionStorageService.loadMemoryExtractionQueue();
      const nextQueue = [
        ...queue,
        {
          id: `extraction_${crypto.randomUUID()}`,
          source,
          content,
          createdAt: nowIso(),
        },
      ].slice(-MAX_QUEUE_ITEMS);

      await CompanionStorageService.saveMemoryExtractionQueue(nextQueue);

      if (source !== 'chat' || nextQueue.filter(item => item.source === 'chat').length >= MIN_CHAT_QUEUE_SIZE) {
        void this.runExtraction();
      }
    } catch (error) {
      console.error('MemoryExtractionService: failed to queue source', error);
    }
  }

  static async runExtraction(force = false) {
    if (isExtracting) return;

    const config = useCompanionStore.getState().config;
    if (config.memoryExtractionEnabled === false) return;

    const now = Date.now();
    if (!force && now - lastExtractionAt < EXTRACTION_COOLDOWN_MS) return;

    const queue = await CompanionStorageService.loadMemoryExtractionQueue();
    if (queue.length === 0) return;

    isExtracting = true;
    try {
      lastExtractionAt = now;
      const sourceItems = queue.slice(-10);
      const drafts = await GeminiService.extractLongTermMemories(this.buildPrompt(sourceItems));
      if (drafts.length === 0) return;

      await this.saveExtractedDrafts(drafts.map(normalizeDraft).filter(Boolean) as ExtractedMemoryDraft[], sourceItems);
      await CompanionStorageService.saveMemoryExtractionQueue(queue.filter(item => !sourceItems.some(source => source.id === item.id)));
    } catch (error) {
      console.error('MemoryExtractionService: extraction failed', error);
    } finally {
      isExtracting = false;
    }
  }

  static buildPrompt(items: MemoryExtractionQueueItem[]) {
    return `Extract only meaningful long-term Companion memories from these user/journal texts.

Return strict JSON only:
[
  { "category": "goal|project|habit|interest|preference|milestone|personal_note", "content": "User ...", "importance": 0.5 }
]

Rules:
- Save goals, projects, habits, preferences, important life events, emotional patterns, milestones, recurring struggles, and study/work interests.
- Do not save passwords, API keys, credentials, one-time complaints, vague moods, or temporary details.
- Only include memories with importance >= 0.5.
- Use 0.9 for major goals, long-term projects, important life context.
- Use 0.7 for habits, preferences, recurring patterns.
- Use 0.5 for useful minor context.
- Keep content concise and factual.

Texts:
${items.map(item => `- Source: ${item.source}\n  Text: ${item.content}`).join('\n')}`;
  }

  static async saveExtractedDrafts(drafts: ExtractedMemoryDraft[], sourceItems: MemoryExtractionQueueItem[]) {
    if (drafts.length === 0) return;

    const state = useCompanionStore.getState();
    const existing = state.memories;
    const pending = state.pendingMemories;
    const reviewRequired = state.config.memoryExtractionReviewRequired !== false;
    let nextMemories = [...existing];
    let nextPending = [...pending];

    for (const draft of drafts) {
      const duplicate = this.findDuplicate(draft, nextMemories);
      if (duplicate) {
        nextMemories = nextMemories.map(memory => (
          memory.id === duplicate.id
            ? {
                ...memory,
                importance: Math.max(memory.importance, draft.importance),
                lastAccessed: nowIso(),
                timesReferenced: memory.timesReferenced + 1,
                content: draft.content.length > memory.content.length ? draft.content : memory.content,
              }
            : memory
        ));
        continue;
      }

      if (nextPending.some(memory => similarity(memory.content, draft.content) >= 0.72)) continue;

      if (reviewRequired) {
        nextPending.push({
          id: `pending_${crypto.randomUUID()}`,
          category: draft.category,
          content: draft.content,
          importance: draft.importance,
          source: sourceItems[0]?.source || 'chat',
          createdAt: nowIso(),
        });
      } else {
        nextMemories = await MemoryService.createMemory(nextMemories, { ...draft, source: 'extracted' });
      }
    }

    useCompanionStore.setState({ memories: nextMemories, pendingMemories: nextPending });
    await Promise.all([
      MemoryService.saveMemories(nextMemories),
      CompanionStorageService.savePendingMemories(nextPending),
    ]);
    window.dispatchEvent(new CustomEvent('companion-relationship-refresh'));
  }

  static findDuplicate(draft: ExtractedMemoryDraft, memories: CompanionMemory[]) {
    return memories.find(memory => (
      memory.category === draft.category && similarity(memory.content, draft.content) >= 0.62
    ));
  }
}
