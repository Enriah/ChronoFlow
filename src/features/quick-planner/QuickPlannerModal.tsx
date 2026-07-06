import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, CheckCircle2, FileText, Trash2, X } from 'lucide-react';
import { format } from 'date-fns';
import type { PlannedTask } from '../../models/PlannedTask';
import { usePlannerStore } from '../../store/usePlannerStore';
import { useDeveloperActionStore } from '../developer-actions/useDeveloperActionStore';
import { Button } from '../../components/ui/Button';
import { ToggleSwitch } from '../../components/ui/ToggleSwitch';
import { createStrictQuickPlanTask } from './StrictQuickPlannerPlan';
import { parseStrictQuickPlan, strictTimeToMinutes, type ParsedStrictTimelineEvent, type StrictQuickPlanParseResult, type StrictTimelineEventType } from './StrictQuickPlannerParser';

const eventTypes: StrictTimelineEventType[] = ['action', 'reminder', 'checklist', 'note', 'alert'];
const sampleFor = (date: Date) => [
  `Day ${format(date, 'dd/MM/yyyy')}, from "09:30" to "10:30", "Fix CI Pipeline",`,
  'event(from "09:45" to "09:50", name "Open Chrome", action "Chrome"),',
  'event(from "10:00" to "10:05", name "Check logs", reminder),',
  'event(from "10:15" to "10:25", name "Verify", checklist "check health|check logs|check dashboard")',
].join('\n');

