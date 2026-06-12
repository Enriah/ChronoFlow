import { useEffect, useState } from 'react';
import { clsx } from 'clsx';
import { useCompanionStore } from '../../store/useCompanionStore';
import { WakeWordService } from '../../companion/voice/WakeWordService';
import type { WakeWordDebugStatus } from '../../companion/voice/WakeWordTypes';

const visibleStates = new Set([
  'requesting_permission',
  'wake_listening',
  'wake_detected',
  'companion_listening',
  'transcribing',
  'thinking',
  'speaking',
  'error',
]);

const labels: Record<string, string> = {
  requesting_permission: 'Requesting mic',
  wake_listening: 'Wake Word Active',
  wake_detected: 'Wake Word Detected',
  companion_listening: 'Listening',
  transcribing: 'Understanding',
  thinking: 'Thinking',
  speaking: 'Speaking',
  error: 'Wake Word Error',
};

export function WakeWordStatusIndicator() {
  const config = useCompanionStore((state) => state.config);
  const [status, setStatus] = useState<Partial<WakeWordDebugStatus>>(() => WakeWordService.getDebugStatus());

  useEffect(() => {
    const handleWakeState = (event: Event) => {
      setStatus((current) => ({
        ...current,
        ...(event as CustomEvent<Partial<WakeWordDebugStatus>>).detail,
      }));
    };

    window.addEventListener('companion-wake-word-state', handleWakeState);
    return () => window.removeEventListener('companion-wake-word-state', handleWakeState);
  }, []);

  if (
    config.wakeWordEnabled !== true
    || config.wakeWordAlwaysOnEnabled !== true
    || config.wakeWordShowStatus === false
    || !status.state
    || !visibleStates.has(status.state)
  ) {
    return null;
  }

  const isActive = status.state === 'wake_listening';
  const isBusy = ['wake_detected', 'companion_listening', 'transcribing', 'thinking', 'speaking'].includes(status.state);
  const label = status.message && status.state === 'error'
    ? status.message
    : labels[status.state] || status.message || status.state;

  return (
    <div
      className={clsx(
        'fixed left-5 bottom-5 z-[70] flex max-w-[min(360px,calc(100vw-2rem))] items-center gap-3 rounded-xl border px-4 py-3 shadow-xl backdrop-blur-md transition-all',
        status.state === 'error'
          ? 'border-red-400/30 bg-red-500/15 text-red-100'
          : isActive || isBusy
            ? 'border-primary/30 bg-bg-secondary/90 text-text'
            : 'border-white/10 bg-bg-secondary/80 text-text-secondary'
      )}
      aria-live="polite"
      title="Companion wake word microphone status"
    >
      <span
        className={clsx(
          'h-2.5 w-2.5 shrink-0 rounded-full',
          status.state === 'error'
            ? 'bg-red-300'
            : isActive
              ? 'bg-emerald-300 shadow-[0_0_14px_rgba(110,231,183,0.8)]'
              : isBusy
                ? 'bg-primary shadow-[0_0_14px_rgba(99,102,241,0.8)]'
                : 'bg-white/40'
        )}
      />
      <div className="min-w-0">
        <p className="truncate text-xs font-bold">{label}</p>
        <p className="truncate text-[11px] text-text-secondary">
          Mic active locally. No AI call until wake word is detected.
        </p>
      </div>
      {status.detectionConfidence !== undefined && status.detectionConfidence > 0 && (
        <span className="shrink-0 text-xs font-bold text-text-secondary opacity-70">
          {Math.round(status.detectionConfidence * 100)}%
        </span>
      )}
    </div>
  );
}
