import { isPermissionGranted, requestPermission, sendNotification } from '@tauri-apps/plugin-notification';
import { AudioService } from '../audio/AudioService';

export const NotificationService = {
  async init() {
    try {
      let permissionGranted = await isPermissionGranted();
      if (!permissionGranted) {
        const permission = await requestPermission();
        permissionGranted = permission === 'granted';
      }
      return permissionGranted;
    } catch (error) {
      console.warn('NotificationService: Tauri plugins not available', error);
      return false;
    }
  },

  async notify(title: string, body: string) {
    try {
      if (await isPermissionGranted()) {
        sendNotification({ title, body });
      }
      
      // If it's a warning or completion, we might have already played a sound in useAppStore.
      // But for general notifications, we can play the warningNotification sound as a fallback.
      // However, to avoid double sounds, we should be careful.
      // For now, let's only play it if it's not a task start/end/warning which are handled in useAppStore.
      if (!title.includes('Started') && !title.includes('Completed') && !title.includes('Warning')) {
        AudioService.trigger('warningNotification');
      }
    } catch (error) {
      // Silently fail if notification cannot be sent
    }
  }
};
