import { useEffect, useState, type ReactNode } from 'react';
import { format } from 'date-fns';
import { Check, ChevronDown, Clock3, Pause, Play, Plus, Square, Trash2 } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { getSessionElapsedMs, useWorkSessionStore } from '../core/sessions/useWorkSessionStore';
import { ActionRegistry } from './developer-actions/ActionRegistry';
import { TimelineWidget } from '../widgets/timeline/TimelineWidget';
import { PlannerWidget } from '../widgets/planner/PlannerWidget';
import { ThemeSettings } from '../components/ThemeSettings';
import { WidgetSettings } from '../components/WidgetSettings';
import { DataSettings } from '../components/DataSettings';
import { AudioSettings } from '../components/AudioSettings';
import { AgentSettings } from './agents/AgentSettings';
import { Button } from '../components/ui/Button';
import type { Schedule } from '../models/Schedule';
import type { WorkSession } from '../models/WorkSession';
import { EventTrack } from './orchestrator/EventTrack';
export { SchedulePage } from './schedule/SchedulePage';

function Card({ children, className = '' }: { children: ReactNode; className?: string }) { return <section className={`rounded-xl border border-border bg-surface p-5 shadow-sm ${className}`}>{children}</section>; }
function SettingsSection({ title, description, defaultOpen = false, children }: { title: string; description?: string; defaultOpen?: boolean; children: ReactNode }) {
  return <details open={defaultOpen} className="group overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
    <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 transition hover:bg-surface-hover/40 [&::-webkit-details-marker]:hidden">
      <div className="min-w-0">
        <h3 className="font-black">{title}</h3>
        {description && <p className="mt-1 truncate text-xs text-text-secondary">{description}</p>}
      </div>
      <ChevronDown className="h-4 w-4 shrink-0 text-text-secondary transition-transform group-open:rotate-180" />
    </summary>
    <div className="border-t border-border/60 p-5">{children}</div>
  </details>;
}
const formatDuration = (ms: number) => { const hours = Math.floor(ms / 3_600_000); const minutes = Math.floor((ms % 3_600_000) / 60_000); return hours ? `${hours}h ${minutes}m` : `${minutes}m`; };

export function OrchestratorPage({ onEdit, onNavigate }: { onEdit: (schedule: Schedule) => void; onNavigate: (page: string) => void }) {
  const schedules = useAppStore((state) => state.schedules);
  const currentTask = useAppStore((state) => state.currentTask);
  const nextTask = useAppStore((state) => state.nextTask);
  return <div className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-surface px-4 py-3"><div><h2 className="font-black">Today&apos;s Orchestrator</h2><div className="mt-1 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm"><span><strong>{schedules.length}</strong> blocks today</span><span className="text-text-secondary">Current: <strong className="text-text">{currentTask?.title || 'None'}</strong></span><span className="text-text-secondary">Next: <strong className="text-text">{nextTask ? `${format(nextTask.startTime, 'HH:mm')} ${nextTask.title}` : 'None'}</strong></span></div></div><Button size="sm" onClick={() => onNavigate('planner')}>Open Planner</Button></div>
    <div className="grid h-[calc(100vh-190px)] min-h-[620px] gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
      <EventTrack onOpenPlanner={() => onNavigate('planner')} />
      <div className="min-h-0"><TimelineWidget onEdit={onEdit} compact /></div>
    </div>
  </div>;
}

export function PlannerPage({ onNavigate }: { onNavigate?: (page: string) => void }) { return <div className="h-[calc(100vh-128px)] min-h-[640px] w-full"><PlannerWidget onNavigate={onNavigate} /></div>; }

