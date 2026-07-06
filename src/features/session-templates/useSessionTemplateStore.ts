import { create } from 'zustand';
import type { WorkSessionTemplate } from '../../models/WorkSessionTemplate';
import { LocalStorageService } from '../../services/persistence/storage';

interface TemplateState {
  templates: WorkSessionTemplate[];
  hydrate: () => void;
  save: (template: WorkSessionTemplate) => void;
  duplicate: (id: string) => void;
  remove: (id: string) => void;
}

const examples = (): WorkSessionTemplate[] => {
  const now = new Date().toISOString();
  return [
    { id: crypto.randomUUID(), name: 'My Debug Session', project: '', tags: ['debugging'], defaultDurationMinutes: 60, actions: [], flowSteps: [
      { id: crypto.randomUUID(), title: 'Reproduce issue', plannedDurationMinutes: 15, checklist: [], actions: [], status: 'pending' },
      { id: crypto.randomUUID(), title: 'Implement and verify', plannedDurationMinutes: 45, checklist: [], actions: [], status: 'pending' },
    ], timelineTracks: [], timelineEvents: [], notesTemplate: '## What I worked on\n\n## What blocked me\n\n## Next step\n', createdAt: now, updatedAt: now },
    { id: crypto.randomUUID(), name: 'My Review Flow', project: '', tags: ['review'], defaultDurationMinutes: 45, actions: [], flowSteps: [
      { id: crypto.randomUUID(), title: 'Read context', plannedDurationMinutes: 10, checklist: [], actions: [], status: 'pending' },
      { id: crypto.randomUUID(), title: 'Review and leave notes', plannedDurationMinutes: 35, checklist: [], actions: [], status: 'pending' },
    ], timelineTracks: [], timelineEvents: [], createdAt: now, updatedAt: now },
  ];
};

export const useSessionTemplateStore = create<TemplateState>((set, get) => ({
  templates: [],
  hydrate: () => {
    let templates = LocalStorageService.loadSessionTemplates();
    if (!templates.length) {
      try {
        const legacy = JSON.parse(localStorage.getItem('chronoflow_dev_presets_v1') || '[]');
        const now = new Date().toISOString();
        templates = Array.isArray(legacy) && legacy.length ? legacy.filter((item) => !item.isBuiltIn).map((item) => ({ id: item.id || crypto.randomUUID(), name: item.title || 'Migrated template', project: item.project, tags: item.tags || [], defaultDurationMinutes: item.durationMinutes || 30, actions: [], flowSteps: [], timelineTracks: [], timelineEvents: [], createdAt: now, updatedAt: now })) : examples();
        LocalStorageService.saveSessionTemplates(templates);
      } catch { templates = examples(); }
    }
    set({ templates });
  },
  save: (template) => {
    const next = { ...template, updatedAt: new Date().toISOString() };
    const templates = get().templates.some((item) => item.id === next.id) ? get().templates.map((item) => item.id === next.id ? next : item) : [next, ...get().templates];
    LocalStorageService.saveSessionTemplates(templates); set({ templates });
  },
  duplicate: (id) => {
    const source = get().templates.find((item) => item.id === id); if (!source) return;
    const now = new Date().toISOString();
    get().save({ ...source, id: crypto.randomUUID(), name: `${source.name} copy`, flowSteps: source.flowSteps.map((step) => ({ ...step, id: crypto.randomUUID(), checklist: step.checklist?.map((item) => ({ ...item, id: crypto.randomUUID() })) })), createdAt: now, updatedAt: now });
  },
  remove: (id) => { const templates = get().templates.filter((item) => item.id !== id); LocalStorageService.saveSessionTemplates(templates); set({ templates }); },
}));
