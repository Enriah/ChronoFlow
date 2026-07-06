import type { DevTaskStatus, DevTaskType } from './DevTask';
import type { LinkedAction } from './LinkedAction';
import type { TimelineEvent, TimelineTrack } from './EventTimeline';

export type PlannedTask = {
  id: string;
  title: string;
  description?: string;
  date: string; // ISO string (YYYY-MM-DD)
  startTime?: string; // HH:mm
  endTime?: string; // HH:mm
  category?: string;
  tags?: string[];
  completed?: boolean;
  color?: string;
  type?: DevTaskType;
  project?: string;
  plannedDurationMinutes?: number;
  actualDurationMinutes?: number;
  status?: DevTaskStatus;
  priority?: 'low' | 'medium' | 'high';
  deepWork?: boolean;
  linkedActions?: LinkedAction[];
  timelineTracks?: TimelineTrack[];
  timelineEvents?: TimelineEvent[];
};
