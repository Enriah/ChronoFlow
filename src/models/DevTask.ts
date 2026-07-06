import type { LinkedAction } from './LinkedAction';

export type DevTaskType =
  | 'coding' | 'devops' | 'learning' | 'debugging' | 'meeting'
  | 'deployment' | 'incident' | 'review' | 'documentation';

export type DevTaskStatus =
  | 'planned' | 'running' | 'paused' | 'completed' | 'skipped' | 'overdue';

export type DevTask = {
  id: string;
  title: string;
  description?: string;
  type: DevTaskType;
  project?: string;
  tags?: string[];
  date: string;
  startTime?: string;
  endTime?: string;
  plannedDurationMinutes: number;
  actualDurationMinutes?: number;
  status: DevTaskStatus;
  priority?: 'low' | 'medium' | 'high';
  deepWork?: boolean;
  linkedActions?: LinkedAction[];
};
