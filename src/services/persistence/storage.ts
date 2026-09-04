import type { Schedule } from '../../models/Schedule';
import type { PlannedTask } from '../../models/PlannedTask';
import type { TaskSession } from '../../models/TaskSession';
import type { WorkSession } from '../../models/WorkSession';
import type { FlowStep } from '../../models/FlowStep';
import type { TimelineEvent, TimelineTrack } from '../../models/EventTimeline';

const timelineTypes = ['reminder', 'action', 'checklist', 'note', 'alert', 'flow_step', 'agent'] as const;
const agentDescriptionSources = ['self', 'previous_output'] as const;
const agentFailureModes = ['stop', 'retry', 'fallback', 'manual'] as const;

const normalizeTimelineTrack = (track: any, order: number): TimelineTrack => {
  const now = new Date().toISOString();
  return {
    id: track?.id || crypto.randomUUID(), name: track?.name || `Track ${order + 1}`,
    type: [...timelineTypes, 'custom'].includes(track?.type) ? track.type : 'custom',
    visible: track?.visible !== false, locked: !!track?.locked, muted: !!track?.muted,
    order: Number.isFinite(track?.order) ? track.order : order,
    createdAt: track?.createdAt || now, updatedAt: track?.updatedAt || now,
  };
};

const normalizeTimelineEvent = (event: any): TimelineEvent => {
  const now = new Date().toISOString();
  const agent = event?.agent || {};
  return {
    id: event?.id || crypto.randomUUID(), trackId: event?.trackId || '',
    title: event?.title || 'Untitled event', description: event?.description,
    type: timelineTypes.includes(event?.type) ? event.type : 'reminder',
    offsetMinutes: Math.max(0, Number(event?.offsetMinutes) || 0),
    durationMinutes: Number(event?.durationMinutes) > 0 ? Number(event.durationMinutes) : undefined,
    absoluteStartTime: event?.absoluteStartTime, absoluteEndTime: event?.absoluteEndTime,
    actions: Array.isArray(event?.actions) ? event.actions : [],
    agentProfileId: event?.agentProfileId,
    agentRunIds: Array.isArray(event?.agentRunIds) ? event.agentRunIds : [],
    agent: event?.type === 'agent' || event?.agent ? {
      nextEventName: typeof agent?.nextEventName === 'string' ? agent.nextEventName : undefined,
      timeoutMinutes: Number(agent?.timeoutMinutes) > 0 ? Number(agent.timeoutMinutes) : undefined,
      descriptionSource: agentDescriptionSources.includes(agent?.descriptionSource) ? agent.descriptionSource : 'self',
      descriptionAppend: typeof agent?.descriptionAppend === 'string' ? agent.descriptionAppend : undefined,
      requireApprovalBeforeNext: !!agent?.requireApprovalBeforeNext,
      writeOutputPath: typeof agent?.writeOutputPath === 'string' ? agent.writeOutputPath : undefined,
      onFail: agentFailureModes.includes(agent?.onFail) ? agent.onFail : 'stop',
    } : undefined,
    checklist: Array.isArray(event?.checklist) ? event.checklist.map((item: any) => ({ id: item.id || crypto.randomUUID(), text: item.text || '', done: !!item.done })) : [],
    noteTemplate: event?.noteTemplate, flowStepId: event?.flowStepId,
    triggerBehavior: {
      showPopup: event?.triggerBehavior?.showPopup !== false,
      playSound: !!event?.triggerBehavior?.playSound,
      autoDismiss: !!event?.triggerBehavior?.autoDismiss,
      autoDismissAfterSeconds: Math.max(1, Number(event?.triggerBehavior?.autoDismissAfterSeconds) || 30),
      requireUserAction: !!event?.triggerBehavior?.requireUserAction,
      launchActionsOnStart: !!event?.triggerBehavior?.launchActionsOnStart,
      closeManagedActionsOnEnd: !!event?.triggerBehavior?.closeManagedActionsOnEnd,
      closeMode: event?.triggerBehavior?.closeMode || 'soft',
      markCompletedOnEnd: event?.triggerBehavior?.markCompletedOnEnd !== false,
    },
    lifecycle: event?.lifecycle || {},
    status: ['pending', 'triggered', 'running', 'completed', 'dismissed', 'skipped', 'missed', 'failed', 'waiting_approval'].includes(event?.status) ? event.status : 'pending',
    createdAt: event?.createdAt || now, updatedAt: event?.updatedAt || now,
  };
};

const normalizeTimeline = (value: any) => ({
  timelineTracks: Array.isArray(value?.timelineTracks) ? value.timelineTracks.map(normalizeTimelineTrack) : [],
  timelineEvents: Array.isArray(value?.timelineEvents) ? value.timelineEvents.map(normalizeTimelineEvent) : [],
});

const normalizeAction = (action: any) => {
  const now = new Date().toISOString();
  return {
  ...action,
  type: action?.type === 'application' ? 'app' : (action?.type || 'url'),
  enabled: action?.enabled !== false,
  requiresConfirmation: action?.requiresConfirmation !== false,
  dangerLevel: action?.dangerLevel || 'safe',
  createdAt: action?.createdAt || now,
  updatedAt: action?.updatedAt || now,
  };
};

