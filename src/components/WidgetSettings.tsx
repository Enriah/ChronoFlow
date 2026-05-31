import { useWidgetStore } from '../store/useWidgetStore';
import { ShieldCheck, Zap, MousePointer2 } from 'lucide-react';
import { clsx } from 'clsx';

export function WidgetSettings() {
  const { settings, updateSettings } = useWidgetStore();

  return (
    <div className="space-y-12 animate-in fade-in duration-500 pb-8">
      {/* Behavior Section */}
      <div className="bg-surface/40 p-8 rounded-[2.5rem] border border-border/50">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
          <div className="flex items-center gap-5">
            <div className="w-14 h-14 rounded-3xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <div>
              <h4 className="text-base font-black text-text tracking-tight uppercase">Window Behavior</h4>
              <p className="text-[10px] text-text-secondary font-black tracking-[0.1em] opacity-60 uppercase mt-0.5">Desktop Integration</p>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center gap-6 w-full md:w-auto">
            <label className="flex items-center justify-between sm:justify-start gap-4 cursor-pointer group w-full sm:w-auto">
              <span className="text-xs font-bold text-text-secondary group-hover:text-text transition-colors">Always on Top</span>
              <button
                onClick={() => updateSettings({ alwaysOnTop: !settings.alwaysOnTop })}
                className={clsx(
                  "w-12 h-6 rounded-full transition-all relative shrink-0",
                  settings.alwaysOnTop ? "bg-primary" : "bg-surface-hover border border-border"
                )}
              >
                <div className={clsx(
                  "absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-all shadow-sm",
                  settings.alwaysOnTop ? "translate-x-6" : "translate-x-0"
                )} />
              </button>
            </label>

            <div className="hidden sm:block w-px h-8 bg-border/50" />

            <label className="flex items-center justify-between sm:justify-start gap-4 cursor-pointer group w-full sm:w-auto">
              <span className="text-xs font-bold text-text-secondary group-hover:text-text transition-colors">Show Milliseconds</span>
              <button
                onClick={() => updateSettings({ showMilliseconds: !settings.showMilliseconds })}
                className={clsx(
                  "w-12 h-6 rounded-full transition-all relative shrink-0",
                  settings.showMilliseconds ? "bg-primary" : "bg-surface-hover border border-border"
                )}
              >
                <div className={clsx(
                  "absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-all shadow-sm",
                  settings.showMilliseconds ? "translate-x-6" : "translate-x-0"
                )} />
              </button>
            </label>
          </div>
        </div>
      </div>

      {/* Visuals Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-surface/30 p-8 rounded-[2rem] border border-border/50 space-y-8 transition-colors hover:border-primary/20">
          <div className="flex justify-between items-end">
            <div>
              <h4 className="text-xs font-black text-text-secondary uppercase tracking-[0.2em]">Widget Opacity</h4>
              <p className="text-[10px] text-text-secondary font-medium mt-1 opacity-70">Controls background transparency</p>
            </div>
            <span className="text-sm font-black text-text tabular-nums">{Math.round(settings.opacity * 100)}%</span>
          </div>
          <input 
            type="range" min="0.1" max="1" step="0.01" 
            value={settings.opacity}
            onChange={(e) => updateSettings({ opacity: parseFloat(e.target.value) })}
            className="w-full h-1.5 bg-surface rounded-lg appearance-none cursor-pointer accent-primary"
          />
        </div>

        <div className="bg-surface/30 p-8 rounded-[2rem] border border-border/50 space-y-8 transition-colors hover:border-primary/20">
          <div className="flex justify-between items-end">
            <div>
              <h4 className="text-xs font-black text-text-secondary uppercase tracking-[0.2em]">Blur Intensity</h4>
              <p className="text-[10px] text-text-secondary font-medium mt-1 opacity-70">Glassmorphism effect strength</p>
            </div>
            <span className="text-sm font-black text-text tabular-nums">{settings.blurAmount}px</span>
          </div>
          <input 
            type="range" min="0" max="40" step="1" 
            value={settings.blurAmount}
            onChange={(e) => updateSettings({ blurAmount: parseInt(e.target.value) })}
            className="w-full h-1.5 bg-surface rounded-lg appearance-none cursor-pointer accent-primary"
          />
        </div>
      </div>

      {/* Interaction Help */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-6 bg-primary/5 border border-primary/20 rounded-[1.5rem] flex gap-5 items-start">
          <Zap className="w-6 h-6 text-primary shrink-0 mt-1" />
          <div>
            <h5 className="text-xs font-black text-primary uppercase tracking-widest mb-1.5">Performance Mode</h5>
            <p className="text-[10px] text-text-secondary leading-relaxed font-medium">
              Floating widgets are automatically optimized for low resource usage. Particle effects and complex animations are disabled to ensure your desktop remains responsive.
            </p>
          </div>
        </div>
        
        <div className="p-6 bg-surface/40 border border-border/50 rounded-[1.5rem] flex gap-5 items-start">
          <MousePointer2 className="w-6 h-6 text-text-secondary shrink-0 mt-1" />
          <div>
            <h5 className="text-xs font-black text-text uppercase tracking-widest mb-1.5">Desktop Mobility</h5>
            <p className="text-[10px] text-text-secondary leading-relaxed font-medium">
              Click and drag the header area of any floating widget to reposition it anywhere on your screens. Use the X button to return it to the dashboard.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
