import { useEffect, useRef, useState } from 'react';
import { usePlannerStore } from '../../store/usePlannerStore';
import { useDeveloperActionStore } from '../developer-actions/useDeveloperActionStore';
import { useAgentStore } from '../agents/useAgentStore';
import { useWorkSessionStore } from '../../core/sessions/useWorkSessionStore';
import { LauncherService } from '../../services/actions/LauncherService';
import { AgentService, buildAgentHandoff, buildScheduleAgentPrompt } from '../../services/agents/AgentService';
import { NotificationService } from '../../services/notifications/NotificationService';
import type { PlannedTask } from '../../models/PlannedTask';
import type { TimelineEvent } from '../../models/EventTimeline';
import type { AgentRun } from '../../models/Agent';

type ScheduleEventRun = {
  key: string;
  taskId: string;
  eventId: string;
  eventTitle: string;
  scheduledAt: number;
  executedAt: string;
  status: 'completed' | 'failed' | 'missed';
  actionIds: string[];
  errors?: string[];
};

const STORAGE_KEY = 'chronoflow_schedule_event_runs_v1';
const MAX_AGENT_CHAIN_DEPTH = 5;

const loadRuns = (): ScheduleEventRun[] => {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
};

const saveRun = (run: ScheduleEventRun) => {
  const cutoff = Date.now() - 7 * 86_400_000;
  const runs = loadRuns().filter((item) => item.scheduledAt >= cutoff && item.key !== run.key);
  localStorage.setItem(STORAGE_KEY, JSON.stringify([run, ...runs].slice(0, 500)));
};

const localDateKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

const scheduledTime = (date: string, startTime: string, offsetMinutes: number) => {
  const [year, month, day] = date.split('-').map(Number);
  const [hours, minutes] = startTime.split(':').map(Number);
  return new Date(year, month - 1, day, hours, minutes).getTime() + offsetMinutes * 60_000;
};

const eventRunKey = (task: PlannedTask, event: TimelineEvent) => `${task.id}:${event.id}:${scheduledTime(task.date, task.startTime!, event.offsetMinutes)}`;
const matchesEventTitle = (event: TimelineEvent, title: string) => event.title.trim().toLowerCase() === title.trim().toLowerCase();

const applyAgentHandoff = (task: PlannedTask, event: TimelineEvent, run: AgentRun) => {
  const now = new Date().toISOString();
  const nextEventName = event.agent?.nextEventName?.trim();
  const handoff = run.handoff || buildAgentHandoff(run);
  let nextEventId: string | undefined;
  let nextEventTitle: string | undefined;

  const nextEvents = (task.timelineEvents || []).map((item) => {
    if (item.id === event.id) {
      return {
        ...item,
        agentRunIds: [...(item.agentRunIds || []), run.id],
        lifecycle: { ...item.lifecycle, completedAt: now },
        status: run.status === 'completed' ? 'completed' as const : 'failed' as const,
        updatedAt: now,
      };
    }

    if (run.status === 'completed' && nextEventName && matchesEventTitle(item, nextEventName)) {
      nextEventId = item.id;
      nextEventTitle = item.title;
      const append = item.agent?.descriptionAppend?.trim();
      const shouldReplaceDescription = item.type === 'agent' && (item.agent?.descriptionSource === 'previous_output' || !item.description?.trim());
      return {
        ...item,
        description: shouldReplaceDescription ? [handoff, append].filter(Boolean).join('\n\n') : item.description,
        status: event.agent?.requireApprovalBeforeNext ? 'waiting_approval' as const : 'pending' as const,
        updatedAt: now,
      };
    }

    return item;
  });

  return { nextEvents, nextEventId, nextEventTitle };
};

