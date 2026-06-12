import { create } from 'zustand';
import type { PlannedTask } from '../models/PlannedTask';
import { LocalStorageService } from '../services/persistence/storage';
import { useAppStore } from './useAppStore';
import { emitCompanionEvent } from '../companion/events/CompanionEventManager';
import { getTodayDateString } from '../utils/time';

interface PlannerState {
  tasks: PlannedTask[];
  hydrate: () => void;
  addTask: (task: PlannedTask) => void;
  updateTask: (id: string, task: Partial<PlannedTask>) => void;
  deleteTask: (id: string) => void;
  toggleComplete: (id: string) => void;
}

export const usePlannerStore = create<PlannerState>((set, get) => ({
  tasks: [],

  hydrate: () => {
    const rawTasks = LocalStorageService.loadPlannedTasks();
    
    // Cleanup: Remove tasks older than 30 days to prevent storage bloat
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    thirtyDaysAgo.setHours(0, 0, 0, 0);
    
    const tasks = rawTasks.filter(t => {
      // t.date is YYYY-MM-DD
      const [year, month, day] = t.date.split('-').map(Number);
      const taskDate = new Date(year, month - 1, day);
      return taskDate >= thirtyDaysAgo;
    });

    if (tasks.length !== rawTasks.length) {
      LocalStorageService.savePlannedTasks(tasks);
    }

    set({ tasks });
  },

  addTask: (task) => {
    const newTasks = [...get().tasks, task];
    set({ tasks: newTasks });
    LocalStorageService.savePlannedTasks(newTasks);
    // Sync with active scheduler
    useAppStore.getState().syncWithPlanner();
  },

  updateTask: (id, updated) => {
    const newTasks = get().tasks.map((t) =>
      t.id === id ? { ...t, ...updated } : t
    );
    set({ tasks: newTasks });
    LocalStorageService.savePlannedTasks(newTasks);
    // Sync with active scheduler
    useAppStore.getState().syncWithPlanner();
  },

  deleteTask: (id) => {
    const newTasks = get().tasks.filter((t) => t.id !== id);
    set({ tasks: newTasks });
    LocalStorageService.savePlannedTasks(newTasks);
    // Note: If deleted from planner, we might want to delete from active too?
    // For now, syncWithPlanner only adds. Let's improve it if needed.
    useAppStore.getState().syncWithPlanner();
  },

  toggleComplete: (id) => {
    const previousTask = get().tasks.find((t) => t.id === id);
    const newTasks = get().tasks.map((t) =>
      t.id === id ? { ...t, completed: !t.completed } : t
    );
    set({ tasks: newTasks });
    LocalStorageService.savePlannedTasks(newTasks);
    useAppStore.getState().syncWithPlanner();

    const updatedTask = newTasks.find((t) => t.id === id);
    if (updatedTask?.completed && !previousTask?.completed) {
      emitCompanionEvent('task_completed', { taskId: updatedTask.id, taskName: updatedTask.title });

      const today = getTodayDateString();
      const todayTasks = newTasks.filter((t) => t.date === today);
      if (todayTasks.length > 0 && todayTasks.every((t) => t.completed)) {
        emitCompanionEvent('schedule_finished');
      }
    }
  },
}));
