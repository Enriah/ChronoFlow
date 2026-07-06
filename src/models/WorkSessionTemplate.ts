import type { FlowStep } from './FlowStep';
import type { TimelineEvent, TimelineTrack } from './EventTimeline';

export type WorkSessionTemplate = {
  id: string;
  name: string;
  description?: string;
  project?: string;
  tags?: string[];
  defaultDurationMinutes: number;
  actions: string[];
  flowSteps: FlowStep[];
  timelineTracks: TimelineTrack[];
  timelineEvents: TimelineEvent[];
  notesTemplate?: string;
  createdAt: string;
  updatedAt: string;
};
