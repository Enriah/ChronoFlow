import { useEffect, useState, type ReactNode } from 'react';
import { format } from 'date-fns';
import { Clock3, Copy, FilePlus2, Play, Plus, Save, Trash2 } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { useWorkSessionStore } from '../core/sessions/useWorkSessionStore';
import { useSessionTemplateStore } from './session-templates/useSessionTemplateStore';
import { useDeveloperActionStore } from './developer-actions/useDeveloperActionStore';
import { ActionRegistry } from './developer-actions/ActionRegistry';
import { SessionEditor, type EditorValue } from './sessions/SessionEditor';
import { LaunchSessionDialog, SessionRuntime } from './sessions/SessionRuntime';
import { TimelineWidget } from '../widgets/timeline/TimelineWidget';
import { PlannerWidget } from '../widgets/planner/PlannerWidget';
import { ThemeSettings } from '../components/ThemeSettings';
import { WidgetSettings } from '../components/WidgetSettings';
import { DataSettings } from '../components/DataSettings';
import { AudioSettings } from '../components/AudioSettings';
import { Button } from '../components/ui/Button';
import type { Schedule } from '../models/Schedule';
import type { WorkSession } from '../models/WorkSession';
import type { WorkSessionTemplate } from '../models/WorkSessionTemplate';
import { ScheduleEventTrack } from './schedule/ScheduleEventTrack';

function Card({ children, className = '' }: { children: ReactNode; className?: string }) { return <section className={`rounded-xl border border-border bg-surface p-5 shadow-sm ${className}`}>{children}</section>; }
const formatDuration = (ms: number) => { const hours = Math.floor(ms / 3_600_000); const minutes = Math.floor((ms % 3_600_000) / 60_000); return hours ? `${hours}h ${minutes}m` : `${minutes}m`; };

export function SchedulePage({ onEdit, onNavigate }: { onEdit: (schedule: Schedule) => void; onNavigate: (page: string) => void }) {
  const schedules = useAppStore((state) => state.schedules);
  const currentTask = useAppStore((state) => state.currentTask);
  const nextTask = useAppStore((state) => state.nextTask);
  return <div className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-surface px-4 py-3"><div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm"><span><strong>{schedules.length}</strong> blocks today</span><span className="text-text-secondary">Current: <strong className="text-text">{currentTask?.title || 'None'}</strong></span><span className="text-text-secondary">Next: <strong className="text-text">{nextTask ? `${format(nextTask.startTime, 'HH:mm')} ${nextTask.title}` : 'None'}</strong></span></div><Button size="sm" onClick={() => onNavigate('planner')}>Open Planner</Button></div>
    <div className="grid h-[calc(100vh-190px)] min-h-[620px] gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
      <ScheduleEventTrack onOpenPlanner={() => onNavigate('planner')} />
      <div className="min-h-0"><TimelineWidget onEdit={onEdit} compact /></div>
    </div>
  </div>;
}

export function PlannerPage({ onNavigate }: { onNavigate?: (page: string) => void }) { return <div className="h-[600px] max-w-6xl"><PlannerWidget onNavigate={onNavigate} /></div>; }

