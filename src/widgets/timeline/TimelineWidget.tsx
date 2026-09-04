import { useAppStore } from '../../store/useAppStore';
import { useThemeStore } from '../../store/useThemeStore';
import { Clock, CalendarDays, Edit2, Trash2, Globe, Laptop, FolderOpen } from 'lucide-react';
import { format } from 'date-fns';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { Schedule } from '../../models/Schedule';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface TimelineWidgetProps {
  onEdit: (schedule: Schedule) => void;
  compact?: boolean;
}

export function TimelineWidget({ onEdit, compact = false }: TimelineWidgetProps) {
  const schedules = useAppStore(state => state.schedules);
  const deleteSchedule = useAppStore(state => state.deleteSchedule);
  
  const theme = useThemeStore(state => state.getTheme());
  const isTerminal = theme.type === 'terminal';

  return (
    <div className="relative flex h-full flex-col rounded-xl border border-border bg-surface p-5 shadow-sm">
      <div className={`flex items-center justify-between relative z-10 ${compact ? 'mb-4' : 'mb-8'}`}>
        <h3 className={`${compact ? 'text-base' : 'text-xl'} font-black tracking-tight text-text flex items-center gap-2`}>
          <CalendarDays className="w-5 h-5 text-primary" />
          {isTerminal ? "> SCHED_LOG" : "Today's Timeline"}
        </h3>
      </div>

      <div className="space-y-3 overflow-y-auto pr-2 flex-1 relative z-10 custom-scrollbar">
        {[...schedules].sort((a, b) => a.startTime - b.startTime).map(schedule => {
          const hasUrls = schedule.linkedActions?.some(a => a.type === 'url' && a.enabled);
          const hasApps = schedule.linkedActions?.some(a => a.type === 'app' && a.enabled);
          const hasFolders = schedule.linkedActions?.some(a => a.type === 'folder' && a.enabled);

          return (
            <div 
              key={schedule.id}
              className={cn(
                `group flex items-center rounded-[calc(var(--radius)/1.5)] bg-surface-hover/30 hover:bg-surface-hover/60 transition-all border border-border/50 hover:border-primary/30 ${compact ? 'gap-2 p-3' : 'gap-4 p-4'}`,
                isTerminal && "font-mono"
              )}
            >
              <div className={cn(`${compact ? 'w-1 h-9' : 'w-2 h-10'} rounded-full shrink-0`, !isTerminal && schedule.color, isTerminal && "bg-primary")} />
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className={`${compact ? 'text-sm' : 'text-base'} font-bold text-text truncate`}>
                    {isTerminal && "> "}{schedule.title}
                  </h4>
                  {(hasUrls || hasApps || hasFolders) && (
                    <div className="flex gap-1">
                      {hasUrls && <Globe className="w-2.5 h-2.5 text-primary opacity-50" />}
                      {hasApps && <Laptop className="w-2.5 h-2.5 text-primary opacity-50" />}
                      {hasFolders && <FolderOpen className="w-2.5 h-2.5 text-primary opacity-50" />}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-1 text-xs text-text-secondary font-medium">
                  <Clock className="w-3.5 h-3.5 text-primary" />
                  <span>
                    {format(new Date(schedule.startTime), 'HH:mm')} - {format(new Date(schedule.endTime), 'HH:mm')}
                  </span>
                </div>
              </div>
              
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                <button 
                  onClick={() => onEdit(schedule)}
                  className="p-2 hover:bg-primary/10 rounded-xl text-text-secondary hover:text-primary transition-all"
                  title="Edit"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => deleteSchedule(schedule.id)}
                  className="p-2 hover:bg-rose-500/10 rounded-xl text-text-secondary hover:text-rose-500 transition-all"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}

        {schedules.length === 0 && (
          <div className="text-center py-20">
            <div className="w-16 h-16 bg-surface-hover rounded-full flex items-center justify-center mx-auto mb-4">
              <CalendarDays className="w-8 h-8 text-text-secondary opacity-30" />
            </div>
            <p className="text-text-secondary font-medium">
              {isTerminal ? "[NO_DATA_FOUND]" : "No tasks scheduled yet."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
