import { useAnalyticsStore } from '../../store/useAnalyticsStore';
import { useThemeStore } from '../../store/useThemeStore';
import { FloatingWidgetContainer } from './FloatingWidgetContainer';
import { clsx } from 'clsx';
import { BarChart3 } from 'lucide-react';

export function WeeklyFocusFloating() {
  const { getWeeklyStats } = useAnalyticsStore();
  const { totalFocusTime, dailyFocusTime } = getWeeklyStats();
  const theme = useThemeStore(state => state.getTheme());
  const isTerminal = theme.type === 'terminal';

  // Convert dailyFocusTime to sorted array
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - i);
    return d.toISOString().split('T')[0];
  }).reverse();

  const stats = last7Days.map(date => ({
    day: new Date(date).toLocaleDateString('en-US', { weekday: 'short' }),
    hours: (dailyFocusTime[date] || 0) / (1000 * 60 * 60)
  }));

  const totalHours = totalFocusTime / (1000 * 60 * 60);
  const maxHours = Math.max(...stats.map(s => s.hours), 1);

  return (
    <FloatingWidgetContainer type="weekly-focus" title="Weekly Progress">
      <div className="p-6 h-full flex flex-col justify-between">
        <div className="flex items-center justify-between mb-6">
          <div className="flex flex-col">
            <span className="text-[10px] font-black text-text/40 uppercase tracking-[0.2em]">Total Focus</span>
            <div className={clsx(
              "text-3xl font-black tracking-tighter",
              isTerminal ? "text-primary font-mono" : "text-text"
            )}>
              {totalHours.toFixed(1)}h
            </div>
          </div>
          <BarChart3 className={clsx("w-8 h-8", isTerminal ? "text-primary" : "text-primary/40")} />
        </div>

        <div className="flex-1 flex items-end justify-between gap-2 h-32 mb-4">
          {stats.map((stat, idx) => (
            <div key={idx} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
              <div 
                className={clsx(
                  "w-full rounded-t-md transition-all duration-500",
                  isTerminal ? "bg-primary/40 border-t border-primary" : "bg-primary/30 hover:bg-primary/50"
                )}
                style={{ height: `${(stat.hours / maxHours) * 100}%` }}
              />
              <span className="text-[8px] font-black uppercase text-text/30 tracking-widest">{stat.day}</span>
            </div>
          ))}
        </div>

        <div className="pt-4 border-t border-border/20">
          <p className="text-[9px] font-medium text-text/40 leading-relaxed italic">
            "Focus is a muscle."
          </p>
        </div>
      </div>
    </FloatingWidgetContainer>
  );
}