const normalizeStep = (step: any): FlowStep => ({
  id: step?.id || crypto.randomUUID(),
  title: step?.title || 'Untitled step',
  description: step?.description,
  plannedDurationMinutes: Number(step?.plannedDurationMinutes) || undefined,
  checklist: Array.isArray(step?.checklist) ? step.checklist.map((item: any) => ({ id: item.id || crypto.randomUUID(), text: item.text || '', done: !!item.done })) : [],
  actions: Array.isArray(step?.actions) ? step.actions : [],
  status: ['pending', 'running', 'completed', 'skipped'].includes(step?.status) ? step.status : 'pending',
  startedAt: step?.startedAt,
  completedAt: step?.completedAt,
});

const normalizeWorkSession = (session: any): WorkSession => {
  const now = new Date().toISOString();
  const legacyStartedAt = session?.startedAt || (session?.startTime ? new Date(session.startTime).toISOString() : undefined);
  const legacyStatus = session?.status === 'active' ? 'running' : session?.status;
  return {
    id: session?.id || crypto.randomUUID(),
    sourcePlannerTaskId: session?.sourcePlannerTaskId,
    title: session?.title || session?.taskTitle || session?.taskName || 'Migrated session',
    description: session?.description,
    project: session?.project,
    tags: Array.isArray(session?.tags) ? session.tags : [],
    plannedDurationMinutes: Number(session?.plannedDurationMinutes) || 30,
    startedAt: legacyStartedAt,
    endedAt: session?.endedAt || (session?.endTime ? new Date(session.endTime).toISOString() : undefined),
    pausedAt: session?.pausedAt,
    totalPausedMs: Number(session?.totalPausedMs ?? session?.pausedDurationMs) || 0,
    actualDurationMs: Number(session?.actualDurationMs ?? session?.duration) || undefined,
    status: ['planned', 'running', 'paused', 'completed', 'cancelled', 'overdue'].includes(legacyStatus) ? legacyStatus : 'planned',
    actions: Array.isArray(session?.actions) ? session.actions : [],
    flowSteps: Array.isArray(session?.flowSteps) ? session.flowSteps.map(normalizeStep) : [],
    activeStepId: session?.activeStepId,
    notes: session?.notes,
    interruptions: Number(session?.interruptions) || 0,
    ...normalizeTimeline(session),
    managedActionInstances: Array.isArray(session?.managedActionInstances) ? session.managedActionInstances : [],
    missedEventBehavior: ['mark_missed', 'trigger_immediately', 'ask'].includes(session?.missedEventBehavior) ? session.missedEventBehavior : 'trigger_immediately',
    createdAt: session?.createdAt || legacyStartedAt || now,
    updatedAt: session?.updatedAt || now,
  };
};

const normalizeSchedule = (schedule: any): Schedule => {
  const duration = Math.max(1, Math.round(((schedule.endTime || 0) - (schedule.startTime || 0)) / 60000));
  return {
    ...schedule,
    type: schedule.type || 'coding',
    plannedDurationMinutes: schedule.plannedDurationMinutes || duration,
    status: schedule.status || (schedule.completed ? 'completed' : 'planned'),
    tags: Array.isArray(schedule.tags) ? schedule.tags : [],
    linkedActions: Array.isArray(schedule.linkedActions) ? schedule.linkedActions.map(normalizeAction) : [],
  };
};

const normalizePlannedTask = (task: any): PlannedTask => ({
  ...task,
  type: undefined,
  category: undefined,
  plannedDurationMinutes: task.plannedDurationMinutes || 30,
  status: task.status || (task.completed ? 'completed' : 'planned'),
  tags: Array.isArray(task.tags) ? task.tags : [],
  linkedActions: Array.isArray(task.linkedActions) ? task.linkedActions.map(normalizeAction) : [],
  ...normalizeTimeline(task),
});

export interface StorageService {
  saveSchedules(schedules: Schedule[]): void;
  loadSchedules(): Schedule[];
  savePlannedTasks(tasks: PlannedTask[]): void;
  loadPlannedTasks(): PlannedTask[];
  saveTaskSessions(sessions: TaskSession[]): void;
  loadTaskSessions(): TaskSession[];
  saveWorkSessions(sessions: WorkSession[]): void;
  loadWorkSessions(): WorkSession[];
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
      return Array.isArray(parsed) ? parsed.map(normalizeSchedule) : [];
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
      return Array.isArray(parsed) ? parsed.map(normalizePlannedTask) : [];
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
  },
  saveWorkSessions(sessions) {
    localStorage.setItem('chronoflow_work_sessions_v2', JSON.stringify(sessions));
  },
  loadWorkSessions() {
    try {
      const current = localStorage.getItem('chronoflow_work_sessions_v2') || localStorage.getItem('chronoflow_work_sessions_v1');
      if (current) {
        const parsed = JSON.parse(current);
        return Array.isArray(parsed) ? parsed.map(normalizeWorkSession) : [];
      }
      return this.loadTaskSessions().map(normalizeWorkSession);
    } catch (error) {
      console.error('LocalStorageService: Failed to load work sessions', error);
      return [];
    }
  },
};
