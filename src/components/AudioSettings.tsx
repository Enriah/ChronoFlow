import React, { useRef, useState } from 'react';
import { 
  Volume2, VolumeX, Play, Music, Trash2, 
  Upload, AlertCircle,
  Bell, Clock, CheckCircle, ArrowRight, AlertTriangle
} from 'lucide-react';
import { clsx } from 'clsx';
import { useAudioStore } from '../store/useAudioStore';
import type { AudioEventType } from '../systems/audio/audio.types';
import { Button } from './ui/Button';

const EVENT_LABELS: Record<AudioEventType, { label: string, icon: any, description: string }> = {
  taskStarted: { 
    label: 'Task Started', 
    icon: Play, 
    description: 'Played when a new focus session begins.' 
  },
  taskEndingSoon: { 
    label: '5 Minute Warning', 
    icon: Clock, 
    description: 'Subtle alert when task is nearing completion.' 
  },
  taskCompleted: { 
    label: 'Task Completed', 
    icon: CheckCircle, 
    description: 'Played when a focus session ends successfully.' 
  },
  nextTaskStarting: { 
    label: 'Next Task Starting', 
    icon: ArrowRight, 
    description: 'Alert for the immediate transition to a new task.' 
  },
  plannerReminder: { 
    label: 'Planner Reminder', 
    icon: Bell, 
    description: 'Notification for scheduled planning sessions.' 
  },
  warningNotification: { 
    label: 'System Warning', 
    icon: AlertTriangle, 
    description: 'Important alerts or system notifications.' 
  },
};

