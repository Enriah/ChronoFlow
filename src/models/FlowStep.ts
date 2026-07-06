export type FlowChecklistItem = {
  id: string;
  text: string;
  done: boolean;
};

export type FlowStep = {
  id: string;
  title: string;
  description?: string;
  plannedDurationMinutes?: number;
  checklist?: FlowChecklistItem[];
  actions?: string[];
  status: 'pending' | 'running' | 'completed' | 'skipped';
  startedAt?: string;
  completedAt?: string;
};
