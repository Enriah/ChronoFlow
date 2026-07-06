import { useState, type FormEvent } from 'react';
import { X } from 'lucide-react';
import type { FlowStep } from '../../models/FlowStep';
import type { LinkedAction } from '../../models/LinkedAction';
import { Button } from '../../components/ui/Button';
import { FlowBuilder } from './FlowBuilder';

export type EditorValue = {
  title: string; description?: string; project?: string; tags: string[];
  durationMinutes: number; actions: string[]; flowSteps: FlowStep[]; notes?: string;
};

export function SessionEditor({ title, initial, actions, notesLabel = 'Notes template', onClose, onSave }: {
  title: string; initial?: Partial<EditorValue>; actions: LinkedAction[]; notesLabel?: string;
  onClose: () => void; onSave: (value: EditorValue) => void;
}) {
  const [value, setValue] = useState<EditorValue>({ title: initial?.title || '', description: initial?.description || '', project: initial?.project || '', tags: initial?.tags || [], durationMinutes: initial?.durationMinutes || 60, actions: initial?.actions || [], flowSteps: initial?.flowSteps || [], notes: initial?.notes || '' });
  const submit = (event: FormEvent) => { event.preventDefault(); if (value.title.trim()) onSave({ ...value, title: value.title.trim() }); };
  return <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4"><form onSubmit={submit} className="session-editor flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-2xl">
    <div className="flex shrink-0 items-center justify-between border-b border-border p-5"><h2 className="text-xl font-black">{title}</h2><button type="button" onClick={onClose}><X className="h-5 w-5" /></button></div>
    <div className="overflow-y-auto p-5"><div className="grid gap-4 md:grid-cols-2">
      <label className="md:col-span-2"><span className="text-xs font-bold">Title</span><input autoFocus required value={value.title} onChange={(event) => setValue({ ...value, title: event.target.value })} className="mt-1 w-full rounded-lg p-3" /></label>
      <label><span className="text-xs font-bold">Project</span><input value={value.project} onChange={(event) => setValue({ ...value, project: event.target.value })} className="mt-1 w-full rounded-lg p-3" /></label>
      <label><span className="text-xs font-bold">Duration (minutes)</span><input type="number" min="1" value={value.durationMinutes} onChange={(event) => setValue({ ...value, durationMinutes: Number(event.target.value) })} className="mt-1 w-full rounded-lg p-3" /></label>
      <label className="md:col-span-2"><span className="text-xs font-bold">Tags</span><input value={value.tags.join(', ')} onChange={(event) => setValue({ ...value, tags: event.target.value.split(',').map((tag) => tag.trim()).filter(Boolean) })} className="mt-1 w-full rounded-lg p-3" placeholder="backend, debugging" /></label>
      <label className="md:col-span-2"><span className="text-xs font-bold">Description</span><textarea value={value.description} onChange={(event) => setValue({ ...value, description: event.target.value })} className="mt-1 min-h-20 w-full rounded-lg p-3" /></label>
    </div>
    <div className="mt-5"><h4 className="mb-2 text-sm font-black">Session actions</h4><div className="flex flex-wrap gap-2">{actions.filter((action) => action.enabled).map((action) => { const selected = value.actions.includes(action.id); return <button type="button" key={action.id} onClick={() => setValue({ ...value, actions: selected ? value.actions.filter((id) => id !== action.id) : [...value.actions, action.id] })} className={`rounded-lg border px-3 py-2 text-sm ${selected ? 'border-primary bg-primary/10 text-primary' : 'border-border'}`}>{action.label}</button>; })}</div></div>
    <div className="mt-6"><FlowBuilder steps={value.flowSteps} actions={actions} onChange={(flowSteps) => setValue({ ...value, flowSteps })} /></div>
    <label className="mt-6 block"><span className="text-xs font-bold">{notesLabel}</span><textarea value={value.notes} onChange={(event) => setValue({ ...value, notes: event.target.value })} className="mt-1 min-h-28 w-full rounded-lg p-3 font-mono text-sm" /></label></div>
    <div className="flex shrink-0 justify-end gap-2 border-t border-border bg-surface p-4"><Button type="button" variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit">Save</Button></div>
  </form></div>;
}
