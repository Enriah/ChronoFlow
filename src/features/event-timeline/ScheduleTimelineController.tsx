import { useEffect, useRef, useState } from 'react';
import { usePlannerStore } from '../../store/usePlannerStore';
import { useDeveloperActionStore } from '../developer-actions/useDeveloperActionStore';
import { useWorkSessionStore } from '../../core/sessions/useWorkSessionStore';
import { LauncherService } from '../../services/actions/LauncherService';
import { NotificationService } from '../../services/notifications/NotificationService';

type ScheduleEventRun = {
  key: string; taskId: string; eventId: string; eventTitle: string;
  scheduledAt: number; executedAt: string; status: 'completed' | 'failed' | 'missed';
  actionIds: string[]; errors?: string[];
};

const STORAGE_KEY = 'chronoflow_schedule_event_runs_v1';
const loadRuns = (): ScheduleEventRun[] => {
  try { const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); return Array.isArray(value) ? value : []; } catch { return []; }
};
const saveRun = (run: ScheduleEventRun) => {
  const cutoff = Date.now() - 7 * 86_400_000;
  const runs = loadRuns().filter((item) => item.scheduledAt >= cutoff && item.key !== run.key);
  localStorage.setItem(STORAGE_KEY, JSON.stringify([run, ...runs].slice(0, 500)));
};
const localDateKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const scheduledTime = (date: string, startTime: string, offsetMinutes: number) => {
  const [year, month, day] = date.split('-').map(Number); const [hours, minutes] = startTime.split(':').map(Number);
  return new Date(year, month - 1, day, hours, minutes).getTime() + offsetMinutes * 60_000;
};

export function ScheduleTimelineController() {
  const tasks = usePlannerStore((state) => state.tasks);
  const actions = useDeveloperActionStore((state) => state.actions);
  const activeSession = useWorkSessionStore((state) => state.activeSession);
  const [now, setNow] = useState(Date.now());
  const launching = useRef(new Set<string>());

  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 1000); return () => window.clearInterval(timer); }, []);
  useEffect(() => {
    const today = localDateKey(new Date(now)); const completed = new Set(loadRuns().map((run) => run.key));
    for (const task of tasks.filter((item) => item.date === today && item.startTime)) {
      if (activeSession?.sourcePlannerTaskId === task.id) continue;
      for (const event of task.timelineEvents || []) {
        const shouldLaunch = (event.type === 'action' || event.triggerBehavior.launchActionsOnStart) && !!event.actions?.length;
        if (!shouldLaunch) continue;
        const at = scheduledTime(task.date, task.startTime!, event.offsetMinutes); const key = `${task.id}:${event.id}:${at}`;
        if (now < at || completed.has(key) || launching.current.has(key)) continue;
        launching.current.add(key);
        if (now - at > 120_000) {
          saveRun({ key, taskId: task.id, eventId: event.id, eventTitle: event.title, scheduledAt: at, executedAt: new Date(now).toISOString(), status: 'missed', actionIds: event.actions || [] });
          continue;
        }
        void (async () => {
          void NotificationService.notify('Event started', `${task.title}: ${event.title}`);
          const errors: string[] = []; let successes = 0;
          for (const actionId of event.actions || []) {
            const action = actions.find((item) => item.id === actionId);
            if (!action) { errors.push(`Action ${actionId} no longer exists.`); continue; }
            const result = await LauncherService.execute(action);
            if (result.success) successes += 1; else errors.push(`${action.label}: ${result.message || 'Launch failed.'}`);
          }
          saveRun({ key, taskId: task.id, eventId: event.id, eventTitle: event.title, scheduledAt: at, executedAt: new Date().toISOString(), status: successes > 0 && !errors.length ? 'completed' : 'failed', actionIds: event.actions || [], errors: errors.length ? errors : undefined });
          if (errors.length) void NotificationService.notify('Event action failed', errors.join(' · '));
        })();
      }
    }
  }, [actions, activeSession?.sourcePlannerTaskId, now, tasks]);

  return null;
}
