import type { Schedule } from '../../models/Schedule';

export type TaskResult = {
  currentTask: Schedule | null;
  nextTask: Schedule | null;
};

/**
 * Calculates the current active task and the immediate next task.
 * 
 * Logic:
 * 1. Find the first task that contains 'nowMs'.
 * 2. Find the first task that starts AFTER 'nowMs' (and isn't the current task).
 * 
 * NOTE: 'schedules' MUST be pre-sorted by startTime for correct behavior.
 */
export function getCurrentTask(nowMs: number, schedules: Schedule[]): TaskResult {
  if (schedules.length === 0) {
    return { currentTask: null, nextTask: null };
  }

  // Find the first task currently active
  const currentTask = schedules.find(s => nowMs >= s.startTime && nowMs < s.endTime) || null;

  // Find the first task starting after now
  const nextTask = schedules.find(s => s.startTime > nowMs && s.id !== currentTask?.id) || null;

  return {
    currentTask,
    nextTask
  };
}
