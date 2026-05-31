import { openUrl, openPath } from '@tauri-apps/plugin-opener';
import type { LinkedAction } from '../../models/LinkedAction';

export const LauncherService = {
  async execute(action: LinkedAction) {
    if (!action.enabled || !action.value) return;

    try {
      const isUrl = action.type === 'url' || action.value.startsWith('http://') || action.value.startsWith('https://');
      if (isUrl) {
        await openUrl(action.value);
      } else {
        await openPath(action.value);
      }
    } catch (error) {
      console.error(`ChronoFlow: Failed to launch action "${action.label}" (${action.value})`, error);
    }
  }
};
