import { useState } from 'react';
import { CalendarDays, Clock3, Gauge, Hexagon, LayoutTemplate, Palette, PanelLeftClose, PanelLeftOpen, Plus, Settings, SlidersHorizontal } from 'lucide-react';
import { BackgroundLayer } from '../visual-engine/backgrounds/BackgroundLayer';
import { OverlayLayer } from '../visual-engine/overlays/OverlayLayer';
import { VisualEffectsLayer } from '../visual-engine/renderer/VisualEffectsLayer';
import { ScheduleModal } from './ScheduleModal';
import { Button } from './ui/Button';
import type { Schedule } from '../models/Schedule';
import { PlannerPage, ReportsPage, SchedulePage, SessionsPage, SettingsPage, TemplatesPage, ThemesPage } from '../features/DevEditionPages';
import { SpecialSidebarOrnament } from '../themes/special/SpecialSidebarOrnament';
import { useThemeStore } from '../store/useThemeStore';

type Page = 'schedule' | 'planner' | 'sessions' | 'templates' | 'reports' | 'themes' | 'settings';
const nav: { id: Page; label: string; icon: typeof Gauge }[] = [
  { id: 'schedule', label: 'Schedule', icon: Gauge }, { id: 'planner', label: 'Planner', icon: CalendarDays },
  { id: 'sessions', label: 'Sessions', icon: Clock3 }, { id: 'templates', label: 'Session Templates', icon: LayoutTemplate },
  { id: 'reports', label: 'Reports', icon: SlidersHorizontal }, { id: 'themes', label: 'Themes', icon: Palette },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export function Dashboard() {
  const [page, setPage] = useState<Page>('schedule');
  const [sidebarPinned, setSidebarPinned] = useState(false);
  const [isModalOpen, setModalOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<Schedule>();
  const theme = useThemeStore((state) => state.getTheme());
  const edit = (schedule: Schedule) => { if (schedule.fromPlanner) { setPage('planner'); return; } setEditingSchedule(schedule); setModalOpen(true); };
  const createCurrent = () => {
    if (page === 'sessions') window.dispatchEvent(new Event('chronoflow:new-session'));
    if (page === 'templates') window.dispatchEvent(new Event('chronoflow:new-template'));
  };
  return <>
    <BackgroundLayer />
    <VisualEffectsLayer />
    <div className="relative z-20 min-h-screen">
      <aside className={`app-sidebar group fixed inset-y-0 left-0 z-40 border-r border-border bg-surface px-3 py-5 shadow-xl transition-[width] duration-200 ${sidebarPinned ? 'w-64' : 'w-20 hover:w-64'}`}>
        <SpecialSidebarOrnament themeId={theme.id} />
        <div className="relative z-10">
          <div className="mb-8 flex h-10 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-primary/35 bg-primary/10 text-primary shadow-[0_0_18px_color-mix(in_srgb,var(--color-primary)_28%,transparent)] transition group-hover:scale-105">
              <Hexagon className="h-5 w-5" />
            </div>
            <div className={`min-w-0 pl-1 transition-opacity ${sidebarPinned ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
              <h1 className="truncate text-xl font-black tracking-tight">Chrono Flow</h1>
            </div>
            <button type="button" onClick={() => setSidebarPinned(!sidebarPinned)} className={`ml-auto hidden rounded-lg p-2 text-text-secondary hover:bg-surface-hover hover:text-text md:block ${sidebarPinned ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`} title={sidebarPinned ? 'Collapse sidebar' : 'Pin sidebar open'}>
              {sidebarPinned ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeftOpen className="h-4 w-4" />}
            </button>
          </div>
          <nav className="space-y-1">{nav.map((item) => <button key={item.id} onClick={() => setPage(item.id)} title={item.label} className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-bold transition ${page === item.id ? 'bg-primary text-primary-fg shadow-sm' : 'text-text-secondary hover:bg-surface-hover hover:text-text'}`}><item.icon className="h-4 w-4 shrink-0" /><span className={`truncate transition-opacity ${sidebarPinned ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>{item.label}</span></button>)}</nav>
        </div>
      </aside>
      <div className={`app-content relative z-20 min-w-0 transition-[margin-left] duration-200 ${sidebarPinned ? 'ml-64' : 'ml-20'}`}>
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
