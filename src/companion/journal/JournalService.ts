import { endOfMonth, endOfWeek, format, parseISO, startOfMonth, startOfWeek, subDays } from 'date-fns';
import type { CompanionMemory, JournalBackup, JournalEntry, JournalSummary } from '../../models/companion/types';
import { LocalStorageService } from '../../services/persistence/storage';
import { CompanionStorageService } from '../../services/companion/StorageService';
import { GeminiService } from '../../services/companion/GeminiService';
import { MemoryService } from '../memory/MemoryService';
import { MemoryExtractionService } from '../memory/MemoryExtractionService';
import { useCompanionStore } from '../../store/useCompanionStore';

type PeriodKind = 'week' | 'month';

const dailyInFlight = new Set<string>();
const summaryInFlight = new Set<string>();

function todayKey() {
  return format(new Date(), 'yyyy-MM-dd');
}

function toDateKey(value: number | Date) {
  return format(value, 'yyyy-MM-dd');
}

function nowIso() {
  return new Date().toISOString();
}

function unique(values: string[]) {
  return [...new Set(values.filter(Boolean))];
}

function getFocusDayStreakThrough(date: string) {
  const sessions = LocalStorageService.loadTaskSessions();
  const focusDays = new Set(sessions.map(session => toDateKey(session.startTime)));
  let streak = 0;
  const cursor = parseISO(date);

  while (focusDays.has(format(cursor, 'yyyy-MM-dd'))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}

function normalizeJournalEntry(raw: unknown): JournalEntry | null {
  if (!raw || typeof raw !== 'object') return null;

  const entry = raw as Partial<JournalEntry> & {
    content?: string;
    stats?: Partial<JournalEntry['stats']>;
  };

  if (!entry.date) return null;

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
      streak: typeof entry.stats?.streak === 'number' ? entry.stats.streak : getFocusDayStreakThrough(entry.date),
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

function normalizeSummary(raw: unknown): JournalSummary | null {
  if (!raw || typeof raw !== 'object') return null;
  const summary = raw as Partial<JournalSummary>;
  if (!summary.period || !summary.startDate || !summary.endDate) return null;

  return {
    period: summary.period,
    startDate: summary.startDate,
    endDate: summary.endDate,
    summary: summary.summary || '',
    status: summary.status || (summary.summary ? 'generated' : 'pending'),
    generatedAt: summary.generatedAt,
  };
}

export class JournalService {
  static normalizeJournal(raw: unknown) {
    if (!Array.isArray(raw)) return [];
    return raw.map(normalizeJournalEntry).filter(Boolean) as JournalEntry[];
  }

  static normalizeSummaries(raw: unknown) {
    if (!Array.isArray(raw)) return [];
    return raw.map(normalizeSummary).filter(Boolean) as JournalSummary[];
  }

  static async loadJournal() {
    const journal = this.normalizeJournal(await CompanionStorageService.loadJournal());
    await CompanionStorageService.saveJournal(journal);
    return journal;
  }

  static async loadWeeklySummaries() {
    const summaries = this.normalizeSummaries(await CompanionStorageService.loadWeeklySummaries());
    await CompanionStorageService.saveWeeklySummaries(summaries);
    return summaries;
  }

  static async loadMonthlySummaries() {
    const summaries = this.normalizeSummaries(await CompanionStorageService.loadMonthlySummaries());
    await CompanionStorageService.saveMonthlySummaries(summaries);
    return summaries;
  }

  static collectDailyEntry(date: string): JournalEntry {
    const sessions = LocalStorageService.loadTaskSessions().filter(session => toDateKey(session.startTime) === date);
    const totalFocusMs = sessions.reduce((sum, session) => sum + session.duration, 0);
    const completedTaskNames = unique(sessions.map(session => session.taskName));
    const firstSession = sessions.length > 0 ? Math.min(...sessions.map(session => session.startTime)) : null;
    const importantEvents = completedTaskNames.slice(0, 6).map(taskName => `Completed ${taskName}`);

    if (firstSession) {
      const firstHour = new Date(firstSession).getHours();
      if (firstHour >= 11) importantEvents.unshift('Started later than usual');
      if (firstHour < 7) importantEvents.unshift('Started early');
    }

    return {
      date,
      stats: {
        focusHours: Math.round((totalFocusMs / 3600000) * 10) / 10,
        completedTasks: completedTaskNames.length,
        streak: getFocusDayStreakThrough(date),
        focusTimeMinutes: Math.round(totalFocusMs / 60000),
        tasksCompleted: completedTaskNames.length,
      },
      importantEvents,
      reflection: '',
      reflectionStatus: 'pending',
    };
  }

  static async upsertDailyStats(date: string) {
    const current = this.normalizeJournal(useCompanionStore.getState().journal);
    const collected = this.collectDailyEntry(date);
    const existing = current.find(entry => entry.date === date);
    const updated: JournalEntry = existing
      ? {
          ...existing,
          stats: collected.stats,
          importantEvents: unique([...existing.importantEvents, ...collected.importantEvents]),
          reflectionStatus: existing.reflection ? existing.reflectionStatus : 'pending',
        }
      : collected;

    const next = [...current.filter(entry => entry.date !== date), updated].sort((a, b) => a.date.localeCompare(b.date));
    useCompanionStore.setState({ journal: next });
    await CompanionStorageService.saveJournal(next);
    if (updated.importantEvents.length > 0) {
      MemoryExtractionService.queueJournalEntry(updated.importantEvents.join('\n'), 'journal').catch((error) => {
        console.error('JournalService: failed to queue journal memory extraction', error);
      });
    }
    return updated;
  }

  static async ensureDailyReflection(date: string) {
    const config = useCompanionStore.getState().config;
    if (config.journalEnabled === false || dailyInFlight.has(date)) return;

    dailyInFlight.add(date);
    try {
      const entry = await this.upsertDailyStats(date);
      if (entry.reflectionStatus === 'generated' && entry.reflection) return;

      const memories = MemoryService.getMostImportantMemories(useCompanionStore.getState().memories, 6);
      const reflection = await GeminiService.generateJournalReflection(this.buildDailyPrompt(entry, memories));
      await this.saveDailyReflection(date, reflection);
    } catch (error) {
      console.error('JournalService: daily reflection failed', error);
      await this.markDailyPending(date);
    } finally {
      dailyInFlight.delete(date);
    }
  }

  static async saveDailyReflection(date: string, reflection: string) {
    const current = this.normalizeJournal(useCompanionStore.getState().journal);
    const entry = current.find(item => item.date === date) || this.collectDailyEntry(date);
    const updated: JournalEntry = {
      ...entry,
      reflection,
      content: reflection,
      reflectionStatus: reflection ? 'generated' : 'pending',
      generatedAt: reflection ? nowIso() : entry.generatedAt,
    };

    const next = [...current.filter(item => item.date !== date), updated].sort((a, b) => a.date.localeCompare(b.date));
    useCompanionStore.setState({ journal: next });
    await CompanionStorageService.saveJournal(next);
    if (reflection) {
      MemoryExtractionService.queueJournalEntry(reflection, 'daily_reflection').catch((error) => {
        console.error('JournalService: failed to queue reflection memory extraction', error);
      });
    }
  }

  static async markDailyPending(date: string) {
    const current = this.normalizeJournal(useCompanionStore.getState().journal);
    const entry = current.find(item => item.date === date) || this.collectDailyEntry(date);
    const updated = { ...entry, reflectionStatus: 'pending' as const };
    const next = [...current.filter(item => item.date !== date), updated].sort((a, b) => a.date.localeCompare(b.date));
    useCompanionStore.setState({ journal: next });
    await CompanionStorageService.saveJournal(next);
  }

  static buildDailyPrompt(entry: JournalEntry, memories: CompanionMemory[]) {
    const profile = useCompanionStore.getState().profile;
    return `Write a warm Companion journal reflection for ${entry.date}.

Tone: supportive, observant, human. Avoid analytics language and productivity jargon.
Length: 50-120 words.
Address style: Call the user as "${profile.userAddressStyle || 'you'}" when it fits naturally. User display name: "${profile.userDisplayName || 'the user'}".

Today's statistics:
- Focus hours: ${entry.stats.focusHours}
- Completed tasks: ${entry.stats.completedTasks}
- Streak: ${entry.stats.streak}

Completed tasks and important events:
${entry.importantEvents.length ? entry.importantEvents.map(event => `- ${event}`).join('\n') : '- No major events were recorded.'}

Important memories:
${memories.length ? memories.map(memory => `- [${memory.category}] ${memory.content}`).join('\n') : '- No important memories yet.'}

Write as if you quietly observed the user's day. Do not mention percentages, performance, reports, or software logging.`;
  }

  static getPeriodBounds(kind: PeriodKind, date = new Date()) {
    const startsOn = kind === 'week'
      ? startOfWeek(date, { weekStartsOn: 1 })
      : startOfMonth(date);
    const endsOn = kind === 'week'
      ? endOfWeek(date, { weekStartsOn: 1 })
      : endOfMonth(date);

    return {
      period: kind === 'week' ? format(startsOn, "yyyy-'W'II") : format(startsOn, 'yyyy-MM'),
      startDate: format(startsOn, 'yyyy-MM-dd'),
      endDate: format(endsOn, 'yyyy-MM-dd'),
    };
  }

  static async ensurePeriodSummary(kind: PeriodKind, date = new Date()) {
    const config = useCompanionStore.getState().config;
    if (kind === 'week' && config.weeklySummaryEnabled === false) return;
    if (kind === 'month' && config.monthlySummaryEnabled === false) return;

    const bounds = this.getPeriodBounds(kind, date);
    const lockKey = `${kind}:${bounds.period}`;
    if (summaryInFlight.has(lockKey)) return;

    summaryInFlight.add(lockKey);
    try {
      const summaries = kind === 'week'
        ? this.normalizeSummaries(await CompanionStorageService.loadWeeklySummaries())
        : this.normalizeSummaries(await CompanionStorageService.loadMonthlySummaries());

      const existing = summaries.find(summary => summary.period === bounds.period);
      if (existing?.status === 'generated' && existing.summary) return;

      const entries = this.normalizeJournal(useCompanionStore.getState().journal)
        .filter(entry => entry.date >= bounds.startDate && entry.date <= bounds.endDate);

      const pending: JournalSummary = existing || {
        ...bounds,
        summary: '',
        status: 'pending',
      };

      await this.saveSummary(kind, [...summaries.filter(summary => summary.period !== bounds.period), pending]);

      const summaryText = await GeminiService.generateJournalSummary(this.buildSummaryPrompt(kind, pending, entries));
      await this.saveSummary(kind, [
        ...summaries.filter(summary => summary.period !== bounds.period),
        {
          ...pending,
          summary: summaryText,
          status: summaryText ? 'generated' : 'pending',
          generatedAt: summaryText ? nowIso() : pending.generatedAt,
        },
      ]);
    } catch (error) {
      console.error(`JournalService: ${kind} summary failed`, error);
    } finally {
      summaryInFlight.delete(lockKey);
    }
  }

  static async saveSummary(kind: PeriodKind, summaries: JournalSummary[]) {
    const normalized = this.normalizeSummaries(summaries).sort((a, b) => a.period.localeCompare(b.period));
    if (kind === 'week') {
      useCompanionStore.setState({ weeklySummaries: normalized });
      await CompanionStorageService.saveWeeklySummaries(normalized);
    } else {
      useCompanionStore.setState({ monthlySummaries: normalized });
      await CompanionStorageService.saveMonthlySummaries(normalized);
    }
  }

  static buildSummaryPrompt(kind: PeriodKind, summary: JournalSummary, entries: JournalEntry[]) {
    const profile = useCompanionStore.getState().profile;
    const reflections = entries
      .filter(entry => entry.reflection)
      .map(entry => `${entry.date}: ${entry.reflection}`)
      .join('\n\n');

    const totals = entries.reduce((acc, entry) => ({
      focusHours: acc.focusHours + entry.stats.focusHours,
      completedTasks: acc.completedTasks + entry.stats.completedTasks,
    }), { focusHours: 0, completedTasks: 0 });

    return `Write a warm ${kind} Companion journal summary for ${summary.startDate} to ${summary.endDate}.

Maximum length: 150 words.
Tone: supportive, observant, human. Avoid analytics language, comparisons, and productivity jargon.
Address style: Call the user as "${profile.userAddressStyle || 'you'}" when it fits naturally. User display name: "${profile.userDisplayName || 'the user'}".

Quiet context:
- Focus hours across entries: ${Math.round(totals.focusHours * 10) / 10}
- Completed tasks across entries: ${totals.completedTasks}

Daily reflections:
${reflections || 'No daily reflections were available yet.'}

Write like a companion remembering the user's journey, not like software reporting results.`;
  }

  static async ensureMissingReflections() {
    const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd');
    const previousCompletedWeekDate = subDays(startOfWeek(new Date(), { weekStartsOn: 1 }), 1);
    const previousCompletedMonthDate = subDays(startOfMonth(new Date()), 1);

    await this.ensureDailyReflection(yesterday);
    await this.ensurePeriodSummary('week', previousCompletedWeekDate);
    await this.ensurePeriodSummary('month', previousCompletedMonthDate);
  }

  static async ensureCompletedPeriodSummaries(date: string) {
    const parsed = parseISO(date);
    const weekBounds = this.getPeriodBounds('week', parsed);
    const monthBounds = this.getPeriodBounds('month', parsed);

    if (weekBounds.endDate === date) {
      await this.ensurePeriodSummary('week', parsed);
    }

    if (monthBounds.endDate === date) {
      await this.ensurePeriodSummary('month', parsed);
    }
  }

  static createBackup(dailyEntries: JournalEntry[], weeklySummaries: JournalSummary[], monthlySummaries: JournalSummary[]): JournalBackup {
    return {
      version: 1,
      exportedAt: nowIso(),
      dailyEntries: this.normalizeJournal(dailyEntries),
      weeklySummaries: this.normalizeSummaries(weeklySummaries),
      monthlySummaries: this.normalizeSummaries(monthlySummaries),
    };
  }

  static normalizeBackup(raw: unknown): JournalBackup | null {
    if (!raw || typeof raw !== 'object') return null;
    const backup = raw as Partial<JournalBackup>;
    if (!Array.isArray(backup.dailyEntries)) return null;

    return {
      version: 1,
      exportedAt: typeof backup.exportedAt === 'string' ? backup.exportedAt : nowIso(),
      dailyEntries: this.normalizeJournal(backup.dailyEntries),
      weeklySummaries: this.normalizeSummaries(backup.weeklySummaries || []),
      monthlySummaries: this.normalizeSummaries(backup.monthlySummaries || []),
    };
  }

  static todayKey = todayKey;
}
