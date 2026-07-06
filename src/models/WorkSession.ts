import type { FlowStep } from './FlowStep';
import type { ManagedActionInstance, MissedEventBehavior, TimelineEvent, TimelineTrack } from './EventTimeline';

export type WorkSessionStatus = 'planned' | 'running' | 'paused' | 'completed' | 'cancelled' | 'overdue';

export type WorkSession = {
  id: string;
  templateId?: string;
  sourcePlannerTaskId?: string;
  title: string;
  description?: string;
  project?: string;
  tags?: string[];
  plannedDurationMinutes: number;
  startedAt?: string;
  endedAt?: string;
  pausedAt?: string;
  totalPausedMs: number;
  actualDurationMs?: number;
  status: WorkSessionStatus;
  actions: string[];
  flowSteps: FlowStep[];
  activeStepId?: string;
  notes?: string;
  interruptions: number;
  timelineTracks: TimelineTrack[];
  timelineEvents: TimelineEvent[];
  managedActionInstances: ManagedActionInstance[];
  missedEventBehavior?: MissedEventBehavior;
  createdAt: string;
  updatedAt: string;
};
