import { create } from 'zustand';
import type { Schedule } from '../models/Schedule';
import { LocalStorageService } from '../services/persistence/storage';
import { getCurrentTask } from '../services/scheduler/engine';
import { alignToToday, getTodayDateString } from '../utils/time';
import { LauncherService } from '../services/actions/LauncherService';
import { AudioService } from '../services/audio/AudioService';
import { NotificationService } from '../services/notifications/NotificationService';

interface AppState {
  // State
  schedules: Schedule[];
  currentTask: Schedule | null;
  nextTask: Schedule | null;
  remainingMs: number;
  progress: number;
  isRunning: boolean;
  now: number;
  today: string; // YYYY-MM-DD
  
  // Workflow tracking
  lastTriggeredTaskId: string | null;
  lastWarningMs: number;

  // Actions
  hydrate: () => void;
  tick: () => void;
  toggleTimer: () => void;
  addSchedule: (schedule: Schedule) => void;
  updateSchedule: (id: string, schedule: Partial<Schedule>) => void;
  deleteSchedule: (id: string) => void;
  skipTask: () => void;
  syncWithPlanner: () => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  schedules: [],
  currentTask: null,
  nextTask: null,
  remainingMs: 0,
  progress: 0,
  isRunning: true,
  now: Date.now(),
  today: getTodayDateString(),
  lastTriggeredTaskId: null,
  lastWarningMs: 0,

  hydrate: () => {
    const today = getTodayDateString();
    const rawSchedules = LocalStorageService.loadSchedules();
    
    // Filter only today's schedules and align recurring ones
    const schedules = rawSchedules
      .filter(s => s.date === today || s.recurring)
      .map(s => {
        if (s.recurring) {
          return {
            ...s,
            startTime: alignToToday(s.startTime),
            endTime: alignToToday(s.endTime),
            date: today
          };
        }
        return s;
      })
      .sort((a, b) => a.startTime - b.startTime);

    // Save cleaned up schedules back to storage
    LocalStorageService.saveSchedules(schedules);

    // Init services
    AudioService.init();
    NotificationService.init();

    set({ schedules, today });
    
    // Sync with planner to pull any tasks scheduled for today
    get().syncWithPlanner();
    
    get().tick(); // Initial calculation
  },

  syncWithPlanner: () => {
    const { today, schedules } = get();
    const plannerTasks = LocalStorageService.loadPlannedTasks();
    
    const todayPlannedTasks = plannerTasks.filter(t => t.date === today);
    
    let newSchedules = [...schedules];
    let changed = false;

    // 1. Remove tasks that are no longer in the planner for today
    // (but only if they came from the planner, i.e., they aren't marked as 'recurring')
    const plannerIds = new Set(todayPlannedTasks.map(t => t.id));
    const schedulesBeforeCount = newSchedules.length;
    
    newSchedules = newSchedules.filter(s => {
      // Keep if recurring
      if (s.recurring) return true;
      // Keep if it's in the planner tasks for today
      if (plannerIds.has(s.id)) return true;
      // Keep if it was manually added today
      if (s.date === today) return true;
      
      return false; 
    });

    if (newSchedules.length !== schedulesBeforeCount) changed = true;

    // 2. Add or Update tasks from planner
    todayPlannedTasks.forEach(pt => {
      const existing = newSchedules.find(s => s.id === pt.id);
      
      const [startH, startM] = (pt.startTime || '00:00').split(':').map(Number);
      const [endH, endM] = (pt.endTime || '00:00').split(':').map(Number);
      
      // Use the task's own date for correct timestamping
      const [year, month, day] = pt.date.split('-').map(Number);
      const startTime = new Date(year, month - 1, day, startH, startM).getTime();
      const endTime = new Date(year, month - 1, day, endH, endM).getTime();

      const updatedSchedule: Schedule = {
        id: pt.id,
        title: pt.title,
        startTime,
        endTime,
        date: pt.date,
        color: pt.color || '#3b82f6',
        recurring: false,
        repeatDays: [],
        completed: pt.completed || false,
        linkedApp: '',
        linkedUrl: '',
        notificationsEnabled: true,
        linkedActions: existing?.linkedActions // Preserve linked actions if they exist
      };

      if (!existing) {
        newSchedules.push(updatedSchedule);
        changed = true;
      } else {
        // Check if anything changed
        if (
          existing.title !== updatedSchedule.title ||
          existing.startTime !== updatedSchedule.startTime ||
          existing.endTime !== updatedSchedule.endTime ||
          existing.completed !== updatedSchedule.completed ||
          existing.color !== updatedSchedule.color
        ) {
          newSchedules = newSchedules.map(s => s.id === pt.id ? updatedSchedule : s);
          changed = true;
        }
      }
    });

    if (changed) {
      set({ schedules: newSchedules });
      LocalStorageService.saveSchedules(newSchedules);
    }
  },

