import type { PlannedTask } from '../../models/PlannedTask';
import type { TimelineEvent, TimelineEventType, TimelineTrack } from '../../models/EventTimeline';
import type { ParsedStrictTimelineEvent, StrictQuickPlanParseResult } from './StrictQuickPlannerParser';

const TRACKS: { type: Exclude<TimelineEventType, 'flow_step'>; name: string }[] = [
  { type: 'action', name: 'Actions' },
  { type: 'reminder', name: 'Reminders' },
  { type: 'checklist', name: 'Checklist' },
  { type: 'note', name: 'Notes' },
  { type: 'alert', name: 'Alerts' },
];

export function createStrictQuickPlanTask(plan: StrictQuickPlanParseResult): PlannedTask {
  if (!plan.ok || !plan.date || !plan.startTime || !plan.endTime || !plan.title || !plan.plannedDurationMinutes) {
    throw new Error('Quick plan is incomplete or invalid.');
  }
  const now = new Date().toISOString();
  const tracks: TimelineTrack[] = TRACKS.map((track, order) => ({
    id: crypto.randomUUID(), name: track.name, type: track.type, visible: true, locked: false, muted: false, order, createdAt: now, updatedAt: now,
  }));
  const trackByType = new Map(tracks.map((track) => [track.type, track.id]));
  const events: TimelineEvent[] = plan.events.map((event) => toTimelineEvent(event, trackByType.get(event.type)!, plan.date!, now));
  return {
    id: crypto.randomUUID(), title: plan.title.trim(), date: plan.date, startTime: plan.startTime, endTime: plan.endTime,
    plannedDurationMinutes: plan.plannedDurationMinutes, status: 'planned', completed: false, timelineTracks: tracks, timelineEvents: events,
  };
}

function toTimelineEvent(event: ParsedStrictTimelineEvent, trackId: string, date: string, now: string): TimelineEvent {
  return {
    id: event.id, trackId, title: event.title.trim(), type: event.type,
    offsetMinutes: event.offsetMinutes, durationMinutes: event.durationMinutes,
    absoluteStartTime: `${date}T${event.startTime}:00`, absoluteEndTime: `${date}T${event.endTime}:00`,
    actions: event.type === 'action' && event.matchedActionId ? [event.matchedActionId] : [], checklist: event.checklist,
    noteTemplate: event.type === 'note' ? event.title : undefined,
    triggerBehavior: {
      ...event.triggerBehavior,
      requireUserAction: event.type === 'checklist',
      closeMode: 'soft',
      markCompletedOnEnd: true,
    },
    lifecycle: {}, status: 'pending', createdAt: now, updatedAt: now,
  };
}