export function SessionsPage({ onNavigate }: { onNavigate: (page: string) => void }) {
  const store = useWorkSessionStore();
  const actions = useDeveloperActionStore((state) => state.actions);
  const templateSave = useSessionTemplateStore((state) => state.save);
  const [editor, setEditor] = useState<WorkSession | 'new' | null>(null);
  const [launching, setLaunching] = useState<WorkSession | null>(null);
  useEffect(() => { const open = () => setEditor('new'); window.addEventListener('chronoflow:new-session', open); return () => window.removeEventListener('chronoflow:new-session', open); }, []);
  const saveEditor = (value: EditorValue) => {
    if (editor && editor !== 'new') store.update(editor.id, { title: value.title, description: value.description, project: value.project, tags: value.tags, plannedDurationMinutes: value.durationMinutes, actions: value.actions, flowSteps: value.flowSteps, notes: value.notes });
    else store.create({ title: value.title, description: value.description, project: value.project, tags: value.tags, plannedDurationMinutes: value.durationMinutes, actions: value.actions, flowSteps: value.flowSteps, notes: value.notes });
    setEditor(null);
  };
  const saveAsTemplate = (session: WorkSession) => { const now = new Date().toISOString(); templateSave({ id: crypto.randomUUID(), name: session.title, description: session.description, project: session.project, tags: session.tags, defaultDurationMinutes: session.plannedDurationMinutes, actions: session.actions, flowSteps: session.flowSteps, timelineTracks: [], timelineEvents: [], notesTemplate: session.notes, createdAt: now, updatedAt: now }); onNavigate('templates'); };
  const inactive = store.sessions.filter((session) => session.id !== store.activeSession?.id);
  const completed = inactive.filter((session) => session.status === 'completed');

  return <div className="space-y-5">
    {store.activeSession && <SessionRuntime session={store.activeSession} actions={actions} />}
    {!store.activeSession && <div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => onNavigate('templates')}>From template</Button><Button onClick={() => setEditor('new')}><Plus className="h-4 w-4" /> New session</Button></div>}
    <Card><h3 className="font-black">Sessions</h3><div className="mt-4 space-y-2">{inactive.map((session) => <div key={session.id} className="grid gap-3 rounded-xl border border-border bg-surface-hover/20 p-4 lg:grid-cols-[1fr_auto] lg:items-center"><button className="text-left" onClick={() => setEditor(session)}><div className="flex flex-wrap items-center gap-2"><strong>{session.title}</strong><span className="rounded bg-surface-hover px-2 py-0.5 text-[10px] uppercase">{session.status}</span></div><p className="mt-1 text-sm text-text-secondary">{session.project || 'No project'} · {session.plannedDurationMinutes}m</p></button><div className="flex flex-wrap gap-2">{['planned', 'paused'].includes(session.status) && <Button size="sm" onClick={() => setLaunching(session)}><Play className="h-3.5 w-3.5" /> Start</Button>}<Button size="sm" variant="secondary" onClick={() => store.duplicate(session.id)}><Copy className="h-3.5 w-3.5" /> Duplicate</Button><Button size="sm" variant="secondary" onClick={() => saveAsTemplate(session)}><Save className="h-3.5 w-3.5" /> Template</Button>{!['running', 'paused', 'overdue'].includes(session.status) && <Button size="icon" variant="danger" onClick={() => store.remove(session.id)}><Trash2 className="h-4 w-4" /></Button>}</div></div>)}{!inactive.length && <p className="text-sm text-text-secondary">No sessions yet</p>}</div></Card>
    {!store.activeSession && completed[0] && <CompletionCard session={completed[0]} />}
    {editor && <SessionEditor title={editor === 'new' ? 'New session' : 'Edit session'} actions={actions} initial={editor === 'new' ? undefined : { title: editor.title, description: editor.description, project: editor.project, tags: editor.tags, durationMinutes: editor.plannedDurationMinutes, actions: editor.actions, flowSteps: editor.flowSteps, notes: editor.notes }} notesLabel="Session notes" onClose={() => setEditor(null)} onSave={saveEditor} />}
    {launching && <LaunchSessionDialog session={launching} actions={actions} onClose={() => setLaunching(null)} onStart={() => { store.start(launching.id); setLaunching(null); }} />}
  </div>;
}

function CompletionCard({ session }: { session: WorkSession }) {
  const actual = session.actualDurationMs || 0; const planned = session.plannedDurationMinutes * 60_000;
  const completedSteps = session.flowSteps.filter((step) => step.status === 'completed').length;
  return <Card><p className="text-xs font-black uppercase text-emerald-500">Session completed</p><h3 className="mt-1 text-xl font-black">{session.title}</h3><div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-5"><Metric label="Planned" value={formatDuration(planned)} /><Metric label="Actual" value={formatDuration(actual)} /><Metric label="Overtime" value={formatDuration(Math.max(0, actual - planned))} /><Metric label="Interruptions" value={String(session.interruptions)} /><Metric label="Steps" value={`${completedSteps}/${session.flowSteps.length}`} /></div>{session.notes && <pre className="mt-4 whitespace-pre-wrap rounded-lg bg-surface-hover/30 p-3 text-sm">{session.notes}</pre>}</Card>;
}
function Metric({ label, value }: { label: string; value: string }) { return <div><p className="text-xs text-text-secondary">{label}</p><strong>{value}</strong></div>; }

