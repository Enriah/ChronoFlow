import { clsx } from 'clsx';
import { useWidgetStore } from '../store/useWidgetStore';

function Toggle({ active, onClick }: { active: boolean; onClick: () => void }) {
  return <button onClick={onClick} className={clsx('relative h-6 w-12 shrink-0 rounded-full transition-all', active ? 'bg-primary' : 'border border-border bg-surface-hover')}>
    <span className={clsx('absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-all', active && 'translate-x-6')} />
  </button>;
}

export function WidgetSettings() {
  const { settings, updateSettings } = useWidgetStore();
  return <div className="grid gap-5 rounded-xl border border-border bg-surface/40 p-5 lg:grid-cols-[220px_1fr_1fr] lg:items-center">
    <div className="flex items-center justify-between gap-4"><span className="text-sm font-bold">Always on top</span><Toggle active={settings.alwaysOnTop} onClick={() => updateSettings({ alwaysOnTop: !settings.alwaysOnTop })} /></div>
    <label className="block"><span className="flex justify-between text-sm font-bold"><span>Opacity</span><span>{Math.round(settings.opacity * 100)}%</span></span><input type="range" min="0.1" max="1" step="0.01" value={settings.opacity} onChange={(event) => updateSettings({ opacity: Number(event.target.value) })} className="mt-3 w-full accent-primary" /></label>
    <label className="block"><span className="flex justify-between text-sm font-bold"><span>Blur</span><span>{settings.blurAmount}px</span></span><input type="range" min="0" max="40" step="1" value={settings.blurAmount} onChange={(event) => updateSettings({ blurAmount: Number(event.target.value) })} className="mt-3 w-full accent-primary" /></label>
  </div>;
}
