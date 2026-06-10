import React, { useRef, useState } from 'react';
import { Download, Upload, ShieldCheck, Database, FileJson, AlertTriangle } from 'lucide-react';
import { Button } from './ui/Button';
import { PresetService } from '../services/persistence/PresetService';
import { clsx } from 'clsx';

export function DataSettings() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importStatus, setImportStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleExport = () => {
    PresetService.exportPreset();
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportStatus('loading');
    try {
      await PresetService.importPreset(file);
      setImportStatus('success');
      setTimeout(() => setImportStatus('idle'), 3000);
    } catch (err: any) {
      setImportStatus('error');
      setErrorMessage(err.message || 'Failed to import preset');
      setTimeout(() => setImportStatus('idle'), 5000);
    }
    
    // Clear input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="space-y-12 animate-in fade-in duration-300">
      <div className="space-y-4">
        <h3 className="text-xl font-black text-text tracking-tight flex items-center gap-3">
          <Database className="w-6 h-6 text-primary" />
          Data Portability
        </h3>
        <p className="text-text-secondary text-sm font-medium opacity-70">
          Export your entire configuration as a JSON file to backup or transfer to another device.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Export Card */}
        <div className="bg-surface/50 border border-border p-8 rounded-[2rem] space-y-6 hover:border-primary/30 transition-colors group">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
            <Download className="w-7 h-7" />
          </div>
          <div className="space-y-2">
            <h4 className="text-base font-black text-text uppercase tracking-widest">Export Backup</h4>
            <p className="text-xs text-text-secondary leading-relaxed">
              Includes themes, custom presets, audio settings, planner tasks, and schedules.
            </p>
          </div>
          <Button 
            onClick={handleExport}
            className="w-full justify-center py-4"
          >
            <FileJson className="w-4 h-4" />
            Save Preset File
          </Button>
        </div>

        {/* Import Card */}
        <div className="bg-surface/50 border border-border p-8 rounded-[2rem] space-y-6 hover:border-primary/30 transition-colors group">
          <div className="w-14 h-14 rounded-2xl bg-accent/10 flex items-center justify-center text-accent group-hover:scale-110 transition-transform">
            <Upload className="w-7 h-7" />
          </div>
          <div className="space-y-2">
            <h4 className="text-base font-black text-text uppercase tracking-widest">Import Backup</h4>
            <p className="text-xs text-text-secondary leading-relaxed">
              Restore your data from a previously exported JSON file. <span className="text-amber-500 font-bold">This will overwrite current data.</span>
            </p>
          </div>
          
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleImport} 
            accept=".json" 
            className="hidden" 
          />
          
          <Button 
            variant="secondary"
            onClick={() => fileInputRef.current?.click()}
            className={clsx(
              "w-full justify-center py-4",
              importStatus === 'loading' && "opacity-50 pointer-events-none"
            )}
            isLoading={importStatus === 'loading'}
          >
            <Upload className="w-4 h-4" />
            Load Preset File
          </Button>

          {importStatus === 'success' && (
            <div className="flex items-center gap-2 text-emerald-500 text-[10px] font-black uppercase tracking-widest justify-center animate-in zoom-in duration-300">
              <ShieldCheck className="w-4 h-4" />
              Import Successful
            </div>
          )}

          {importStatus === 'error' && (
            <div className="flex items-center gap-2 text-red-500 text-[10px] font-black uppercase tracking-widest justify-center animate-in shake duration-300">
              <AlertTriangle className="w-4 h-4" />
              {errorMessage}
            </div>
          )}
        </div>
      </div>

      <div className="p-6 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex gap-4 items-start">
        <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <h5 className="text-xs font-black text-amber-500 uppercase tracking-widest">A Note on Custom Assets</h5>
          <p className="text-[10px] text-text-secondary font-medium leading-relaxed opacity-80">
            Exported presets contain references to custom background images and sound files. If you import a preset on a different machine, make sure to manually move those files if they aren't accessible via URL.
          </p>
        </div>
      </div>
    </div>
  );
}
