import { create } from 'zustand';
import type { WorkSession } from '../../models/WorkSession';
import type { FlowStep } from '../../models/FlowStep';
import { LocalStorageService } from '../../services/persistence/storage';
import type { ManagedActionInstance, TimelineEvent } from '../../models/EventTimeline';
import { TimelineEventScheduler } from '../../services/timeline/TimelineEventScheduler';

type SessionDraft = Pick<WorkSession, 'title' | 'plannedDurationMinutes'> & Partial<Omit<WorkSession, 'id' | 'title' | 'plannedDurationMinutes' | 'createdAt' | 'updatedAt'>>;

interface WorkSessionState {
  sessions: WorkSession[];
  activeSession: WorkSession | null;
  hydrate: () => void;
  tick: () => void;
  create: (draft: SessionDraft) => WorkSession;
  update: (id: string, updates: Partial<WorkSession>) => void;
  duplicate: (id: string) => WorkSession | null;
  remove: (id: string) => void;
  start: (id: string) => void;
  pause: () => void;
  resume: () => void;
  continueLater: () => void;
  complete: () => void;
  cancel: () => void;
  logInterruption: (note?: string) => void;
  updateNotes: (notes: string) => void;
  startStep: (stepId: string) => void;
  completeStep: (stepId: string) => void;
  skipStep: (stepId: string) => void;
  toggleChecklistItem: (stepId: string, itemId: string) => void;
  updateTimelineEvent: (eventId: string, updates: Partial<TimelineEvent>) => void;
  completeTimelineEvent: (eventId: string) => void;
  skipTimelineEvent: (eventId: string) => void;
  dismissTimelineEvent: (eventId: string) => void;
  snoozeTimelineEvent: (eventId: string, minutes?: number) => void;
  toggleTimelineChecklistItem: (eventId: string, itemId: string) => void;
  addManagedActionInstance: (instance: ManagedActionInstance) => void;
}

export function getSessionElapsedMs(session: WorkSession, now = Date.now()) {
  if (!session.startedAt) return session.actualDurationMs || 0;
  const end = session.endedAt ? new Date(session.endedAt).getTime() : (session.pausedAt ? new Date(session.pausedAt).getTime() : now);
  return Math.max(0, end - new Date(session.startedAt).getTime() - session.totalPausedMs);
}

const cloneSteps = (steps: FlowStep[] = []): FlowStep[] => steps.map((step) => ({
  ...step,
  id: crypto.randomUUID(), status: 'pending', startedAt: undefined, completedAt: undefined,
  checklist: step.checklist?.map((item) => ({ ...item, id: crypto.randomUUID(), done: false })) || [],
}));

const cloneTimeline = (events: TimelineEvent[] = []): TimelineEvent[] => events.map((event) => ({
  ...event, id: crypto.randomUUID(), status: 'pending', lifecycle: {},
  checklist: event.checklist?.map((item) => ({ ...item, id: crypto.randomUUID(), done: false })) || [],
}));

