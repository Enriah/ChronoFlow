import { useState } from 'react';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay, 
  addMonths, 
  subMonths,
  startOfWeek,
  endOfWeek,
  isToday
} from 'date-fns';
import { usePlannerStore } from '../../store/usePlannerStore';
import { useThemeStore } from '../../store/useThemeStore';
import { WidgetContainer } from '../widget-styles/WidgetContainer';
import { ChevronLeft, ChevronRight, Plus, CheckCircle2, Circle, Calendar } from 'lucide-react';
import { clsx } from 'clsx';
import { PlannerModal } from './PlannerModal';
import { SectionHeader } from '../../components/ui/SectionHeader';
import { Button } from '../../components/ui/Button';

export function PlannerWidget() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<any>(null);

  const tasks = usePlannerStore(state => state.tasks);
  const toggleComplete = usePlannerStore(state => state.toggleComplete);
  
  const isEditingTheme = useThemeStore(state => state.isEditing);
  const activeEnv = useThemeStore(state => state.activeEnvironment);
  const draftEnv = useThemeStore(state => state.draftEnvironment);
  const theme = useThemeStore(state => state.getTheme());
  
  const style = isEditingTheme ? draftEnv.plannerStyle : activeEnv.plannerStyle;
  const isTerminal = theme.type === 'terminal';

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const calendarDays = eachDayOfInterval({
    start: startDate,
    end: endDate,
  });

  const selectedDateTasks = tasks.filter(task => 
    isSameDay(new Date(task.date), selectedDate)
  );

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

  const handleAddTask = () => {
    setEditingTask(null);
    setIsModalOpen(true);
  };

  const handleEditTask = (task: any) => {
    setEditingTask(task);
    setIsModalOpen(true);
  };

  return (
    <WidgetContainer style={style} className="h-full overflow-hidden">
      <SectionHeader 
        title={isTerminal ? `PLANNER_${format(currentMonth, 'MMM_yyyy').toUpperCase()}` : format(currentMonth, 'MMMM yyyy')}
        icon={<Calendar className="w-5 h-5" />}
        actions={
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" className="w-8 h-8" onClick={prevMonth}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" className="w-8 h-8" onClick={nextMonth}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-7 mb-4">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="text-center text-[10px] font-black uppercase tracking-widest text-text-secondary opacity-50">
            {isTerminal ? day.toUpperCase() : day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1 flex-grow">
        {calendarDays.map((day, idx) => {
          const isSelected = isSameDay(day, selectedDate);
          const isCurrentMonth = isSameMonth(day, monthStart);
          const dayTasks = tasks.filter(t => isSameDay(new Date(t.date), day));
          const hasTasks = dayTasks.length > 0;
          const allCompleted = hasTasks && dayTasks.every(t => t.completed);

          return (
            <button
              key={idx}
              onClick={() => setSelectedDate(day)}
              className={clsx(
                "relative aspect-square rounded-lg flex flex-col items-center justify-center transition-all group",
                !isCurrentMonth && "opacity-20",
                isSelected ? "bg-primary text-primary-fg scale-95" : "hover:bg-surface-hover text-text",
                isToday(day) && !isSelected && "border border-primary/50"
              )}
            >
              <span className="text-sm font-bold">{format(day, 'd')}</span>
              {hasTasks && (
                <div className={clsx(
                  "w-1 h-1 rounded-full mt-1",
                  isSelected ? "bg-primary-fg" : (allCompleted ? "bg-green-500" : "bg-primary")
                )} />
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-8 pt-8 border-t border-border/50 flex flex-col flex-grow max-h-[180px]">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-text-secondary">
            {format(selectedDate, 'MMM d, yyyy')}
          </h3>
          <button 
            onClick={handleAddTask}
            className="text-primary hover:opacity-80 transition-opacity p-1"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-2 overflow-y-auto flex-grow custom-scrollbar pr-1">
          {selectedDateTasks.length === 0 ? (
            <p className="text-[10px] text-text-secondary opacity-50 italic py-4 text-center">No tasks planned for this day.</p>
          ) : (
            selectedDateTasks.map(task => (
              <div 
                key={task.id}
                className="group flex items-center justify-between p-3 rounded-xl bg-surface/30 hover:bg-surface-hover/50 transition-colors border border-border/10"
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <button onClick={() => toggleComplete(task.id)}>
                    {task.completed ? (
                      <CheckCircle2 className="w-4 h-4 text-primary" />
                    ) : (
                      <Circle className="w-4 h-4 text-text-secondary opacity-50 group-hover:opacity-100" />
                    )}
                  </button>
                  <div 
                    className="flex flex-col cursor-pointer overflow-hidden"
                    onClick={() => handleEditTask(task)}
                  >
                    <span className={clsx(
                      "text-xs font-bold truncate",
                      task.completed && "line-through opacity-50"
                    )}>
                      {task.title}
                    </span>
                    {task.startTime && (
                      <span className="text-[10px] text-text-secondary font-medium">
                        {task.startTime} {task.endTime ? ` - ${task.endTime}` : ''}
                      </span>
                    )}
                  </div>
                </div>
                {task.category && (
                  <span className="text-[9px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-black uppercase whitespace-nowrap ml-2">
                    {task.category}
                  </span>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      <PlannerModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        date={selectedDate}
        initialData={editingTask}
      />
    </WidgetContainer>
  );
}
