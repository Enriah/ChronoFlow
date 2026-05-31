import React, { useState, useRef } from 'react';
import { useThemeStore } from '../store/useThemeStore';
import { themes } from '../themes/configs';
import { 
  ImageIcon, Sparkles, Layers, 
  Upload, Save, CheckCircle2, AlertCircle, Trash2, Plus, 
  Monitor, LayoutPanelLeft, Zap, Music, ChevronRight
} from 'lucide-react';
import { clsx } from 'clsx';
import type { VisualEffectType } from '../themes/theme.types';
import { assetManager } from '../assets-system/manager/AssetManager';
import { WidgetStyleEditor } from '../widgets/widget-styles/WidgetStyleEditor';
import { AudioSettings } from './AudioSettings';
import { WidgetSettings } from './WidgetSettings';
import { Button } from './ui/Button';

export function ThemeSettings() {
  const { 
    activeEnvironment,
    draftEnvironment,
    isEditing,
    hasUnsavedChanges,
    savedPresets,
    startEditing,
    stopEditing,
    setTheme,
    updateDraftBackground,
    updateDraftEffect,
    toggleDraftEffect,
    updateDraftOverlay,
    updateDraftCountdownStyle,
    updateDraftTimelineStyle,
    updateDraftPlannerStyle,
    updateDraftStatsStyle,
    updateDraftRankingStyle,
    applyEnvironment,
    resetDraft,
    savePreset,
    loadPreset,
    deletePreset,
    performanceMode,
    togglePerformanceMode
    } = useThemeStore();

  
  const [activeTab, setActiveTab] = useState<'presets' | 'custom'>('presets');
  const [customTab, setCustomTab] = useState<'background' | 'effects' | 'overlays' | 'widgets' | 'audio' | 'widgets-desktop'>('background');
  const [selectedWidget, setSelectedWidget] = useState<'countdown' | 'timeline' | 'planner' | 'stats' | 'ranking'>('countdown');
  const [showApplyFeedback, setShowApplyFeedback] = useState(false);
  const [presetName, setPresetName] = useState('');
  const [isSaving, setIsEditingName] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Ensure we are in editing mode (Live Preview) as long as the builder is open
  React.useEffect(() => {
    startEditing();
    return () => stopEditing();
  }, []);

  const handleApply = () => {
    applyEnvironment();
    setShowApplyFeedback(true);
    setTimeout(() => setShowApplyFeedback(false), 3000);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const asset = await assetManager.loadLocalAsset(file);
      updateDraftBackground({ url: asset.url, type: asset.type as any });
    }
  };

  const handleSavePreset = () => {
    if (presetName.trim()) {
      savePreset(presetName);
      setPresetName('');
      setIsEditingName(false);
    }
  };

  return (
    <div className="bg-surface/80 backdrop-blur-2xl border border-border rounded-[3rem] p-8 md:p-14 shadow-2xl w-[96vw] max-w-[1440px] mx-auto transition-all duration-500 overflow-hidden">
      {/* Header with Navigation */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-8 mb-12">
        <div className="space-y-1 min-w-0">
          <h2 className="text-3xl font-black tracking-tighter text-text truncate">Atmosphere Builder</h2>
          <p className="text-text-secondary text-sm font-medium opacity-70 truncate">Design your personalized focus environment.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
          <button
            onClick={togglePerformanceMode}
            className={clsx(
              "flex items-center gap-2 px-4 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-[0.15em] transition-all border shrink-0",
              performanceMode 
                ? "bg-amber-500/10 text-amber-500 border-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.1)]" 
                : "bg-surface-hover/50 text-text-secondary border-border hover:text-text hover:border-primary/30"
            )}
          >
            <Zap className={clsx("w-3.5 h-3.5", performanceMode && "fill-current")} />
            {performanceMode ? "Lite" : "Full"}
          </button>
          
          <div className="flex gap-1.5 bg-black/20 p-1.5 rounded-[1.25rem] border border-white/5 flex-grow sm:flex-grow-0">
            <button
              onClick={() => { setActiveTab('presets'); }}
              className={clsx(
                "flex-1 flex items-center justify-center gap-2 px-4 sm:px-6 py-2.5 rounded-xl transition-all font-black text-[10px] uppercase tracking-widest min-w-0",
                activeTab === 'presets' 
                  ? "bg-primary text-primary-fg shadow-lg shadow-primary/20" 
                  : "text-text-secondary hover:text-text hover:bg-white/5"
              )}
            >
              <LayoutPanelLeft className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Presets</span>
            </button>
            <button
              onClick={() => { setActiveTab('custom'); }}
              className={clsx(
                "flex-1 flex items-center justify-center gap-2 px-4 sm:px-6 py-2.5 rounded-xl transition-all font-black text-[10px] uppercase tracking-widest min-w-0",
                activeTab === 'custom' 
                  ? "bg-primary text-primary-fg shadow-lg shadow-primary/20" 
                  : "text-text-secondary hover:text-text hover:bg-white/5"
              )}
            >
              <Sparkles className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Builder</span>
            </button>
          </div>
        </div>
      </div>

      <div className="min-h-[500px]">
        {/* Presets Tab */}
        {activeTab === 'presets' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {savedPresets.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => loadPreset(preset.id)}
                  className={clsx(
                    "group relative flex flex-col gap-5 p-6 rounded-[2rem] border transition-all text-left overflow-hidden",
                    draftEnvironment.themeId === preset.themeId && activeTab === 'presets'
                      ? "border-primary bg-primary/5 ring-4 ring-primary/5" 
                      : "border-border bg-surface-hover/20 hover:border-primary/40 hover:bg-surface-hover/40"
                  )}
                >
                  <div className="flex justify-between items-center z-10 min-w-0">
                    <span className="text-[10px] font-black text-text uppercase tracking-[0.2em] truncate pr-4">{preset.name}</span>
                    {activeEnvironment.themeId === preset.themeId && !hasUnsavedChanges && (
                      <div className="bg-primary/20 p-1 rounded-full">
                        <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
                      </div>
                    )}
                  </div>
                  
                  {/* Thumbnail Preview Area */}
                  <div className="h-28 w-full rounded-2xl bg-black/40 overflow-hidden relative border border-white/5 shadow-inner">
                    <div className="absolute inset-0 opacity-40 bg-gradient-to-br from-primary/30 to-accent/30" />
                    <div className="absolute bottom-4 left-4 flex gap-2">
                      <div className="w-5 h-5 rounded-full border-2 border-white/20 shadow-sm" style={{ backgroundColor: themes.find(t => t.id === preset.themeId)?.colors.primary }} />
                      <div className="w-5 h-5 rounded-full border-2 border-white/20 shadow-sm" style={{ backgroundColor: themes.find(t => t.id === preset.themeId)?.colors.accent }} />
                    </div>
                  </div>

                  {preset.isCustom && (
                    <Button 
                      variant="danger"
                      size="icon"
                      onClick={(e) => { e.stopPropagation(); deletePreset(preset.id); }}
                      className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 w-8 h-8 rounded-xl"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </button>
              ))}
              
              <button
                onClick={() => { setActiveTab('custom'); }}
                className="flex flex-col items-center justify-center gap-4 p-6 rounded-[2rem] border-2 border-dashed border-border/50 bg-transparent hover:border-primary/50 hover:bg-primary/5 transition-all text-text-secondary hover:text-primary group"
              >
                <div className="w-14 h-14 rounded-[1.5rem] bg-surface-hover flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm group-hover:shadow-lg">
                  <Plus className="w-7 h-7" />
                </div>
                <span className="text-xs font-black uppercase tracking-widest">New Custom</span>
              </button>
            </div>
          </div>
        )}

        {/* Custom Builder Tab */}
        {activeTab === 'custom' && (
          <div className="flex flex-col lg:flex-row gap-12 animate-in fade-in slide-in-from-right-4 duration-500">
            {/* Editor Sidebar */}
            <div className="w-full lg:w-72 flex flex-col gap-2 shrink-0">
              {[
                { id: 'background', label: 'Global BG', icon: ImageIcon },
                { id: 'effects', label: 'Atmosphere', icon: Sparkles },
                { id: 'overlays', label: 'Filters', icon: Layers },
                { id: 'widgets', label: 'Widgets UI', icon: Monitor },
                { id: 'widgets-desktop', label: 'Desktop Widgets', icon: LayoutPanelLeft },
                { id: 'audio', label: 'Audio Engine', icon: Music },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setCustomTab(tab.id as any)}
                  className={clsx(
                    "flex items-center justify-between px-6 py-5 rounded-[1.5rem] transition-all font-black text-[10px] uppercase tracking-widest text-left group",
                    customTab === tab.id 
                      ? "bg-primary/10 text-primary border border-primary/20 shadow-sm" 
                      : "text-text-secondary hover:text-text hover:bg-surface-hover hover:border-border border border-transparent"
                  )}
                >
                  <div className="flex items-center gap-4">
                    <tab.icon className={clsx("w-5 h-5 transition-transform group-hover:scale-110", customTab === tab.id ? "text-primary" : "text-text-secondary opacity-50")} />
                    {tab.label}
                  </div>
                  {customTab === tab.id && <ChevronRight className="w-4 h-4 animate-in slide-in-from-left-2" />}
                </button>
              ))}
            </div>

            {/* Editor Content */}
            <div className="flex-1 bg-black/10 rounded-[2.5rem] p-8 md:p-10 border border-white/5 overflow-y-auto overflow-x-hidden max-h-[75vh] custom-scrollbar">
              {/* Background Section */}
              {customTab === 'background' && (
                <div className="space-y-12 animate-in fade-in duration-300">
                  <div className="space-y-6">
                    <label className="text-[10px] font-black text-text-secondary uppercase tracking-[0.2em] ml-2 opacity-60">Theme Personality</label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      {themes.map(theme => (
                        <button
                          key={theme.id}
                          onClick={() => setTheme(theme.id)}
                          className={clsx(
                            "py-4 px-3 rounded-2xl border text-[10px] font-black uppercase tracking-widest transition-all shadow-sm",
                            draftEnvironment.themeId === theme.id 
                              ? "border-primary bg-primary text-primary-fg shadow-lg shadow-primary/20" 
                              : "border-border bg-surface hover:border-primary/40 hover:bg-surface-hover"
                          )}
                        >
                          {theme.name.split(' ')[0]}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  <div className="space-y-6 pt-10 border-t border-white/5">
                    <label className="text-[10px] font-black text-text-secondary uppercase tracking-[0.2em] ml-2 opacity-60">Global Background</label>
                    <div className="flex flex-col sm:flex-row gap-4">
                      <input 
                        type="text" 
                        placeholder="Paste image/video URL..."
                        value={draftEnvironment.background.url || ''}
                        onChange={(e) => updateDraftBackground({ url: e.target.value, type: 'image' })}
                        className="flex-1 bg-surface-hover/50 border border-border rounded-2xl px-6 py-4 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 placeholder:opacity-30"
                      />
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                        className="hidden"
                        accept="image/*,video/*,image/gif"
                      />
                      <Button 
                        onClick={() => fileInputRef.current?.click()}
                        className="shrink-0"
                        title="Upload Local File"
                      >
                        <Upload className="w-5 h-5" />
                        Upload
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {['none', 'gradient', 'image', 'video'].map(type => (
                        <button
                          key={type}
                          onClick={() => updateDraftBackground({ type: type as any })}
                          className={clsx(
                            "px-5 py-2.5 rounded-xl border text-[9px] font-black uppercase tracking-widest transition-all",
                            draftEnvironment.background.type === type 
                              ? "bg-primary/20 border-primary text-primary shadow-sm" 
                              : "border-border/50 bg-surface/50 text-text-secondary hover:text-text hover:border-primary/30"
                          )}
                        >
                          {type}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8 pt-10 border-t border-white/5">
                    {[
                      { label: 'Opacity', value: draftEnvironment.background.opacity, min: 0, max: 1, step: 0.01, formatter: (v: number) => `${Math.round(v * 100)}%`, key: 'opacity' },
                      { label: 'Blur', value: draftEnvironment.background.blur, min: 0, max: 20, step: 1, formatter: (v: number) => `${v}px`, key: 'blur' },
                      { label: 'Brightness', value: draftEnvironment.background.brightness, min: 0, max: 2, step: 0.01, formatter: (v: number) => `${Math.round(v * 100)}%`, key: 'brightness' },
                    ].map(slider => (
                      <div key={slider.key} className="space-y-4">
                        <div className="flex justify-between text-[10px] font-black text-text-secondary uppercase tracking-widest px-1">
                          <span>{slider.label}</span>
                          <span className="text-text tabular-nums">{slider.formatter(slider.value)}</span>
                        </div>
                        <input 
                          type="range" min={slider.min} max={slider.max} step={slider.step} 
                          value={slider.value}
                          onChange={(e) => updateDraftBackground({ [slider.key]: parseFloat(e.target.value) })}
                          className="w-full h-1.5 bg-surface rounded-lg appearance-none cursor-pointer accent-primary"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Audio Section */}
              {customTab === 'audio' && (
                <AudioSettings />
              )}

              {/* Desktop Widgets Section */}
              {customTab === 'widgets-desktop' && (
                <WidgetSettings />
              )}

              {/* Effects Section */}
              {customTab === 'effects' && (
                <div className="grid grid-cols-1 gap-6 animate-in fade-in duration-300">
                  {draftEnvironment.effects.map(effect => (
                    <div key={effect.id} className={clsx(
                      "group p-6 rounded-[2rem] border transition-all",
                      effect.enabled 
                        ? "bg-primary/5 border-primary/30 shadow-[0_0_20px_rgba(var(--primary-rgb),0.05)]" 
                        : "bg-surface/50 border-border/50 opacity-80"
                    )}>
                      <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-5">
                          <div className={clsx(
                            "w-14 h-14 rounded-3xl flex items-center justify-center transition-all",
                            effect.enabled ? "bg-primary text-primary-fg shadow-xl shadow-primary/20" : "bg-surface-hover text-text-secondary"
                          )}>
                            <Sparkles className="w-7 h-7" />
                          </div>
                          <div>
                            <h4 className="text-base font-black text-text capitalize tracking-tight">{effect.id}</h4>
                            <p className="text-[10px] text-text-secondary uppercase font-black tracking-widest opacity-60 mt-0.5">Atmospheric Effect</p>
                          </div>
                        </div>
                        <button
                          onClick={() => toggleDraftEffect(effect.id as VisualEffectType)}
                          className={clsx(
                            "w-14 h-7 rounded-full transition-all relative",
                            effect.enabled ? "bg-primary" : "bg-surface-hover border border-border"
                          )}
                        >
                          <div className={clsx(
                            "absolute top-1 left-1 w-5 h-5 bg-white rounded-full transition-all shadow-md",
                            effect.enabled ? "translate-x-7" : "translate-x-0"
                          )} />
                        </button>
                      </div>
                      
                      {effect.enabled && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-10 px-2 animate-in slide-in-from-top-4 duration-300">
                          <div className="space-y-4">
                            <div className="flex justify-between text-[10px] font-black text-text-secondary uppercase tracking-widest">
                              <span>Intensity</span>
                              <span className="text-text tabular-nums">{Math.round(effect.intensity * 100)}%</span>
                            </div>
                            <input 
                              type="range" min="0" max="1" step="0.01" 
                              value={effect.intensity}
                              onChange={(e) => updateDraftEffect(effect.id as VisualEffectType, { intensity: parseFloat(e.target.value) })}
                              className="w-full h-1 bg-surface-hover rounded-lg appearance-none cursor-pointer accent-primary"
                            />
                          </div>
                          <div className="space-y-4">
                            <div className="flex justify-between text-[10px] font-black text-text-secondary uppercase tracking-widest">
                              <span>Speed</span>
                              <span className="text-text tabular-nums">{Math.round(effect.speed * 100)}%</span>
                            </div>
                            <input 
                              type="range" min="0" max="1" step="0.01" 
                              value={effect.speed}
                              onChange={(e) => updateDraftEffect(effect.id as VisualEffectType, { speed: parseFloat(e.target.value) })}
                              className="w-full h-1 bg-surface-hover rounded-lg appearance-none cursor-pointer accent-primary"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Overlays Section */}
              {customTab === 'overlays' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 animate-in fade-in duration-300">
                  {draftEnvironment.overlays.map(overlay => (
                    <button
                      key={overlay.type}
                      onClick={() => updateDraftOverlay(overlay.type, { enabled: !overlay.enabled })}
                      className={clsx(
                        "p-8 rounded-[2.5rem] border transition-all text-left flex flex-col gap-8 relative group",
                        overlay.enabled 
                          ? "border-primary bg-primary/5 ring-4 ring-primary/5 shadow-lg" 
                          : "border-border bg-surface/50 hover:border-primary/40 hover:bg-surface"
                      )}
                    >
                      <div className="flex justify-between items-center w-full">
                        <div className={clsx(
                          "w-16 h-16 rounded-[1.75rem] flex items-center justify-center transition-all",
                          overlay.enabled ? "bg-primary text-primary-fg shadow-xl shadow-primary/20" : "bg-surface-hover text-text-secondary"
                        )}>
                          <Layers className="w-8 h-8" />
                        </div>
                        {overlay.enabled && (
                          <div className="bg-primary/20 p-1.5 rounded-full">
                            <CheckCircle2 className="w-5 h-5 text-primary" />
                          </div>
                        )}
                      </div>
                      <div>
                        <span className="text-base font-black text-text capitalize tracking-tight">{overlay.type}</span>
                        <p className="text-[10px] text-text-secondary uppercase font-black tracking-widest opacity-60 mt-1">Visual Filter</p>
                      </div>
                      
                      {overlay.enabled && (
                         <div className="w-full space-y-4 pt-4 border-t border-primary/10" onClick={e => e.stopPropagation()}>
                            <div className="flex justify-between text-[10px] font-black text-text-secondary uppercase tracking-widest">
                              <span>Filter Intensity</span>
                              <span className="text-primary tabular-nums">{Math.round(overlay.intensity * 100)}%</span>
                            </div>
                            <input 
                              type="range" min="0" max="1" step="0.01" 
                              value={overlay.intensity}
                              onChange={(e) => updateDraftOverlay(overlay.type, { intensity: parseFloat(e.target.value) })}
                              className="w-full h-1 bg-surface-hover rounded-lg appearance-none cursor-pointer accent-primary"
                            />
                         </div>
                      )}
                    </button>
                  ))}
                </div>
              )}

              {/* Widgets Section */}
              {customTab === 'widgets' && (
                <div className="space-y-12 animate-in fade-in duration-300">
                  <div className="flex flex-wrap gap-2 p-1.5 bg-black/20 rounded-2xl border border-white/5 w-fit">
                    {(['countdown', 'timeline', 'planner', 'stats', 'ranking'] as const).map(w => (
                      <button
                        key={w}
                        onClick={() => setSelectedWidget(w)}
                        className={clsx(
                          "px-6 py-2.5 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all",
                          selectedWidget === w 
                            ? "bg-primary text-primary-fg shadow-lg shadow-primary/20" 
                            : "text-text-secondary hover:text-text hover:bg-white/5"
                        )}
                      >
                        {w}
                      </button>
                    ))}
                  </div>

                  <div className="bg-surface/30 rounded-[2rem] border border-border/50 p-8">
                    {selectedWidget === 'countdown' && (
                      <WidgetStyleEditor 
                        label="Countdown" 
                        style={draftEnvironment.countdownStyle} 
                        onUpdate={updateDraftCountdownStyle} 
                      />
                    )}

                    {selectedWidget === 'timeline' && (
                      <WidgetStyleEditor 
                        label="Timeline" 
                        style={draftEnvironment.timelineStyle} 
                        onUpdate={updateDraftTimelineStyle} 
                      />
                    )}

                    {selectedWidget === 'planner' && (
                      <WidgetStyleEditor 
                        label="Planner" 
                        style={draftEnvironment.plannerStyle} 
                        onUpdate={updateDraftPlannerStyle} 
                      />
                    )}

                    {selectedWidget === 'stats' && (
                      <WidgetStyleEditor 
                        label="Statistics" 
                        style={draftEnvironment.statsStyle} 
                        onUpdate={updateDraftStatsStyle} 
                      />
                    )}

                    {selectedWidget === 'ranking' && (
                      <WidgetStyleEditor 
                        label="Ranking" 
                        style={draftEnvironment.rankingStyle} 
                        onUpdate={updateDraftRankingStyle} 
                      />
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer Workflow Bar */}
      <div className="mt-12 pt-10 border-t border-border/50 flex flex-col xl:flex-row justify-between items-center gap-8">
        <div className="flex flex-wrap items-center justify-center xl:justify-start gap-6 w-full xl:w-auto">
          {hasUnsavedChanges ? (
            <div className="flex items-center gap-3 px-5 py-2.5 bg-amber-500/10 text-amber-500 rounded-2xl border border-amber-500/20 animate-pulse shrink-0">
              <AlertCircle className="w-4 h-4" />
              <span className="text-[10px] font-black uppercase tracking-[0.15em]">Unsaved Changes</span>
            </div>
          ) : (
            <div className="flex items-center gap-3 px-5 py-2.5 bg-emerald-500/10 text-emerald-500 rounded-2xl border border-emerald-500/20 shrink-0">
              <CheckCircle2 className="w-4 h-4" />
              <span className="text-[10px] font-black uppercase tracking-[0.15em]">Environment Synced</span>
            </div>
          )}
          
          {isEditing && (
            <div className="flex items-center gap-4 shrink-0">
               {isSaving ? (
                 <div className="flex items-center gap-3 animate-in slide-in-from-left-4 duration-300">
                    <input 
                      autoFocus
                      type="text" 
                      placeholder="Preset name..."
                      value={presetName}
                      onChange={e => setPresetName(e.target.value)}
                      className="bg-surface-hover/50 border border-border rounded-xl px-5 py-2.5 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 placeholder:opacity-30 w-32 sm:w-48"
                      onKeyDown={e => e.key === 'Enter' && handleSavePreset()}
                    />
                    <Button size="sm" onClick={handleSavePreset}>Save</Button>
                    <button onClick={() => setIsEditingName(false)} className="text-text-secondary text-[10px] font-black uppercase tracking-widest px-3 hover:text-text transition-colors">Cancel</button>
                 </div>
               ) : (
                <button 
                  onClick={() => setIsEditingName(true)}
                  className="flex items-center gap-3 text-text-secondary hover:text-primary transition-all text-[10px] font-black uppercase tracking-widest group"
                >
                  <div className="p-2 bg-surface-hover rounded-xl group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                    <Save className="w-4 h-4" />
                  </div>
                  Save as Preset
                </button>
               )}
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-center xl:justify-end gap-4 w-full xl:w-auto">
          {hasUnsavedChanges && (
            <button
              onClick={resetDraft}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest text-text-secondary hover:text-text hover:bg-white/5 transition-all border border-transparent hover:border-border/50 shrink-0"
            >
              Discard Changes
            </button>
          )}
          
          <button
            onClick={handleApply}
            disabled={!hasUnsavedChanges && !showApplyFeedback}
            className={clsx(
              "flex-1 sm:flex-initial flex items-center justify-center gap-4 px-10 py-5 rounded-[2rem] font-black text-xs uppercase tracking-[0.2em] transition-all relative overflow-hidden group active:scale-95 shrink-0",
              showApplyFeedback 
                ? "bg-emerald-500 text-white shadow-xl shadow-emerald-500/30" 
                : hasUnsavedChanges
                  ? "bg-primary text-primary-fg shadow-2xl shadow-primary/40 hover:scale-[1.02] hover:-translate-y-0.5"
                  : "bg-surface-hover/50 text-text-secondary cursor-not-allowed opacity-50 border border-border/50"
            )}
          >
            {showApplyFeedback ? (
              <>
                <CheckCircle2 className="w-5 h-5 animate-in zoom-in duration-300" />
                System Updated
              </>
            ) : (
              <>
                Deploy Environment
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
