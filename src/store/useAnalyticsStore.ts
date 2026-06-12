import { create } from 'zustand';
import type { TaskSession } from '../models/TaskSession';
import { LocalStorageService } from '../services/persistence/storage';
import { emitCompanionEvent } from '../companion/events/CompanionEventManager';

const STREAK_MILESTONES = [3, 7, 14, 30, 50, 100];

function getFocusDayStreak(sessions: TaskSession[]) {
  const focusDays = new Set(sessions.map((session) => new Date(session.startTime).toISOString().split('T')[0]));
  let streak = 0;
  const cursor = new Date();

  while (focusDays.has(cursor.toISOString().split('T')[0])) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}

interface AnalyticsState {
  sessions: TaskSession[];
  hydrate: () => void;
  addSession: (session: TaskSession) => void;
  getWeeklyStats: () => { 
    totalFocusTime: number; 
    taskBreakdown: Record<string, number>;
    dailyFocusTime: Record<string, number>; // "YYYY-MM-DD": duration
  };
  getRankings: () => { name: string; duration: number }[];
}

export const useAnalyticsStore = create<AnalyticsState>((set, get) => ({
  sessions: [],

  hydrate: () => {
    const sessions = LocalStorageService.loadTaskSessions();
    set({ sessions });
  },

  addSession: (session) => {
    const newSessions = [...get().sessions, session];
    set({ sessions: newSessions });
    LocalStorageService.saveTaskSessions(newSessions);

    const streak = getFocusDayStreak(newSessions);
    if (STREAK_MILESTONES.includes(streak)) {
      emitCompanionEvent('streak_milestone', { streak, milestone: streak });
    }
  },

  getWeeklyStats: () => {
    const { sessions } = get();
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).getTime();
    
    const weeklySessions = sessions.filter(s => s.startTime >= oneWeekAgo);
    
    let totalFocusTime = 0;
    const taskBreakdown: Record<string, number> = {};
    const dailyFocusTime: Record<string, number> = {};

    weeklySessions.forEach(s => {
      totalFocusTime += s.duration;
      
      // Task breakdown
      taskBreakdown[s.taskName] = (taskBreakdown[s.taskName] || 0) + s.duration;
      
      // Daily breakdown
      const dateKey = new Date(s.startTime).toISOString().split('T')[0];
      dailyFocusTime[dateKey] = (dailyFocusTime[dateKey] || 0) + s.duration;
    });

    return { totalFocusTime, taskBreakdown, dailyFocusTime };
  },

  getRankings: () => {
    const { taskBreakdown } = get().getWeeklyStats();
    return Object.entries(taskBreakdown)
      .map(([name, duration]) => ({ name, duration }))
      .sort((a, b) => b.duration - a.duration);
  }
}));
