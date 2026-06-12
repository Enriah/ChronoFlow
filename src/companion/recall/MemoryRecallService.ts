import type { CompanionMemoryCategory } from '../../models/companion/types';
import { useCompanionStore } from '../../store/useCompanionStore';

export type RecallResult = {
  type: 'memory' | 'journal' | 'milestone';
  date?: string;
  title: string;
  content: string;
  score: number;
};

export type RecallQuery = {
  text?: string;
  date?: string;
  project?: string;
  category?: CompanionMemoryCategory;
  milestone?: string;
  limit?: number;
};

const MEMORY_QUESTION_PATTERNS = [
  'remember',
  'memory',
  'when did',
  'first',
  'started',
  'start',
  'journal',
  'milestone',
  'history',
  'together',
  'streak',
  'focus hours',
];

function tokenize(text: string) {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/i)
    .map(token => token.trim())
    .filter(token => token.length > 2);
}

function keywordScore(haystack: string, tokens: string[]) {
  const normalized = haystack.toLowerCase();
  return tokens.reduce((score, token) => score + (normalized.includes(token) ? 1 : 0), 0);
}

export class MemoryRecallService {
  static isRecallQuestion(text: string) {
    const normalized = text.toLowerCase();
    return MEMORY_QUESTION_PATTERNS.some(pattern => normalized.includes(pattern));
  }

  static search(query: RecallQuery): RecallResult[] {
    const state = useCompanionStore.getState();
    const tokens = tokenize([query.text, query.project, query.milestone].filter(Boolean).join(' '));
    const results: RecallResult[] = [];
    const limit = query.limit || 5;

    state.memories.forEach(memory => {
      if (query.category && memory.category !== query.category) return;
      if (query.date && !memory.createdAt.startsWith(query.date)) return;

      const score = keywordScore(`${memory.category} ${memory.content}`, tokens) + memory.importance * 2;
      if (tokens.length > 0 && score <= memory.importance * 2 && !query.category && !query.date) return;

      results.push({
        type: 'memory',
        date: memory.createdAt.slice(0, 10),
        title: memory.category.replace('_', ' '),
        content: memory.content,
        score,
      });
    });

    state.journal.forEach(entry => {
      if (query.date && entry.date !== query.date) return;

      const content = [entry.reflection, ...entry.importantEvents].join(' ');
      const score = keywordScore(`${entry.date} ${content}`, tokens) + (entry.reflection ? 1 : 0);
      if (tokens.length > 0 && score <= (entry.reflection ? 1 : 0) && !query.date) return;

      results.push({
        type: 'journal',
        date: entry.date,
        title: `Journal ${entry.date}`,
        content: entry.reflection || entry.importantEvents.join('; ') || 'Journal statistics were saved, but no reflection was written yet.',
        score,
      });
    });

    state.milestones.forEach(milestone => {
      if (query.date && milestone.date !== query.date) return;
      if (query.milestone && !`${milestone.title} ${milestone.description}`.toLowerCase().includes(query.milestone.toLowerCase())) return;

      const score = keywordScore(`${milestone.title} ${milestone.description} ${milestone.category}`, tokens) + 2;
      if (tokens.length > 0 && score <= 2 && !query.milestone && !query.date) return;

      results.push({
        type: 'milestone',
        date: milestone.date,
        title: milestone.title,
        content: milestone.description,
        score,
      });
    });

    return results
      .sort((a, b) => b.score - a.score || (b.date || '').localeCompare(a.date || ''))
      .slice(0, limit);
  }

  static buildContext(text: string, limit = 5) {
    const results = this.search({ text, limit });
    if (results.length === 0) {
      return "Recall: I don't think I have a memory about that yet.";
    }

    return `Recall:\n${results.map(result => `- [${result.type}] ${result.date || 'undated'} | ${result.title}: ${result.content}`).join('\n')}`;
  }
}
