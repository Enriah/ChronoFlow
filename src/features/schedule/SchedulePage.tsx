import { addDays, format, startOfWeek } from 'date-fns';
import { ChevronDown, ChevronUp, Clock3, Pencil, Plus, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { PlannedTask } from '../../models/PlannedTask';
import { usePlannerStore } from '../../store/usePlannerStore';
import { Button } from '../../components/ui/Button';

const DAY_START = 6 * 60;
const DAY_END = 22 * 60;
const SLOT_MINUTES = 120;
const SLOT_HEIGHT = 92;
const minuteValues = Array.from({ length: 60 }, (_, index) => String(index).padStart(2, '0'));
const startHours = Array.from({ length: 16 }, (_, index) => String(index + 6).padStart(2, '0'));
const endHours = Array.from({ length: 17 }, (_, index) => String(index + 6).padStart(2, '0'));
const times = Array.from({ length: (DAY_END - DAY_START) / SLOT_MINUTES }, (_, index) => DAY_START + index * SLOT_MINUTES);

const toMinutes = (value?: string) => value ? Number(value.slice(0, 2)) * 60 + Number(value.slice(3, 5)) : DAY_START;
const toTime = (minutesFromMidnight: number) => `${String(Math.floor(minutesFromMidnight / 60)).padStart(2, '0')}:${String(minutesFromMidnight % 60).padStart(2, '0')}`;
const dateKey = (date: Date) => format(date, 'yyyy-MM-dd');
const durationOf = (task: PlannedTask) => Math.max(15, task.plannedDurationMinutes || (toMinutes(task.endTime) - toMinutes(task.startTime)) || 60);

export function SchedulePage() {
  const tasks = usePlannerStore((state) => state.tasks);
  const addTask = usePlannerStore((state) => state.addTask);
  const updateTask = usePlannerStore((state) => state.updateTask);
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [selectedDay, setSelectedDay] = useState(() => new Date());
  const [creating, setCreating] = useState(false);
  const [editingTask, setEditingTask] = useState<PlannedTask | null>(null);
  const [timingStart, setTimingStart] = useState('09:00');
  const [timingEnd, setTimingEnd] = useState('10:00');
  const [timingError, setTimingError] = useState('');

  const days = useMemo(() => Array.from({ length: 7 }, (_, index) => addDays(weekStart, index)), [weekStart]);
  const visibleTasks = useMemo(() => tasks.filter((task) => task.startTime && task.endTime && days.some((day) => task.date === dateKey(day))), [days, tasks]);
  const selectedDate = dateKey(selectedDay);
  const changeWeek = (offset: number) => { const next = addDays(weekStart, offset); setWeekStart(next); setSelectedDay(next); };
  const beginTaskEdit = (task: PlannedTask) => { setEditingTask(task); setTimingStart(task.startTime || '09:00'); setTimingEnd(task.endTime || toTime(toMinutes(task.startTime || '09:00') + durationOf(task))); setTimingError(''); };
  const savePreciseTiming = () => {
    if (!editingTask) return;
    const start = toMinutes(timingStart); const end = toMinutes(timingEnd);
    if (start < DAY_START || end > DAY_END || end <= start) { setTimingError('Use a time between 06:00 and 22:00, with an end after the start.'); return; }
    updateTask(editingTask.id, { startTime: timingStart, endTime: timingEnd, plannedDurationMinutes: end - start }); setEditingTask(null);
  };

  return <div className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4"><div><h2 className="text-xl font-black">Weekly Schedule</h2><p className="mt-1 text-sm text-text-secondary">Select a day and create a Work Card with exact start and end times.</p></div><div className="flex flex-wrap items-center gap-2"><Button size="sm" variant="secondary" onClick={() => changeWeek(-7)}>Previous</Button><Button size="sm" variant="secondary" onClick={() => { const current = startOfWeek(new Date(), { weekStartsOn: 1 }); setWeekStart(current); setSelectedDay(new Date()); }}>This week</Button><Button size="sm" variant="secondary" onClick={() => changeWeek(7)}>Next</Button><Button size="sm" onClick={() => setCreating(true)}><Plus className="h-4 w-4" /> New Work Card</Button></div></div>
    <div className="overflow-x-auto rounded-xl border border-border bg-surface shadow-sm"><div className="min-w-[980px]"><div className="grid grid-cols-[74px_repeat(7,minmax(126px,1fr))] border-b border-border bg-surface-muted"><div />{days.map((day) => <button key={dateKey(day)} type="button" onClick={() => setSelectedDay(day)} className={`border-l border-border px-3 py-3 text-center transition ${dateKey(day) === selectedDate ? 'bg-primary text-primary-fg' : dateKey(day) === dateKey(new Date()) ? 'bg-primary/5 text-primary hover:bg-primary/10' : 'hover:bg-surface-hover'}`}><strong className="block text-sm">{format(day, 'EEE')}</strong><span className="text-xs">{format(day, 'MMM d')}</span></button>)}</div><div className="grid grid-cols-[74px_repeat(7,minmax(126px,1fr))]"><div>{times.map((time) => <div key={time} className="h-[92px] border-b border-border px-2 pt-2 text-right text-xs text-text-secondary">{toTime(time)}</div>)}</div>{days.map((day) => <div key={dateKey(day)} className={`relative border-l border-border ${dateKey(day) === selectedDate ? 'bg-primary/[.035]' : ''}`} style={{ height: times.length * SLOT_HEIGHT }}>{times.map((time) => <div key={time} className="h-[92px] border-b border-border/70" />)}{visibleTasks.filter((task) => task.date === dateKey(day)).map((task) => <ScheduledCard key={task.id} task={task} onEdit={() => beginTaskEdit(task)} />)}</div>)}</div></div></div>
    {creating && <CreateWorkCardDialog day={selectedDay} onClose={() => setCreating(false)} onCreate={(task) => { addTask(task); setCreating(false); }} />}
    {editingTask && <TimingDialog task={editingTask} start={timingStart} end={timingEnd} error={timingError} onStart={setTimingStart} onEnd={setTimingEnd} onClose={() => setEditingTask(null)} onSave={savePreciseTiming} />}
  </div>;
}

function CreateWorkCardDialog({ day, onClose, onCreate }: { day: Date; onClose: () => void; onCreate: (task: PlannedTask) => void }) {
  const [title, setTitle] = useState(''); const [description, setDescription] = useState('');
  const [startHour, setStartHour] = useState('09'); const [startMinute, setStartMinute] = useState('00');
  const [endHour, setEndHour] = useState('10'); const [endMinute, setEndMinute] = useState('00'); const [error, setError] = useState('');
  const submit = () => {
    const startTime = `${startHour}:${startMinute}`; const endTime = `${endHour}:${endMinute}`;
    const start = toMinutes(startTime); const end = toMinutes(endTime);
    if (!title.trim()) { setError('Enter a Work Card name.'); return; }
    if (end <= start) { setError('The end time must be after the start time.'); return; }
    onCreate({ id: crypto.randomUUID(), title: title.trim(), description: description.trim() || undefined, date: dateKey(day), startTime, endTime, plannedDurationMinutes: end - start, color: '#0ea5e9', status: 'planned', completed: false });
  };
  return <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm"><form onSubmit={(event) => { event.preventDefault(); submit(); }} className="max-h-[94vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-border bg-surface p-5 shadow-2xl"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-black uppercase text-primary">{format(day, 'EEEE, MMM d')}</p><h2 className="mt-1 text-xl font-black">Create Work Card</h2></div><button type="button" onClick={onClose} className="rounded-lg p-2 text-text-secondary hover:bg-surface-hover hover:text-text" title="Close"><X className="h-5 w-5" /></button></div><div className="mt-5 grid gap-4 md:grid-cols-2"><label className="md:col-span-2"><span className="text-xs font-bold">Name</span><input autoFocus value={title} onChange={(event) => setTitle(event.target.value)} className="mt-1 w-full rounded-lg border border-border p-3" placeholder="Focus work" /></label><label className="md:col-span-2"><span className="text-xs font-bold">Description</span><textarea value={description} onChange={(event) => setDescription(event.target.value)} className="mt-1 min-h-24 w-full rounded-lg border border-border p-3" placeholder="Optional details" /></label><WheelTimePicker label="Start time" hour={startHour} minute={startMinute} hours={startHours} onHour={setStartHour} onMinute={setStartMinute} /><WheelTimePicker label="End time" hour={endHour} minute={endMinute} hours={endHours} onHour={setEndHour} onMinute={setEndMinute} /></div>{error && <p className="mt-4 text-sm font-bold text-red-500">{error}</p>}<div className="mt-6 flex justify-end gap-2"><Button type="button" variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit"><Plus className="h-4 w-4" /> Create Work Card</Button></div></form></div>;
}

function WheelTimePicker({ label, hour, minute, hours, onHour, onMinute }: { label: string; hour: string; minute: string; hours: string[]; onHour: (value: string) => void; onMinute: (value: string) => void }) {
  return <section className="rounded-lg border border-border bg-surface-muted p-4"><h3 className="text-sm font-black">{label}</h3><div className="mt-3 grid grid-cols-2 gap-3"><WheelPicker label="Hour" values={hours} value={hour} onChange={onHour} /><WheelPicker label="Minute" values={minuteValues} value={minute} onChange={onMinute} /></div></section>;
}

function WheelPicker({ label, values, value, onChange }: { label: string; values: string[]; value: string; onChange: (value: string) => void }) {
  const [origin, setOrigin] = useState<{ y: number; index: number } | null>(null);
  const index = Math.max(0, values.indexOf(value));
  const setIndex = (next: number) => onChange(values[Math.min(values.length - 1, Math.max(0, next))]);
  const nearby = (offset: number) => values[Math.min(values.length - 1, Math.max(0, index + offset))];
  return <div><span className="block text-[10px] font-bold uppercase text-text-secondary">{label}</span><div onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); setOrigin({ y: event.clientY, index }); }} onPointerMove={(event) => { if (!origin) return; setIndex(origin.index + Math.round((origin.y - event.clientY) / 28)); }} onPointerUp={() => setOrigin(null)} onPointerCancel={() => setOrigin(null)} onWheel={(event) => { event.preventDefault(); setIndex(index + (event.deltaY > 0 ? 1 : -1)); }} className="mt-1 grid h-32 cursor-ns-resize select-none grid-rows-3 overflow-hidden rounded-lg border border-border bg-surface text-center touch-none"><span className="flex items-center justify-center text-sm text-text-secondary opacity-45">{nearby(-1)}</span><strong className="flex items-center justify-center border-y border-primary/40 bg-primary/10 text-lg tabular-nums text-primary">{value}</strong><span className="flex items-center justify-center text-sm text-text-secondary opacity-45">{nearby(1)}</span></div><div className="mt-1 flex justify-center gap-1"><button type="button" className="rounded p-1 text-text-secondary hover:bg-surface-hover hover:text-text" onClick={() => setIndex(index - 1)} title={`Previous ${label}`}><ChevronUp className="h-3.5 w-3.5" /></button><button type="button" className="rounded p-1 text-text-secondary hover:bg-surface-hover hover:text-text" onClick={() => setIndex(index + 1)} title={`Next ${label}`}><ChevronDown className="h-3.5 w-3.5" /></button></div></div>;
}

