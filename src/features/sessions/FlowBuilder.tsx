import { ChevronDown, ChevronUp, Plus, Trash2 } from 'lucide-react';
import type { FlowStep } from '../../models/FlowStep';
import type { LinkedAction } from '../../models/LinkedAction';
import { Button } from '../../components/ui/Button';

export function createEmptyStep(): FlowStep {
  return { id: crypto.randomUUID(), title: '', plannedDurationMinutes: 15, checklist: [], actions: [], status: 'pending' };
}

export function FlowBuilder({ steps, actions, onChange }: { steps: FlowStep[]; actions: LinkedAction[]; onChange: (steps: FlowStep[]) => void }) {
  const update = (id: string, patch: Partial<FlowStep>) => onChange(steps.map((step) => step.id === id ? { ...step, ...patch } : step));
  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction; if (target < 0 || target >= steps.length) return;
    const next = [...steps]; [next[index], next[target]] = [next[target], next[index]]; onChange(next);
  };
  return <div className="space-y-3">
    <div className="flex items-center justify-between"><h4 className="text-sm font-black">Flow</h4><Button type="button" variant="secondary" size="sm" onClick={() => onChange([...steps, createEmptyStep()])}><Plus className="h-4 w-4" /> Step</Button></div>
    {steps.map((step, index) => <div key={step.id} className="rounded-xl border border-border bg-surface-hover/30 p-4">
      <div className="grid grid-cols-[auto_1fr_90px_auto] gap-2">
        <div className="flex flex-col"><button type="button" onClick={() => move(index, -1)}><ChevronUp className="h-4 w-4" /></button><button type="button" onClick={() => move(index, 1)}><ChevronDown className="h-4 w-4" /></button></div>
        <input required placeholder={`Step ${index + 1}`} value={step.title} onChange={(event) => update(step.id, { title: event.target.value })} className="rounded-lg px-3 py-2" />
        <input type="number" min="1" value={step.plannedDurationMinutes || ''} onChange={(event) => update(step.id, { plannedDurationMinutes: Number(event.target.value) || undefined })} className="rounded-lg px-3 py-2" title="Minutes" />
        <button type="button" onClick={() => onChange(steps.filter((item) => item.id !== step.id))}><Trash2 className="h-4 w-4 text-red-500" /></button>
      </div>
      <textarea placeholder="Description" value={step.description || ''} onChange={(event) => update(step.id, { description: event.target.value })} className="mt-2 min-h-16 w-full rounded-lg p-3 text-sm" />
      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        <div><div className="mb-2 flex items-center justify-between text-xs font-bold"><span>Checklist</span><button type="button" className="text-primary" onClick={() => update(step.id, { checklist: [...(step.checklist || []), { id: crypto.randomUUID(), text: '', done: false }] })}>+ item</button></div>
          <div className="space-y-2">{step.checklist?.map((item) => <div key={item.id} className="flex gap-2"><input placeholder="Checklist item" value={item.text} onChange={(event) => update(step.id, { checklist: step.checklist?.map((entry) => entry.id === item.id ? { ...entry, text: event.target.value } : entry) })} className="min-w-0 flex-1 rounded-lg px-3 py-2 text-sm" /><button type="button" onClick={() => update(step.id, { checklist: step.checklist?.filter((entry) => entry.id !== item.id) })}><Trash2 className="h-3.5 w-3.5" /></button></div>)}</div>
        </div>
        <div><div className="mb-2 text-xs font-bold">Step actions</div><div className="flex flex-wrap gap-2">{actions.filter((action) => action.enabled).map((action) => { const selected = step.actions?.includes(action.id); return <button type="button" key={action.id} onClick={() => update(step.id, { actions: selected ? step.actions?.filter((id) => id !== action.id) : [...(step.actions || []), action.id] })} className={`rounded-lg border px-2 py-1 text-xs ${selected ? 'border-primary bg-primary/10 text-primary' : 'border-border'}`}>{action.label}</button>; })}</div></div>
      </div>
    </div>)}
    {!steps.length && <p className="text-sm text-text-secondary">No flow steps</p>}
  </div>;
}
