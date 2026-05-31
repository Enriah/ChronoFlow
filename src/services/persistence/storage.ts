import type { Schedule } from '../../models/Schedule';
import type { PlannedTask } from '../../models/PlannedTask';
import type { TaskSession } from '../../models/TaskSession';

export interface StorageService {
  saveSchedules(schedules: Schedule[]): void;
  loadSchedules(): Schedule[];
  savePlannedTasks(tasks: PlannedTask[]): void;
  loadPlannedTasks(): PlannedTask[];
  saveTaskSessions(sessions: TaskSession[]): void;
  loadTaskSessions(): TaskSession[];
}

export const LocalStorageService: StorageService = {
  saveSchedules(schedules: Schedule[]) {
    try {
      localStorage.setItem('chronoflow_schedules', JSON.stringify(schedules));
    } catch (error) {
      console.error('LocalStorageService: Failed to save schedules', error);
    }
  },
  loadSchedules(): Schedule[] {
    try {
      const data = localStorage.getItem('chronoflow_schedules');
      if (!data) return [];
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.error('LocalStorageService: Failed to load schedules', error);
      return [];
    }
  },
  savePlannedTasks(tasks: PlannedTask[]) {
    try {
      localStorage.setItem('chronoflow_planned_tasks', JSON.stringify(tasks));
    } catch (error) {
      console.error('LocalStorageService: Failed to save planned tasks', error);
    }
  },
  loadPlannedTasks(): PlannedTask[] {
    try {
      const data = localStorage.getItem('chronoflow_planned_tasks');
      if (!data) return [];
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.error('LocalStorageService: Failed to load planned tasks', error);
      return [];
    }
  },
  saveTaskSessions(sessions: TaskSession[]) {
    try {
      localStorage.setItem('chronoflow_task_sessions', JSON.stringify(sessions));
    } catch (error) {
      console.error('LocalStorageService: Failed to save task sessions', error);
    }
  },
  loadTaskSessions(): TaskSession[] {
    try {
      const data = localStorage.getItem('chronoflow_task_sessions');
      if (!data) return [];
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.error('LocalStorageService: Failed to load task sessions', error);
      return [];
    }
  }
};