export function QuickPlannerModal({ date, onClose, onCreated }: { date: Date; onClose: () => void; onCreated: (task: PlannedTask) => void }) {
  const actions = useDeveloperActionStore((state) => state.actions);
  const addTask = usePlannerStore((state) => state.addTask);
  const [text, setText] = useState(() => sampleFor(date));
  const [plan, setPlan] = useState<StrictQuickPlanParseResult>();
  const validationErrors = useMemo(() => {
    if (!plan?.ok) return plan?.errors.map((error) => error.message) || [];
    const errors: string[] = [];
    if (!plan.date || !plan.title?.trim()) errors.push('Date and schedule name are required.');
    if (!plan.startTime || !plan.endTime || !/^\d{2}:\d{2}$/.test(plan.startTime) || !/^\d{2}:\d{2}$/.test(plan.endTime) || strictTimeToMinutes(plan.startTime) >= strictTimeToMinutes(plan.endTime)) errors.push('Schedule start must be before schedule end.');
    plan.events.forEach((event) => {
      if (!event.title.trim()) errors.push('Every event requires a name.');
      if (!/^\d{2}:\d{2}$/.test(event.startTime) || !/^\d{2}:\d{2}$/.test(event.endTime) || strictTimeToMinutes(event.startTime) >= strictTimeToMinutes(event.endTime)) errors.push(`${event.title || 'Event'} must end after it starts.`);
    });
    return errors;
  }, [plan]);

  const parse = () => setPlan(parseStrictQuickPlan(text, actions));
  const patchPlan = (updates: Partial<StrictQuickPlanParseResult>) => setPlan((current) => {
    if (!current) return current;
    const next = { ...current, ...updates };
    if (next.startTime && next.endTime) {
      const start = strictTimeToMinutes(next.startTime); const end = strictTimeToMinutes(next.endTime);
      next.plannedDurationMinutes = Math.max(0, end - start);
      next.events = next.events.map((event) => ({ ...event, offsetMinutes: strictTimeToMinutes(event.startTime) - start }));
    }
    return next;
  });
  const patchEvent = (eventId: string, updates: Partial<ParsedStrictTimelineEvent>) => setPlan((current) => {
    if (!current) return current;
    const scheduleStart = current.startTime ? strictTimeToMinutes(current.startTime) : 0;
    const events = current.events.map((event) => {
      if (event.id !== eventId) return event;
      const next = { ...event, ...updates };
      const start = strictTimeToMinutes(next.startTime); const end = strictTimeToMinutes(next.endTime);
      return { ...next, offsetMinutes: start - scheduleStart, durationMinutes: Math.max(0, end - start) };
    });
    const actionResolvedOrRemoved = !!updates.matchedActionId || (updates.type !== undefined && updates.type !== 'action');
    const warnings = actionResolvedOrRemoved ? current.warnings.filter((warning) => !(warning.type === 'unknown_action' && warning.relatedEventId === eventId)) : current.warnings;
    return { ...current, events, warnings };
  });
  const removeEvent = (eventId: string) => setPlan((current) => current ? ({ ...current, events: current.events.filter((event) => event.id !== eventId), warnings: current.warnings.filter((warning) => warning.relatedEventId !== eventId) }) : current);
  const create = () => {
    if (!plan || validationErrors.length) return;
    if (!window.confirm(`Create “${plan.title}” with ${plan.events.length} timeline event(s)?`)) return;
    const task = createStrictQuickPlanTask({ ...plan, ok: true });
    addTask(task); onCreated(task); onClose();
  };

  return createPortal(<div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/70 p-4">
    <div className="flex max-h-[96vh] w-full max-w-7xl flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl">
      <header className="flex items-center justify-between border-b border-border px-6 py-5"><div><p className="text-[10px] font-black uppercase tracking-[.18em] text-primary">Strict Quick Planner</p><h2 className="mt-1 text-xl font-black">Create schedule from text</h2></div><button onClick={onClose} className="rounded-lg p-2 hover:bg-surface-hover"><X className="h-5 w-5" /></button></header>
      <div className="grid min-h-0 flex-1 overflow-y-auto lg:grid-cols-[.85fr_1.15fr]">
        <section className="border-b border-border p-5 lg:border-b-0 lg:border-r">
          <label className="text-xs font-bold">Strict command</label>
          <textarea value={text} onChange={(event) => setText(event.target.value)} className="mt-2 min-h-[360px] w-full resize-y rounded-xl border border-border p-4 font-mono text-sm leading-6" spellCheck={false} />
          <details className="mt-4 rounded-xl border border-border bg-surface-muted p-4 text-xs"><summary className="cursor-pointer font-bold">Format help</summary><pre className="mt-3 whitespace-pre-wrap text-text-secondary">{'Day DD/MM/YYYY, from "HH:mm" to "HH:mm", "Schedule Name",\nevent(from "HH:mm" to "HH:mm", name "Event Name", action "Action Label"),\nevent(from "HH:mm" to "HH:mm", name "Reminder", reminder),\nevent(from "HH:mm" to "HH:mm", name "Checklist", checklist "item 1|item 2")'}</pre></details>
          <div className="mt-4 flex justify-end"><Button onClick={parse}><FileText className="h-4 w-4" /> Parse</Button></div>
        </section>
        <section className="min-h-[520px] p-5">
          {!plan && <div className="flex h-full min-h-80 flex-col items-center justify-center text-center text-text-secondary"><FileText className="mb-3 h-8 w-8 opacity-40" /><p className="font-bold">Parse the command to review the plan.</p><p className="mt-1 text-sm">Nothing is created before confirmation.</p></div>}
          {plan && <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-black">Preview</h3><p className="text-xs text-text-secondary">Confidence: {plan.confidence}</p></div>{plan.ok && !validationErrors.length && <span className="flex items-center gap-1 text-xs font-bold text-emerald-500"><CheckCircle2 className="h-4 w-4" /> Ready to create</span>}</div>
            {!!plan.errors.length && <MessageList tone="error" messages={plan.errors.map((error) => error.message)} />}
            {!!plan.warnings.length && <MessageList tone="warning" messages={plan.warnings.map((warning) => warning.message)} />}
            {plan.ok && <>
              <div className="grid gap-3 rounded-xl border border-border bg-surface-muted p-4 sm:grid-cols-2">
                <label className="sm:col-span-2"><span className="text-xs font-bold">Schedule name</span><input value={plan.title || ''} onChange={(event) => patchPlan({ title: event.target.value })} className="mt-1 w-full rounded-lg border border-border p-2.5" /></label>
                <label><span className="text-xs font-bold">Date</span><input type="date" value={plan.date || ''} onChange={(event) => patchPlan({ date: event.target.value })} className="mt-1 w-full rounded-lg border border-border p-2.5" /></label>
                <div className="grid grid-cols-2 gap-2"><label><span className="text-xs font-bold">Start</span><input type="time" value={plan.startTime || ''} onChange={(event) => patchPlan({ startTime: event.target.value })} className="mt-1 w-full rounded-lg border border-border p-2.5" /></label><label><span className="text-xs font-bold">End</span><input type="time" value={plan.endTime || ''} onChange={(event) => patchPlan({ endTime: event.target.value })} className="mt-1 w-full rounded-lg border border-border p-2.5" /></label></div>
              </div>
              <div className="space-y-3">{plan.events.map((event, index) => <EventPreview key={event.id} event={event} index={index} actions={actions} onPatch={(updates) => patchEvent(event.id, updates)} onRemove={() => removeEvent(event.id)} />)}{!plan.events.length && <p className="rounded-xl border border-border p-4 text-sm text-text-secondary">This command creates a schedule block without timeline events.</p>}</div>
              {!!validationErrors.length && <MessageList tone="error" messages={validationErrors} />}
            </>}
          </div>}
        </section>
      </div>
      <footer className="flex items-center justify-between border-t border-border px-6 py-4"><span className="text-xs text-text-secondary">Local deterministic parser · no AI or external API</span><div className="flex gap-2"><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={create} disabled={!plan?.ok || validationErrors.length > 0}>Create plan</Button></div></footer>
    </div>
  </div>, document.body);
}