export const useWorkSessionStore = create<WorkSessionState>((set, get) => {
  const persist = (sessions: WorkSession[], activeSession: WorkSession | null) => {
    LocalStorageService.saveWorkSessions(sessions);
    set({ sessions, activeSession });
  };
  const replaceActive = (updated: WorkSession | null) => {
    if (!updated) return;
    persist(get().sessions.map((session) => session.id === updated.id ? updated : session), updated);
  };

  return {
    sessions: [], activeSession: null,
    hydrate: () => {
      const sessions = LocalStorageService.loadWorkSessions();
      const activeSession = sessions.find((session) => ['running', 'paused', 'overdue'].includes(session.status)) || null;
      set({ sessions, activeSession });
    },
    tick: () => {
      const active = get().activeSession;
      if (!active || active.status === 'paused') return;
      const overdue = getSessionElapsedMs(active) > active.plannedDurationMinutes * 60_000;
      const transitions = TimelineEventScheduler.evaluate(active.timelineEvents || [], getSessionElapsedMs(active));
      if (!transitions.length && (!overdue || active.status === 'overdue')) return;
      const byId = new Map(transitions.map((transition) => [transition.eventId, transition]));
      replaceActive({
        ...active,
        status: overdue ? 'overdue' : active.status,
        timelineEvents: (active.timelineEvents || []).map((event) => {
          const transition = byId.get(event.id); if (!transition) return event;
          return { ...event, status: transition.status, lifecycle: { ...event.lifecycle, triggeredAt: transition.status === 'triggered' ? transition.at : event.lifecycle.triggeredAt, completedAt: transition.status === 'completed' ? transition.at : event.lifecycle.completedAt }, updatedAt: transition.at };
        }),
        updatedAt: new Date().toISOString(),
      });
    },
    create: (draft) => {
      const now = new Date().toISOString();
      const session: WorkSession = {
        id: crypto.randomUUID(), title: draft.title.trim() || 'Untitled session',
        description: draft.description, project: draft.project, tags: draft.tags || [],
        templateId: draft.templateId, plannedDurationMinutes: Math.max(1, draft.plannedDurationMinutes),
        totalPausedMs: 0, status: 'planned', actions: draft.actions || [],
        flowSteps: cloneSteps(draft.flowSteps), notes: draft.notes || '', interruptions: 0,
        timelineTracks: draft.timelineTracks || [], timelineEvents: cloneTimeline(draft.timelineEvents),
        managedActionInstances: [], missedEventBehavior: draft.missedEventBehavior || 'trigger_immediately',
        sourcePlannerTaskId: draft.sourcePlannerTaskId,
        createdAt: now, updatedAt: now,
      };
      const sessions = [session, ...get().sessions];
      persist(sessions, get().activeSession); return session;
    },
    update: (id, updates) => {
      const now = new Date().toISOString();
      const sessions = get().sessions.map((session) => session.id === id ? { ...session, ...updates, updatedAt: now } : session);
      const active = get().activeSession?.id === id ? sessions.find((session) => session.id === id) || null : get().activeSession;
      persist(sessions, active);
    },
    duplicate: (id) => {
      const source = get().sessions.find((session) => session.id === id); if (!source) return null;
      return get().create({ ...source, title: `${source.title} copy`, templateId: undefined, flowSteps: source.flowSteps, notes: source.notes });
    },
    remove: (id) => {
      if (get().activeSession?.id === id) return;
      persist(get().sessions.filter((session) => session.id !== id), get().activeSession);
    },
    start: (id) => {
      if (get().activeSession && get().activeSession?.id !== id) return;
      const source = get().sessions.find((session) => session.id === id); if (!source) return;
      const now = new Date().toISOString();
      replaceActive({ ...source, status: 'running', startedAt: source.startedAt || now, pausedAt: undefined, updatedAt: now });
    },
    pause: () => {
      const active = get().activeSession; if (!active || !['running', 'overdue'].includes(active.status)) return;
      const now = new Date().toISOString();
      replaceActive({ ...active, status: 'paused', pausedAt: now, interruptions: active.interruptions + 1, updatedAt: now });
    },
    resume: () => {
      const active = get().activeSession; if (!active || active.status !== 'paused') return;
      const nowMs = Date.now();
      const pausedFor = active.pausedAt ? nowMs - new Date(active.pausedAt).getTime() : 0;
      const next = { ...active, pausedAt: undefined, totalPausedMs: active.totalPausedMs + pausedFor, updatedAt: new Date(nowMs).toISOString() };
      replaceActive({ ...next, status: getSessionElapsedMs(next, nowMs) > next.plannedDurationMinutes * 60_000 ? 'overdue' : 'running' });
    },
    continueLater: () => get().pause(),
    complete: () => {
      const active = get().activeSession; if (!active) return;
      const now = Date.now();
      const finalPaused = active.pausedAt ? now - new Date(active.pausedAt).getTime() : 0;
      const updated = { ...active, status: 'completed' as const, endedAt: new Date(now).toISOString(), pausedAt: undefined, totalPausedMs: active.totalPausedMs + finalPaused, updatedAt: new Date(now).toISOString() };
      updated.actualDurationMs = getSessionElapsedMs(updated, now);
      persist(get().sessions.map((session) => session.id === updated.id ? updated : session), null);
    },
    cancel: () => {
      const active = get().activeSession; if (!active) return;
      const now = new Date().toISOString();
      const updated = { ...active, status: 'cancelled' as const, endedAt: now, actualDurationMs: getSessionElapsedMs(active), updatedAt: now };
      persist(get().sessions.map((session) => session.id === updated.id ? updated : session), null);
    },
    logInterruption: (note) => {
      const active = get().activeSession; if (!active) return;
      const stamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const notes = note ? `${active.notes || ''}${active.notes ? '\n' : ''}[${stamp}] Interruption: ${note}` : active.notes;
      replaceActive({ ...active, interruptions: active.interruptions + 1, notes, updatedAt: new Date().toISOString() });
    },
    updateNotes: (notes) => {
      const active = get().activeSession; if (active) replaceActive({ ...active, notes, updatedAt: new Date().toISOString() });
    },
    startStep: (stepId) => {
      const active = get().activeSession; if (!active) return;
      const now = new Date().toISOString();
      replaceActive({ ...active, activeStepId: stepId, flowSteps: active.flowSteps.map((step) => step.id === stepId ? { ...step, status: 'running', startedAt: step.startedAt || now } : step), updatedAt: now });
    },
    completeStep: (stepId) => {
      const active = get().activeSession; if (!active) return;
      const now = new Date().toISOString();
      const flowSteps = active.flowSteps.map((step) => step.id === stepId ? { ...step, status: 'completed' as const, completedAt: now } : step);
      replaceActive({ ...active, flowSteps, activeStepId: undefined, updatedAt: now });
    },
    skipStep: (stepId) => {
      const active = get().activeSession; if (!active) return;
      const now = new Date().toISOString();
      const flowSteps = active.flowSteps.map((step) => step.id === stepId ? { ...step, status: 'skipped' as const, completedAt: now } : step);
      replaceActive({ ...active, flowSteps, activeStepId: undefined, updatedAt: now });
    },
    toggleChecklistItem: (stepId, itemId) => {
      const active = get().activeSession; if (!active) return;
      replaceActive({ ...active, flowSteps: active.flowSteps.map((step) => step.id === stepId ? { ...step, checklist: step.checklist?.map((item) => item.id === itemId ? { ...item, done: !item.done } : item) } : step), updatedAt: new Date().toISOString() });
    },
    updateTimelineEvent: (eventId, updates) => {
      const active = get().activeSession; if (!active) return;
      const now = new Date().toISOString();
      replaceActive({ ...active, timelineEvents: active.timelineEvents.map((event) => event.id === eventId ? { ...event, ...updates, updatedAt: now } : event), updatedAt: now });
    },
    completeTimelineEvent: (eventId) => {
      const now = new Date().toISOString();
      get().updateTimelineEvent(eventId, { status: 'completed', lifecycle: { ...(get().activeSession?.timelineEvents.find((event) => event.id === eventId)?.lifecycle || {}), completedAt: now } });
    },
    skipTimelineEvent: (eventId) => {
      const now = new Date().toISOString();
      get().updateTimelineEvent(eventId, { status: 'skipped', lifecycle: { ...(get().activeSession?.timelineEvents.find((event) => event.id === eventId)?.lifecycle || {}), skippedAt: now } });
    },
    dismissTimelineEvent: (eventId) => {
      const now = new Date().toISOString();
      const event = get().activeSession?.timelineEvents.find((item) => item.id === eventId);
      get().updateTimelineEvent(eventId, { status: event?.durationMinutes ? 'running' : 'dismissed', lifecycle: { ...(event?.lifecycle || {}), dismissedAt: now } });
    },
    snoozeTimelineEvent: (eventId, minutes = 5) => {
      const event = get().activeSession?.timelineEvents.find((item) => item.id === eventId); if (!event) return;
      get().updateTimelineEvent(eventId, { status: 'pending', offsetMinutes: event.offsetMinutes + minutes, lifecycle: {} });
    },
    toggleTimelineChecklistItem: (eventId, itemId) => {
      const event = get().activeSession?.timelineEvents.find((item) => item.id === eventId); if (!event) return;
      get().updateTimelineEvent(eventId, { checklist: event.checklist?.map((item) => item.id === itemId ? { ...item, done: !item.done } : item) });
    },
    addManagedActionInstance: (instance) => {
      const active = get().activeSession; if (!active) return;
      replaceActive({ ...active, managedActionInstances: [...active.managedActionInstances, instance], updatedAt: new Date().toISOString() });
    },
  };
});
