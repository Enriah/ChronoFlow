export type TimelineEventType = 'reminder' | 'action' | 'checklist' | 'note' | 'alert' | 'flow_step';

export type TimelineTrack = {
  id: string;
  name: string;
  type?: TimelineEventType | 'custom';
  visible: boolean;
  locked: boolean;
  muted?: boolean;
  order: number;
  createdAt: string;
  updatedAt: string;
};

export type TimelineChecklistItem = { id: string; text: string; done: boolean };
export type TimelineEventStatus = 'pending' | 'triggered' | 'running' | 'completed' | 'dismissed' | 'skipped' | 'missed' | 'failed';

export type TimelineEvent = {
  id: string;
  trackId: string;
  title: string;
  description?: string;
  type: TimelineEventType;
  offsetMinutes: number;
  durationMinutes?: number;
  absoluteStartTime?: string;
  absoluteEndTime?: string;
  actions?: string[];
  checklist?: TimelineChecklistItem[];
  noteTemplate?: string;
  flowStepId?: string;
  triggerBehavior: {
    showPopup: boolean;
    playSound?: boolean;
    autoDismiss?: boolean;
    autoDismissAfterSeconds?: number;
    requireUserAction?: boolean;
    launchActionsOnStart?: boolean;
    closeManagedActionsOnEnd?: boolean;
    closeMode?: 'soft' | 'force_after_confirm' | 'never';
    markCompletedOnEnd?: boolean;
  };
  lifecycle: {
    triggeredAt?: string;
    completedAt?: string;
    dismissedAt?: string;
    skippedAt?: string;
    missedAt?: string;
    launchedManagedActionIds?: string[];
  };
  status: TimelineEventStatus;
  createdAt: string;
  updatedAt: string;
};

export type ManagedActionInstance = {
  id: string;
  sourceEventId: string;
  sourceSessionId: string;
  actionId: string;
  actionType: 'app' | 'url' | 'folder' | 'file' | 'command';
  label: string;
  startedAt: string;
  endedAt?: string;
  status: 'starting' | 'running' | 'closed' | 'failed' | 'unknown';
  processId?: number;
  windowLabel?: string;
  url?: string;
  path?: string;
  canAutoClose: boolean;
  closeStrategy: 'process' | 'tauri_window' | 'browser_unmanaged' | 'explorer_unmanaged' | 'command_child' | 'none';
  error?: string;
};

export type MissedEventBehavior = 'mark_missed' | 'trigger_immediately' | 'ask';
