import { useAnalyticsStore } from '../../store/useAnalyticsStore';
import { useThemeStore } from '../../store/useThemeStore';
import { WidgetContainer } from '../widget-styles/WidgetContainer';
import { Trophy, Medal, Star, Award } from 'lucide-react';
import { clsx } from 'clsx';
import { SectionHeader } from '../../components/ui/SectionHeader';

export function RankingWidget() {
  const { getRankings } = useAnalyticsStore();
  const rankings = getRankings().slice(0, 5);
  
  const isEditingTheme = useThemeStore(state => state.isEditing);
  const activeEnv = useThemeStore(state => state.activeEnvironment);
  const draftEnv = useThemeStore(state => state.draftEnvironment);
  const theme = useThemeStore(state => state.getTheme());
  
  const style = isEditingTheme ? draftEnv.rankingStyle : activeEnv.rankingStyle;
  const isTerminal = theme.type === 'terminal';

  const formatDuration = (ms: number) => {
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const getRankIcon = (index: number) => {
    switch (index) {
      case 0: return <Trophy className="w-5 h-5 text-yellow-400" />;
      case 1: return <Medal className="w-5 h-5 text-slate-300" />;
      case 2: return <Medal className="w-5 h-5 text-amber-600" />;
      default: return <Star className="w-4 h-4 text-primary/50" />;
    }
  };

  return (
    <WidgetContainer style={style} className="h-full">
      <SectionHeader 
        title={isTerminal ? "TOP_TASKS" : "Top Activities"}
        icon={<Award className="w-5 h-5" />}
      />

      <div className="space-y-4 flex-grow overflow-y-auto custom-scrollbar pr-2">
        {rankings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 opacity-50 text-center space-y-4">
            <Trophy className="w-16 h-16 text-border opacity-20" />
            <p className="text-sm font-medium italic">No rankings available yet.</p>
          </div>
        ) : (
          rankings.map((task, index) => (
            <div 
              key={task.name}
              className={clsx(
                "flex items-center justify-between p-4 rounded-2xl transition-all border group",
                index === 0 
                  ? "bg-primary/10 border-primary/30 shadow-sm" 
                  : "bg-surface/30 border-border/20 hover:bg-surface-hover/50 hover:border-primary/20"
              )}
            >
              <div className="flex items-center gap-4 min-w-0">
                <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-surface/50 flex items-center justify-center shadow-sm border border-border/10">
                  {getRankIcon(index)}
                </div>
                <div className="flex flex-col min-w-0">
                  <span className={clsx(
                    "text-sm font-black truncate",
                    index === 0 ? "text-primary" : "text-text"
                  )}>
                    {task.name}
                  </span>
                  <span className="text-[10px] font-bold text-text-secondary uppercase tracking-widest opacity-60">
                    Rank #{index + 1}
                  </span>
                </div>
              </div>
              <div className="text-right shrink-0">
                <span className="text-sm font-black text-text tabular-nums">
                  {formatDuration(task.duration)}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      <div className={clsx(
        "mt-6 p-4 rounded-2xl border border-border/10",
        isTerminal ? "bg-primary/5" : "bg-surface/20"
      )}>
        <p className="text-[10px] font-bold text-text-secondary text-center uppercase tracking-widest opacity-70">
          {isTerminal ? ">> ANALYZING_FOCUS_PATTERNS..." : "Maintain focus to climb the ranks"}
        </p>
      </div>
    </WidgetContainer>
  );
}
