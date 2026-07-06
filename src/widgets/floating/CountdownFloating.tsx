import { useEffect, useState } from 'react';
import { Check, Clock3, FastForward, Pause, Play } from 'lucide-react';
import { getSessionElapsedMs, useWorkSessionStore } from '../../core/sessions/useWorkSessionStore';
import { SyncManager } from '../../services/widgets/SyncManager';
import { FloatingWidgetContainer } from './FloatingWidgetContainer';

const clock = (ms: number) => { const total = Math.max(0, Math.floor(ms / 1000)); return `${String(Math.floor(total / 3600)).padStart(2, '0')}:${String(Math.floor((total % 3600) / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`; };

export function CountdownFloating() {
  const session = useWorkSessionStore((state) => state.activeSession);
  const completeEvent = useWorkSessionStore((state) => state.completeTimelineEvent);
  const skipEvent = useWorkSessionStore((state) => state.skipTimelineEvent);
  const snoozeEvent = useWorkSessionStore((state) => state.snoozeTimelineEvent);
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(timer); }, []);
  if (!session) return <FloatingWidgetContainer type="countdown" title="Current Session"><div className="flex h-full items-center justify-center text-sm text-text-secondary">No active session</div></FloatingWidgetContainer>;
  const elapsed = getSessionElapsedMs(session, now); const planned = session.plannedDurationMinutes * 60_000; const overtime = Math.max(0, elapsed - planned); const remaining = Math.max(0, planned - elapsed);
  const step = session.flowSteps.find((item) => item.id === session.activeStepId) || session.flowSteps.find((item) => item.status === 'running');
  const currentEvent = session.timelineEvents?.find((event) => ['triggered', 'running'].includes(event.status));
  const nextEvent = session.timelineEvents?.filter((event) => event.status === 'pending').sort((a, b) => a.offsetMinutes - b.offsetMinutes)[0];
  return <FloatingWidgetContainer type="countdown" title={session.title}><div className="flex h-full flex-col justify-between p-4">
    <div className="flex items-start justify-between gap-3"><div className="min-w-0"><h2 className="truncate font-black">{session.title}</h2><p className="truncate text-xs text-text-secondary">{currentEvent ? currentEvent.title : nextEvent ? `Next: ${nextEvent.title}` : (session.project || 'No project')}{step ? ` · ${step.title}` : ''}</p></div><div className="flex gap-2"><button className="rounded-lg border border-border p-2" onClick={() => SyncManager.dispatchAction(session.status === 'paused' ? 'resumeSession' : 'pauseSession')}>{session.status === 'paused' ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}</button><button className="rounded-lg border border-border p-2" onClick={() => SyncManager.dispatchAction('completeSession')}><Check className="h-4 w-4" /></button></div></div>
    <div>{currentEvent && <div className="mb-2 flex gap-1"><button className="rounded border border-border px-2 py-1 text-xs" onClick={() => completeEvent(currentEvent.id)}><Check className="inline h-3 w-3" /> Done</button><button className="rounded border border-border px-2 py-1 text-xs" onClick={() => skipEvent(currentEvent.id)}><FastForward className="inline h-3 w-3" /> Skip</button><button className="rounded border border-border px-2 py-1 text-xs" onClick={() => snoozeEvent(currentEvent.id)}><Clock3 className="inline h-3 w-3" /> 5m</button></div>}<div className={`text-4xl font-black tabular-nums ${overtime ? 'text-amber-500' : ''}`}>{overtime ? `+${clock(overtime)}` : clock(remaining)}</div><div className="mt-2 flex justify-between text-xs text-text-secondary"><span>{clock(elapsed)} elapsed</span><span>{session.status}</span></div></div>
  </div></FloatingWidgetContainer>;
}
