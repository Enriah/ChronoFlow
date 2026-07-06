import { invoke } from '@tauri-apps/api/core';
import { openUrl, openPath } from '@tauri-apps/plugin-opener';
import type { LinkedAction } from '../../models/LinkedAction';

export type ActionExecutionLog = {
  id: string; actionId: string; label: string; type: LinkedAction['type'];
  requestedAt: string; confirmed: boolean; success: boolean; error?: string;
};

const LOG_KEY = 'chronoflow_action_logs_v1';
const log = (entry: ActionExecutionLog) => {
  try {
    const current = JSON.parse(localStorage.getItem(LOG_KEY) || '[]');
    localStorage.setItem(LOG_KEY, JSON.stringify([entry, ...(Array.isArray(current) ? current : [])].slice(0, 500)));
  } catch { /* logging must never block execution */ }
};

export const LauncherService = {
  getLogs(): ActionExecutionLog[] {
    try { const parsed = JSON.parse(localStorage.getItem(LOG_KEY) || '[]'); return Array.isArray(parsed) ? parsed : []; } catch { return []; }
  },
  async execute(action: LinkedAction): Promise<{ success: boolean; message?: string }> {
    const base = { id: crypto.randomUUID(), actionId: action.id, label: action.label, type: action.type, requestedAt: new Date().toISOString() };
    if (!action.enabled || !action.value.trim()) {
      log({ ...base, confirmed: false, success: false, error: 'Action disabled or empty.' });
      return { success: false, message: 'Action disabled or empty.' };
    }
    const preview = action.type === 'command' && action.workingDirectory ? `${action.value}\n\nWorking directory: ${action.workingDirectory}` : action.value;
    let confirmed = true;
    if (action.requiresConfirmation || action.type === 'command') confirmed = window.confirm(`${action.type.toUpperCase()}: ${action.label}\n\n${preview}`);
    if (!confirmed) { log({ ...base, confirmed: false, success: false, error: 'Cancelled.' }); return { success: false, message: 'Cancelled.' }; }
    if (action.dangerLevel === 'dangerous') {
      log({ ...base, confirmed: true, success: false, error: 'Dangerous command blocked.' });
      return { success: false, message: 'Dangerous command blocked.' };
    }
    if (action.dangerLevel === 'medium' && !window.confirm(`Potentially destructive command. Run anyway?\n\n${preview}`)) {
      log({ ...base, confirmed: false, success: false, error: 'Extra confirmation declined.' });
      return { success: false, message: 'Cancelled.' };
    }
    try {
      if (action.type === 'url') {
        const parsed = new URL(action.value);
        if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('Only HTTP(S) URLs are allowed.');
        await openUrl(action.value);
      } else if (action.type === 'command') {
        await invoke('run_registered_command', { request: { command: action.value, workingDirectory: action.workingDirectory, dangerLevel: action.dangerLevel || 'safe' } });
      } else {
        await openPath(action.value);
      }
      log({ ...base, confirmed: true, success: true }); return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      log({ ...base, confirmed: true, success: false, error: message });
      console.error('[ActionRegistry] Execution failed', { actionId: action.id, type: action.type, message });
      return { success: false, message };
    }
  },
};
