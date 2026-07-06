import { useEffect, useRef } from 'react';
import type { ManagedActionInstance } from '../../models/EventTimeline';
import type { LinkedAction } from '../../models/LinkedAction';
import { useWorkSessionStore } from '../../core/sessions/useWorkSessionStore';
import { useDeveloperActionStore } from '../developer-actions/useDeveloperActionStore';
import { LauncherService } from '../../services/actions/LauncherService';

const closeInfo = (action: LinkedAction): Pick<ManagedActionInstance, 'canAutoClose' | 'closeStrategy'> => {
  if (action.type === 'url') return { canAutoClose: false, closeStrategy: 'browser_unmanaged' };
  if (action.type === 'folder') return { canAutoClose: false, closeStrategy: 'explorer_unmanaged' };
  return { canAutoClose: false, closeStrategy: 'none' };
};

export function TimelineRuntimeController() {
  const session = useWorkSessionStore((state) => state.activeSession);
  const actions = useDeveloperActionStore((state) => state.actions);
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
        if (event.type === 'action' || event.triggerBehavior.launchActionsOnStart) {
          for (const actionId of event.actions || []) {
            const action = actions.find((item) => item.id === actionId); if (!action) continue;
            const result = await LauncherService.execute(action); const id = crypto.randomUUID(); managedIds.push(id);
            addInstance({ id, sourceEventId: event.id, sourceSessionId: session.id, actionId: action.id, actionType: action.type, label: action.label, startedAt: new Date().toISOString(), status: result.success ? 'running' : 'failed', ...closeInfo(action), error: result.message });
          }
        }
        const latest = useWorkSessionStore.getState().activeSession?.timelineEvents.find((item) => item.id === event.id); if (!latest) return;
        updateEvent(event.id, { status: event.durationMinutes ? 'running' : 'triggered', lifecycle: { ...latest.lifecycle, launchedManagedActionIds: managedIds } });
        if (event.type === 'flow_step' && event.flowStepId) startStep(event.flowStepId);
      })();
    }
  }, [actions, addInstance, session, startStep, updateEvent]);

  useEffect(() => {
    if (!session) return;
    const timers = session.timelineEvents.filter((event) => ['triggered', 'running'].includes(event.status) && event.triggerBehavior.showPopup && event.triggerBehavior.autoDismiss).map((event) => window.setTimeout(() => dismissEvent(event.id), (event.triggerBehavior.autoDismissAfterSeconds || 30) * 1000));
    return () => timers.forEach(window.clearTimeout);
  }, [dismissEvent, session]);

  return null;
}
