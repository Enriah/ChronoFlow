import { useMemo } from 'react';
import { Bell, Check, CheckSquare, Clock3, FastForward, Layers3, X } from 'lucide-react';
import type { WorkSession } from '../../models/WorkSession';
import type { TimelineEvent } from '../../models/EventTimeline';
import { getSessionElapsedMs, useWorkSessionStore } from '../../core/sessions/useWorkSessionStore';
import { Button } from '../../components/ui/Button';

export function EventTimelineRuntime({ session, now }: { session: WorkSession; now: number }) {
  const store = useWorkSessionStore();
  const elapsedMinutes = getSessionElapsedMs(session, now) / 60_000;
  const ordered = useMemo(() => [...(session.timelineEvents || [])].sort((a, b) => a.offsetMinutes - b.offsetMinutes), [session.timelineEvents]);
  const visible = ordered.filter((event) => ['triggered', 'running'].includes(event.status) && event.triggerBehavior.showPopup);
  const current = ordered.find((event) => event.status === 'running') || visible[0];
  const next = ordered.find((event) => event.status === 'pending');

  if (!ordered.length) return null;
  return <section className="mt-5 rounded-xl border border-border bg-black/15 p-4">
    <div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2"><Layers3 className="h-4 w-4 text-primary" /><strong>Event Timeline</strong></div><span className="text-xs tabular-nums text-text-secondary">{elapsedMinutes.toFixed(1)} / {session.plannedDurationMinutes}m</span></div>
    <div className="relative mt-3 h-2 overflow-hidden rounded bg-surface-hover"><div className="absolute inset-y-0 left-0 bg-primary" style={{ width: `${Math.min(100, elapsedMinutes / session.plannedDurationMinutes * 100)}%` }} />{ordered.map((event) => <span key={event.id} className="absolute top-0 h-2 w-0.5 bg-white/70" style={{ left: `${Math.min(100, event.offsetMinutes / session.plannedDurationMinutes * 100)}%` }} title={event.title} />)}</div>
    <div className="mt-3 grid gap-2 sm:grid-cols-2"><div className="rounded-lg border border-border p-3"><span className="text-[10px] font-bold uppercase text-text-secondary">Current event</span><strong className="mt-1 block truncate text-sm">{current?.title || 'No event running'}</strong>{current && <span className="text-xs text-text-secondary">{current.type.replace('_', ' ')} · {current.status}</span>}</div><div className="rounded-lg border border-border p-3"><span className="text-[10px] font-bold uppercase text-text-secondary">Up next</span><strong className="mt-1 block truncate text-sm">{next?.title || 'Timeline complete'}</strong>{next && <span className="text-xs text-text-secondary">in {Math.max(0, Math.ceil(next.offsetMinutes - elapsedMinutes))}m</span>}</div></div>
    {visible.map((event) => <EventPopup key={event.id} event={event} onDone={() => store.completeTimelineEvent(event.id)} onSkip={() => store.skipTimelineEvent(event.id)} onSnooze={() => store.snoozeTimelineEvent(event.id)} onDismiss={() => store.dismissTimelineEvent(event.id)} onChecklist={(itemId) => store.toggleTimelineChecklistItem(event.id, itemId)} />)}
    {!!session.managedActionInstances?.length && <div className="mt-3 text-xs text-text-secondary">Managed resources: {session.managedActionInstances.filter((item) => item.status === 'running').length} running · external browser and Explorer resources are never auto-closed.</div>}
  </section>;
}

function EventPopup({ event, onDone, onSkip, onSnooze, onDismiss, onChecklist }: { event: TimelineEvent; onDone: () => void; onSkip: () => void; onSnooze: () => void; onDismiss: () => void; onChecklist: (id: string) => void }) {
  return <div className="mt-3 rounded-xl border border-primary/40 bg-primary/5 p-4 shadow-lg"><div className="flex items-start justify-between gap-3"><div><span className="flex items-center gap-1 text-[10px] font-black uppercase text-primary"><Bell className="h-3 w-3" /> {event.type.replace('_', ' ')}</span><h4 className="mt-1 font-black">{event.title}</h4>{event.description && <p className="mt-1 text-sm text-text-secondary">{event.description}</p>}</div><button type="button" onClick={onDismiss}><X className="h-4 w-4" /></button></div>
    {!!event.checklist?.length && <div className="mt-3 space-y-2">{event.checklist.map((item) => <label key={item.id} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={item.done} onChange={() => onChecklist(item.id)} /><span className={item.done ? 'line-through opacity-50' : ''}>{item.text}</span></label>)}</div>}
    {event.noteTemplate && <pre className="mt-3 whitespace-pre-wrap rounded bg-black/20 p-3 text-xs">{event.noteTemplate}</pre>}
    <div className="mt-4 flex flex-wrap gap-2"><Button size="sm" onClick={onDone}><Check className="h-3.5 w-3.5" /> Done</Button><Button size="sm" variant="secondary" onClick={onSkip}><FastForward className="h-3.5 w-3.5" /> Skip</Button><Button size="sm" variant="secondary" onClick={onSnooze}><Clock3 className="h-3.5 w-3.5" /> Snooze 5m</Button>{event.type === 'checklist' && <span className="ml-auto flex items-center gap-1 text-xs text-text-secondary"><CheckSquare className="h-3.5 w-3.5" /> {event.checklist?.filter((item) => item.done).length}/{event.checklist?.length}</span>}</div>
  </div>;
}
