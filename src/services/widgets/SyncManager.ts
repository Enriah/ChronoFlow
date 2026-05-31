import { emit, listen } from '@tauri-apps/api/event';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { useAppStore } from '../../store/useAppStore';
import { useThemeStore } from '../../store/useThemeStore';
import { useWidgetStore } from '../../store/useWidgetStore';

class SyncManagerClass {
  private isWidget = false;
  private isInitialized = false;

  async init() {
    if (this.isInitialized) return;
    
    const win = getCurrentWindow();
    this.isWidget = win.label.startsWith('widget-');
    this.isInitialized = true;

    if (this.isWidget) {
      this.initWidgetListeners();
    } else {
      this.initMainEmitters();
    }
  }

  private initMainEmitters() {
    // Sync AppStore
    useAppStore.subscribe((state) => {
      emit('sync-app-state', state);
    });

    // Sync ThemeStore
    useThemeStore.subscribe((state) => {
      emit('sync-theme-state', state);
    });

    // Sync WidgetStore
    useWidgetStore.subscribe((state) => {
      emit('sync-widget-state', state);
    });

    // Listen for actions from widgets
    listen('widget-action', (event: any) => {
      const { type, payload } = event.payload;
      this.handleWidgetAction(type, payload);
    });
  }

  private initWidgetListeners() {
    // Listen for AppStore updates
    listen('sync-app-state', (event: any) => {
      useAppStore.setState(event.payload);
    });

    // Listen for ThemeStore updates
    listen('sync-theme-state', (event: any) => {
      useThemeStore.setState(event.payload);
    });

    // Listen for WidgetStore updates
    listen('sync-widget-state', (event: any) => {
      useWidgetStore.setState(event.payload);
    });
  }

  private handleWidgetAction(type: string, _payload: any) {
    switch (type) {
      case 'toggleTimer':
        useAppStore.getState().toggleTimer();
        break;
      case 'skipTask':
        useAppStore.getState().skipTask();
        break;
      // Add more as needed
    }
  }

  /**
   * Widgets call this to trigger an action in the main window
   */
  dispatchAction(type: string, payload?: any) {
    if (this.isWidget) {
      emit('widget-action', { type, payload });
    } else {
      this.handleWidgetAction(type, payload);
    }
  }
}

export const SyncManager = new SyncManagerClass();
