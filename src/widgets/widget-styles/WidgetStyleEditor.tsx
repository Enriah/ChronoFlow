import React from 'react';
import { clsx } from 'clsx';
import { Upload } from 'lucide-react';
import type { WidgetStyle, WidgetBackgroundType, WidgetBorderStyle } from '../../themes/theme.types';
import { assetManager } from '../../assets-system/manager/AssetManager';

interface WidgetStyleEditorProps {
  label: string;
  style: WidgetStyle;
  onUpdate: (config: Partial<WidgetStyle>) => void;
}

export const WidgetStyleEditor: React.FC<WidgetStyleEditorProps> = ({ label, style, onUpdate }) => {
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const asset = await assetManager.loadLocalAsset(file);
      onUpdate({ backgroundImage: asset.url, backgroundType: 'image' });
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <div>
        <h3 className="text-sm font-black text-text uppercase tracking-widest mb-6">{label} Appearance</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          {/* Background & Transparency */}
          <div className="space-y-6">
            <div className="space-y-4">
              <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest opacity-60">Background Type</label>
              <div className="grid grid-cols-2 gap-2">
                {['solid', 'glass', 'gradient', 'image'].map(type => (
                  <button
                    key={type}
                    onClick={() => onUpdate({ backgroundType: type as WidgetBackgroundType })}
                    className={clsx(
                      "px-4 py-2.5 rounded-xl border text-[10px] font-black uppercase transition-all",
                      style.backgroundType === type ? "border-primary bg-primary/10 text-primary" : "border-border bg-surface text-text-secondary hover:border-primary/30"
                    )}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            {style.backgroundType === 'image' && (
              <div className="space-y-4 animate-in slide-in-from-top-2 duration-300">
                <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest opacity-60">Widget Background Image</label>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    placeholder="URL..."
                    value={style.backgroundImage || ''}
                    onChange={(e) => onUpdate({ backgroundImage: e.target.value })}
                    className="flex-1 bg-surface border border-border rounded-xl px-4 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    className="hidden"
                    accept="image/*"
                  />
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-primary text-primary-fg p-2.5 rounded-xl hover:opacity-90 transition-all shadow-lg shadow-primary/20"
                  >
                    <Upload className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {[
              { label: 'Opacity', value: style.opacity, min: 0, max: 1, step: 0.01, formatter: (v: number) => `${Math.round(v * 100)}%`, key: 'opacity' },
              { label: 'Blur Depth', value: style.blur, min: 0, max: 40, step: 1, formatter: (v: number) => `${v}px`, key: 'blur' },
            ].map(slider => (
              <div key={slider.key} className="space-y-3">
                <div className="flex justify-between text-[10px] font-black text-text-secondary uppercase tracking-widest">
                  <span>{slider.label}</span>
                  <span className="text-text">{slider.formatter(slider.value)}</span>
                </div>
                <input 
                  type="range" min={slider.min} max={slider.max} step={slider.step} 
                  value={slider.value}
                  onChange={(e) => onUpdate({ [slider.key]: parseFloat(e.target.value) })}
                  className="w-full h-1.5 bg-surface rounded-lg appearance-none cursor-pointer accent-primary"
                />
              </div>
            ))}
          </div>

          {/* Borders & Effects */}
          <div className="space-y-6">
            <div className="space-y-4">
              <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest opacity-60">Border Style</label>
              <div className="grid grid-cols-2 gap-2">
                {['minimal', 'neon', 'terminal', 'soft'].map(type => (
                  <button
                    key={type}
                    onClick={() => onUpdate({ borderStyle: type as WidgetBorderStyle })}
                    className={clsx(
                      "px-4 py-2.5 rounded-xl border text-[10px] font-black uppercase transition-all",
                      style.borderStyle === type ? "border-primary bg-primary/10 text-primary" : "border-border bg-surface text-text-secondary hover:border-primary/30"
                    )}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            {[
              { label: 'Corner Radius', value: style.borderRadius, min: 0, max: 64, step: 1, formatter: (v: number) => `${v}px`, key: 'borderRadius' },
              { label: 'Inner Glow', value: style.glowIntensity, min: 0, max: 1, step: 0.01, formatter: (v: number) => `${Math.round(v * 100)}%`, key: 'glowIntensity' },
              { label: 'Shadow Depth', value: style.shadowIntensity, min: 0, max: 1, step: 0.01, formatter: (v: number) => `${Math.round(v * 100)}%`, key: 'shadowIntensity' },
            ].map(slider => (
              <div key={slider.key} className="space-y-3">
                <div className="flex justify-between text-[10px] font-black text-text-secondary uppercase tracking-widest">
                  <span>{slider.label}</span>
                  <span className="text-text">{slider.formatter(slider.value)}</span>
                </div>
                <input 
                  type="range" min={slider.min} max={slider.max} step={slider.step} 
                  value={slider.value}
                  onChange={(e) => onUpdate({ [slider.key]: parseFloat(e.target.value) })}
                  className="w-full h-1.5 bg-surface rounded-lg appearance-none cursor-pointer accent-primary"
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
