import { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { Bell, Bot, CheckSquare, FileText, Layers3, TriangleAlert, Workflow, Zap } from 'lucide-react';
import type { TimelineEventType } from '../../models/EventTimeline';
import { useAppStore } from '../../store/useAppStore';
import { usePlannerStore } from '../../store/usePlannerStore';
import { useThemeStore } from '../../store/useThemeStore';
import { Button } from '../../components/ui/Button';
import { WidgetContainer } from '../../widgets/widget-styles/WidgetContainer';

const eventStyles: Record<TimelineEventType, string> = {
  reminder: 'border-sky-400/60 bg-sky-500/20 text-sky-300',
  action: 'border-violet-400/60 bg-violet-500/20 text-violet-300',
  checklist: 'border-emerald-400/60 bg-emerald-500/20 text-emerald-300',
  note: 'border-amber-400/60 bg-amber-500/20 text-amber-300',
  alert: 'border-red-400/60 bg-red-500/20 text-red-300',
  flow_step: 'border-cyan-400/60 bg-cyan-500/20 text-cyan-300',
  agent: 'border-fuchsia-400/60 bg-fuchsia-500/20 text-fuchsia-300',
};

const eventIcons: Record<TimelineEventType, typeof Bell> = { reminder: Bell, action: Zap, agent: Bot, checklist: CheckSquare, note: FileText, alert: TriangleAlert, flow_step: Workflow };
const eventTime = (startMs: number, offsetMinutes: number) => format(new Date(startMs + offsetMinutes * 60_000), 'HH:mm');
const clampPercent = (value: number) => Math.min(100, Math.max(0, value));

export function ScheduleEventTrack({ onOpenPlanner }: { onOpenPlanner: () => void }) {
  const [now, setNow] = useState(() => Date.now());
  const schedules = useAppStore((state) => state.schedules);
  const tasks = usePlannerStore((state) => state.tasks);
  const isEditingTheme = useThemeStore((state) => state.isEditing);
  const activeEnvironment = useThemeStore((state) => state.activeEnvironment);
  const draftEnvironment = useThemeStore((state) => state.draftEnvironment);
  const style = isEditingTheme ? draftEnvironment.timelineStyle : activeEnvironment.timelineStyle;

  const rawBlocks = useMemo(() => schedules.map((schedule) => {
    const planned = tasks.find((task) => task.id === schedule.id);
    return { schedule, tracks: planned?.timelineTracks || [], events: planned?.timelineEvents || [] };
  }).filter((block) => block.events.length), [schedules, tasks]);

  const needsLiveTick = rawBlocks.some((block) => now >= block.schedule.startTime && now <= block.schedule.endTime)
    || rawBlocks.some((block) => block.events.some((event) => {
      const at = block.schedule.startTime + event.offsetMinutes * 60_000;
      return at >= now && at - now <= 5 * 60_000;
    }));

  useEffect(() => {
    const tick = () => setNow(Date.now());
    const timer = window.setInterval(tick, needsLiveTick ? 1000 : 30_000);
    tick();
    return () => window.clearInterval(timer);
  }, [needsLiveTick]);

  const blocks = useMemo(() => rawBlocks.filter((block) => block.schedule.endTime >= now).sort((a, b) => a.schedule.startTime - b.schedule.startTime), [now, rawBlocks]);
  const totalEvents = blocks.reduce((total, block) => total + block.events.length, 0);
  const nextEvent = blocks.flatMap((block) => block.events.map((event) => ({ event, at: block.schedule.startTime + event.offsetMinutes * 60_000, scheduleTitle: block.schedule.title }))).filter((item) => item.at >= now).sort((a, b) => a.at - b.at)[0];

  return <WidgetContainer style={style} noPadding className="h-full min-h-0 overflow-hidden">
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4"><div><div className="flex items-center gap-2"><Layers3 className="h-5 w-5 text-primary" /><h2 className="font-black">Event Track</h2><span className="rounded bg-surface-hover px-2 py-0.5 text-[10px] text-text-secondary">{totalEvents} events</span></div><p className="mt-1 text-xs text-text-secondary">Timed events from today’s scheduled Planner blocks</p></div><Button size="sm" variant="secondary" onClick={onOpenPlanner}>Edit in Planner</Button></header>
    {nextEvent && <div className="flex items-center justify-between gap-4 border-b border-border/60 bg-primary/5 px-5 py-3 text-sm"><span className="min-w-0 truncate"><strong className="text-primary">Next · {format(new Date(nextEvent.at), 'HH:mm')}</strong><span className="ml-2 text-text-secondary">{nextEvent.scheduleTitle} / {nextEvent.event.title}</span></span><span className="shrink-0 text-xs text-text-secondary">in {Math.max(1, Math.ceil((nextEvent.at - now) / 60_000))}m</span></div>}
    <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">{blocks.map(({ schedule, tracks, events }) => {
      const durationMinutes = Math.max(5, (schedule.endTime - schedule.startTime) / 60_000);
      const orderedTracks = [...tracks].sort((a, b) => a.order - b.order);
      const trackRows = orderedTracks.length ? orderedTracks : [{ id: 'events', name: 'Events', visible: true, locked: false, order: 0, createdAt: '', updatedAt: '' }];
      const running = now >= schedule.startTime && now <= schedule.endTime;
      const currentProgress = clampPercent((now - schedule.startTime) / Math.max(1, schedule.endTime - schedule.startTime) * 100);
      return <article key={schedule.id} className={`overflow-hidden rounded-xl border ${running ? 'border-primary/50 bg-primary/[.03]' : 'border-border bg-black/10'}`}>
        <div className="flex items-center justify-between gap-3 border-b border-border/60 px-4 py-3"><div className="min-w-0"><div className="flex items-center gap-2"><strong className="truncate">{schedule.title}</strong>{running && <span className="rounded bg-primary px-2 py-0.5 text-[9px] font-black uppercase text-primary-fg">Now</span>}</div><span className="text-xs tabular-nums text-text-secondary">{format(schedule.startTime, 'HH:mm')}–{format(schedule.endTime, 'HH:mm')} · {Math.round(durationMinutes)}m</span></div><span className="text-xs text-text-secondary">{events.length} events</span></div>
        <div className="overflow-x-auto"><div className="min-w-[680px]">
          <div className="grid h-8 grid-cols-[120px_1fr] border-b border-border/50"><div className="flex items-center border-r border-border/50 px-3 text-[9px] font-bold uppercase text-text-secondary">Tracks</div><div className="relative">{[0, .25, .5, .75, 1].map((ratio) => <span key={ratio} className="absolute inset-y-0 border-l border-border/50 pl-1 text-[9px] tabular-nums text-text-secondary" style={{ left: `${ratio * 100}%` }}>{eventTime(schedule.startTime, durationMinutes * ratio)}</span>)}</div></div>
          {trackRows.filter((track) => track.visible !== false).map((track) => {
            const rowEvents = orderedTracks.length ? events.filter((event) => event.trackId === track.id) : events;
            return <div key={track.id} className="grid min-h-14 grid-cols-[120px_1fr] border-b border-border/40 last:border-0"><div className="flex items-center truncate border-r border-border/50 px-3 text-xs font-bold">{track.name}</div><div className="relative bg-[linear-gradient(to_right,var(--color-border)_1px,transparent_1px)] bg-[length:25%_100%]">{running && <span className="absolute inset-y-0 z-10 w-px bg-primary shadow-[0_0_12px_var(--color-primary)]" style={{ left: `${currentProgress}%`, transition: 'left 1000ms linear' }} />}{rowEvents.map((event) => { const Icon = eventIcons[event.type]; const left = Math.min(100, event.offsetMinutes / durationMinutes * 100); const width = Math.max(3, Math.min(100 - left, (event.durationMinutes || 2) / durationMinutes * 100)); return <div key={event.id} className={`absolute top-2 flex h-10 items-center gap-1.5 overflow-hidden rounded-md border px-2 text-[10px] ${eventStyles[event.type]}`} style={{ left: `${left}%`, width: `${width}%` }} title={`${eventTime(schedule.startTime, event.offsetMinutes)} · ${event.title}`}><Icon className="h-3 w-3 shrink-0" /><span className="truncate font-bold">{event.title}</span></div>; })}</div></div>;
          })}
        </div></div>
      </article>;
    })}{!blocks.length && <div className="flex h-full min-h-72 flex-col items-center justify-center text-center"><Layers3 className="mb-3 h-8 w-8 text-text-secondary opacity-30" /><h3 className="font-bold">No events scheduled today</h3><p className="mt-1 max-w-sm text-sm text-text-secondary">Add an Event Timeline to a block in Planner. Its events will appear here automatically.</p><Button className="mt-4" size="sm" onClick={onOpenPlanner}>Open Planner</Button></div>}</div>
  </WidgetContainer>;
}
