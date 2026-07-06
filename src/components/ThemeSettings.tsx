import { useEffect, useRef, type ChangeEvent } from 'react';
import { Binary, Check, Cloud, CloudRain, Flower2, Gauge, Image, Leaf, RotateCcw, Snowflake, Sparkles, Upload, Zap } from 'lucide-react';
import { clsx } from 'clsx';
import { useThemeStore } from '../store/useThemeStore';
import { themes } from '../themes/configs';
import { assetManager } from '../assets-system/manager/AssetManager';
import { Button } from './ui/Button';
import { ToggleSwitch } from './ui/ToggleSwitch';
import type { VisualEffectType } from '../themes/theme.types';

const featuredEffects: { id: VisualEffectType; label: string; description: string; icon: typeof Sparkles }[] = [
  { id: 'aurora', label: 'Aurora', description: 'Soft moving light ribbons.', icon: Sparkles },
  { id: 'rain', label: 'Rain', description: 'Falling rain across the workspace.', icon: CloudRain },
  { id: 'sakura', label: 'Sakura petals', description: 'Drifting cherry blossom petals.', icon: Flower2 },
  { id: 'maple_leaf', label: 'Maple leaves', description: 'Rotating autumn leaves.', icon: Leaf },
  { id: 'stars', label: 'Star field', description: 'Subtle pulsing background stars.', icon: Sparkles },
  { id: 'snow', label: 'Snow', description: 'Soft snowfall across the workspace.', icon: Snowflake },
  { id: 'electricity', label: 'Electricity', description: 'Occasional animated lightning bolts.', icon: Zap },
  { id: 'matrix', label: 'Matrix', description: 'Falling terminal characters.', icon: Binary },
  { id: 'fog', label: 'Fog', description: 'Slow moving atmospheric fog.', icon: Cloud },
];

export function ThemeSettings() {
  const {
    draftEnvironment, savedPresets, hasUnsavedChanges,
    startEditing, stopEditing, loadPreset, updateDraftBackground,
    applyEnvironment, resetDraft, toggleDraftEffect, updateDraftEffect,
    performanceMode, togglePerformanceMode,
  } = useThemeStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    startEditing();
    return stopEditing;
  }, [startEditing, stopEditing]);

  const uploadBackground = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const asset = await assetManager.loadLocalAsset(file);
    updateDraftBackground({ type: asset.type as 'image' | 'video' | 'gif', url: asset.url });
    event.target.value = '';
  };

  return <div className="space-y-5">
    <section className="rounded-xl border border-border bg-surface p-5 shadow-sm">
      <h3 className="font-black">Theme preset</h3>
      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8">
        {savedPresets.filter((preset) => !preset.isCustom).map((preset) => {
          const theme = themes.find((item) => item.id === preset.themeId);
          const selected = draftEnvironment.themeId === preset.themeId;
          return <button key={preset.id} onClick={() => loadPreset(preset.id)} className={clsx('rounded-xl border bg-surface-muted p-4 text-left transition', selected ? 'border-primary ring-1 ring-primary' : 'border-border hover:border-primary')}>
            <div className="flex items-center justify-between">
              <span className="h-7 w-7 rounded-full border border-white/10" style={{ background: theme?.colors.primary }} />
              {selected && <Check className="h-4 w-4 text-primary" />}
            </div>
            <span className="mt-4 block text-sm font-black">{preset.name}</span>
          </button>;
        })}
      </div>
    </section>

    <section className="rounded-xl border border-border bg-surface p-5 shadow-sm">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div><h3 className="font-black">Environment effects</h3><p className="mt-1 text-xs text-text-secondary">Canvas colors adapt automatically to light and dark themes.</p></div>
        <div className="min-w-56 rounded-xl border border-border bg-surface-muted p-3">
          <ToggleSwitch checked={performanceMode} onCheckedChange={togglePerformanceMode} label={<span className="flex items-center gap-2 text-sm font-bold"><Gauge className="h-4 w-4 text-primary" />Reduced density</span>} description="Uses fewer particles; effects remain visible." />
        </div>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">{featuredEffects.map((meta) => {
        const effect = draftEnvironment.effects.find((item) => item.id === meta.id);
        if (!effect) return null; const Icon = meta.icon;
        return <div key={meta.id} className="rounded-xl border border-border bg-surface-muted p-4"><ToggleSwitch checked={effect.enabled} onCheckedChange={() => toggleDraftEffect(meta.id)} label={<span className="flex items-center gap-2 font-bold"><Icon className="h-4 w-4 text-primary" />{meta.label}</span>} description={meta.description} />{effect.enabled && <div className="mt-4 grid grid-cols-2 gap-3"><MiniRange label="Intensity" value={effect.intensity} onChange={(intensity) => updateDraftEffect(meta.id, { intensity })} /><MiniRange label="Speed" value={effect.speed} onChange={(speed) => updateDraftEffect(meta.id, { speed })} /></div>}</div>;
      })}</div>
    </section>

    <section className="rounded-xl border border-border bg-surface p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3"><h3 className="font-black">Background</h3><Image className="h-4 w-4 text-text-secondary" /></div>
      <div className="mt-4 flex flex-wrap gap-2">
        {(['none', 'image'] as const).map((type) => <Button key={type} variant={draftEnvironment.background.type === type ? 'primary' : 'secondary'} onClick={() => updateDraftBackground({ type })}>{type}</Button>) }
        <Button variant="secondary" onClick={() => fileInputRef.current?.click()}><Upload className="h-4 w-4" /> Upload</Button>
        <input ref={fileInputRef} type="file" accept="image/*,video/*" onChange={uploadBackground} className="hidden" />
      </div>
      {draftEnvironment.background.type !== 'none' && <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Range label="Opacity" value={draftEnvironment.background.opacity} min={0.1} max={1} step={0.05} onChange={(opacity) => updateDraftBackground({ opacity })} />
        <Range label="Blur" value={draftEnvironment.background.blur} min={0} max={20} step={1} onChange={(blur) => updateDraftBackground({ blur })} suffix="px" />
        <Range label="Brightness" value={draftEnvironment.background.brightness} min={0.3} max={1.5} step={0.05} onChange={(brightness) => updateDraftBackground({ brightness })} />
      </div>}
    </section>

    <div className="flex justify-end gap-2">
      {hasUnsavedChanges && <Button variant="secondary" onClick={resetDraft}><RotateCcw className="h-4 w-4" /> Reset</Button>}
      <Button onClick={applyEnvironment} disabled={!hasUnsavedChanges}>Apply</Button>
    </div>
  </div>;
}

function MiniRange({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return <label><span className="flex justify-between text-[10px] font-bold text-text-secondary"><span>{label}</span><span>{Math.round(value * 100)}%</span></span><input className="mt-2 w-full accent-primary" type="range" value={value} min={0.1} max={1} step={0.05} onChange={(event) => onChange(Number(event.target.value))} /></label>;
}

function Range({ label, value, min, max, step, suffix = '' , onChange }: {
  label: string; value: number; min: number; max: number; step: number;
  suffix?: string; onChange: (value: number) => void;
}) {
  return <label className="rounded-lg border border-border bg-surface-muted p-4">
    <span className="flex justify-between text-sm font-bold"><span>{label}</span><span>{Math.round(value * (suffix ? 1 : 100))}{suffix || '%'}</span></span>
    <input className="mt-3 w-full accent-primary" type="range" value={value} min={min} max={max} step={step} onChange={(event) => onChange(Number(event.target.value))} />
  </label>;
}
