import { useState } from 'react';
import { CalendarDays, Clock3, Gauge, LayoutTemplate, Palette, Plus, Settings, SlidersHorizontal } from 'lucide-react';
import { BackgroundLayer } from '../visual-engine/backgrounds/BackgroundLayer';
import { OverlayLayer } from '../visual-engine/overlays/OverlayLayer';
import { VisualEffectsLayer } from '../visual-engine/renderer/VisualEffectsLayer';
import { ScheduleModal } from './ScheduleModal';
import { Button } from './ui/Button';
import type { Schedule } from '../models/Schedule';
import { PlannerPage, ReportsPage, SchedulePage, SessionsPage, SettingsPage, TemplatesPage, ThemesPage } from '../features/DevEditionPages';

type Page = 'schedule' | 'planner' | 'sessions' | 'templates' | 'reports' | 'themes' | 'settings';
const nav: { id: Page; label: string; icon: typeof Gauge }[] = [
  { id: 'schedule', label: 'Schedule', icon: Gauge }, { id: 'planner', label: 'Planner', icon: CalendarDays },
  { id: 'sessions', label: 'Sessions', icon: Clock3 }, { id: 'templates', label: 'Session Templates', icon: LayoutTemplate },
  { id: 'reports', label: 'Reports', icon: SlidersHorizontal }, { id: 'themes', label: 'Themes', icon: Palette },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export function Dashboard() {
  const [page, setPage] = useState<Page>('schedule');
  const [isModalOpen, setModalOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<Schedule>();
  const edit = (schedule: Schedule) => { if (schedule.fromPlanner) { setPage('planner'); return; } setEditingSchedule(schedule); setModalOpen(true); };
  const createCurrent = () => {
    if (page === 'sessions') window.dispatchEvent(new Event('chronoflow:new-session'));
    if (page === 'templates') window.dispatchEvent(new Event('chronoflow:new-template'));
  };
  return <>
    <BackgroundLayer />
    <VisualEffectsLayer />
    <div className="relative z-20 min-h-screen">
      <aside className="fixed inset-y-0 left-0 z-40 w-20 border-r border-border bg-surface px-3 py-5 md:w-56 md:px-5">
        <div className="mb-8 flex h-10 items-center justify-center md:block">
          <h1 className="hidden text-xl font-black tracking-tight md:block">ChronoFlow</h1>
          <span className="text-xs font-black text-primary md:text-[9px] md:uppercase md:tracking-[.2em]">CF</span>
        </div>
        <nav className="space-y-1">{nav.map((item) => <button key={item.id} onClick={() => setPage(item.id)} title={item.label} className={`flex w-full items-center justify-center gap-3 rounded-xl px-3 py-3 text-sm font-bold transition md:justify-start md:px-4 ${page === item.id ? 'bg-primary text-primary-fg shadow-sm' : 'text-text-secondary hover:bg-surface-hover hover:text-text'}`}><item.icon className="h-4 w-4 shrink-0" /><span className="hidden md:inline">{item.label}</span></button>)}</nav>
      </aside>
      <div className="relative z-20 ml-20 min-w-0 md:ml-56">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-surface-muted px-5 md:px-8"><h2 className="text-lg font-black capitalize">{page === 'templates' ? 'Session Templates' : page}</h2>{(page === 'sessions' || page === 'templates') && <Button onClick={createCurrent}><Plus className="w-4 h-4" /> {page === 'sessions' ? 'New session' : 'New session template'}</Button>}</header>
        <main className="mx-auto max-w-[1440px] p-4 md:p-8">
          {page === 'schedule' && <SchedulePage onEdit={edit} onNavigate={(p) => setPage(p as Page)} />}
          {page === 'sessions' && <SessionsPage onNavigate={(target) => setPage(target as Page)} />}{page === 'templates' && <TemplatesPage onNavigate={(target) => setPage(target as Page)} />}{page === 'planner' && <PlannerPage onNavigate={(target) => setPage(target as Page)} />}
          {page === 'reports' && <ReportsPage />}{page === 'themes' && <ThemesPage />}{page === 'settings' && <SettingsPage />}
        </main>
      </div>
    </div>
    <OverlayLayer />
    <ScheduleModal isOpen={isModalOpen} onClose={() => setModalOpen(false)} initialData={editingSchedule} />
  </>;
}
