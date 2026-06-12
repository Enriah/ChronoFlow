import { useEffect, useState } from 'react';
import { clsx } from 'clsx';
import type { CompanionConfig, CompanionProfile } from '../../models/companion/types';
import { WakeWordService } from '../../companion/voice/WakeWordService';
import type { WakeWordDebugStatus } from '../../companion/voice/WakeWordTypes';
import { ToggleSwitch } from '../ui/ToggleSwitch';
import { useCompanionStore } from '../../store/useCompanionStore';

type WakeWordSettingsProps = {
  config: CompanionConfig;
  profile: CompanionProfile;
  updateConfig: (patch: Partial<CompanionConfig>) => void;
  updateProfile: (patch: Partial<CompanionProfile>) => void;
};

const defaultDebugStatus: WakeWordDebugStatus = {
  state: 'off',
  engine: 'smart_vosk',
  microphoneLevel: 0,
  detectionConfidence: 0,
  falseTriggerCount: 0,
};

export function WakeWordSettings({ config, profile, updateConfig, updateProfile }: WakeWordSettingsProps) {
  const savedConfig = useCompanionStore((state) => state.config);
  const [variantInput, setVariantInput] = useState('');
  const [status, setStatus] = useState(config.wakeWordAlwaysOnEnabled ? 'Wake Word Active' : 'Wake Word Off');
  const [isTesting, setIsTesting] = useState(false);
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [recordingIndex, setRecordingIndex] = useState<number | null>(null);
  const [debugStatus, setDebugStatus] = useState<WakeWordDebugStatus>(defaultDebugStatus);

  useEffect(() => {
    const handleWakeState = (event: Event) => {
      const detail = (event as CustomEvent<Partial<WakeWordDebugStatus>>).detail;
      if (!detail?.state) return;

      const labels: Record<string, string> = {
        off: 'Wake Word Off',
        requesting_permission: 'Requesting microphone permission',
        wake_listening: 'Wake Word Active',
        wake_detected: 'Wake Word Detected',
        companion_listening: 'Listening',
        transcribing: 'Transcribing',
        thinking: 'Thinking',
        speaking: 'Speaking',
        error: detail.message || 'Wake Word Error',
      };
      setStatus(labels[detail.state] || detail.message || detail.state);
      setDebugStatus((current) => ({ ...current, ...detail }));
    };

    window.addEventListener('companion-wake-word-state', handleWakeState);
    return () => window.removeEventListener('companion-wake-word-state', handleWakeState);
  }, []);

  const variants = config.wakeWordVariants || [];
  const samples = config.wakeWordTrainingSamples || [];
  const engine = config.wakeWordProvider || 'smart_vosk';

  const addVariant = () => {
    const variant = variantInput.trim();
    if (!variant || variants.some((item) => item.toLowerCase() === variant.toLowerCase())) return;
    updateConfig({ wakeWordVariants: [...variants, variant] });
    setVariantInput('');
  };

  const removeVariant = (variant: string) => {
    updateConfig({ wakeWordVariants: variants.filter((item) => item !== variant) });
  };

  const testWakeWord = async () => {
    setIsTesting(true);
      setStatus(engine === 'transcript_match_debug'
        ? 'Say your wake word now...'
        : 'Wake engine test is active. Say the selected wake word and watch the status panel.'
      );
    try {
      await WakeWordService.pause();
      const result = await WakeWordService.test(config);
      setStatus(result.message || (result.detected ? `Detected: ${result.transcript}` : `Not detected: ${result.transcript}`));
    } catch (error: any) {
      console.error('WakeWordSettings: test failed', error);
      setStatus(error?.message || 'Wake Word test failed.');
    } finally {
      setIsTesting(false);
      WakeWordService.resume(savedConfig).catch((error) => {
        console.error('WakeWordSettings: failed to resume wake word', error);
      });
    }
  };

  const calibrateMicrophone = async () => {
    setIsCalibrating(true);
    setStatus('Calibrating microphone level...');
    try {
      const available = await WakeWordService.isAvailable();
      setStatus(available ? 'Microphone is available for local wake word detection.' : 'Real wake word detection is unavailable on this system.');
    } catch (error: any) {
      setStatus(error?.message || 'Microphone calibration failed.');
    } finally {
      setIsCalibrating(false);
    }
  };

  const recordSample = async (index: number) => {
    setRecordingIndex(index);
    setStatus(`Recording sample ${index + 1}...`);
    try {
      await WakeWordService.pause();
      const sample = await WakeWordService.recordTrainingSample(config);
      const next = [...samples];
      next[index] = sample;
      updateConfig({ wakeWordTrainingSamples: next.filter(Boolean) });
      setStatus(`Saved sample: ${sample}`);
    } catch (error: any) {
      console.error('WakeWordSettings: sample recording failed', error);
      setStatus(error?.message || 'Could not record wake word sample.');
    } finally {
      setRecordingIndex(null);
      WakeWordService.resume(savedConfig).catch((error) => {
        console.error('WakeWordSettings: failed to resume wake word', error);
      });
    }
  };

  return (
    <div className="space-y-4 pt-4 border-t border-white/10">
      <ToggleSwitch
        checked={config.wakeWordEnabled === true}
        onChange={() => updateConfig({ wakeWordEnabled: !config.wakeWordEnabled })}
        label="Wake Word"
        description="Microphone listens locally for wake word. Your speech is only sent for transcription after wake word activation."
      />

      <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-4">
        <ToggleSwitch
          checked={config.wakeWordAlwaysOnEnabled === true}
          onChange={() => updateConfig({ wakeWordAlwaysOnEnabled: !config.wakeWordAlwaysOnEnabled })}
          label="Enable Always-On Wake Word"
          description="Microphone will remain active locally to detect the wake word. Audio is not sent to AI services until wake word is detected."
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[
            { label: 'Show Wake Status Indicator', key: 'wakeWordShowStatus', value: config.wakeWordShowStatus !== false },
            { label: 'Disable While On Battery', key: 'wakeWordDisableOnBattery', value: config.wakeWordDisableOnBattery === true },
            { label: 'Disable While Companion Is Speaking', key: 'wakeWordDisableWhileSpeaking', value: config.wakeWordDisableWhileSpeaking !== false },
            { label: 'Disable When App Exits', key: 'wakeWordDisableOnAppExit', value: config.wakeWordDisableOnAppExit !== false },
          ].map((option) => (
            <ToggleSwitch
              key={option.key}
              checked={option.value}
              onChange={() => updateConfig({ [option.key]: !option.value } as Partial<CompanionConfig>)}
              label={option.label}
            />
          ))}
        </div>
      </div>

      <div className={clsx(
        "p-3 rounded-xl border text-sm font-bold",
        config.wakeWordAlwaysOnEnabled ? "bg-primary/10 border-primary/30 text-primary" : "bg-white/5 border-white/10 text-text-secondary"
      )}>
        {config.wakeWordAlwaysOnEnabled ? status || 'Wake Word Active' : 'Wake Word Off'}
      </div>

      {engine === 'smart_vosk' && (
        <div className="p-3 rounded-xl bg-primary/10 border border-primary/25 text-xs text-text leading-relaxed">
          Smart Wake Vosk uses local lightweight STT only for wake matching. It supports custom names like Airi, Nova, Luna, and Chronos without ONNX training. Gemini, Memory, Journal, and TTS stay inactive until wake detection succeeds.
        </div>
      )}

      {engine === 'openwakeword_builtin' && (
        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200 leading-relaxed">
          OpenWakeWord is advanced mode. It currently supports Alexa and Hey Mycroft unless you provide a custom ONNX model pipeline later.
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="text-sm font-medium text-text-secondary">Wake Word Text</label>
          <input
            value={config.wakeWordText || 'Airi'}
            onChange={(event) => updateConfig({ wakeWordText: event.target.value })}
            className="w-full bg-bg-secondary border border-white/10 rounded-lg p-2 text-sm focus:outline-none focus:border-primary/50"
            placeholder="Airi"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-text-secondary">Companion Name</label>
          <input
            value={config.wakeWordListeningName || ''}
            onChange={(event) => updateConfig({ wakeWordListeningName: event.target.value })}
            className="w-full bg-bg-secondary border border-white/10 rounded-lg p-2 text-sm focus:outline-none focus:border-primary/50"
            placeholder={profile.name}
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-text-secondary">How should Companion call you?</label>
          <input
            value={profile.userAddressStyle || ''}
            onChange={(event) => updateProfile({ userAddressStyle: event.target.value })}
            className="w-full bg-bg-secondary border border-white/10 rounded-lg p-2 text-sm focus:outline-none focus:border-primary/50"
            placeholder="anh, em, ban, Khoa, senpai..."
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-text-secondary">User Display Name</label>
          <input
            value={profile.userDisplayName || ''}
            onChange={(event) => updateProfile({ userDisplayName: event.target.value })}
            className="w-full bg-bg-secondary border border-white/10 rounded-lg p-2 text-sm focus:outline-none focus:border-primary/50"
            placeholder="Khoa"
          />
        </div>

        <div className="space-y-3">
          <div className="flex justify-between text-sm font-medium text-text-secondary">
            <label>Sensitivity</label>
            <span>{Math.round((config.wakeWordSensitivity ?? 0.75) * 100)}%</span>
          </div>
          <input
            type="range"
            min="0.4"
            max="1"
            step="0.05"
            value={config.wakeWordSensitivity ?? 0.75}
            onChange={(event) => updateConfig({ wakeWordSensitivity: Number(event.target.value) })}
            className="w-full accent-primary"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-text-secondary">Wake Word Engine</label>
          <select
            value={engine}
            onChange={(event) => updateConfig({ wakeWordProvider: event.target.value as any })}
            className="w-full bg-bg-secondary border border-white/10 rounded-lg p-2 text-sm focus:outline-none focus:border-primary/50"
          >
            <option value="smart_vosk">Smart Wake Vosk - Recommended</option>
            <option value="openwakeword_builtin">OpenWakeWord Built-in - Advanced</option>
            <option value="transcript_match_debug">Experimental Transcript Match Debug</option>
            <option value="future_openwakeword_custom" disabled>Future OpenWakeWord Custom Model</option>
            <option value="future_porcupine_provider" disabled>Future Porcupine</option>
          </select>
        </div>

        {engine === 'smart_vosk' && (
          <div className="md:col-span-2 space-y-2">
            <label className="text-sm font-medium text-text-secondary">Custom Vosk Model Folder Path</label>
            <input
              value={config.wakeWordVoskModelPath || ''}
              onChange={(event) => updateConfig({ wakeWordVoskModelPath: event.target.value })}
              className="w-full bg-bg-secondary border border-white/10 rounded-lg p-2 text-sm focus:outline-none focus:border-primary/50"
              placeholder="Optional. Leave empty to use the bundled Vosk model."
            />
            <p className="text-xs text-text-secondary">
              Smart Wake runs fully local. The MSI includes a default Vosk model and libvosk.dll; use this field only to override it.
            </p>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-text-secondary">Alternative Pronunciations</label>
        <div className="flex gap-2">
          <input
            value={variantInput}
            onChange={(event) => setVariantInput(event.target.value)}
            onKeyDown={(event) => event.key === 'Enter' && addVariant()}
            className="flex-1 bg-bg-secondary border border-white/10 rounded-lg p-2 text-sm focus:outline-none focus:border-primary/50"
            placeholder="Ai-ri, Airy, Eri..."
          />
          <button onClick={addVariant} className="px-4 py-2 rounded-lg bg-white/5 text-text border border-white/10 text-xs font-bold hover:bg-white/10">
            Add
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {variants.map((variant) => (
            <button
              key={variant}
              onClick={() => removeVariant(variant)}
              className="px-3 py-1.5 rounded-lg bg-white/5 text-text-secondary border border-white/10 text-xs hover:bg-red-500/10 hover:text-red-300 hover:border-red-500/20"
              title="Remove pronunciation variant"
            >
              {variant}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <button
          onClick={calibrateMicrophone}
          disabled={isCalibrating}
          className="px-4 py-2 rounded-lg bg-white/5 text-text border border-white/10 text-xs font-bold hover:bg-white/10 disabled:opacity-60"
        >
          {isCalibrating ? 'Testing...' : 'Mic Permission Test'}
        </button>
        <button
          onClick={testWakeWord}
          disabled={isTesting}
          className="px-4 py-2 rounded-lg bg-primary text-white text-xs font-bold hover:opacity-90 disabled:opacity-60"
        >
          {isTesting ? 'Testing...' : 'Test Wake Word'}
        </button>
        {[0, 1, 2, 3, 4].map((index) => (
          <button
            key={index}
            onClick={() => recordSample(index)}
            disabled={recordingIndex !== null}
            className="px-4 py-2 rounded-lg bg-white/5 text-text border border-white/10 text-xs font-bold hover:bg-white/10 disabled:opacity-60"
          >
            {recordingIndex === index ? 'Recording...' : `Record Sample ${index + 1}`}
          </button>
        ))}
      </div>

      {samples.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {samples.map((sample, index) => (
            <span key={`${sample}-${index}`} className="px-3 py-1.5 rounded-lg bg-primary/10 text-primary border border-primary/20 text-xs">
              Sample {index + 1}: {sample}
            </span>
          ))}
          <button
            onClick={() => updateConfig({ wakeWordTrainingSamples: [] })}
            className="px-3 py-1.5 rounded-lg bg-red-500/10 text-red-300 border border-red-500/20 text-xs font-bold hover:bg-red-500/20"
          >
            Reset Training Data
          </button>
          <span className="text-xs text-text-secondary opacity-70 self-center">
            Training samples saved. Custom model training requires a supported OpenWakeWord custom model pipeline.
          </span>
        </div>
      )}

      <div className="space-y-3">
        <button
          onClick={() => updateConfig({ wakeWordDebugPanelEnabled: !config.wakeWordDebugPanelEnabled })}
          className="px-4 py-2 rounded-lg bg-white/5 text-text border border-white/10 text-xs font-bold hover:bg-white/10"
        >
          {config.wakeWordDebugPanelEnabled ? 'Hide Debug Panel' : 'Show Debug Panel'}
        </button>
        {config.wakeWordDebugPanelEnabled && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3 rounded-xl bg-bg-secondary/70 border border-white/10 text-xs">
            <div><span className="text-text-secondary">State:</span> {debugStatus.state}</div>
            <div><span className="text-text-secondary">Engine:</span> {debugStatus.engine}</div>
            <div><span className="text-text-secondary">Mic level:</span> {(debugStatus.microphoneLevel || 0).toFixed(4)}</div>
            <div><span className="text-text-secondary">Confidence:</span> {Math.round((debugStatus.detectionConfidence || 0) * 100)}%</div>
            <div><span className="text-text-secondary">Last detection:</span> {debugStatus.lastDetectionTime || 'None'}</div>
            <div><span className="text-text-secondary">False triggers:</span> {debugStatus.falseTriggerCount || 0}</div>
            <div className="md:col-span-3"><span className="text-text-secondary">Last partial:</span> {debugStatus.lastPartialTranscript || 'None'}</div>
            <div className="md:col-span-3"><span className="text-text-secondary">Last final:</span> {debugStatus.lastFinalTranscript || 'None'}</div>
            <div><span className="text-text-secondary">Matched:</span> {debugStatus.matchedVariant || 'None'}</div>
            <div><span className="text-text-secondary">Trigger:</span> {debugStatus.triggerReason || 'None'}</div>
            <div><span className="text-text-secondary">Ignored:</span> {debugStatus.ignoredReason || 'None'}</div>
            {debugStatus.cpuWarning && <div className="md:col-span-3 text-amber-200">{debugStatus.cpuWarning}</div>}
          </div>
        )}
      </div>
    </div>
  );
}
