import { useEffect, useState } from 'react';
import { Check, Circle, ExternalLink, Pause, Play, RotateCcw, SkipForward, Square, Zap } from 'lucide-react';
import type { WorkSession } from '../../models/WorkSession';
import type { LinkedAction } from '../../models/LinkedAction';
import { getSessionElapsedMs, useWorkSessionStore } from '../../core/sessions/useWorkSessionStore';
import { LauncherService } from '../../services/actions/LauncherService';
import { Button } from '../../components/ui/Button';
import { WidgetManager } from '../../services/widgets/WidgetManager';
import { EventTimelineRuntime } from '../event-timeline/EventTimelineRuntime';

const clock = (ms: number) => {
  const total = Math.max(0, Math.floor(ms / 1000));
  return `${String(Math.floor(total / 3600)).padStart(2, '0')}:${String(Math.floor((total % 3600) / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
};

export function SessionRuntime({ session, actions }: { session: WorkSession; actions: LinkedAction[] }) {
  const { pause, resume, continueLater, complete, cancel, logInterruption, updateNotes, startStep, completeStep, skipStep, toggleChecklistItem } = useWorkSessionStore();
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(timer); }, []);
  const elapsed = getSessionElapsedMs(session, now);
  const planned = session.plannedDurationMinutes * 60_000;
  const remaining = Math.max(0, planned - elapsed);
  const overtime = Math.max(0, elapsed - planned);
  const activeStep = session.flowSteps.find((step) => step.id === session.activeStepId) || session.flowSteps.find((step) => step.status === 'running');
  const startStepActions = async (stepId: string) => {
    startStep(stepId);
    const step = session.flowSteps.find((item) => item.id === stepId);
    for (const id of step?.actions || []) { const action = actions.find((item) => item.id === id); if (action) await LauncherService.execute(action, { source: 'session', sourceId: session.id, sourceLabel: `${session.title}: ${step?.title || 'Flow step'}` }); }
  };

  return <div className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
    <section className="rounded-xl border border-border bg-surface/90 p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><span className={`text-xs font-black uppercase ${overtime ? 'text-amber-500' : 'text-primary'}`}>{session.status}</span><h2 className="mt-1 text-2xl font-black">{session.title}</h2><div className="mt-1 flex flex-wrap gap-2 text-sm text-text-secondary">{session.project && <span>{session.project}</span>}{session.tags?.map((tag) => <span key={tag}>#{tag}</span>)}</div></div><div className="text-right"><div className="text-4xl font-black tabular-nums">{clock(remaining)}</div><div className="mt-1 text-xs text-text-secondary">{clock(elapsed)} elapsed · {session.plannedDurationMinutes}m planned</div>{overtime > 0 && <div className="mt-1 text-sm font-bold text-amber-500">+{clock(overtime)} overtime</div>}</div></div>
      {activeStep && <div className="mt-5 rounded-xl border border-primary/30 bg-primary/5 p-4"><span className="text-xs font-bold uppercase text-primary">Current step</span><div className="mt-1 flex justify-between gap-3"><strong>{activeStep.title}</strong><span className="text-sm text-text-secondary">{activeStep.startedAt ? clock(now - new Date(activeStep.startedAt).getTime()) : '00:00:00'}</span></div></div>}
      <div className="mt-5 flex flex-wrap gap-2">
        {['running', 'overdue'].includes(session.status) && <Button onClick={pause}><Pause className="h-4 w-4" /> Pause</Button>}
        {session.status === 'paused' && <Button onClick={resume}><RotateCcw className="h-4 w-4" /> Resume</Button>}
        <Button variant="secondary" onClick={() => { const note = window.prompt('Interruption note (optional)') || undefined; logInterruption(note); }}><Zap className="h-4 w-4" /> Log interruption ({session.interruptions})</Button>
        <Button variant="secondary" onClick={() => WidgetManager.openWidget('countdown')}><ExternalLink className="h-4 w-4" /> Widget</Button>
        <Button variant="secondary" onClick={complete}><Check className="h-4 w-4" /> Complete</Button>
        <Button variant="secondary" onClick={continueLater}><Pause className="h-4 w-4" /> Continue later</Button>
        <Button variant="danger" onClick={cancel}><Square className="h-4 w-4" /> Cancel</Button>
      </div>
      <EventTimelineRuntime session={session} now={now} />
      <label className="mt-6 block"><span className="text-xs font-bold">Session notes</span><textarea value={session.notes || ''} onChange={(event) => updateNotes(event.target.value)} className="mt-2 min-h-48 w-full rounded-xl p-4 font-mono text-sm" placeholder={'## What I worked on\n\n## What blocked me\n\n## What I learned\n\n## Next step'} /></label>
    </section>
    <section className="rounded-xl border border-border bg-surface/90 p-5 shadow-sm"><h3 className="font-black">Flow</h3><div className="mt-4 space-y-3">{session.flowSteps.map((step, index) => <div key={step.id} className={`rounded-xl border p-4 ${step.status === 'running' ? 'border-primary bg-primary/5' : 'border-border bg-surface-hover/20'}`}>
      <div className="flex items-start justify-between gap-3"><div><span className="text-[10px] font-bold text-text-secondary">STEP {index + 1}</span><h4 className="font-bold">{step.title}</h4>{step.description && <p className="mt-1 text-xs text-text-secondary">{step.description}</p>}</div><span className="text-xs text-text-secondary">{step.plannedDurationMinutes || 0}m</span></div>
      {!!step.checklist?.length && <div className="mt-3 space-y-2">{step.checklist.map((item) => <label key={item.id} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={item.done} onChange={() => toggleChecklistItem(step.id, item.id)} /> <span className={item.done ? 'line-through opacity-50' : ''}>{item.text}</span></label>)}</div>}
      <div className="mt-3 flex gap-2">{step.status === 'pending' && <Button size="sm" onClick={() => startStepActions(step.id)}><Play className="h-3.5 w-3.5" /> Start</Button>}{step.status === 'running' && <Button size="sm" onClick={() => completeStep(step.id)}><Check className="h-3.5 w-3.5" /> Complete</Button>}{['pending', 'running'].includes(step.status) && <Button size="sm" variant="secondary" onClick={() => skipStep(step.id)}><SkipForward className="h-3.5 w-3.5" /> Skip</Button>}{step.status === 'completed' && <span className="flex items-center gap-1 text-xs text-emerald-500"><Check className="h-3.5 w-3.5" /> Completed</span>}{step.status === 'skipped' && <span className="text-xs text-text-secondary">Skipped</span>}</div>
    </div>)}{!session.flowSteps.length && <div className="flex items-center gap-2 text-sm text-text-secondary"><Circle className="h-4 w-4" /> No flow steps</div>}</div></section>
  </div>;
}

export function LaunchSessionDialog({ session, actions, onClose, onStart }: { session: WorkSession; actions: LinkedAction[]; onClose: () => void; onStart: () => void }) {
  const available = actions.filter((action) => action.enabled && session.actions.includes(action.id));
  const [selected, setSelected] = useState(available.map((action) => action.id));
  const launch = async () => { for (const id of selected) { const action = actions.find((item) => item.id === id); if (action) await LauncherService.execute(action, { source: 'session', sourceId: session.id, sourceLabel: session.title }); } onStart(); };
  return <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 p-4"><div className="w-full max-w-lg rounded-xl border border-border bg-surface p-5"><h2 className="text-xl font-black">Start {session.title}</h2><p className="mt-1 text-sm text-text-secondary">{session.plannedDurationMinutes} minutes</p><div className="mt-5 space-y-2">{available.map((action) => <label key={action.id} className="flex items-center gap-3 rounded-lg border border-border p-3"><input type="checkbox" checked={selected.includes(action.id)} onChange={() => setSelected(selected.includes(action.id) ? selected.filter((id) => id !== action.id) : [...selected, action.id])} /><span><strong className="block text-sm">{action.label}</strong><span className="font-mono text-xs text-text-secondary">{action.value}</span></span></label>)}{!available.length && <p className="text-sm text-text-secondary">No session actions</p>}</div><div className="mt-6 flex justify-end gap-2"><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={launch}>Launch & start</Button></div></div></div>;
}