export function TemplatesPage({ onNavigate }: { onNavigate: (page: string) => void }) {
  const { templates, save, duplicate, remove } = useSessionTemplateStore();
  const actions = useDeveloperActionStore((state) => state.actions);
  const createSession = useWorkSessionStore((state) => state.create);
  const [editing, setEditing] = useState<WorkSessionTemplate | 'new' | null>(null);
  useEffect(() => { const open = () => setEditing('new'); window.addEventListener('chronoflow:new-template', open); return () => window.removeEventListener('chronoflow:new-template', open); }, []);
  const saveEditor = (value: EditorValue) => { const now = new Date().toISOString(); const previous = editing !== 'new' ? editing : null; save({ id: previous?.id || crypto.randomUUID(), name: value.title, description: value.description, project: value.project, tags: value.tags, defaultDurationMinutes: value.durationMinutes, actions: value.actions, flowSteps: value.flowSteps, timelineTracks: [], timelineEvents: [], notesTemplate: value.notes, createdAt: previous?.createdAt || now, updatedAt: now }); setEditing(null); };
  const createFromTemplate = (template: WorkSessionTemplate) => { createSession({ templateId: template.id, title: template.name, description: template.description, project: template.project, tags: template.tags, plannedDurationMinutes: template.defaultDurationMinutes, actions: template.actions, flowSteps: template.flowSteps, notes: template.notesTemplate }); onNavigate('sessions'); };
  return <div>
    <div className="mb-5 flex flex-wrap items-start justify-between gap-4 rounded-xl border border-border bg-surface p-5"><div><h2 className="text-xl font-black">Session Templates</h2><p className="mt-1 max-w-2xl text-sm text-text-secondary">Reusable starting setups for manual Sessions: duration, actions, flow steps and notes. They do not create Planner blocks or calendar schedules.</p></div><Button onClick={() => setEditing('new')}><FilePlus2 className="h-4 w-4" /> New session template</Button></div>
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{templates.map((template) => <Card key={template.id}>
      <h3 className="text-lg font-black">{template.name}</h3>
      <p className="mt-1 text-sm text-text-secondary">{template.project || 'No project'} · {template.defaultDurationMinutes}m · {template.flowSteps.length} steps</p>
      <div className="mt-5 flex flex-wrap gap-2"><Button onClick={() => createFromTemplate(template)}>Create Session</Button><Button variant="secondary" onClick={() => setEditing(template)}>Edit template</Button><Button size="icon" variant="secondary" title="Duplicate template" onClick={() => duplicate(template.id)}><Copy className="h-4 w-4" /></Button><Button size="icon" variant="danger" title="Delete template" onClick={() => remove(template.id)}><Trash2 className="h-4 w-4" /></Button></div>
    </Card>)}</div>
    {editing && <SessionEditor title={editing === 'new' ? 'New session template' : 'Edit session template'} actions={actions} initial={editing === 'new' ? undefined : { title: editing.name, description: editing.description, project: editing.project, tags: editing.tags, durationMinutes: editing.defaultDurationMinutes, actions: editing.actions, flowSteps: editing.flowSteps, notes: editing.notesTemplate }} onClose={() => setEditing(null)} onSave={saveEditor} />}
  </div>;
}

