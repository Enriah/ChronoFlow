import { useEffect, useRef } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { register, unregister } from '@tauri-apps/plugin-global-shortcut';
import { useCompanionStore } from '../store/useCompanionStore';
import { CompanionVoiceController } from '../companion/voice/CompanionVoiceController';
import { WakeWordService } from '../companion/voice/WakeWordService';

const normalizeHotkey = (hotkey?: string) => hotkey?.trim() || 'Alt+Space';

export function useCompanionGlobalPushToTalk() {
  const enabled = useCompanionStore((state) => state.config.globalPushToTalkEnabled === true);
  const hotkey = useCompanionStore((state) => normalizeHotkey(state.config.globalPushToTalkHotkey));
  const registeredHotkeyRef = useRef<string | null>(null);

  useEffect(() => {
    let isDisposed = false;

    const unregisterCurrent = async () => {
      const registeredHotkey = registeredHotkeyRef.current;
      if (!registeredHotkey) return;
      registeredHotkeyRef.current = null;
      try {
        await unregister(registeredHotkey);
      } catch (error) {
        console.error('CompanionGlobalPushToTalk: failed to unregister hotkey', error);
      }
    };

    const registerHotkey = async () => {
      try {
        const win = getCurrentWindow();
        if (win.label !== 'main') return;

        await unregisterCurrent();
        if (!enabled) {
          CompanionVoiceController.cancel();
          return;
        }

        await register(hotkey, async (event) => {
          const { config } = useCompanionStore.getState();
          if (config.globalPushToTalkEnabled !== true) return;

          const mode = config.globalPushToTalkMode || 'hold';
          if (mode === 'toggle') {
            if (event.state === 'Pressed') CompanionVoiceController.toggle();
            return;
          }

          if (event.state === 'Pressed') {
            await WakeWordService.pause().catch((error) => {
              console.error('CompanionGlobalPushToTalk: failed to pause wake word', error);
            });
            const started = CompanionVoiceController.start({ source: 'global_push_to_talk', requireGlobalEnabled: true });
            if (!started) {
              WakeWordService.resume(config).catch((error) => {
                console.error('CompanionGlobalPushToTalk: failed to resume wake word', error);
              });
            }
          }
          if (event.state === 'Released') CompanionVoiceController.stop();
        });

        if (!isDisposed) {
          registeredHotkeyRef.current = hotkey;
          console.info('CompanionGlobalPushToTalk: registered hotkey', { hotkey });
        } else {
          await unregister(hotkey).catch(() => undefined);
        }
      } catch (error) {
        console.error('CompanionGlobalPushToTalk: failed to register hotkey', error);
        window.dispatchEvent(new CustomEvent('companion-popup', {
          detail: { message: 'Global Push-To-Talk hotkey could not be registered.' },
        }));
      }
    };

    void registerHotkey();

    return () => {
      isDisposed = true;
      void unregisterCurrent();
    };
  }, [enabled, hotkey]);
}
