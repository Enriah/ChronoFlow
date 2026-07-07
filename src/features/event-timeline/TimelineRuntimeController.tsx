import { useEffect, useRef } from 'react';
import type { ManagedActionInstance } from '../../models/EventTimeline';
import type { LinkedAction } from '../../models/LinkedAction';
import { useWorkSessionStore } from '../../core/sessions/useWorkSessionStore';
import { useDeveloperActionStore } from '../developer-actions/useDeveloperActionStore';
import { useAgentStore } from '../agents/useAgentStore';
import { LauncherService } from '../../services/actions/LauncherService';
import { AgentService, buildSessionAgentPrompt } from '../../services/agents/AgentService';

const closeInfo = (action: LinkedAction): Pick<ManagedActionInstance, 'canAutoClose' | 'closeStrategy'> => {
  if (action.type === 'url') return { canAutoClose: false, closeStrategy: 'browser_unmanaged' };
  if (action.type === 'folder') return { canAutoClose: false, closeStrategy: 'explorer_unmanaged' };
  return { canAutoClose: false, closeStrategy: 'none' };
};

export function TimelineRuntimeController() {
  const session = useWorkSessionStore((state) => state.activeSession);
  const actions = useDeveloperActionStore((state) => state.actions);
  const agents = useAgentStore((state) => state.profiles);
  const recordAgentRun = useAgentStore((state) => state.recordRun);
  const updateEvent = useWorkSessionStore((state) => state.updateTimelineEvent);
  const addInstance = useWorkSessionStore((state) => state.addManagedActionInstance);
  const startStep = useWorkSessionStore((state) => state.startStep);
  const dismissEvent = useWorkSessionStore((state) => state.dismissTimelineEvent);
  const launching = useRef(new Set<string>());

  useEffect(() => {
    if (!session) return;
    for (const event of session.timelineEvents.filter((item) => item.status === 'triggered')) {
      if (launching.current.has(event.id)) continue;
      launching.current.add(event.id);
      void (async () => {
        const managedIds: string[] = [];
        if (event.type === 'agent') {
          const profile = agents.find((item) => item.id === event.agentProfileId && item.enabled);
          const startedAt = new Date().toISOString();
          if (!profile) {
            updateEvent(event.id, { status: 'failed', lifecycle: { ...event.lifecycle, completedAt: new Date().toISOString() } });
            return;
          }
          try {
            const prompt = buildSessionAgentPrompt(session, event);
            const result = await AgentService.run(profile, prompt);
            const run = AgentService.createRun({
              agentId: profile.id,
              agentName: profile.name,
              source: 'session',
              sourceId: session.id,
              sourceTitle: session.title,
              eventId: event.id,
              eventTitle: event.title,
              prompt,
            }, result, startedAt);
            recordAgentRun(run);
            const latest = useWorkSessionStore.getState().activeSession?.timelineEvents.find((item) => item.id === event.id);
            updateEvent(event.id, { status: run.status === 'completed' ? 'completed' : 'failed', agentRunIds: [...(latest?.agentRunIds || event.agentRunIds || []), run.id], lifecycle: { ...(latest?.lifecycle || event.lifecycle), completedAt: new Date().toISOString() } });
          } catch {
            updateEvent(event.id, { status: 'failed', lifecycle: { ...event.lifecycle, completedAt: new Date().toISOString() } });
          }
          return;
        }
        if (event.type === 'action' || event.triggerBehavior.launchActionsOnStart) {
          for (const actionId of event.actions || []) {
            const action = actions.find((item) => item.id === actionId); if (!action) continue;
            const result = await LauncherService.execute(action, { source: 'session', sourceId: session.id, sourceLabel: `${session.title}: ${event.title}` }); const id = crypto.randomUUID(); managedIds.push(id);
            addInstance({ id, sourceEventId: event.id, sourceSessionId: session.id, actionId: action.id, actionType: action.type, label: action.label, startedAt: new Date().toISOString(), status: result.success ? 'running' : 'failed', ...closeInfo(action), error: result.message });
          }
        }
        const latest = useWorkSessionStore.getState().activeSession?.timelineEvents.find((item) => item.id === event.id); if (!latest) return;
        updateEvent(event.id, { status: event.durationMinutes ? 'running' : 'triggered', lifecycle: { ...latest.lifecycle, launchedManagedActionIds: managedIds } });
        if (event.type === 'flow_step' && event.flowStepId) startStep(event.flowStepId);
      })();
    }
  }, [actions, addInstance, agents, recordAgentRun, session, startStep, updateEvent]);

  useEffect(() => {
    if (!session) return;
    const timers = session.timelineEvents.filter((event) => ['triggered', 'running'].includes(event.status) && event.triggerBehavior.showPopup && event.triggerBehavior.autoDismiss).map((event) => window.setTimeout(() => dismissEvent(event.id), (event.triggerBehavior.autoDismissAfterSeconds || 30) * 1000));
    return () => timers.forEach(window.clearTimeout);
  }, [dismissEvent, session]);

  return null;
}
