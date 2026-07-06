import { useState } from 'react';
import { ExternalLink, Pencil, Plus, Save, Trash2, X } from 'lucide-react';
import type { LinkedAction, LinkedActionType } from '../../models/LinkedAction';
import { LauncherService } from '../../services/actions/LauncherService';
import { getDangerLevel, useDeveloperActionStore } from './useDeveloperActionStore';
import { Button } from '../../components/ui/Button';
import { ToggleSwitch } from '../../components/ui/ToggleSwitch';

const types: LinkedActionType[] = ['app', 'url', 'folder', 'file', 'command'];
const blank = (): LinkedAction => { const now = new Date().toISOString(); return { id: crypto.randomUUID(), type: 'app', label: '', value: '', enabled: true, requiresConfirmation: true, dangerLevel: 'safe', createdAt: now, updatedAt: now }; };

export function ActionRegistry() {
  const { actions, save, toggle, remove } = useDeveloperActionStore();
  const [draft, setDraft] = useState<LinkedAction | null>(null);
  const [message, setMessage] = useState('');
  const editing = !!draft && actions.some((action) => action.id === draft.id);
  const updateValue = (value: string) => setDraft((current) => current ? { ...current, value, dangerLevel: current.type === 'command' ? getDangerLevel(value) : 'safe' } : current);
  const test = async (action: LinkedAction) => { const result = await LauncherService.execute(action); setMessage(result.success ? `${action.label} launched.` : (result.message || 'Action failed.')); };
  const saveDraft = () => {
    if (!draft?.label.trim() || !draft.value.trim()) { setMessage('Label and path or URL are required.'); return; }
    save({ ...draft, label: draft.label.trim(), value: draft.value.trim() }); setDraft(null); setMessage('Action saved.');
  };

  return <div className="space-y-5">
    <header className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-black">Developer Actions</h3><p className="mt-1 text-xs text-text-secondary">Apps, URLs, files, folders and commands available to Sessions and Event Timeline.</p></div><Button size="sm" variant="secondary" onClick={() => { setDraft(blank()); setMessage(''); }}><Plus className="h-4 w-4" /> Add action</Button></header>

    {draft && <section className="overflow-hidden rounded-xl border border-primary/30 bg-primary/5">
      <div className="flex items-center justify-between border-b border-border/60 px-5 py-4"><div><p className="text-[10px] font-black uppercase tracking-wider text-primary">Action Registry</p><h4 className="mt-1 font-black">{editing ? `Edit ${draft.label || 'action'}` : 'New action'}</h4></div><button type="button" onClick={() => setDraft(null)} className="rounded-lg p-2 text-text-secondary hover:bg-surface-hover hover:text-text"><X className="h-4 w-4" /></button></div>
      <div className="grid gap-4 p-5 md:grid-cols-2">
        <label><span className="text-xs font-bold">Label</span><input autoFocus value={draft.label} onChange={(event) => setDraft({ ...draft, label: event.target.value })} className="mt-1.5 w-full rounded-lg border border-border p-3" placeholder="Chrome" /></label>
        <label><span className="text-xs font-bold">Type</span><select value={draft.type} onChange={(event) => { const type = event.target.value as LinkedActionType; setDraft({ ...draft, type, requiresConfirmation: type === 'command' ? true : draft.requiresConfirmation, dangerLevel: type === 'command' ? getDangerLevel(draft.value) : 'safe' }); }} className="mt-1.5 w-full rounded-lg border border-border p-3">{types.map((type) => <option key={type}>{type}</option>)}</select></label>
        <label className="md:col-span-2"><span className="text-xs font-bold">{draft.type === 'command' ? 'Registered command' : draft.type === 'url' ? 'URL' : 'Path'}</span><input value={draft.value} onChange={(event) => updateValue(event.target.value)} className="mt-1.5 w-full rounded-lg border border-border p-3 font-mono text-sm" placeholder={draft.type === 'url' ? 'https://…' : draft.type === 'command' ? 'pnpm dev' : String.raw`C:\Program Files\…`} /></label>
        {draft.type === 'command' && <label className="md:col-span-2"><span className="text-xs font-bold">Working directory</span><input value={draft.workingDirectory || ''} onChange={(event) => setDraft({ ...draft, workingDirectory: event.target.value })} className="mt-1.5 w-full rounded-lg border border-border p-3 font-mono text-sm" placeholder={String.raw`C:\path\to\project`} /></label>}
        <div className="md:col-span-2"><p className="mb-2 text-xs font-black uppercase tracking-wider text-text-secondary">Behavior</p><div className="grid gap-3 sm:grid-cols-2"><ToggleSwitch checked={draft.enabled} onCheckedChange={(enabled) => setDraft({ ...draft, enabled })} label="Enabled" description="Available to Event Timeline and Sessions." className="rounded-lg border border-border bg-surface-hover/20 p-3" /><ToggleSwitch checked={draft.requiresConfirmation} disabled={draft.type === 'command'} onCheckedChange={(requiresConfirmation) => setDraft({ ...draft, requiresConfirmation })} label="Confirm before launch" description={draft.type === 'command' ? 'Commands always require confirmation.' : 'Ask before this action is opened.'} className="rounded-lg border border-border bg-surface-hover/20 p-3" /></div></div>
        {draft.type === 'command' && <div className={`md:col-span-2 rounded-lg border p-3 text-sm ${draft.dangerLevel === 'dangerous' ? 'border-red-500/40 text-red-500' : draft.dangerLevel === 'medium' ? 'border-amber-500/40 text-amber-500' : 'border-border text-text-secondary'}`}>Risk: {draft.dangerLevel}. Dangerous commands are blocked.</div>}
      </div>
      <footer className="flex justify-end gap-2 border-t border-border/60 px-5 py-4"><Button size="sm" variant="secondary" onClick={() => setDraft(null)}>Cancel</Button><Button size="sm" onClick={saveDraft}><Save className="h-4 w-4" /> Save action</Button></footer>
    </section>}

    <div className="space-y-2">{actions.map((action) => <div key={action.id} className={`grid gap-3 rounded-xl border border-border p-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center ${action.enabled ? 'bg-surface-hover/30' : 'opacity-55'}`}>
      <div className="min-w-0"><div className="flex items-center gap-2"><strong className="truncate">{action.label}</strong><span className="rounded bg-surface-hover px-2 py-0.5 text-[10px] uppercase">{action.type}</span>{action.dangerLevel && action.dangerLevel !== 'safe' && <span className="text-[10px] uppercase text-amber-500">{action.dangerLevel}</span>}</div><p className="mt-1 truncate font-mono text-xs text-text-secondary">{action.value}</p></div>
      <div className="flex items-center gap-2"><ToggleSwitch checked={action.enabled} onCheckedChange={() => toggle(action.id)} /><Button size="icon" variant="ghost" title="Edit action" onClick={() => { setDraft(action); setMessage(''); }}><Pencil className="h-4 w-4" /></Button><Button size="icon" variant="secondary" title="Test action" onClick={() => test(action)}><ExternalLink className="h-4 w-4" /></Button><Button size="icon" variant="danger" title="Delete action" onClick={() => remove(action.id)}><Trash2 className="h-4 w-4" /></Button></div>
    </div>)}{!actions.length && <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-text-secondary">No registered actions.</div>}</div>
    {message && <p className="text-sm text-text-secondary">{message}</p>}
  </div>;
}
