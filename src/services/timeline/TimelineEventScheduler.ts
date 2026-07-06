import type { TimelineEvent } from '../../models/EventTimeline';

export type TimelineTransition = { eventId: string; status: TimelineEvent['status']; at: string };

export const TimelineEventScheduler = {
  evaluate(events: TimelineEvent[], elapsedMs: number, now = new Date()): TimelineTransition[] {
    const transitions: TimelineTransition[] = [];
    const at = now.toISOString();
    for (const event of events) {
      const startMs = event.offsetMinutes * 60_000;
      const endMs = startMs + (event.durationMinutes || 0) * 60_000;
      if (event.status === 'pending' && elapsedMs >= startMs) {
        transitions.push({ eventId: event.id, status: 'triggered', at });
        continue;
      }
      if (event.status === 'running' && event.durationMinutes && elapsedMs >= endMs) {
        transitions.push({ eventId: event.id, status: 'completed', at });
      }
    }
    return transitions;
  },
};
