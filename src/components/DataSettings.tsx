import { useRef, useState, type ChangeEvent } from 'react';
import { Download, Upload } from 'lucide-react';
import { Button } from './ui/Button';
import { PresetService } from '../services/persistence/PresetService';

export function DataSettings() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  const handleImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setStatus('loading');
    try {
      await PresetService.importPreset(file);
      setStatus('success');
    } catch {
      setStatus('error');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return <div>
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <Button onClick={() => PresetService.exportPreset()} className="justify-center"><Download className="h-4 w-4" /> Export backup</Button>
      <Button variant="secondary" onClick={() => fileInputRef.current?.click()} isLoading={status === 'loading'} className="justify-center"><Upload className="h-4 w-4" /> Import backup</Button>
      <input ref={fileInputRef} type="file" accept=".json" onChange={handleImport} className="hidden" />
    </div>
    {status === 'success' && <p className="mt-3 text-sm font-bold text-emerald-500">Import complete</p>}
    {status === 'error' && <p className="mt-3 text-sm font-bold text-red-500">Import failed</p>}
    <p className="mt-3 text-xs text-amber-500">Import replaces current local settings and schedules.</p>
  </div>;
}