function MessageList({ tone, messages }: { tone: 'error' | 'warning'; messages: string[] }) {
  const warning = tone === 'warning';
  return <div className={`rounded-xl border p-3 text-sm ${warning ? 'border-amber-500/30 bg-amber-500/10 text-amber-400' : 'border-red-500/30 bg-red-500/10 text-red-400'}`}>{messages.map((message, index) => <div key={`${message}-${index}`} className="flex gap-2"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /><span>{message}</span></div>)}</div>;
}

function EventPreview({ event, index, actions, onPatch, onRemove }: { event: ParsedStrictTimelineEvent; index: number; actions: ReturnType<typeof useDeveloperActionStore.getState>['actions']; onPatch: (updates: Partial<ParsedStrictTimelineEvent>) => void; onRemove: () => void }) {
  return <article className="rounded-xl border border-border p-4">
    <div className="mb-3 flex items-center justify-between"><strong className="text-sm">Event {index + 1}</strong><button onClick={onRemove} className="text-red-400"><Trash2 className="h-4 w-4" /></button></div>
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="sm:col-span-2"><span className="text-xs font-bold">Name</span><input value={event.title} onChange={(change) => onPatch({ title: change.target.value })} className="mt-1 w-full rounded-lg border border-border p-2" /></label>
      <label><span className="text-xs font-bold">Type</span><select value={event.type} onChange={(change) => { const type = change.target.value as StrictTimelineEventType; onPatch({ type, matchedActionId: type === 'action' ? event.matchedActionId : undefined, unresolvedActionLabel: type === 'action' ? event.unresolvedActionLabel : undefined, triggerBehavior: { ...event.triggerBehavior, launchActionsOnStart: type === 'action', closeManagedActionsOnEnd: type === 'action' && event.triggerBehavior.closeManagedActionsOnEnd } }); }} className="mt-1 w-full rounded-lg border border-border p-2">{eventTypes.map((type) => <option key={type}>{type}</option>)}</select></label>
      <div className="grid grid-cols-2 gap-2"><label><span className="text-xs font-bold">Start</span><input type="time" value={event.startTime} onChange={(change) => onPatch({ startTime: change.target.value })} className="mt-1 w-full rounded-lg border border-border p-2" /></label><label><span className="text-xs font-bold">End</span><input type="time" value={event.endTime} onChange={(change) => onPatch({ endTime: change.target.value })} className="mt-1 w-full rounded-lg border border-border p-2" /></label></div>
      {event.type === 'action' && <label className="sm:col-span-2"><span className="text-xs font-bold">Registered action</span><select value={event.matchedActionId || ''} onChange={(change) => { const action = actions.find((item) => item.id === change.target.value); onPatch({ matchedActionId: action?.id, actionLabel: action?.label || event.actionLabel, unresolvedActionLabel: action ? undefined : event.actionLabel }); }} className="mt-1 w-full rounded-lg border border-border p-2"><option value="">Unresolved — do not launch</option>{actions.filter((action) => action.enabled).map((action) => <option key={action.id} value={action.id}>{action.label} · {action.type}</option>)}</select></label>}
      {event.type === 'checklist' && <label className="sm:col-span-2"><span className="text-xs font-bold">Checklist · one item per line</span><textarea value={event.checklist?.map((item) => item.text).join('\n') || ''} onChange={(change) => onPatch({ checklist: change.target.value.split('\n').filter(Boolean).map((itemText, itemIndex) => ({ id: event.checklist?.[itemIndex]?.id || crypto.randomUUID(), text: itemText, done: false })) })} className="mt-1 min-h-24 w-full rounded-lg border border-border p-2" /></label>}
      <div className="sm:col-span-2 grid gap-2 sm:grid-cols-2"><ToggleSwitch checked={event.triggerBehavior.autoDismiss} onCheckedChange={(autoDismiss) => onPatch({ triggerBehavior: { ...event.triggerBehavior, autoDismiss, autoDismissAfterSeconds: autoDismiss ? (event.triggerBehavior.autoDismissAfterSeconds || 30) : undefined } })} label="Auto dismiss" />{event.type === 'action' && <ToggleSwitch checked={event.triggerBehavior.closeManagedActionsOnEnd} onCheckedChange={(closeManagedActionsOnEnd) => onPatch({ triggerBehavior: { ...event.triggerBehavior, closeManagedActionsOnEnd } })} label="Auto close managed actions" />}</div>
      {event.triggerBehavior.autoDismiss && <label><span className="text-xs font-bold">Dismiss after (seconds)</span><input type="number" min={1} value={event.triggerBehavior.autoDismissAfterSeconds || 30} onChange={(change) => onPatch({ triggerBehavior: { ...event.triggerBehavior, autoDismissAfterSeconds: Math.max(1, Number(change.target.value) || 30) } })} className="mt-1 w-full rounded-lg border border-border p-2" /></label>}
    </div>
  </article>;
}