  tick: () => {
    const { schedules, lastTriggeredTaskId, lastWarningMs, today, isRunning } = get();
    
    const now = Date.now();
    const currentToday = getTodayDateString();

    // Midnight rollover detection - MUST run even if !isRunning
    if (currentToday !== today) {
      set({ today: currentToday, schedules: [] });
      get().hydrate(); // Re-hydrate will filter, sync, and save the new day state
      return;
    }

    if (!isRunning) return;
    
    const { currentTask, nextTask } = getCurrentTask(now, schedules);
    
    let remainingMs = 0;
    let progress = 0;

    if (currentTask) {
      remainingMs = Math.max(0, currentTask.endTime - now);
      const total = currentTask.endTime - currentTask.startTime;
      progress = total > 0 ? ((total - remainingMs) / total) * 100 : 100;

      // Handle Task Start Hook
      if (currentTask.id !== lastTriggeredTaskId) {
        set({ lastTriggeredTaskId: currentTask.id });
        
        // Execute Linked Actions
        if (currentTask.linkedActions && Array.isArray(currentTask.linkedActions)) {
          currentTask.linkedActions.forEach(action => {
            if (action) LauncherService.execute(action);
          });
        }

        // Play Start Sound
        AudioService.trigger('taskStarted');

        // Notification
        NotificationService.notify('Session Started', `Now focusing on: ${currentTask.title}`);
      }

      // Handle Warning Hooks
      const remainingMinutes = Math.floor(remainingMs / 60000);
      const remainingSeconds = Math.floor((remainingMs % 60000) / 1000);
      
      // Warn at 5m and 1m (only once per minute)
      if ((remainingMinutes === 5 || remainingMinutes === 1) && remainingSeconds === 0) {
        if (lastWarningMs !== remainingMs) {
          set({ lastWarningMs: remainingMs });
          
          // If we are at 1 minute and there is a next task, play "nextTaskStarting"
          if (remainingMinutes === 1 && nextTask) {
            AudioService.trigger('nextTaskStarting');
          } else {
            AudioService.trigger('taskEndingSoon');
          }

          NotificationService.notify('Transition Warning', `${currentTask.title} ending in ${remainingMinutes} minute(s).`);
        }
      }
    } else {
      // If we were in a task and it just ended
      if (lastTriggeredTaskId) {
        set({ lastTriggeredTaskId: null });
        AudioService.trigger('taskCompleted');
        NotificationService.notify('Session Completed', 'Your focus session has finished.');
      }
    }

    set({ 
      now, 
      currentTask, 
      nextTask, 
      remainingMs, 
      progress: Math.min(100, Math.max(0, progress)) 
    });
  },

  toggleTimer: () => set((state) => ({ isRunning: !state.isRunning })),

  addSchedule: (schedule) => {
    const newSchedules = [...get().schedules, schedule].sort((a, b) => a.startTime - b.startTime);
    set({ schedules: newSchedules });
    LocalStorageService.saveSchedules(newSchedules);
    get().tick();
  },

  updateSchedule: (id, updated) => {
    const newSchedules = get().schedules
      .map((s) => (s.id === id ? { ...s, ...updated } : s))
      .sort((a, b) => a.startTime - b.startTime);
    set({ schedules: newSchedules });
    LocalStorageService.saveSchedules(newSchedules);
    get().tick();
  },

  deleteSchedule: (id) => {
    const newSchedules = get().schedules.filter((s) => s.id !== id);
    set({ schedules: newSchedules });
    LocalStorageService.saveSchedules(newSchedules);
    get().tick();
  },

  skipTask: () => {
    const { currentTask } = get();
    if (!currentTask) return;

    // To "skip", we effectively end the current task now
    const now = Date.now();
    get().updateSchedule(currentTask.id, { endTime: now });
  },
}));
