import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, Trash2, X } from 'lucide-react';
import { format } from 'date-fns';
import { usePlannerStore } from '../../store/usePlannerStore';
import type { PlannedTask } from '../../models/PlannedTask';
import { Button } from '../../components/ui/Button';
import type { TimelineEvent, TimelineTrack } from '../../models/EventTimeline';
import { EventTimelineEditor } from '../../features/event-timeline/EventTimelineEditor';

const toMinutes = (value: string) => Number(value.slice(0, 2)) * 60 + Number(value.slice(3));
const toTime = (minutes: number) => `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;

export function PlannerModal({ isOpen, onClose, date, initialData }: { isOpen: boolean; onClose: () => void; date: Date; initialData?: PlannedTask | null }) {
  const tasks = usePlannerStore((state) => state.tasks);
  const addTask = usePlannerStore((state) => state.addTask);
  const updateTask = usePlannerStore((state) => state.updateTask);
  const deleteTask = usePlannerStore((state) => state.deleteTask);
  const [title, setTitle] = useState(''); const [dateValue, setDateValue] = useState(format(date, 'yyyy-MM-dd'));
  const [startTime, setStartTime] = useState('09:00'); const [durationInput, setDurationInput] = useState('60');
  const [project, setProject] = useState('');
  const [timelineTracks, setTimelineTracks] = useState<TimelineTrack[]>([]); const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    const start = initialData?.startTime || '09:00';
    const calculatedDuration = initialData?.plannedDurationMinutes || (initialData?.endTime ? Math.max(1, toMinutes(initialData.endTime) - toMinutes(start)) : 60);
    setTitle(initialData?.title || ''); setDateValue(initialData?.date || format(date, 'yyyy-MM-dd'));
    setStartTime(start); setDurationInput(String(calculatedDuration)); setProject(initialData?.project || ''); setTimelineTracks(initialData?.timelineTracks || []); setTimelineEvents(initialData?.timelineEvents || []); setError('');
  }, [date, initialData, isOpen]);

  const duration = Math.max(5, Number(durationInput) || 5);
  const endMinutes = toMinutes(startTime) + duration;
  const endTime = endMinutes < 1440 ? toTime(endMinutes) : '';
  const conflict = useMemo(() => tasks.find((task) => task.id !== initialData?.id && task.date === dateValue && task.startTime && task.endTime && toMinutes(startTime) < toMinutes(task.endTime) && endMinutes > toMinutes(task.startTime)), [dateValue, endMinutes, initialData?.id, startTime, tasks]);
  if (!isOpen) return null;

  const submit = (event: FormEvent) => {
    event.preventDefault(); setError('');
    if (!title.trim()) return setError('Title is required.');
    if (!endTime) return setError('The schedule must end before midnight.');
    if (conflict) return setError(`Overlaps with “${conflict.title}” (${conflict.startTime}–${conflict.endTime}).`);
    const task: Omit<PlannedTask, 'id'> = { title: title.trim(), date: dateValue, startTime, endTime, project: project.trim() || undefined, category: undefined, type: undefined, plannedDurationMinutes: duration, status: initialData?.status || 'planned', completed: initialData?.completed || false, timelineTracks, timelineEvents };
    if (initialData) updateTask(initialData.id, task); else addTask({ ...task, id: crypto.randomUUID() });
    onClose();
  };
  const remove = () => { if (initialData) deleteTask(initialData.id); onClose(); };

  return createPortal(<div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm">
    <form onSubmit={submit} className="flex max-h-[96vh] w-[96vw] max-w-[1600px] flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-2xl">
      <div className="flex items-center justify-between border-b border-border px-5 py-4"><div><p className="text-xs font-bold uppercase text-primary">Daily schedule</p><h2 className="text-xl font-black">{initialData ? 'Edit task' : 'Set schedule'}</h2></div><button type="button" onClick={onClose}><X className="h-5 w-5" /></button></div>
      <div className="min-h-0 flex-1 overflow-y-auto p-5"><div className="grid gap-4 sm:grid-cols-4">
        <label className="sm:col-span-2"><span className="text-xs font-bold">Task</span><input autoFocus required value={title} onChange={(event) => setTitle(event.target.value)} className="mt-1 w-full rounded-lg border border-border p-3" placeholder="What needs to be done?" /></label>
        <label><span className="text-xs font-bold">Date</span><input type="date" value={dateValue} onChange={(event) => setDateValue(event.target.value)} className="mt-1 w-full rounded-lg border border-border p-3" /></label>
        <label><span className="text-xs font-bold">Project</span><input value={project} onChange={(event) => setProject(event.target.value)} className="mt-1 w-full rounded-lg border border-border p-3" placeholder="Repository or service" /></label>
        <label><span className="text-xs font-bold">Start</span><input type="time" value={startTime} onChange={(event) => setStartTime(event.target.value)} className="mt-1 w-full rounded-lg border border-border p-3" /></label>
        <label><span className="text-xs font-bold">Duration (minutes)</span><input type="number" min="1" step="1" value={durationInput} onChange={(event) => setDurationInput(event.target.value)} onBlur={() => { if ((Number(durationInput) || 0) < 5) setDurationInput('5'); }} className="mt-1 w-full rounded-lg border border-border p-3" /></label>
        <div className="rounded-lg border border-border bg-surface-hover/30 p-3 sm:col-span-2"><span className="text-xs text-text-secondary">Time block</span><strong className="mt-1 block tabular-nums">{startTime} → {endTime || 'Next day'}</strong></div>
        {conflict && <div className="sm:col-span-2 flex gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-500"><AlertTriangle className="h-4 w-4 shrink-0" />Overlaps with {conflict.title}, {conflict.startTime}–{conflict.endTime}</div>}
        {error && <div className="sm:col-span-2 text-sm font-bold text-red-500">{error}</div>}
      </div><div className="mt-5"><EventTimelineEditor durationMinutes={duration} startTime={startTime} tracks={timelineTracks} events={timelineEvents} onChange={(value) => { setTimelineTracks(value.tracks); setTimelineEvents(value.events); }} /></div></div>
      <div className="flex justify-between border-t border-border p-4">{initialData ? <Button type="button" variant="danger" onClick={remove}><Trash2 className="h-4 w-4" /> Delete</Button> : <span />}<div className="flex gap-2"><Button type="button" variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit">Save schedule</Button></div></div>
    </form>
  </div>, document.body);
}