export function SessionsPage() {
  const store = useWorkSessionStore();
  const [newSessionOpen, setNewSessionOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [duration, setDuration] = useState('60');
  useEffect(() => { const open = () => setNewSessionOpen(true); window.addEventListener('chronoflow:new-session', open); return () => window.removeEventListener('chronoflow:new-session', open); }, []);
  const create = () => {
    if (!title.trim()) return;
    store.create({ title, plannedDurationMinutes: Math.max(1, Number(duration) || 60) });
    setTitle(''); setDuration('60'); setNewSessionOpen(false);
  };
  const inactive = store.sessions.filter((session) => session.id !== store.activeSession?.id);
  return <div className="mx-auto max-w-3xl space-y-5">
    {store.activeSession ? <SimpleSessionTimer session={store.activeSession} /> : <div className="flex justify-end"><Button onClick={() => setNewSessionOpen(true)}><Plus className="h-4 w-4" /> New session</Button></div>}
    <Card><h3 className="font-black">Sessions</h3><div className="mt-4 space-y-2">{inactive.map((session) => <div key={session.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-surface-hover/20 p-4"><div><strong className="block">{session.title}</strong><span className="text-sm text-text-secondary">{session.plannedDurationMinutes} minutes · {session.status}</span></div><div className="flex gap-2">{session.status === 'planned' && <Button size="sm" onClick={() => store.start(session.id)}><Play className="h-3.5 w-3.5" /> Start</Button>}{!['running', 'paused', 'overdue'].includes(session.status) && <Button size="icon" variant="danger" title="Delete session" onClick={() => store.remove(session.id)}><Trash2 className="h-4 w-4" /></Button>}</div></div>)}{!inactive.length && <p className="py-6 text-center text-sm text-text-secondary">No saved sessions yet.</p>}</div></Card>
    {newSessionOpen && <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm"><form onSubmit={(event) => { event.preventDefault(); create(); }} className="w-full max-w-md rounded-xl border border-border bg-surface p-5 shadow-2xl"><h2 className="text-xl font-black">New session</h2><label className="mt-5 block"><span className="text-xs font-bold">Name</span><input autoFocus required value={title} onChange={(event) => setTitle(event.target.value)} className="mt-1 w-full rounded-lg border border-border p-3" placeholder="Focus session" /></label><label className="mt-4 block"><span className="text-xs font-bold">Minutes</span><input type="number" min="1" value={duration} onChange={(event) => setDuration(event.target.value)} className="mt-1 w-full rounded-lg border border-border p-3" /></label><div className="mt-6 flex justify-end gap-2"><Button type="button" variant="secondary" onClick={() => setNewSessionOpen(false)}>Cancel</Button><Button type="submit">Create timer</Button></div></form></div>}
  </div>;
}

function SimpleSessionTimer({ session }: { session: WorkSession }) {
  const { pause, resume, complete, cancel } = useWorkSessionStore();
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 1000); return () => window.clearInterval(timer); }, []);
  const elapsed = getSessionElapsedMs(session, now);
  const remaining = Math.max(0, session.plannedDurationMinutes * 60_000 - elapsed);
  const clock = (value: number) => new Date(value).toISOString().slice(11, 19);
  return <Card className="text-center"><p className="text-xs font-black uppercase text-primary">{session.status}</p><h2 className="mt-2 text-2xl font-black">{session.title}</h2><div className="mt-5 text-5xl font-black tabular-nums">{clock(remaining)}</div><p className="mt-2 text-sm text-text-secondary">{clock(elapsed)} elapsed of {session.plannedDurationMinutes} minutes</p><div className="mt-6 flex flex-wrap justify-center gap-2">{['running', 'overdue'].includes(session.status) && <Button onClick={pause}><Pause className="h-4 w-4" /> Pause</Button>}{session.status === 'paused' && <Button onClick={resume}><Play className="h-4 w-4" /> Resume</Button>}<Button variant="secondary" onClick={complete}><Check className="h-4 w-4" /> Complete</Button><Button variant="danger" onClick={cancel}><Square className="h-4 w-4" /> Cancel</Button></div></Card>;
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

export function SettingsPage() {
  return <div className="mx-auto max-w-6xl space-y-3">
    <div className="rounded-xl border border-border bg-surface px-5 py-4 shadow-sm">
      <h2 className="text-xl font-black">Settings</h2>
      <p className="mt-1 text-sm text-text-secondary">Core controls are grouped into dropdown sections to keep this page compact.</p>
    </div>
    <SettingsSection title="Developer Actions" description="Apps, URLs, folders, files and commands available to event actions." defaultOpen>
      <ActionRegistry />
    </SettingsSection>
    <SettingsSection title="AI Agents" description="CLI agents or Agent Apps triggered by timeline events." defaultOpen>
      <AgentSettings />
    </SettingsSection>
    <SettingsSection title="Themes" description="Theme presets, special backgrounds, and visual effects.">
      <ThemeSettings />
    </SettingsSection>
    <SettingsSection title="Timer alerts" description="Master volume, notification sounds and custom audio bank.">
      <AudioSettings />
    </SettingsSection>
    <div className="grid gap-3 lg:grid-cols-2">
      <SettingsSection title="Widgets" description="Floating widget behavior and appearance.">
        <WidgetSettings />
      </SettingsSection>
      <SettingsSection title="Data / Backup" description="Export or import local ChronoFlow data.">
        <DataSettings />
      </SettingsSection>
    </div>
  </div>;
}
