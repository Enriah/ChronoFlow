import { useAnalyticsStore } from '../../store/useAnalyticsStore';
import { useThemeStore } from '../../store/useThemeStore';
import { WidgetContainer } from '../widget-styles/WidgetContainer';
import { WidgetManager } from '../../services/widgets/WidgetManager';
import { Clock, TrendingUp, Calendar, ExternalLink } from 'lucide-react';
import { SectionHeader } from '../../components/ui/SectionHeader';
import { Button } from '../../components/ui/Button';

export function StatisticsWidget() {
  const { getWeeklyStats } = useAnalyticsStore();
  const { totalFocusTime, taskBreakdown } = getWeeklyStats();
  
  const isEditingTheme = useThemeStore(state => state.isEditing);
  const activeEnv = useThemeStore(state => state.activeEnvironment);
  const draftEnv = useThemeStore(state => state.draftEnvironment);
  const theme = useThemeStore(state => state.getTheme());
  
  const style = isEditingTheme ? draftEnv.statsStyle : activeEnv.statsStyle;
  const isTerminal = theme.type === 'terminal';

  const formatDuration = (ms: number) => {
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const tasks = Object.entries(taskBreakdown)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  const maxDuration = Math.max(...Object.values(taskBreakdown), 1);

  return (
    <WidgetContainer style={style} className="h-full">
      <SectionHeader 
        title={isTerminal ? "FOCUS_STATS" : "Weekly Focus"}
        icon={<TrendingUp className="w-5 h-5" />}
        actions={
          <Button 
            variant="ghost" 
            size="icon" 
            className="w-8 h-8" 
            onClick={() => WidgetManager.openWidget('weekly-focus')}
            title="Open Floating Widget"
          >
            <ExternalLink className="w-4 h-4" />
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-4 mb-10">
        <div className="bg-surface/30 p-5 rounded-2xl border border-border/50 transition-colors hover:border-primary/20">
          <span className="text-[10px] font-black uppercase tracking-widest text-text-secondary opacity-50 block mb-2">
            Total Time
          </span>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary" />
            <span className="text-xl font-black text-text tabular-nums">{formatDuration(totalFocusTime)}</span>
          </div>
        </div>
        <div className="bg-surface/30 p-5 rounded-2xl border border-border/50 transition-colors hover:border-primary/20">
          <span className="text-[10px] font-black uppercase tracking-widest text-text-secondary opacity-50 block mb-2">
            Active Days
          </span>
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-primary" />
            <span className="text-xl font-black text-text tabular-nums">7</span>
          </div>
        </div>
      </div>

      <div className="space-y-6 flex-grow overflow-y-auto custom-scrollbar pr-2">
        <h3 className="text-[10px] font-black uppercase tracking-widest text-text-secondary opacity-60 flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-primary" />
          Task Breakdown
        </h3>
        
        {tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 opacity-50 text-center space-y-3">
            <p className="text-xs font-medium italic">No data collected yet.</p>
          </div>
        ) : (
          tasks.map(([name, duration]) => (
            <div key={name} className="space-y-3">
              <div className="flex justify-between items-end gap-4">
                <span className="text-sm font-bold text-text truncate">{name}</span>
                <span className="text-xs font-medium text-text-secondary tabular-nums shrink-0">{formatDuration(duration)}</span>
              </div>
              <div className="h-2.5 w-full bg-surface/50 rounded-full overflow-hidden border border-border/20 p-0.5">
                <div 
                  className="h-full bg-primary rounded-full transition-all duration-1000 ease-out shadow-[0_0_8px_rgba(var(--primary-rgb),0.3)]"
                  style={{ width: `${(duration / maxDuration) * 100}%` }}
                />
              </div>
            </div>
          ))
        )}
      </div>

      {isTerminal && (
        <div className="mt-6 pt-4 border-t border-border/20">
          <span className="text-[10px] font-mono text-primary opacity-50 tracking-tighter uppercase">
            [SYSTEM_ANALYTICS_V1.0.4] :: OK
          </span>
        </div>
      )}
    </WidgetContainer>
  );
}