export function OrchestratorScheduler() {
  const tasks = usePlannerStore((state) => state.tasks);
  const updateTask = usePlannerStore((state) => state.updateTask);
  const actions = useDeveloperActionStore((state) => state.actions);
  const agents = useAgentStore((state) => state.profiles);
  const recordAgentRun = useAgentStore((state) => state.recordRun);
  const activeSession = useWorkSessionStore((state) => state.activeSession);
  const [now, setNow] = useState(Date.now());
  const launching = useRef(new Set<string>());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const today = localDateKey(new Date(now));
    const completed = new Set(loadRuns().map((run) => run.key));

    const runAgentEvent = async (task: PlannedTask, event: TimelineEvent) => {
      const profile = agents.find((item) => item.id === event.agentProfileId && item.enabled);
      if (!profile) return { task, errors: ['Agent profile is missing or disabled.'] as string[], completed: false };

      const startedAt = new Date().toISOString();
      try {
        const prompt = buildScheduleAgentPrompt(task, event);
        const result = await AgentService.run(profile, prompt, event.agent?.timeoutMinutes ? event.agent.timeoutMinutes * 60 : undefined);
        const createdRun = AgentService.createRun({
          agentId: profile.id,
          agentName: profile.name,
          source: 'schedule',
          sourceId: task.id,
          sourceTitle: task.title,
          eventId: event.id,
          eventTitle: event.title,
          prompt,
        }, result, startedAt);
        const run = { ...createdRun, handoff: buildAgentHandoff(createdRun) };
        const { nextEvents, nextEventId, nextEventTitle } = applyAgentHandoff(task, event, run);
        const storedRun = { ...run, nextEventId, nextEventTitle };
        recordAgentRun(storedRun);

        const nextTask = { ...task, timelineEvents: nextEvents };
        updateTask(task.id, { timelineEvents: nextEvents });
        if (nextEventTitle) void NotificationService.notify('Agent handoff prepared', `${run.eventTitle} → ${nextEventTitle}`);

        const nextEvent = nextEventId ? nextEvents.find((item) => item.id === nextEventId) : undefined;
        return {
          task: nextTask,
          run: storedRun,
          nextEvent,
          errors: run.status === 'completed' ? [] : [`${profile.name}: ${run.error || 'Agent failed.'}`],
          completed: run.status === 'completed',
        };
      } catch (error) {
        return { task, errors: [`${profile.name}: ${error instanceof Error ? error.message : String(error)}`], completed: false };
      }
    };

    const runAgentChain = async (task: PlannedTask, event: TimelineEvent) => {
      const errors: string[] = [];
      let successes = 0;
      let currentTask = task;
      let currentEvent: TimelineEvent | undefined = event;
      let depth = 0;

      while (currentEvent && depth < MAX_AGENT_CHAIN_DEPTH) {
        if (currentEvent.type !== 'agent' || !currentEvent.agentProfileId || currentEvent.status === 'waiting_approval') break;
        const chainKey = eventRunKey(currentTask, currentEvent);
        if (depth > 0 && (loadRuns().some((run) => run.key === chainKey) || launching.current.has(chainKey))) break;
        launching.current.add(chainKey);
        if (depth > 0) void NotificationService.notify('Agent chain continued', `${currentTask.title}: ${currentEvent.title}`);

        const result = await runAgentEvent(currentTask, currentEvent);
        errors.push(...result.errors);
        saveRun({
          key: chainKey,
          taskId: currentTask.id,
          eventId: currentEvent.id,
          eventTitle: currentEvent.title,
          scheduledAt: scheduledTime(currentTask.date, currentTask.startTime!, currentEvent.offsetMinutes),
          executedAt: new Date().toISOString(),
          status: result.completed && !result.errors.length ? 'completed' : 'failed',
          actionIds: [],
          errors: result.errors.length ? result.errors : undefined,
        });
        if (result.completed) successes += 1;
        if (!result.completed || result.nextEvent?.status === 'waiting_approval') break;

        currentTask = result.task;
        currentEvent = result.nextEvent?.type === 'agent' ? result.nextEvent : undefined;
        depth += 1;
      }

      if (depth >= MAX_AGENT_CHAIN_DEPTH && currentEvent) {
        errors.push(`Agent chain stopped after ${MAX_AGENT_CHAIN_DEPTH} steps to prevent an infinite loop.`);
      }
      return { errors, successes };
    };

    for (const task of tasks.filter((item) => item.date === today && item.startTime)) {
      if (activeSession?.sourcePlannerTaskId === task.id) continue;
      for (const event of task.timelineEvents || []) {
        if (event.status === 'waiting_approval' || event.status === 'completed' || event.status === 'running') continue;

        const shouldLaunch = (event.type === 'action' || event.triggerBehavior.launchActionsOnStart) && !!event.actions?.length;
        const shouldRunAgent = event.type === 'agent' && !!event.agentProfileId;
        if (!shouldLaunch && !shouldRunAgent) continue;

        const at = scheduledTime(task.date, task.startTime!, event.offsetMinutes);
        const key = eventRunKey(task, event);
        if (now < at || completed.has(key) || launching.current.has(key)) continue;
        launching.current.add(key);

        if (now - at > 120_000) {
          saveRun({ key, taskId: task.id, eventId: event.id, eventTitle: event.title, scheduledAt: at, executedAt: new Date(now).toISOString(), status: 'missed', actionIds: event.actions || [] });
          continue;
        }

        void (async () => {
          void NotificationService.notify('Event started', `${task.title}: ${event.title}`);
          const errors: string[] = [];
          let successes = 0;

          if (shouldRunAgent) {
            const result = await runAgentChain(task, event);
            errors.push(...result.errors);
            successes += result.successes;
          }

          for (const actionId of event.actions || []) {
            const action = actions.find((item) => item.id === actionId);
            if (!action) {
              errors.push(`Action ${actionId} no longer exists.`);
              continue;
            }
            const result = await LauncherService.execute(action, { source: 'schedule', sourceId: task.id, sourceLabel: `${task.title}: ${event.title}` });
            if (result.success) successes += 1;
            else errors.push(`${action.label}: ${result.message || 'Launch failed.'}`);
          }

          saveRun({
            key,
            taskId: task.id,
            eventId: event.id,
            eventTitle: event.title,
            scheduledAt: at,
            executedAt: new Date().toISOString(),
            status: successes > 0 && !errors.length ? 'completed' : 'failed',
            actionIds: event.actions || [],
            errors: errors.length ? errors : undefined,
          });
          if (errors.length) void NotificationService.notify('Event action failed', errors.join(' · '));
        })();
      }
    }
  }, [actions, activeSession?.sourcePlannerTaskId, agents, now, recordAgentRun, tasks, updateTask]);

  return null;
}