export function AudioSettings() {
  const {
    sounds,
    assignments,
    globalVolume,
    eventSettings,
    importSoundFile,
    deleteCustomSound,
    assignSound,
    updateEventVolume,
    toggleEvent,
    setGlobalVolume,
    previewSound
  } = useAudioStore();

  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setError(null);

    try {
      await importSoundFile(file);
    } catch (err: any) {
      setError(err.message || 'Failed to import audio file.');
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-12 animate-in fade-in duration-500 pb-8">
      {/* Global Controls */}
      <div className="bg-surface/40 p-8 rounded-[2rem] border border-border/50">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
              <Volume2 className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-black text-text tracking-tight uppercase">Master Volume</h4>
              <p className="text-[10px] text-text-secondary font-black tracking-widest opacity-60">Global Audio Intensity</p>
            </div>
          </div>
          
          <div className="flex-1 max-w-md w-full flex items-center gap-4">
            <VolumeX className="w-4 h-4 text-text-secondary" />
            <input 
              type="range" min="0" max="1" step="0.01" 
              value={globalVolume}
              onChange={(e) => setGlobalVolume(parseFloat(e.target.value))}
              className="flex-1 h-1.5 bg-surface rounded-lg appearance-none cursor-pointer accent-primary"
            />
            <Volume2 className="w-4 h-4 text-text" />
            <span className="text-sm font-black text-text w-12 text-right tabular-nums">{Math.round(globalVolume * 100)}%</span>
          </div>
        </div>
      </div>

      {/* Event Assignments */}
      <div className="space-y-6">
        <label className="text-[10px] font-black text-text-secondary uppercase tracking-[0.2em] ml-2 opacity-60">Notification Events</label>
        <div className="flex flex-col gap-4">
          {Object.entries(EVENT_LABELS).map(([key, info]) => {
            const eventType = key as AudioEventType;
            const setting = eventSettings[eventType];
            const assignedSoundId = assignments[eventType];

            return (
              <div key={eventType} className={clsx(
                "group p-6 rounded-[2.5rem] border transition-all",
                setting.enabled ? "bg-surface border-border/50" : "bg-surface/20 border-border/20 opacity-60"
              )}>
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-center">
                  {/* Left: Icon & Info */}
                  <div className="xl:col-span-5 flex items-center gap-5 min-w-0">
                    <div className={clsx(
                      "w-14 h-14 rounded-3xl flex items-center justify-center transition-all shrink-0",
                      setting.enabled ? "bg-primary text-primary-fg shadow-lg shadow-primary/20" : "bg-surface-hover text-text-secondary"
                    )}>
                      <info.icon className="w-6 h-6" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <h4 className="text-sm font-black text-text tracking-tight uppercase truncate">{info.label}</h4>
                        {!setting.enabled && <span className="text-[8px] bg-surface-hover px-2 py-0.5 rounded-full text-text-secondary font-black uppercase tracking-tighter shrink-0 border border-border/10">Muted</span>}
                      </div>
                      <p className="text-[10px] text-text-secondary font-medium leading-relaxed opacity-70 line-clamp-2">{info.description}</p>
                    </div>
                  </div>

                  {/* Right: Controls */}
                  <div className="xl:col-span-7 flex flex-wrap lg:flex-nowrap items-center gap-6">
                    {/* Sound Selector */}
                    <div className="relative flex-1 min-w-[200px]">
                      <select
                        value={assignedSoundId}
                        onChange={(e) => assignSound(eventType, e.target.value)}
                        disabled={!setting.enabled}
                        className="bg-surface-hover border border-border rounded-2xl px-5 py-3 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 w-full appearance-none cursor-pointer pr-10 hover:border-primary/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {sounds.map(sound => (
                          <option key={sound.id} value={sound.id}>{sound.name}</option>
                        ))}
                      </select>
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-text-secondary opacity-50">
                        <ArrowRight className="w-3 h-3 rotate-90" />
                      </div>
                    </div>

                    {/* Volume Slider */}
                    <div className="flex items-center gap-3 w-full lg:w-44 shrink-0">
                      <VolumeX className="w-3.5 h-3.5 text-text-secondary opacity-50" />
                      <input 
                        type="range" min="0" max="1" step="0.01" 
                        value={setting.volume}
                        disabled={!setting.enabled}
                        onChange={(e) => updateEventVolume(eventType, parseFloat(e.target.value))}
                        className="flex-1 h-1.5 bg-surface-hover rounded-lg appearance-none cursor-pointer accent-primary"
                      />
                      <span className="text-[10px] font-black text-text-secondary w-10 text-right tabular-nums">{Math.round(setting.volume * 100)}%</span>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-3 shrink-0">
                      <Button
                        variant="secondary"
                        size="icon"
                        onClick={() => previewSound(assignedSoundId, eventType)}
                        disabled={!setting.enabled}
                        className="w-10 h-10"
                        title="Preview Sound"
                      >
                        <Play className="w-4 h-4" />
                      </Button>
                      <button
                        onClick={() => toggleEvent(eventType, !setting.enabled)}
                        className={clsx(
                          "w-12 h-6 rounded-full transition-all relative shrink-0",
                          setting.enabled ? "bg-primary" : "bg-surface-hover border border-border"
                        )}
                      >
                        <div className={clsx(
                          "absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-all shadow-sm",
                          setting.enabled ? "translate-x-6" : "translate-x-0"
                        )} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Custom Audio Assets */}
      <div className="space-y-8 pt-10 border-t border-border/50">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 px-2">
          <div>
            <h4 className="text-xs font-black text-text uppercase tracking-widest">Custom Sound Bank</h4>
            <p className="text-[10px] text-text-secondary font-medium mt-1">Manage your imported audio files.</p>
          </div>
          
          <div className="w-full sm:w-auto">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              className="hidden"
              accept="audio/mp3,audio/wav,audio/ogg,audio/mpeg"
            />
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={isImporting}
              isLoading={isImporting}
              className="w-full sm:w-auto"
              size="sm"
            >
              <Upload className="w-4 h-4" />
              {isImporting ? 'Importing...' : 'Import Sound'}
            </Button>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-3 p-5 bg-rose-500/10 text-rose-500 rounded-[1.5rem] border border-rose-500/20 text-xs font-bold animate-in slide-in-from-top-2">
            <AlertCircle className="w-5 h-5 shrink-0" />
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sounds.filter(s => !s.isDefault).length === 0 ? (
            <div className="md:col-span-2 py-16 border-2 border-dashed border-border/30 rounded-[2.5rem] flex flex-col items-center justify-center text-text-secondary bg-surface/10">
              <Music className="w-12 h-12 mb-4 opacity-10" />
              <p className="text-xs font-black opacity-30 uppercase tracking-[0.2em]">No custom sounds yet</p>
            </div>
          ) : (
            sounds.filter(s => !s.isDefault).map(sound => (
              <div key={sound.id} className="group p-5 bg-surface/30 border border-border/50 rounded-[1.5rem] hover:border-primary/40 hover:bg-surface/50 transition-all flex items-center justify-between">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-10 h-10 rounded-2xl bg-surface-hover flex items-center justify-center text-text-secondary group-hover:text-primary transition-colors shrink-0">
                    <Music className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <h5 className="text-xs font-black text-text truncate uppercase tracking-tight">{sound.name}</h5>
                    <p className="text-[8px] text-text-secondary font-black uppercase opacity-60 mt-0.5">Custom Asset</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-9 h-9"
                    onClick={() => previewSound(sound.id)}
                  >
                    <Play className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="danger"
                    size="icon"
                    className="w-9 h-9"
                    onClick={() => deleteCustomSound(sound.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
