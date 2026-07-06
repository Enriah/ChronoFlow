import { useState, useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';
import { useThemeStore } from '../store/useThemeStore';
import type { Schedule } from '../models/Schedule';
import { X } from 'lucide-react';
import { clsx } from 'clsx';
import { getTodayDateString } from '../utils/time';
import { Button } from './ui/Button';
import { ToggleSwitch } from './ui/ToggleSwitch';
import type { DevTaskType } from '../models/DevTask';

interface ScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: Schedule;
}

export function ScheduleModal({ isOpen, onClose, initialData }: ScheduleModalProps) {
  const [title, setTitle] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [color, setColor] = useState('bg-blue-500');
  const [taskType, setTaskType] = useState<DevTaskType>('coding');
  const [project, setProject] = useState('');
  const [tags, setTags] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [deepWork, setDeepWork] = useState(false);

  const addSchedule = useAppStore(state => state.addSchedule);
  const updateSchedule = useAppStore(state => state.updateSchedule);
  const theme = useThemeStore(state => state.getTheme());
  const isTerminal = theme.type === 'terminal';

  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title);
      const start = new Date(initialData.startTime);
      const end = new Date(initialData.endTime);
      setStartTime(`${start.getHours().toString().padStart(2, '0')}:${start.getMinutes().toString().padStart(2, '0')}`);
      setEndTime(`${end.getHours().toString().padStart(2, '0')}:${end.getMinutes().toString().padStart(2, '0')}`);
      setColor(initialData.color);
      setTaskType(initialData.type || 'coding');
      setProject(initialData.project || '');
      setTags((initialData.tags || []).join(', '));
      setPriority(initialData.priority || 'medium');
      setDeepWork(initialData.deepWork || false);
    } else {
      setTitle('');
      setStartTime('09:00');
      setEndTime('10:00');
      setColor('bg-blue-500');
      setTaskType('coding'); setProject(''); setTags(''); setPriority('medium'); setDeepWork(false);
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const today = new Date();
    const todayStr = getTodayDateString();
    const [startH, startM] = startTime.split(':').map(Number);
    const [endH, endM] = endTime.split(':').map(Number);

    const startEpoch = new Date(today.getFullYear(), today.getMonth(), today.getDate(), startH, startM).getTime();
    const endEpoch = new Date(today.getFullYear(), today.getMonth(), today.getDate(), endH, endM).getTime();
    if (endEpoch <= startEpoch) return;
    const devFields = { type: taskType, project: project || undefined, tags: tags.split(',').map((tag) => tag.trim()).filter(Boolean), priority, deepWork, plannedDurationMinutes: Math.max(1, Math.round((endEpoch - startEpoch) / 60000)), status: 'planned' as const };

    if (initialData) {
      updateSchedule(initialData.id, {
        title,
        startTime: startEpoch,
        endTime: endEpoch,
        color,
        date: todayStr
        , ...devFields
      });
    } else {
      addSchedule({
        id: Math.random().toString(36).substr(2, 9),
        title,
        startTime: startEpoch,
        endTime: endEpoch,
        date: todayStr,
        color,
        recurring: true,
        repeatDays: [today.getDay()],
        completed: false,
        notificationsEnabled: true
        , ...devFields
      });
    }

    onClose();
  };

  const colors = [
    { name: 'Blue', class: 'bg-blue-500' },
    { name: 'Emerald', class: 'bg-emerald-500' },
    { name: 'Rose', class: 'bg-rose-500' },
    { name: 'Amber', class: 'bg-amber-500' },
    { name: 'Violet', class: 'bg-violet-500' },
    { name: 'Slate', class: 'bg-slate-500' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className={clsx(
        "bg-surface border border-border w-full max-w-md rounded-[2rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200",
        isTerminal && "font-mono rounded-none"
      )}>
        <div className="flex items-center justify-between p-8 border-b border-border">
          <h2 className="text-2xl font-black tracking-tight text-text">
            {isTerminal ? (initialData ? "> EDIT_SCHED" : "> ADD_SCHED") : (initialData ? 'Edit Schedule' : 'Add New Schedule')}
          </h2>
          <Button variant="ghost" size="icon" onClick={onClose} className="text-text-secondary hover:text-text">
            <X className="w-6 h-6" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="space-y-2">
            <label className="block text-[10px] font-black uppercase tracking-widest text-text-secondary opacity-60">
              {isTerminal ? "LABEL:" : "Task Title"}
            </label>
            <input 
              required
              type="text" 
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder={isTerminal ? "INPUT_DATA..." : "e.g., Deep Work Session"}
              className="w-full bg-surface-hover border border-border rounded-2xl px-5 py-4 text-text placeholder:text-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-bold"
            />
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="block text-[10px] font-black uppercase tracking-widest text-text-secondary opacity-60">
                {isTerminal ? "START:" : "Start Time"}
              </label>
              <input 
                required
                type="time" 
                value={startTime}
                onChange={e => setStartTime(e.target.value)}
                className="w-full bg-surface-hover border border-border rounded-2xl px-5 py-4 text-text focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-bold"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-[10px] font-black uppercase tracking-widest text-text-secondary opacity-60">
                {isTerminal ? "END:" : "End Time"}
              </label>
              <input 
                required
                type="time" 
                value={endTime}
                onChange={e => setEndTime(e.target.value)}
                className="w-full bg-surface-hover border border-border rounded-2xl px-5 py-4 text-text focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-bold"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><label className="block text-[10px] font-black uppercase tracking-widest text-text-secondary">Work type</label><select value={taskType} onChange={(e) => setTaskType(e.target.value as DevTaskType)} className="w-full rounded-2xl px-4 py-3">{['coding','devops','learning','debugging','meeting','deployment','incident','review','documentation'].map((type) => <option key={type}>{type}</option>)}</select></div>
            <div className="space-y-2"><label className="block text-[10px] font-black uppercase tracking-widest text-text-secondary">Priority</label><select value={priority} onChange={(e) => setPriority(e.target.value as typeof priority)} className="w-full rounded-2xl px-4 py-3">{['low','medium','high'].map((value) => <option key={value}>{value}</option>)}</select></div>
          </div>
          <div className="grid grid-cols-2 gap-4"><input value={project} onChange={(e) => setProject(e.target.value)} placeholder="Project" className="rounded-2xl px-4 py-3"/><input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="Tags, comma separated" className="rounded-2xl px-4 py-3"/></div>
          <ToggleSwitch checked={deepWork} onCheckedChange={setDeepWork} label="Deep work session" description="Mark this block as focused work." className="rounded-xl border border-border bg-surface-hover/20 px-4 py-3" />

          {!isTerminal && (
            <div className="space-y-3">
              <label className="block text-[10px] font-black uppercase tracking-widest text-text-secondary opacity-60">Color Theme</label>
              <div className="flex flex-wrap gap-3">
                {colors.map(c => (
                  <button
                    key={c.class}
                    type="button"
                    onClick={() => setColor(c.class)}
                    className={clsx(
                      "w-10 h-10 rounded-full transition-all flex items-center justify-center",
                      c.class,
                      color === c.class ? 'ring-4 ring-primary/30 scale-110' : 'opacity-70 hover:opacity-100'
                    )}
                  >
                    {color === c.class && <div className="w-2 h-2 bg-white rounded-full" />}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="pt-6 flex gap-4">
            <Button 
              type="button"
              variant="secondary"
              className="flex-1"
              onClick={onClose}
            >
              {isTerminal ? "BACK" : "Cancel"}
            </Button>
            <Button 
              type="submit"
              className="flex-[1.5]"
            >
              {isTerminal ? "EXECUTE" : (initialData ? 'Update Schedule' : 'Create Schedule')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
