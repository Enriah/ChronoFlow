import type { LinkedAction } from './LinkedAction';
import type { DevTaskStatus, DevTaskType } from './DevTask';

export type Schedule = {
  id: string;
  title: string;
  startTime: number; // epoch milliseconds
  endTime: number; // epoch milliseconds
  date: string; // YYYY-MM-DD
  color: string;
  recurring: boolean;
  repeatDays: number[]; // 0 = Sunday, 1 = Monday, etc.
  linkedActions?: LinkedAction[];
  completed: boolean;
  linkedApp?: string;
  linkedUrl?: string;
  notificationsEnabled?: boolean;
  fromPlanner?: boolean;
  description?: string;
  type?: DevTaskType;
  project?: string;
  tags?: string[];
  plannedDurationMinutes?: number;
  actualDurationMinutes?: number;
  status?: DevTaskStatus;
  priority?: 'low' | 'medium' | 'high';
  deepWork?: boolean;
};
