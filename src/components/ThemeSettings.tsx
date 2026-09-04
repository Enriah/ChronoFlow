import { useEffect, useRef } from 'react';
import { Binary, Check, Cloud, CloudRain, Flower2, Gauge, ImageIcon, Leaf, RotateCcw, Snowflake, Sparkles, Trash2, Upload, Waves, Zap } from 'lucide-react';
import { clsx } from 'clsx';
import { useThemeStore } from '../store/useThemeStore';
import { themes } from '../themes/configs';
import { Button } from './ui/Button';
import { ToggleSwitch } from './ui/ToggleSwitch';
import type { VisualEffectType } from '../themes/theme.types';
import { canUseUserBackground, isEffectAllowedForTheme, isSpecialTheme } from '../themes/special/registry';
import { PersistentAssetService } from '../services/PersistentAssetService';
import { SpecialThemeAddons } from '../features/special-themes/SpecialThemeAddons';

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
  { id: 'water_surface', label: 'Water surface', description: 'Undulating ocean cross-section waves.', icon: Waves },
];

export function ThemeSettings() {
  const backgroundInputRef = useRef<HTMLInputElement>(null);
  const {
    draftEnvironment, savedPresets, hasUnsavedChanges,
    startEditing, stopEditing, loadPreset,
    applyEnvironment, resetDraft, toggleDraftEffect, updateDraftEffect,
    updateDraftBackground, clearDraftBackground,
    performanceMode, togglePerformanceMode,
  } = useThemeStore();
  const allowUserBackground = canUseUserBackground(draftEnvironment.themeId);
  const backgroundPreviewUrl = PersistentAssetService.getAssetUrl(draftEnvironment.background.url || '');
  const presetCards = savedPresets.filter((preset) => !preset.isCustom && !isSpecialTheme(preset.themeId));

  useEffect(() => {
    startEditing();
    return stopEditing;
  }, [startEditing, stopEditing]);

  const chooseBackground = () => backgroundInputRef.current?.click();

  const handleBackgroundFile = (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      window.alert('Please choose an image file.');
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      window.alert('Background image is too large. Please choose an image under 8MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== 'string') return;
      updateDraftBackground({
        type: 'image',
        url: reader.result,
        opacity: 0.46,
        blur: 0,
        brightness: 0.78,
      });
    };
    reader.readAsDataURL(file);
  };

  return <div className="space-y-5">
    <section className="rounded-xl border border-border bg-surface p-5 shadow-sm">
      <h3 className="font-black">Standard themes</h3>
      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8">
        {presetCards.map((preset) => {
          const theme = themes.find((item) => item.id === preset.themeId);
          const selected = draftEnvironment.themeId === preset.themeId;
          return <button key={preset.id} onClick={() => loadPreset(preset.id)} className={clsx('rounded-xl border bg-surface-muted p-4 text-left transition', selected ? 'border-primary ring-1 ring-primary' : 'border-border hover:border-primary')}>
            <div className="flex items-start justify-between">
              <span className="h-7 w-7 rounded-full border border-white/10" style={{ background: theme?.colors.primary }} />
              {selected && <Check className="h-4 w-4 text-primary" />}
            </div>
            <span className="mt-4 block text-sm font-black">{preset.name}</span>
          </button>;
        })}
      </div>
    </section>

    <SpecialThemeAddons />

    {allowUserBackground && <section className="rounded-xl border border-border bg-surface p-5 shadow-sm">
      <input
        ref={backgroundInputRef}
        className="hidden"
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        onChange={(event) => {
          handleBackgroundFile(event.target.files?.[0]);
          event.currentTarget.value = '';
        }}
      />
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
        <div>
          <h3 className="font-black">Special background</h3>
          <p className="mt-1 text-xs text-text-secondary">Only special themes can use user-selected local backgrounds. No copyrighted background is bundled with the app.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={chooseBackground}><Upload className="h-4 w-4" /> Choose image</Button>
          <Button variant="secondary" onClick={clearDraftBackground} disabled={!draftEnvironment.background.url}><Trash2 className="h-4 w-4" /> Remove</Button>
        </div>
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(220px,360px)_1fr]">
        <div className="flex min-h-40 items-center justify-center overflow-hidden rounded-xl border border-border bg-surface-muted">
          {backgroundPreviewUrl
            ? <div className="h-40 w-full bg-cover bg-center" style={{ backgroundImage: `url("${backgroundPreviewUrl}")` }} />
            : <div className="flex flex-col items-center gap-2 p-6 text-center text-sm text-text-secondary"><ImageIcon className="h-8 w-8 text-primary" />No background selected</div>}
        </div>
        <div className="grid content-start gap-4 rounded-xl border border-border bg-surface-muted p-4 md:grid-cols-3">
          <MiniRange label="Opacity" value={draftEnvironment.background.opacity} min={0.2} max={1} step={0.05} onChange={(opacity) => updateDraftBackground({ opacity })} />
          <MiniRange label="Brightness" value={draftEnvironment.background.brightness} min={0.35} max={1.25} step={0.05} onChange={(brightness) => updateDraftBackground({ brightness })} />
          <MiniRange label="Blur" value={draftEnvironment.background.blur} min={0} max={12} step={1} format={(value) => `${value}px`} onChange={(blur) => updateDraftBackground({ blur })} />
        </div>
      </div>
    </section>}

    <section className="rounded-xl border border-border bg-surface p-5 shadow-sm">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div><h3 className="font-black">Environment effects</h3><p className="mt-1 text-xs text-text-secondary">Canvas colors adapt automatically to light and dark themes.</p></div>
        <div className="min-w-56 rounded-xl border border-border bg-surface-muted p-3">
          <ToggleSwitch checked={performanceMode} onCheckedChange={togglePerformanceMode} label={<span className="flex items-center gap-2 text-sm font-bold"><Gauge className="h-4 w-4 text-primary" />Reduced density</span>} description="Uses fewer particles; effects remain visible." />
        </div>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">{featuredEffects.map((meta) => {
        if (!isEffectAllowedForTheme(draftEnvironment.themeId, meta.id)) return null;
        const effect = draftEnvironment.effects.find((item) => item.id === meta.id);
        if (!effect) return null; const Icon = meta.icon;
        return <div key={meta.id} className="rounded-xl border border-border bg-surface-muted p-4"><ToggleSwitch checked={effect.enabled} onCheckedChange={() => toggleDraftEffect(meta.id)} label={<span className="flex items-center gap-2 font-bold"><Icon className="h-4 w-4 text-primary" />{meta.label}</span>} description={meta.description} />{effect.enabled && <div className="mt-4 grid grid-cols-2 gap-3"><MiniRange label="Intensity" value={effect.intensity} onChange={(intensity) => updateDraftEffect(meta.id, { intensity })} /><MiniRange label="Speed" value={effect.speed} onChange={(speed) => updateDraftEffect(meta.id, { speed })} /></div>}</div>;
      })}</div>
    </section>

    <div className="flex justify-end gap-2">
      {hasUnsavedChanges && <Button variant="secondary" onClick={resetDraft}><RotateCcw className="h-4 w-4" /> Reset</Button>}
      <Button onClick={applyEnvironment} disabled={!hasUnsavedChanges}>Apply</Button>
    </div>
  </div>;
}

function MiniRange({
  label,
  value,
  onChange,
  min = 0.1,
  max = 1,
  step = 0.05,
  format = (current) => `${Math.round(current * 100)}%`,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  format?: (value: number) => string;
}) {
  return <label><span className="flex justify-between text-[10px] font-bold text-text-secondary"><span>{label}</span><span>{format(value)}</span></span><input className="mt-2 w-full accent-primary" type="range" value={value} min={min} max={max} step={step} onChange={(event) => onChange(Number(event.target.value))} /></label>;
}
