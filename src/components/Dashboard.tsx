import { useState } from 'react';
import { CountdownWidget } from '../widgets/countdown/CountdownWidget';
import { TimelineWidget } from '../widgets/timeline/TimelineWidget';
import { PlannerWidget } from '../widgets/planner/PlannerWidget';
import { StatisticsWidget } from '../widgets/statistics/StatisticsWidget';
import { RankingWidget } from '../widgets/ranking/RankingWidget';
import { ScheduleModal } from './ScheduleModal';
import { ThemeSettings } from './ThemeSettings';
import { useThemeStore } from '../store/useThemeStore';
import type { Schedule } from '../models/Schedule';
import { Settings, Plus } from 'lucide-react';
import { clsx } from 'clsx';
import { BackgroundLayer } from '../visual-engine/backgrounds/BackgroundLayer';
import { VisualEffectsLayer } from '../visual-engine/renderer/VisualEffectsLayer';
import { OverlayLayer } from '../visual-engine/overlays/OverlayLayer';
import { Button } from './ui/Button';

import { TransitionNotification } from './notifications/TransitionNotification';

export function Dashboard() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | undefined>();
  const theme = useThemeStore(state => state.getTheme());
  const isTerminal = theme.type === 'terminal';

  const handleEdit = (schedule: Schedule) => {
    setEditingSchedule(schedule);
    setIsModalOpen(true);
  };

  const handleAddNew = () => {
    setEditingSchedule(undefined);
    setIsModalOpen(true);
  };

  return (
    <>
      <BackgroundLayer />
      <VisualEffectsLayer />
      <OverlayLayer />
      <TransitionNotification />
      
      <div className={clsx(
        "relative z-20 max-w-screen-2xl mx-auto p-6 md:p-12 w-full transition-all duration-500 min-h-screen flex flex-col gap-12",
        isTerminal && "font-mono"
      )}>
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-2">
            <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-text">
              {isTerminal ? "> CHRONOS_FLOW" : "ChronosFlow"}
            </h1>
            <p className="text-text-secondary font-medium text-lg opacity-70">
              {isTerminal ? "[SYS_READY] Focus state active." : "Take control of your time."}
            </p>
          </div>
          <div className="flex items-center gap-3 w-full md:w-auto">
            <Button 
              variant="secondary"
              size="icon"
              onClick={() => setIsSettingsOpen(!isSettingsOpen)}
              title="Atmosphere Settings"
            >
              <Settings className="w-5 h-5" />
            </Button>
            <Button 
              className="flex-1 md:flex-initial"
              onClick={handleAddNew}
            >
              <Plus className="w-5 h-5" />
              {isTerminal ? "NEW_TASK" : "Add Schedule"}
            </Button>
          </div>
        </header>

        <main className="flex flex-col gap-8 md:gap-12 relative z-10">
          {/* Top Row: Main Focus and Timeline */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 md:gap-12 items-start">
            <div className="lg:col-span-8 flex flex-col gap-8">
              <div className="h-[500px] md:h-[600px]">
                <CountdownWidget />
              </div>
              {isSettingsOpen && (
                <div className="animate-in fade-in slide-in-from-top-4 duration-300">
                  <ThemeSettings />
                </div>
              )}
            </div>
            
            <div className="lg:col-span-4 h-[600px]">
              <TimelineWidget onEdit={handleEdit} />
            </div>
          </div>

          {/* Bottom Row: Productivity Tools */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 md:gap-12">
            <div className="h-[650px]">
              <PlannerWidget />
            </div>
            <div className="h-[650px]">
              <StatisticsWidget />
            </div>
            <div className="h-[650px]">
              <RankingWidget />
            </div>
          </div>
        </main>

        <ScheduleModal 
          isOpen={isModalOpen} 
          onClose={() => setIsModalOpen(false)} 
          initialData={editingSchedule}
        />
      </div>
    </>
  );
}
