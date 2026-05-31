import { useState, useEffect, useRef } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { useThemeStore } from '../../store/useThemeStore';
import { useWidgetStore } from '../../store/useWidgetStore';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Play, Pause, SkipForward, Terminal as TerminalIcon, ExternalLink } from 'lucide-react';
import { WidgetContainer } from '../widget-styles/WidgetContainer';
import { WidgetManager } from '../../services/widgets/WidgetManager';
import { Button } from '../../components/ui/Button';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function CountdownWidget() {
  const { 
    currentTask, 
    nextTask, 
    isRunning, 
    toggleTimer, 
    skipTask 
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

  const isEditing = useThemeStore(state => state.isEditing);
  const activeEnv = useThemeStore(state => state.activeEnvironment);
  const draftEnv = useThemeStore(state => state.draftEnvironment);
  const theme = useThemeStore(state => state.getTheme());
  
  const style = isEditing ? draftEnv.countdownStyle : activeEnv.countdownStyle;

  if (!currentTask) {
    return (
      <WidgetContainer style={style} className="h-full min-h-[400px] flex flex-col items-center justify-center text-center">
        <h2 className="text-2xl text-text-secondary font-black tracking-tight">No Active Task</h2>
        {nextTask ? (
          <p className="mt-4 text-text-secondary font-medium">
            Next: <span className="text-text font-black">{nextTask.title}</span> at {new Date(nextTask.startTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
          </p>
        ) : (
          <p className="mt-4 text-text-secondary font-medium">Add a schedule to get started.</p>
        )}
      </WidgetContainer>
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

  const isTerminal = theme.type === 'terminal';
  const isNeon = theme.type === 'neon';

  return (
    <WidgetContainer 
      style={style} 
      className={cn(
        "h-full",
        !isNeon && !isTerminal && !style.backgroundImage && style.backgroundType === 'solid' && currentTask.color
      )}
    >
      {/* Personality Overlay */}
      {isTerminal && (
        <div className="absolute top-0 left-0 right-0 h-8 bg-primary/10 border-b border-primary/20 flex items-center px-4 gap-2">
          <TerminalIcon className="w-4 h-4" />
          <span className="text-[10px] font-mono uppercase tracking-tighter">chrono_monitor.v1</span>
        </div>
      )}

      {/* Main Content */}
      <div className={cn("relative z-10 flex-1 flex flex-col justify-between", isTerminal && "mt-8")}>
        <div className="flex flex-col md:flex-row justify-between items-start gap-6">
          <div className="space-y-2 min-w-0">
            <span className={cn(
              "inline-block px-3 py-1 rounded-full text-[10px] font-black tracking-widest uppercase",
              isTerminal ? "text-primary" : "bg-white/10 text-white"
            )}>
              {isTerminal ? "> STATUS: RUNNING" : "Current Session"}
            </span>
            <h2 className={cn(
              "text-3xl md:text-4xl font-black tracking-tight truncate",
              isTerminal ? "text-primary" : "text-white"
            )}>
              {isTerminal && "> "}{currentTask.title}
            </h2>
          </div>
          
          <div className="flex gap-2 shrink-0">
            <Button 
              variant="secondary"
              size="icon"
              onClick={() => {
                console.log("[CountdownWidget] Open Floating Widget button clicked");
                WidgetManager.openWidget('countdown');
              }}
              title="Open Floating Widget"
            >
              <ExternalLink className="w-5 h-5" />
            </Button>
            <Button 
              variant="secondary"
              size="icon"
              onClick={toggleTimer}
              title={isRunning ? "Pause" : "Resume"}
            >
              {isRunning ? <Pause className="fill-current w-5 h-5" /> : <Play className="fill-current ml-1 w-5 h-5" />}
            </Button>
            <Button 
              variant="secondary"
              size="icon"
              onClick={skipTask}
              title="Skip Task"
            >
              <SkipForward className="fill-current w-5 h-5" />
            </Button>
          </div>
        </div>

        <div className="my-auto py-12 text-center lg:text-left flex flex-wrap items-baseline justify-center lg:justify-start gap-x-4">
          <div className={cn(
            "text-8xl md:text-9xl font-black tracking-tighter tabular-nums leading-none",
            isTerminal ? "text-primary font-mono" : "text-white drop-shadow-2xl",
            isNeon && "glow-text"
          )}>
            {formattedTime}
          </div>
          {showMilliseconds && (
            <div className={cn(
              "text-4xl md:text-5xl font-black tracking-tighter tabular-nums opacity-50",
              isTerminal ? "text-primary font-mono" : "text-white",
              isNeon && "glow-text"
            )}>
              .{ms.toString().padStart(2, '0')}
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="space-y-3">
            <div className="flex justify-between text-xs font-black uppercase tracking-widest opacity-70">
              <span>{isTerminal ? "PROG_STAT" : "Session Progress"}</span>
              <span>{Math.round(smoothProgress)}%</span>
            </div>
            <div className={cn(
              "h-4 w-full rounded-full p-1 border border-border",
              isTerminal ? "bg-black" : "bg-black/30"
            )}>
              <div 
                className={cn(
                  "h-full rounded-full transition-all duration-100 ease-linear",
                  isTerminal ? "bg-primary" : "bg-white shadow-[0_0_15px_rgba(255,255,255,0.5)]",
                  isNeon && "glow-effect"
                )}
                style={{ width: `${smoothProgress}%` }}
              />
            </div>
          </div>
          
          {nextTask && (
            <div className="pt-6 border-t border-border flex justify-between items-center opacity-80">
              <div className="flex flex-col min-w-0">
                <span className="text-[10px] font-black uppercase tracking-widest opacity-50">
                  {isTerminal ? "NEXT_PTR" : "Coming up next"}
                </span>
                <span className={cn(
                  "font-bold text-lg truncate",
                  isTerminal ? "text-primary" : "text-white"
                )}>
                  {isTerminal && ">> "}{nextTask.title}
                </span>
              </div>
              <span className={cn(
                "shrink-0 text-sm font-black px-3 py-1 rounded-xl border border-border",
                isTerminal ? "text-primary" : "bg-white/10 text-white"
              )}>
                {new Date(nextTask.startTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
              </span>
            </div>
          )}
        </div>
      </div>
    </WidgetContainer>
  );
}
