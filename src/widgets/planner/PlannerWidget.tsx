import { useMemo, useState } from 'react';
import { addMonths, eachDayOfInterval, endOfMonth, endOfWeek, format, isSameDay, isSameMonth, isToday, startOfMonth, startOfWeek, subMonths } from 'date-fns';
import { CalendarDays, CheckCircle2, ChevronLeft, ChevronRight, Circle, Clock3, Keyboard, Layers3, Play, Plus } from 'lucide-react';
import { clsx } from 'clsx';
import { usePlannerStore } from '../../store/usePlannerStore';
import { useThemeStore } from '../../store/useThemeStore';
import type { PlannedTask } from '../../models/PlannedTask';
import { WidgetContainer } from '../widget-styles/WidgetContainer';
import { PlannerModal } from './PlannerModal';
import { Button } from '../../components/ui/Button';
import { useWorkSessionStore } from '../../core/sessions/useWorkSessionStore';
import { QuickPlannerModal } from '../../features/quick-planner/QuickPlannerModal';

const minutesBetween = (start?: string, end?: string) => {
  if (!start || !end) return 0;
  const toMinutes = (value: string) => Number(value.slice(0, 2)) * 60 + Number(value.slice(3));
  return Math.max(0, toMinutes(end) - toMinutes(start));
};

