import { create } from 'zustand';
import type { LinkedAction } from '../../models/LinkedAction';

const KEY = 'chronoflow_developer_actions_v2';
const LEGACY_KEY = 'chronoflow_developer_actions_v1';

export function getDangerLevel(value: string): LinkedAction['dangerLevel'] {
  const command = value.toLowerCase();
  if (['rm -rf', 'del /s', 'del /q', 'terraform destroy', 'kubectl delete', 'format ', 'shutdown', 'reg delete', 'remove-item'].some((pattern) => command.includes(pattern))) return 'dangerous';
  if (['docker compose down', 'git reset', 'git clean', 'npm publish', 'pnpm publish'].some((pattern) => command.includes(pattern))) return 'medium';
  return 'safe';
}

interface State {
  actions: LinkedAction[];
  hydrate: () => void;
  save: (action: LinkedAction) => void;
  toggle: (id: string) => void;
  remove: (id: string) => void;
}

export const useDeveloperActionStore = create<State>((set, get) => ({
  actions: [],
  hydrate: () => {
    try {
      const parsed = JSON.parse(localStorage.getItem(KEY) || localStorage.getItem(LEGACY_KEY) || '[]');
      const now = new Date().toISOString();
      set({ actions: Array.isArray(parsed) ? parsed.map((action) => ({
        ...action, type: action.type === 'application' ? 'app' : action.type,
        requiresConfirmation: action.type === 'command' ? true : action.requiresConfirmation !== false,
        dangerLevel: action.type === 'command' ? getDangerLevel(action.value || '') : (action.dangerLevel || 'safe'),
        createdAt: action.createdAt || now, updatedAt: action.updatedAt || now,
      })) : [] });
    } catch { set({ actions: [] }); }
  },
  save: (action) => {
    const now = new Date().toISOString();
    const normalized: LinkedAction = {
      ...action, updatedAt: now, createdAt: action.createdAt || now,
      requiresConfirmation: action.type === 'command' ? true : action.requiresConfirmation,
      dangerLevel: action.type === 'command' ? getDangerLevel(action.value) : (action.dangerLevel || 'safe'),
    };
    const actions = get().actions.some((item) => item.id === normalized.id) ? get().actions.map((item) => item.id === normalized.id ? normalized : item) : [normalized, ...get().actions];
    localStorage.setItem(KEY, JSON.stringify(actions)); set({ actions });
  },
  toggle: (id) => {
    const action = get().actions.find((item) => item.id === id); if (!action) return;
    get().save({ ...action, enabled: !action.enabled });
  },
  remove: (id) => { const actions = get().actions.filter((item) => item.id !== id); localStorage.setItem(KEY, JSON.stringify(actions)); set({ actions }); },
}));