function ScheduledCard({ task, onEdit }: { task: PlannedTask; onEdit: () => void }) {
  const start = Math.max(DAY_START, toMinutes(task.startTime)); const duration = Math.min(durationOf(task), DAY_END - start);
  return <button type="button" onClick={onEdit} className="absolute left-1 right-1 z-10 overflow-hidden rounded-lg border border-border bg-surface p-2 text-left shadow-md transition hover:border-primary hover:bg-surface-hover" style={{ top: ((start - DAY_START) / SLOT_MINUTES) * SLOT_HEIGHT + 2, height: Math.max(28, (duration / SLOT_MINUTES) * SLOT_HEIGHT - 4), borderLeftWidth: 4, borderLeftColor: task.color || 'var(--color-primary)' }} title={task.description || 'Adjust timing'}><span className="block truncate text-xs font-black">{task.title}</span><span className="mt-1 block text-[10px] text-text-secondary">{task.startTime} - {task.endTime}</span></button>;
}

function TimingDialog({ task, start, end, error, onStart, onEnd, onClose, onSave }: { task: PlannedTask; start: string; end: string; error: string; onStart: (value: string) => void; onEnd: (value: string) => void; onClose: () => void; onSave: () => void }) {
  return <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm"><div className="w-full max-w-md rounded-xl border border-border bg-surface p-5 shadow-2xl"><div className="flex items-start gap-3"><Clock3 className="mt-0.5 h-5 w-5 text-primary" /><div><h3 className="font-black">Adjust timing</h3><p className="mt-1 text-sm text-text-secondary">{task.title}</p></div></div><div className="mt-5 grid grid-cols-2 gap-3"><label><span className="text-xs font-bold">Start</span><input type="time" min="06:00" max="21:45" step="900" value={start} onChange={(event) => onStart(event.target.value)} className="mt-1 w-full rounded-lg border border-border p-2.5" /></label><label><span className="text-xs font-bold">End</span><input type="time" min="06:15" max="22:00" step="900" value={end} onChange={(event) => onEnd(event.target.value)} className="mt-1 w-full rounded-lg border border-border p-2.5" /></label></div>{error && <p className="mt-3 text-sm text-red-500">{error}</p>}<div className="mt-5 flex justify-end gap-2"><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={onSave}><Pencil className="h-4 w-4" /> Save timing</Button></div></div></div>;
}