export function ReportsPage() {
  const allSessions = useWorkSessionStore((state) => state.sessions);
  const sessions = allSessions.filter((session) => session.status === 'completed' && session.actualDurationMs !== undefined);
  const today = format(new Date(), 'yyyy-MM-dd'); const weekStart = Date.now() - 7 * 86_400_000;
  const todayTime = sessions.filter((session) => session.endedAt?.startsWith(today)).reduce((sum, session) => sum + (session.actualDurationMs || 0), 0);
  const weekTime = sessions.filter((session) => session.endedAt && new Date(session.endedAt).getTime() >= weekStart).reduce((sum, session) => sum + (session.actualDurationMs || 0), 0);
  const byProject = groupTime(sessions, (session) => session.project || 'Unassigned');
  const planned = sessions.reduce((sum, session) => sum + session.plannedDurationMinutes * 60_000, 0); const actual = sessions.reduce((sum, session) => sum + (session.actualDurationMs || 0), 0);
  const average = sessions.length ? actual / sessions.length : 0;
  const recent = [...sessions].sort((a, b) => (b.endedAt || '').localeCompare(a.endedAt || '')).slice(0, 8);
  if (!sessions.length) return <Card className="flex min-h-80 flex-col items-center justify-center text-center"><Clock3 className="mb-3 h-8 w-8 text-text-secondary opacity-30" /><h2 className="text-lg font-black">No completed session data</h2><p className="mt-1 max-w-md text-sm text-text-secondary">Reports are calculated only from sessions that have actually finished. Complete a Session to start building this report.</p></Card>;
  return <div className="space-y-5">
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <ReportMetric label="Focused today" value={formatDuration(todayTime)} icon={<Clock3 />} />
      <ReportMetric label="Last 7 days" value={formatDuration(weekTime)} />
      <ReportMetric label="Completed sessions" value={String(sessions.length)} />
      <ReportMetric label="Average session" value={formatDuration(average)} />
    </div>
    <div className="grid gap-5 lg:grid-cols-2">
      <Breakdown title="Completed time by project" values={byProject} />
      <Card><h3 className="font-black">Planned vs actual</h3><div className="mt-5 space-y-4"><div><div className="flex justify-between text-sm"><span>Planned</span><strong>{formatDuration(planned)}</strong></div><div className="mt-2 h-2 rounded bg-surface-hover"><div className="h-full rounded bg-text-secondary" style={{ width: `${Math.min(100, planned / Math.max(planned, actual) * 100)}%` }} /></div></div><div><div className="flex justify-between text-sm"><span>Actual</span><strong>{formatDuration(actual)}</strong></div><div className="mt-2 h-2 rounded bg-surface-hover"><div className="h-full rounded bg-primary" style={{ width: `${Math.min(100, actual / Math.max(planned, actual) * 100)}%` }} /></div></div></div></Card>
    </div>
    <Card><h3 className="font-black">Recently completed</h3><div className="mt-4 divide-y divide-border/60">{recent.map((session) => <div key={session.id} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0"><div className="min-w-0"><strong className="block truncate text-sm">{session.title}</strong><span className="text-xs text-text-secondary">{session.project || 'Unassigned'}{session.endedAt ? ` · ${format(new Date(session.endedAt), 'MMM d, HH:mm')}` : ''}</span></div><span className={(session.actualDurationMs || 0) > session.plannedDurationMinutes * 60_000 ? 'shrink-0 text-sm font-bold text-amber-500' : 'shrink-0 text-sm font-bold'}>{formatDuration(session.actualDurationMs || 0)}</span></div>)}</div></Card>
  </div>;
}
const groupTime = (sessions: WorkSession[], key: (session: WorkSession) => string) => sessions.reduce<Record<string, number>>((result, session) => { const name = key(session); result[name] = (result[name] || 0) + (session.actualDurationMs || 0); return result; }, {});
function ReportMetric({ label, value, icon }: { label: string; value: string; icon?: ReactNode }) { return <Card><div className="text-primary">{icon}</div><p className="mt-3 text-sm text-text-secondary">{label}</p><strong className="text-xl">{value}</strong></Card>; }
function Breakdown({ title, values }: { title: string; values: Record<string, number> }) { const max = Math.max(1, ...Object.values(values)); return <Card><h3 className="font-black">{title}</h3><div className="mt-4 space-y-3">{Object.entries(values).sort((a, b) => b[1] - a[1]).map(([key, value]) => <div key={key}><div className="flex justify-between text-sm"><span>{key}</span><span>{formatDuration(value)}</span></div><div className="mt-1 h-2 rounded bg-surface-hover"><div className="h-full rounded bg-primary" style={{ width: `${value / max * 100}%` }} /></div></div>)}{!Object.keys(values).length && <p className="text-sm text-text-secondary">No data</p>}</div></Card>; }

export function ThemesPage() { return <ThemeSettings />; }
export function SettingsPage() { return <div className="space-y-5"><Card><ActionRegistry /></Card><Card><h3 className="font-black">Timer alerts</h3><div className="mt-4"><AudioSettings /></div></Card><Card><h3 className="font-black">Widgets</h3><div className="mt-4"><WidgetSettings /></div></Card><Card><h3 className="font-black">Data / Backup</h3><div className="mt-4"><DataSettings /></div></Card></div>; }
