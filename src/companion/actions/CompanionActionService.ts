import {
  BaseDirectory,
  exists,
  mkdir,
  readTextFile,
  writeTextFile,
} from '@tauri-apps/plugin-fs';
import { join } from '@tauri-apps/api/path';
import { invoke } from '@tauri-apps/api/core';
import { useAppStore } from '../../store/useAppStore';
import { getCurrentTask } from '../../services/scheduler/engine';
import type { CompanionAction, CompanionActionType, CompanionInternalAction } from '../../models/companion/types';

const COMPANION_DIR = 'companion';
const ACTIONS_FILE = 'actions.json';

type NativeActionRequest = {
  actionType: Exclude<CompanionActionType, 'internal'>;
  label: string;
  path?: string;
  url?: string;
};

const DEFAULT_INTERNAL_ACTIONS: CompanionAction[] = [
  {
    id: 'skip_current_session',
    type: 'internal',
    label: 'Skip Current Session',
    internalAction: 'skip_current_session',
    aliases: [
      'skip current session',
      'skip session',
      'skip timer',
      'end current session',
      'finish session',
      'stop current session',
      'bo qua session',
      'bo qua phien',
      'ket thuc phien',
      'ket thuc session',
      'chuyen phien',
    ],
    enabled: true,
    requiresConfirmation: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

async function ensureCompanionDir() {
  const dirExists = await exists(COMPANION_DIR, { baseDir: BaseDirectory.AppConfig });
  if (!dirExists) {
    await mkdir(COMPANION_DIR, { baseDir: BaseDirectory.AppConfig, recursive: true });
  }
}

function normalizeAliases(action: Partial<CompanionAction>) {
  return Array.from(new Set([
    action.label || '',
    ...(Array.isArray(action.aliases) ? action.aliases : []),
  ]
    .map((alias) => alias.trim())
    .filter(Boolean)));
}

function normalizeAction(action: any): CompanionAction | null {
  if (!action || !['app', 'url', 'folder', 'internal'].includes(action.type) || !action.label) return null;

  const now = new Date().toISOString();
  return {
    id: String(action.id || `${action.type}_${Date.now()}`),
    type: action.type,
    label: String(action.label),
    path: typeof action.path === 'string' ? action.path : '',
    url: typeof action.url === 'string' ? action.url : '',
    internalAction: typeof action.internalAction === 'string' ? action.internalAction : undefined,
    aliases: normalizeAliases(action),
    enabled: action.enabled !== false,
    requiresConfirmation: action.requiresConfirmation !== false,
    createdAt: action.createdAt || now,
    updatedAt: action.updatedAt || now,
  };
}

function withDefaultActions(actions: CompanionAction[]) {
  const merged = [...actions];
  for (const defaultAction of DEFAULT_INTERNAL_ACTIONS) {
    const existingIndex = merged.findIndex((action) => action.id === defaultAction.id);
    if (existingIndex === -1) {
      merged.push(defaultAction);
    } else {
      merged[existingIndex] = {
        ...defaultAction,
        ...merged[existingIndex],
        type: 'internal',
        internalAction: defaultAction.internalAction,
        aliases: Array.from(new Set([...defaultAction.aliases, ...merged[existingIndex].aliases])),
      };
    }
  }
  return merged;
}

export class CompanionActionService {
  static async loadActions(): Promise<CompanionAction[]> {
    try {
      await ensureCompanionDir();
      const path = await join(COMPANION_DIR, ACTIONS_FILE);
      const fileExists = await exists(path, { baseDir: BaseDirectory.AppConfig });
      if (!fileExists) {
        await this.saveActions([]);
        return [];
      }

      const content = await readTextFile(path, { baseDir: BaseDirectory.AppConfig });
      const parsed = JSON.parse(content);
      const actions = Array.isArray(parsed) ? parsed.map(normalizeAction).filter(Boolean) as CompanionAction[] : [];
      const withDefaults = withDefaultActions(actions);
      if (withDefaults.length !== actions.length) await this.saveActions(withDefaults);
      return withDefaults;
    } catch (error) {
      console.error('[CompanionActions] Failed to load actions, using empty registry:', error);
      try {
        await this.saveActions([]);
      } catch (saveError) {
        console.error('[CompanionActions] Failed to create default actions file:', saveError);
      }
      return [];
    }
  }

  static async saveActions(actions: CompanionAction[]) {
    await ensureCompanionDir();
    const path = await join(COMPANION_DIR, ACTIONS_FILE);
    const normalized = withDefaultActions(actions.map(normalizeAction).filter(Boolean) as CompanionAction[]);
    await writeTextFile(path, JSON.stringify(normalized, null, 2), { baseDir: BaseDirectory.AppConfig });
  }

  static createAction(input: {
    type: CompanionActionType;
    label: string;
    path?: string;
    url?: string;
    internalAction?: CompanionInternalAction;
    aliases?: string[];
    enabled?: boolean;
    requiresConfirmation?: boolean;
  }): CompanionAction {
    const now = new Date().toISOString();
    const base = {
      id: `${input.type}_${crypto.randomUUID ? crypto.randomUUID() : Date.now()}`,
      type: input.type,
      label: input.label.trim(),
      path: input.path?.trim() || '',
      url: input.url?.trim() || '',
      internalAction: input.internalAction,
      aliases: input.aliases || [],
      enabled: input.enabled !== false,
      requiresConfirmation: input.requiresConfirmation !== false,
      createdAt: now,
      updatedAt: now,
    };
    return normalizeAction(base) as CompanionAction;
  }

  static async executeAction(action: CompanionAction) {
    if (action.type === 'internal') {
      console.info('[CompanionActions] Executing internal action', {
        id: action.id,
        label: action.label,
        internalAction: action.internalAction,
      });

      if (action.internalAction === 'skip_current_session') {
        const appState = useAppStore.getState();
        const activeTask = appState.currentTask || getCurrentTask(Date.now(), appState.schedules).currentTask;
        console.info('[CompanionActions] Skip session state', {
          currentTaskId: appState.currentTask?.id || null,
          activeTaskId: activeTask?.id || null,
          scheduleCount: appState.schedules.length,
          isRunning: appState.isRunning,
        });

        if (!activeTask) {
          throw new Error('No active session is running right now.');
        }
        appState.skipTask();
        return;
      }

      throw new Error('Unsupported internal Companion action.');
    }

    const request: NativeActionRequest = {
      actionType: action.type,
      label: action.label,
      path: action.path,
      url: action.url,
    };

    console.info('[CompanionActions] Executing registered action', {
      id: action.id,
      type: action.type,
      label: action.label,
    });
    await invoke('execute_companion_action', { request });
  }
}
