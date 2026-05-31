import React, { useEffect, useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { Bell, ArrowRight, Zap } from 'lucide-react';
import { clsx } from 'clsx';

export const TransitionNotification: React.FC = () => {
  const nextTask = useAppStore(state => state.nextTask);
  const remainingMs = useAppStore(state => state.remainingMs);
  
  const [show, setShow] = useState(false);
  const [message, setMessage] = useState('');
  const [type, setType] = useState<'warning' | 'start'>('warning');

  useEffect(() => {
    const remainingMinutes = Math.floor(remainingMs / 60000);
    const remainingSeconds = Math.floor((remainingMs % 60000) / 1000);

    // 5 minute warning
    if (remainingMinutes === 5 && remainingSeconds === 0) {
      setMessage('Session ending in 5 minutes');
      setType('warning');
      setShow(true);
      setTimeout(() => setShow(false), 5000);
    }
    
    // 1 minute warning
    if (remainingMinutes === 1 && remainingSeconds === 0) {
      setMessage('Session ending in 1 minute');
      setType('warning');
      setShow(true);
      setTimeout(() => setShow(false), 5000);
    }

    // Task started (we can detect this when currentTask changes, 
    // but here we just check for the 0 mark or slightly after)
    // Better to handle "started" in the store logic
  }, [remainingMs]);

  if (!show) return null;

  return (
    <div className="fixed top-8 left-1/2 -translate-x-1/2 z-[100] animate-in fade-in slide-in-from-top-4 duration-500">
      <div className={clsx(
        "px-6 py-4 rounded-2xl border backdrop-blur-xl shadow-2xl flex items-center gap-4 min-w-[320px]",
        type === 'warning' ? "bg-amber-500/10 border-amber-500/20 text-amber-500" : "bg-primary/10 border-primary/20 text-primary"
      )}>
        <div className={clsx(
          "w-10 h-10 rounded-full flex items-center justify-center",
          type === 'warning' ? "bg-amber-500/20" : "bg-primary/20"
        )}>
          {type === 'warning' ? <Bell className="w-5 h-5" /> : <Zap className="w-5 h-5" />}
        </div>
        
        <div className="flex-grow">
          <p className="text-[10px] font-black uppercase tracking-widest opacity-60">
            {type === 'warning' ? 'Transition Alert' : 'New Session'}
          </p>
          <p className="text-sm font-bold text-text">
            {message}
          </p>
        </div>

        {nextTask && type === 'warning' && (
          <div className="flex items-center gap-2 pl-4 border-l border-border/20">
            <ArrowRight className="w-4 h-4 opacity-40" />
            <span className="text-xs font-bold opacity-60">{nextTask.title}</span>
          </div>
        )}
      </div>
    </div>
  );
};
