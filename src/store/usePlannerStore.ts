import { create } from 'zustand';
import type { PlannedTask } from '../models/PlannedTask';
import { LocalStorageService } from '../services/persistence/storage';
import { useAppStore } from './useAppStore';

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
    const tasks = LocalStorageService.loadPlannedTasks();
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
    const newTasks = get().tasks.map((t) =>
      t.id === id ? { ...t, completed: !t.completed } : t
    );
    set({ tasks: newTasks });
    LocalStorageService.savePlannedTasks(newTasks);
    useAppStore.getState().syncWithPlanner();
  },
}));
