import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { usePlannerStore } from '../../store/usePlannerStore';
import { useThemeStore } from '../../store/useThemeStore';
import type { PlannedTask } from '../../models/PlannedTask';
import { format } from 'date-fns';
import { Button } from '../../components/ui/Button';
import { clsx } from 'clsx';

interface PlannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  date: Date;
  initialData?: PlannedTask | null;
}

export function PlannerModal({ isOpen, onClose, date, initialData }: PlannerModalProps) {
  const [title, setTitle] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [category, setCategory] = useState('');

  const addTask = usePlannerStore(state => state.addTask);
  const updateTask = usePlannerStore(state => state.updateTask);
  const deleteTask = usePlannerStore(state => state.deleteTask);
  const theme = useThemeStore(state => state.getTheme());
  const isTerminal = theme.type === 'terminal';

  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title);
      setStartTime(initialData.startTime || '');
      setEndTime(initialData.endTime || '');
      setCategory(initialData.category || '');
    } else {
      setTitle('');
      setStartTime('');
      setEndTime('');
      setCategory('');
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) return;

    const taskData = {
      title,
      date: format(date, 'yyyy-MM-dd'),
      startTime: startTime || undefined,
      endTime: endTime || undefined,
      category: category || undefined,
    };

    if (initialData) {
      updateTask(initialData.id, taskData);
    } else {
      addTask({
        ...taskData,
        id: crypto.randomUUID(),
        completed: false,
      });
    }
    onClose();
  };

  const handleDelete = () => {
    if (initialData) {
      deleteTask(initialData.id);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className={clsx(
        "bg-surface border border-border w-full max-w-md rounded-[2rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200",
        isTerminal && "font-mono rounded-none"
      )}>
        <div className="p-8 border-b border-border flex justify-between items-center">
          <h2 className="text-2xl font-black tracking-tight text-text">
            {isTerminal 
              ? (initialData ? "> EDIT_PLAN" : "> NEW_PLAN") 
              : (initialData ? 'Edit Planned Task' : 'Plan New Task')
            }
          </h2>
          <Button variant="ghost" size="icon" onClick={onClose} className="text-text-secondary hover:text-text">
            <X className="w-6 h-6" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-text-secondary opacity-60">Task Title</label>
            <input 
              required
              type="text" 
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What are you planning?"
              className="w-full bg-surface-hover border border-border rounded-2xl px-5 py-4 text-text placeholder:text-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-bold"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-text-secondary opacity-60">Start Time</label>
              <input 
                type="time" 
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full bg-surface-hover border border-border rounded-2xl px-5 py-4 text-text focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-bold"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-text-secondary opacity-60">End Time</label>
              <input 
                type="time" 
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full bg-surface-hover border border-border rounded-2xl px-5 py-4 text-text focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-bold"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-text-secondary opacity-60">Category</label>
            <input 
              type="text" 
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="Work, Study, Gym..."
              className="w-full bg-surface-hover border border-border rounded-2xl px-5 py-4 text-text focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-bold"
            />
          </div>

          <div className="pt-6 flex gap-4">
            {initialData && (
              <Button 
                type="button"
                variant="danger"
                className="flex-1"
                onClick={handleDelete}
              >
                Delete
              </Button>
            )}
            <button 
              type="submit"
              className={clsx(
                "flex-[2] bg-primary text-primary-fg px-6 py-4 rounded-2xl font-black uppercase tracking-widest hover:opacity-90 transition-all shadow-lg shadow-primary/20 active:scale-95",
                isTerminal && "font-mono rounded-none"
              )}
            >
              {initialData ? 'Save Changes' : 'Plan Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
