import { WebviewWindow, getAllWebviewWindows } from '@tauri-apps/api/webviewWindow';
import { useWidgetStore } from '../../store/useWidgetStore';
import type { WidgetType } from '../../store/useWidgetStore';

class WidgetManagerClass {
  private windows: Map<WidgetType, WebviewWindow> = new Map();

  constructor() {
    // Attempt to recover existing windows on startup
    this.recoverWindows();
  }

  private async recoverWindows() {
    try {
      const allWindows = await getAllWebviewWindows();
      for (const win of allWindows) {
        if (win.label.startsWith('widget-')) {
          const type = win.label.replace('widget-', '') as WidgetType;
          this.windows.set(type, win);
          console.log(`[WidgetManager] Recovered existing window: ${win.label}`);
          
          win.onCloseRequested(() => {
            this.windows.delete(type);
            useWidgetStore.getState().unregisterWidget(type);
          });
        }
      }
    } catch (err) {
      console.error('[WidgetManager] Failed to recover windows:', err);
    }
  }

  async openWidget(type: WidgetType): Promise<void> {
    console.log(`[WidgetManager] Requesting to open widget: ${type}`);
    
    // Check if window already exists in our map or in Tauri
    let win = this.windows.get(type);
    if (win) {
      console.log(`[WidgetManager] Widget ${type} already open, focusing...`);
      try {
        await win.show();
        await win.setFocus();
        return;
      } catch (err) {
        console.warn(`[WidgetManager] Failed to focus existing window, cleaning up.`, err);
        this.windows.delete(type);
      }
    }

    const label = `widget-${type}`;
    const { settings } = useWidgetStore.getState();

    console.log(`[WidgetManager] Creating new WebviewWindow for ${type} with label ${label}`);
    try {
      const url = `${window.location.origin}/index.html?widget=${type}`;
      
      win = new WebviewWindow(label, {
        url,
        title: `${type.charAt(0).toUpperCase() + type.slice(1)} Widget`,
        width: type === 'countdown' ? 300 : 400,
        height: type === 'countdown' ? 180 : 500,
        resizable: true,
        decorations: false,
        transparent: true,
        alwaysOnTop: settings.alwaysOnTop,
        shadow: false,
        skipTaskbar: false,
        visible: false,
      });

      this.windows.set(type, win);
      useWidgetStore.getState().registerWidget(type);

      // In Tauri v2, we can just wait for a bit or use the created event
      // but show() after a small delay is often more reliable for transparency to kick in
      setTimeout(async () => {
        try {
          await win?.show();
          if (settings.alwaysOnTop) {
            await win?.setAlwaysOnTop(true);
          }
        } catch (e) {
          console.error(`[WidgetManager] Error showing window ${type}:`, e);
        }
      }, 200);

      win.onCloseRequested(() => {
        console.log(`[WidgetManager] Widget ${type} close requested`);
        this.windows.delete(type);
        useWidgetStore.getState().unregisterWidget(type);
      });

      win.once('tauri://error', (e) => {
        console.error(`[WidgetManager] ERROR: Failed to create widget ${type}`, e);
        this.windows.delete(type);
        useWidgetStore.getState().unregisterWidget(type);
      });

    } catch (err) {
      console.error(`[WidgetManager] CRITICAL: Exception during WebviewWindow creation for ${type}`, err);
    }
  }

  async closeWidget(type: WidgetType) {
    const win = this.windows.get(type);
    if (win) {
      await win.close();
      this.windows.delete(type);
      useWidgetStore.getState().unregisterWidget(type);
    }
  }

  async toggleWidget(type: WidgetType) {
    if (this.windows.has(type)) {
      await this.closeWidget(type);
    } else {
      await this.openWidget(type);
    }
  }

  /**
   * Closes all active widget windows
   */
  async closeAll() {
    for (const type of Array.from(this.windows.keys())) {
      await this.closeWidget(type as WidgetType);
    }
  }
}

export const WidgetManager = new WidgetManagerClass();
