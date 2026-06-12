import { useEffect } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { useCompanionStore } from '../store/useCompanionStore';
import { WakeWordService } from '../companion/voice/WakeWordService';

export function useCompanionWakeWord() {
  const config = useCompanionStore((state) => state.config);

  useEffect(() => {
    let isDisposed = false;
    let batteryManager: any = null;

    const syncWakeWord = async () => {
      try {
        const win = getCurrentWindow();
        if (win.label !== 'main') return;

        if (config.wakeWordEnabled === true && config.wakeWordAlwaysOnEnabled === true) {
          const battery = typeof (navigator as any).getBattery === 'function'
            ? await (navigator as any).getBattery().catch(() => null)
            : null;
          if (config.wakeWordDisableOnBattery === true && battery && battery.charging === false) {
            await WakeWordService.stop();
            window.dispatchEvent(new CustomEvent('companion-wake-word-state', {
              detail: {
                state: 'off',
                message: 'Wake Word disabled while laptop is on battery.',
              },
            }));
            return;
          }
          await WakeWordService.start(config);
        } else {
          await WakeWordService.stop();
        }
      } catch (error) {
        console.error('CompanionWakeWord: failed to sync wake word', error);
        if (!isDisposed) {
          window.dispatchEvent(new CustomEvent('companion-wake-word-state', {
            detail: {
              state: 'error',
              message: 'Wake Word is not available on this system. You can still use Push-to-Talk or typed chat.',
            },
          }));
        }
      }
    };

    void syncWakeWord();

    const bindBatteryWatcher = async () => {
      if (typeof (navigator as any).getBattery !== 'function') return;
      batteryManager = await (navigator as any).getBattery().catch(() => null);
      if (isDisposed) return;
      batteryManager?.addEventListener?.('chargingchange', syncWakeWord);
    };

    void bindBatteryWatcher();

    return () => {
      isDisposed = true;
      batteryManager?.removeEventListener?.('chargingchange', syncWakeWord);
      void WakeWordService.stop();
    };
  }, [
    config.speechRecognitionProvider,
    config.voiceLanguage,
    config.wakeWordAlwaysOnEnabled,
    config.wakeWordDisableOnBattery,
    config.wakeWordEnabled,
    config.wakeWordListeningName,
    config.wakeWordProvider,
    config.wakeWordSensitivity,
    config.wakeWordText,
    config.wakeWordTrainingSamples,
    config.wakeWordVariants,
    config.wakeWordVoskModelPath,
  ]);

  useEffect(() => {
    const handleVoiceState = (event: Event) => {
      const detail = (event as CustomEvent<{ state?: string }>).detail;
      const mappedState: Record<string, string> = {
        listening: 'companion_listening',
        transcribing: 'transcribing',
        thinking: 'thinking',
        speaking: 'speaking',
        error: 'error',
        idle: 'wake_listening',
      };

      if (detail?.state && mappedState[detail.state]) {
        window.dispatchEvent(new CustomEvent('companion-wake-word-state', {
          detail: { state: mappedState[detail.state] },
        }));
      }

      if (detail?.state === 'idle' || detail?.state === 'error') {
        const latestConfig = useCompanionStore.getState().config;
        WakeWordService.resume(latestConfig).catch((error) => {
          console.error('CompanionWakeWord: failed to resume wake word', error);
        });
      }
    };

    window.addEventListener('companion-global-voice-state', handleVoiceState);
    return () => window.removeEventListener('companion-global-voice-state', handleVoiceState);
  }, []);
}
