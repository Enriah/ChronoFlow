import { differenceInCalendarDays, format } from 'date-fns';
import type { CompanionMilestone, CompanionMemory, JournalEntry, RelationshipProfile } from '../../models/companion/types';
import { CompanionStorageService } from '../../services/companion/StorageService';
import { LocalStorageService } from '../../services/persistence/storage';
import { useCompanionStore } from '../../store/useCompanionStore';
import { emitCompanionEvent } from '../events/CompanionEventManager';

const FOCUS_HOUR_MILESTONES = [10, 50, 100, 500];
const JOURNAL_MILESTONES = [1, 30, 100];
const MEMORY_MILESTONES = [1, 50];
const STREAK_MILESTONES = [7, 30, 100];

function dateKey(value: number | Date) {
  return format(value, 'yyyy-MM-dd');
}

function todayKey() {
  return dateKey(new Date());
}

function getFocusDayStreak() {
  const sessions = LocalStorageService.loadTaskSessions();
  const focusDays = new Set(sessions.map(session => dateKey(session.startTime)));
  let streak = 0;
  const cursor = new Date();

  while (focusDays.has(dateKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}

function earliestDate(candidates: string[]) {
  const valid = candidates.filter(Boolean).sort();
  return valid[0] || todayKey();
}

function totalFocusHours() {
  const totalMs = LocalStorageService.loadTaskSessions().reduce((sum, session) => sum + session.duration, 0);
  return Math.round((totalMs / 3600000) * 10) / 10;
}

function milestoneExists(milestones: CompanionMilestone[], id: string) {
  return milestones.some(milestone => milestone.id === id);
}

function buildMilestone(id: string, title: string, description: string, category: CompanionMilestone['category'], value?: number): CompanionMilestone {
  return {
    id,
    date: todayKey(),
    title,
    description,
    category,
    value,
  };
}

export class RelationshipService {
  static createDefaultProfile(): RelationshipProfile {
    const now = new Date().toISOString();
    return {
      firstSeenDate: todayKey(),
      daysKnown: 1,
      sharedFocusHours: 0,
      journalEntries: 0,
      memoriesCreated: 0,
      milestonesUnlocked: 0,
      updatedAt: now,
    };
  }

  static calculateProfile(existing: RelationshipProfile | null, memories: CompanionMemory[], journal: JournalEntry[], milestones: CompanionMilestone[]): RelationshipProfile {
    const sessions = LocalStorageService.loadTaskSessions();
    const firstSeenDate = existing?.firstSeenDate || earliestDate([
      sessions[0]?.startTime ? dateKey(sessions[0].startTime) : '',
      journal[0]?.date || '',
      memories[0]?.createdAt?.slice(0, 10) || '',
      todayKey(),
    ]);

    return {
      firstSeenDate,
      daysKnown: Math.max(1, differenceInCalendarDays(new Date(), new Date(`${firstSeenDate}T00:00:00`)) + 1),
      sharedFocusHours: totalFocusHours(),
      journalEntries: journal.length,
      memoriesCreated: memories.length,
      milestonesUnlocked: milestones.length,
      updatedAt: new Date().toISOString(),
    };
  }

  static detectMilestones(memories: CompanionMemory[], journal: JournalEntry[], existing: CompanionMilestone[]) {
    const next = [...existing];
    const unlocked: CompanionMilestone[] = [];
    const focusHours = totalFocusHours();
    const streak = getFocusDayStreak();

    const add = (milestone: CompanionMilestone) => {
      if (milestoneExists(next, milestone.id)) return;
      next.push(milestone);
      unlocked.push(milestone);
    };

    if (LocalStorageService.loadTaskSessions().length > 0) {
      add(buildMilestone('first_focus_session', 'First Focus Session', 'Completed first focus session.', 'focus'));
    }

    FOCUS_HOUR_MILESTONES.forEach(hours => {
      if (focusHours >= hours) {
        add(buildMilestone(`focus_${hours}_hours`, `${hours} Focus Hours`, `Spent over ${hours} focus hours here.`, 'focus', hours));
      }
    });

    JOURNAL_MILESTONES.forEach(count => {
      if (journal.length >= count) {
        add(buildMilestone(count === 1 ? 'first_journal' : `journal_${count}`, count === 1 ? 'First Journal' : `${count} Journals`, count === 1 ? 'Wrote the first Companion journal entry.' : `Wrote ${count} journal entries together.`, 'journal', count));
      }
    });

    MEMORY_MILESTONES.forEach(count => {
      if (memories.length >= count) {
        add(buildMilestone(count === 1 ? 'first_memory' : `memory_${count}`, count === 1 ? 'First Memory' : `${count} Memories`, count === 1 ? 'Created the first Companion memory.' : `Created ${count} memories together.`, 'memory', count));
      }
    });

    STREAK_MILESTONES.forEach(days => {
      if (streak >= days) {
        add(buildMilestone(`streak_${days}`, `${days}-Day Streak`, `Kept a ${days}-day focus streak.`, 'streak', days));
      }
    });

    if (memories.some(memory => memory.category === 'project')) {
      add(buildMilestone('first_project_memory', 'First Project Memory', 'Saved the first project memory.', 'project'));
    }

    return { milestones: next.sort((a, b) => a.date.localeCompare(b.date)), unlocked };
  }

  static async refreshRelationship() {
    try {
      const state = useCompanionStore.getState();
      const existingRelationship = state.relationship || await CompanionStorageService.loadRelationship();
      const existingMilestones = state.milestones.length > 0 ? state.milestones : await CompanionStorageService.loadMilestones();
      const { milestones, unlocked } = this.detectMilestones(state.memories, state.journal, existingMilestones);
      const relationship = this.calculateProfile(existingRelationship, state.memories, state.journal, milestones);

      useCompanionStore.setState({ relationship, milestones });
      await Promise.all([
        CompanionStorageService.saveRelationship(relationship),
        CompanionStorageService.saveMilestones(milestones),
      ]);

      const subtleMilestone = unlocked[0];
      if (subtleMilestone) {
        emitCompanionEvent('relationship', {
          milestone: subtleMilestone.value,
          relationshipMessage: subtleMilestone.description,
        });
      }

      return { relationship, milestones, unlocked };
    } catch (error) {
      console.error('RelationshipService: failed to refresh relationship', error);
      return null;
    }
  }
}
