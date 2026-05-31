import { useState, useEffect, useRef } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { useThemeStore } from '../../store/useThemeStore';
import { useWidgetStore } from '../../store/useWidgetStore';
import { SyncManager } from '../../services/widgets/SyncManager';
import { FloatingWidgetContainer } from './FloatingWidgetContainer';
import { Play, Pause, SkipForward } from 'lucide-react';
import { clsx } from 'clsx';

export function CountdownFloating() {
  const { 
    currentTask, 
    isRunning 
  } = useAppStore();
  
  const showMilliseconds = useWidgetStore(state => state.settings.showMilliseconds);
  const [localNow, setLocalNow] = useState(Date.now());
  const requestRef = useRef<number>(undefined);

  useEffect(() => {
    const animate = () => {
      if (isRunning) {
        setLocalNow(Date.now());
      }
      requestRef.current = requestAnimationFrame(animate);
    };
    
    requestRef.current = requestAnimationFrame(animate);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [isRunning]);

  const theme = useThemeStore(state => state.getTheme());
  const isTerminal = theme.type === 'terminal';

  if (!currentTask) {
    return (
      <FloatingWidgetContainer type="countdown" title="Focus Monitor">
        <div className="h-full flex flex-col items-center justify-center p-4 text-center">
          <span className="text-xs font-bold text-white/40 uppercase tracking-widest">Idle Mode</span>
        </div>
      </FloatingWidgetContainer>
    );
  }

  // Calculate remaining time smoothly
  const remainingMs = Math.max(0, currentTask.endTime - localNow);
  const totalMs = currentTask.endTime - currentTask.startTime;
  const smoothProgress = totalMs > 0 ? ((totalMs - remainingMs) / totalMs) * 100 : 100;

  // Format remaining time (HH:MM:SS.ms)
  const totalSeconds = Math.floor(remainingMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const ms = Math.floor((remainingMs % 1000) / 10);
  
  const formattedTime = [
    hours > 0 ? hours.toString().padStart(2, '0') : null,
    minutes.toString().padStart(2, '0'),
    seconds.toString().padStart(2, '0')
  ].filter(Boolean).join(':');

  return (
    <FloatingWidgetContainer type="countdown" title={currentTask.title}>
      <div className="p-4 h-full flex flex-col justify-between">
        <div className="flex justify-between items-center">
          <div className="flex flex-col">
            <span className="text-[9px] font-black text-white/40 uppercase tracking-[0.2em]">Remaining</span>
            <div className="flex items-baseline gap-1">
              <div className={clsx(
                "text-3xl font-black tracking-tighter tabular-nums",
                isTerminal ? "text-primary font-mono" : "text-white"
              )}>
                {formattedTime}
              </div>
              {showMilliseconds && (
                <div className={clsx(
                  "text-lg font-black tracking-tighter tabular-nums opacity-40",
                  isTerminal ? "text-primary font-mono" : "text-white"
                )}>
                  .{ms.toString().padStart(2, '0')}
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-2">
            <button 
              onClick={() => SyncManager.dispatchAction('toggleTimer')}
              className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/5 hover:bg-white/10 text-white transition-all active:scale-95 border border-white/5"
            >
              {isRunning ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current ml-0.5" />}
            </button>
            <button 
              onClick={() => SyncManager.dispatchAction('skipTask')}
              className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/5 hover:bg-white/10 text-white transition-all active:scale-95 border border-white/5"
            >
              <SkipForward className="w-3.5 h-3.5 fill-current" />
            </button>
          </div>
        </div>

        <div className="space-y-1.5 mt-2">
          <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
            <div 
              className={clsx(
                "h-full rounded-full transition-all duration-100 ease-linear shadow-[0_0_10px_rgba(255,255,255,0.2)]",
                isTerminal ? "bg-primary" : "bg-white"
              )}
              style={{ width: `${smoothProgress}%` }}
            />
          </div>
          <div className="flex justify-between text-[8px] font-black uppercase tracking-widest text-white/30">
            <span>{currentTask.title}</span>
            <span>{Math.round(smoothProgress)}%</span>
          </div>
        </div>
      </div>
    </FloatingWidgetContainer>
  );
}