export function PlannerWidget({ onNavigate }: { onNavigate?: (page: string) => void }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [editingTask, setEditingTask] = useState<PlannedTask | null | undefined>(undefined);
  const [quickPlannerOpen, setQuickPlannerOpen] = useState(false);
  const tasks = usePlannerStore((state) => state.tasks);
  const toggleComplete = usePlannerStore((state) => state.toggleComplete);
  const createSession = useWorkSessionStore((state) => state.create);
  const startSession = useWorkSessionStore((state) => state.start);
  const activeSession = useWorkSessionStore((state) => state.activeSession);
  const isEditingTheme = useThemeStore((state) => state.isEditing);
  const activeEnvironment = useThemeStore((state) => state.activeEnvironment);
  const draftEnvironment = useThemeStore((state) => state.draftEnvironment);
  const style = isEditingTheme ? draftEnvironment.plannerStyle : activeEnvironment.plannerStyle;

  const monthStart = startOfMonth(currentMonth);
  const calendarDays = eachDayOfInterval({ start: startOfWeek(monthStart), end: endOfWeek(endOfMonth(monthStart)) });
  const selectedKey = format(selectedDate, 'yyyy-MM-dd');
  const dayTasks = useMemo(() => tasks.filter((task) => task.date === selectedKey).sort((a, b) => (a.startTime || '99:99').localeCompare(b.startTime || '99:99')), [tasks, selectedKey]);
  const totalMinutes = dayTasks.reduce((sum, task) => sum + (task.plannedDurationMinutes || minutesBetween(task.startTime, task.endTime)), 0);
  const selectDay = (day: Date) => { setSelectedDate(day); if (!isSameMonth(day, currentMonth)) setCurrentMonth(day); };
  const focusCreatedTask = (task: PlannedTask) => {
    const [year, month, day] = task.date.split('-').map(Number);
    const createdDate = new Date(year, month - 1, day);
    setSelectedDate(createdDate); setCurrentMonth(createdDate);
  };
  const launchBlock = (task: PlannedTask) => {
    if (activeSession) return window.alert('Finish the current session before starting this schedule block.');
    const session = createSession({ sourcePlannerTaskId: task.id, title: task.title, description: task.description, project: task.project, tags: task.tags, plannedDurationMinutes: task.plannedDurationMinutes || minutesBetween(task.startTime, task.endTime) || 30, actions: [], flowSteps: [], timelineTracks: task.timelineTracks || [], timelineEvents: task.timelineEvents || [] });
    startSession(session.id); onNavigate?.('sessions');
  };

  return <WidgetContainer style={style} className="h-full overflow-hidden">
    <div className="mb-4 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2"><CalendarDays className="h-5 w-5 text-primary" /><h2 className="font-black">{format(currentMonth, 'MMMM yyyy')}</h2></div>
      <div className="flex items-center gap-1"><Button size="sm" variant="secondary" onClick={() => setQuickPlannerOpen(true)}><Keyboard className="h-3.5 w-3.5" /> Quick Add</Button><Button variant="ghost" size="sm" onClick={() => { const today = new Date(); setCurrentMonth(today); setSelectedDate(today); }}>Today</Button><Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}><ChevronLeft className="h-4 w-4" /></Button><Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}><ChevronRight className="h-4 w-4" /></Button></div>
    </div>

    <div className="grid min-h-0 flex-1 gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(300px,.85fr)]">
      <div className="min-w-0 rounded-xl border border-border/60 bg-surface/20 p-3">
        <div className="mb-2 grid grid-cols-7">{['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => <div key={day} className="text-center text-[10px] font-bold uppercase text-text-secondary">{day}</div>)}</div>
        <div className="grid grid-cols-7 gap-1">{calendarDays.map((day) => {
          const selected = isSameDay(day, selectedDate); const key = format(day, 'yyyy-MM-dd'); const scheduled = tasks.filter((task) => task.date === key);
          return <button key={key} onClick={() => selectDay(day)} className={clsx('relative flex h-11 flex-col items-center justify-center rounded-lg text-sm font-bold transition', !isSameMonth(day, currentMonth) && 'opacity-30', selected ? 'bg-primary text-primary-fg' : 'hover:bg-surface-hover', isToday(day) && !selected && 'ring-1 ring-primary/60')}>
            {format(day, 'd')}
            {!!scheduled.length && <span className={clsx('absolute bottom-1 h-1 w-1 rounded-full', selected ? 'bg-primary-fg' : scheduled.every((task) => task.completed) ? 'bg-emerald-500' : 'bg-primary')} />}
          </button>;
        })}</div>
      </div>

      <div className="flex min-h-0 flex-col rounded-xl border border-border/60 bg-surface/20 p-4">
        <div className="flex items-start justify-between gap-3 border-b border-border/50 pb-3"><div><p className="text-xs font-bold uppercase text-text-secondary">{format(selectedDate, 'EEEE')}</p><h3 className="text-lg font-black">{format(selectedDate, 'MMM d, yyyy')}</h3><p className="mt-1 text-xs text-text-secondary">{dayTasks.length} tasks · {totalMinutes} min</p></div><Button size="icon" onClick={() => setEditingTask(null)}><Plus className="h-4 w-4" /></Button></div>
        <div className="mt-3 min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">{dayTasks.map((task) => <div key={task.id} className="group grid grid-cols-[auto_72px_1fr_auto] items-center gap-3 rounded-lg border border-border/50 bg-surface/40 p-3">
          <button onClick={() => toggleComplete(task.id)}>{task.completed ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <Circle className="h-4 w-4 text-text-secondary" />}</button>
          <div className="text-xs font-bold tabular-nums text-text-secondary"><div>{task.startTime || 'Any time'}</div>{task.endTime && <div>{task.endTime}</div>}</div>
          <button className="min-w-0 text-left" onClick={() => setEditingTask(task)}><strong className={clsx('block truncate text-sm', task.completed && 'line-through opacity-50')}>{task.title}</strong><span className="flex items-center gap-2 truncate text-xs text-text-secondary">{task.project || 'No project'}{!!task.timelineEvents?.length && <span className="inline-flex items-center gap-1 text-primary"><Layers3 className="h-3 w-3" />{task.timelineEvents.length}</span>}</span></button>
          <Button size="icon" variant="secondary" className="h-8 w-8 opacity-70 group-hover:opacity-100" title="Start this scheduled block" onClick={() => launchBlock(task)}><Play className="h-3.5 w-3.5" /></Button>
        </div>)}{!dayTasks.length && <div className="flex h-full min-h-48 flex-col items-center justify-center text-text-secondary"><Clock3 className="mb-2 h-6 w-6 opacity-40" /><p className="text-sm">No schedule for this day</p><button className="mt-2 text-sm font-bold text-primary" onClick={() => setEditingTask(null)}>Set schedule</button></div>}</div>
      </div>
    </div>

    {editingTask !== undefined && <PlannerModal isOpen onClose={() => setEditingTask(undefined)} date={selectedDate} initialData={editingTask} />}
    {quickPlannerOpen && <QuickPlannerModal date={selectedDate} onClose={() => setQuickPlannerOpen(false)} onCreated={focusCreatedTask} />}
  </WidgetContainer>;
}
