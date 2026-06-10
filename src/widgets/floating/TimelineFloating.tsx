import { useAppStore } from '../../store/useAppStore';
import { useThemeStore } from '../../store/useThemeStore';
import { FloatingWidgetContainer } from './FloatingWidgetContainer';
import { clsx } from 'clsx';
import { format } from 'date-fns';

export function TimelineFloating() {
  const { schedules, currentTask } = useAppStore();
  const theme = useThemeStore(state => state.getTheme());
  const isTerminal = theme.type === 'terminal';

  return (
    <FloatingWidgetContainer type="timeline" title="Daily Timeline">
      <div className="p-4 h-full flex flex-col overflow-hidden">
        <div className="space-y-3 overflow-y-auto pr-2 custom-scrollbar">
          {schedules.length === 0 ? (
            <div className="text-center py-10 text-[10px] font-bold text-white/20 uppercase tracking-widest">
              No tasks scheduled
            </div>
          ) : (
            schedules.map((task) => {
              const isActive = currentTask?.id === task.id;
              return (
                <div 
                  key={task.id}
                  className={clsx(
                    "p-3 rounded-xl border transition-all",
                    isActive 
                      ? "bg-primary/20 border-primary text-primary" 
                      : "bg-surface/40 border-border/50 text-text/60"
                  )}
                >
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] font-black uppercase tracking-widest truncate max-w-[150px]">
                      {isTerminal && isActive && "> "}{task.title}
                    </span>
                    <span className="text-[8px] font-bold opacity-50">
                      {format(task.startTime, 'HH:mm')}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </FloatingWidgetContainer>
  );
}
