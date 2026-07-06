import { useEffect, useLayoutEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { Bell, CheckSquare, ChevronDown, ChevronUp, Copy, Eye, EyeOff, Layers3, Lock, LockOpen, Plus, Trash2, Volume2, VolumeX, X } from 'lucide-react';
import type { TimelineEvent, TimelineEventType, TimelineTrack } from '../../models/EventTimeline';
import { useDeveloperActionStore } from '../developer-actions/useDeveloperActionStore';
import { Button } from '../../components/ui/Button';
import { ToggleSwitch } from '../../components/ui/ToggleSwitch';

const colors: Record<TimelineEventType, string> = {
  reminder: 'bg-sky-500/25 border-sky-400 text-sky-100', action: 'bg-violet-500/25 border-violet-400 text-violet-100',
  checklist: 'bg-emerald-500/25 border-emerald-400 text-emerald-100', note: 'bg-amber-500/25 border-amber-400 text-amber-100',
  alert: 'bg-red-500/25 border-red-400 text-red-100', flow_step: 'bg-cyan-500/25 border-cyan-400 text-cyan-100',
};
const eventTypes: TimelineEventType[] = ['reminder', 'action', 'checklist', 'note', 'alert', 'flow_step'];
const nowIso = () => new Date().toISOString();
const snapValue = (value: number, snap: number) => Math.max(0, Math.round(value / snap) * snap);
const clockAt = (startTime: string | undefined, offset: number) => {
  if (!startTime) return `${offset}m`;
  const [hours, minutes] = startTime.split(':').map(Number); const total = hours * 60 + minutes + offset;
  return `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
};

export function EventTimelineEditor({ durationMinutes, startTime, tracks, events, onChange }: {
  durationMinutes: number; startTime?: string; tracks: TimelineTrack[]; events: TimelineEvent[];
  onChange: (value: { tracks: TimelineTrack[]; events: TimelineEvent[] }) => void;
}) {
  const actions = useDeveloperActionStore((state) => state.actions);
  const [snap, setSnap] = useState(5); const [zoom, setZoom] = useState(1); const [selectedId, setSelectedId] = useState<string>();
  const [editing, setEditing] = useState<TimelineEvent | null>(null);
  const timelineViewportRef = useRef<HTMLDivElement>(null); const [timelineWidth, setTimelineWidth] = useState(0);
  const safeDuration = Math.max(5, durationMinutes); const availableCanvasWidth = Math.max(560, timelineWidth - 176);
  const pixelsPerMinute = Math.max(7, availableCanvasWidth / safeDuration) * zoom;
  const canvasWidth = Math.max(availableCanvasWidth, safeDuration * pixelsPerMinute);
  const orderedTracks = useMemo(() => [...tracks].sort((a, b) => a.order - b.order), [tracks]);
  const selected = events.find((event) => event.id === selectedId);

  useLayoutEffect(() => {
    const element = timelineViewportRef.current; if (!element) return;
    const updateWidth = () => setTimelineWidth(element.clientWidth);
    updateWidth(); const observer = new ResizeObserver(updateWidth); observer.observe(element);
    return () => observer.disconnect();
  }, [tracks.length]);

  const updateTracks = (next: TimelineTrack[]) => onChange({ tracks: next, events });
  const updateEvents = (next: TimelineEvent[]) => onChange({ tracks, events: next });
  const addTrack = () => { const stamp = nowIso(); updateTracks([...tracks, { id: crypto.randomUUID(), name: `Layer ${tracks.length + 1}`, type: 'custom', visible: true, locked: false, muted: false, order: tracks.length, createdAt: stamp, updatedAt: stamp }]); };
  const patchTrack = (id: string, updates: Partial<TimelineTrack>) => updateTracks(tracks.map((track) => track.id === id ? { ...track, ...updates, updatedAt: nowIso() } : track));
  const removeTrack = (id: string) => { if (!window.confirm('Delete this track and its events?')) return; onChange({ tracks: tracks.filter((track) => track.id !== id), events: events.filter((event) => event.trackId !== id) }); };
  const moveTrack = (id: string, direction: -1 | 1) => { const list = [...orderedTracks]; const index = list.findIndex((track) => track.id === id); const target = index + direction; if (index < 0 || target < 0 || target >= list.length) return; [list[index], list[target]] = [list[target], list[index]]; updateTracks(list.map((track, order) => ({ ...track, order, updatedAt: nowIso() }))); };
  const newEvent = (trackId = orderedTracks[0]?.id, offsetMinutes = 0) => {
    if (!trackId) return addTrack(); const stamp = nowIso();
    setEditing({ id: crypto.randomUUID(), trackId, title: '', type: 'reminder', offsetMinutes: snapValue(offsetMinutes, snap), durationMinutes: 5, actions: [], checklist: [], triggerBehavior: { showPopup: true, autoDismiss: false, autoDismissAfterSeconds: 30, requireUserAction: false, launchActionsOnStart: false, closeManagedActionsOnEnd: false, closeMode: 'soft', markCompletedOnEnd: true }, lifecycle: {}, status: 'pending', createdAt: stamp, updatedAt: stamp });
  };
  const saveEvent = (event: TimelineEvent) => { const normalized = { ...event, title: event.title.trim() || 'Untitled event', offsetMinutes: Math.min(durationMinutes, Math.max(0, event.offsetMinutes)), triggerBehavior: { ...event.triggerBehavior, launchActionsOnStart: event.type === 'action' ? true : event.triggerBehavior.launchActionsOnStart }, updatedAt: nowIso() }; updateEvents(events.some((item) => item.id === event.id) ? events.map((item) => item.id === event.id ? normalized : item) : [...events, normalized]); setSelectedId(normalized.id); setEditing(null); };
  const deleteSelected = () => { if (!selectedId) return; updateEvents(events.filter((event) => event.id !== selectedId)); setSelectedId(undefined); setEditing(null); };
  const duplicateSelected = () => { if (!selected) return; const copy = { ...selected, id: crypto.randomUUID(), title: `${selected.title} copy`, offsetMinutes: Math.min(durationMinutes, selected.offsetMinutes + snap), lifecycle: {}, status: 'pending' as const, createdAt: nowIso(), updatedAt: nowIso() }; updateEvents([...events, copy]); setSelectedId(copy.id); };

  useEffect(() => {
    const keyboard = (event: KeyboardEvent) => {
      if (!selected || editing || ['INPUT', 'TEXTAREA', 'SELECT'].includes((event.target as HTMLElement)?.tagName)) return;
      if (event.key === 'Delete') { event.preventDefault(); deleteSelected(); }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'd') { event.preventDefault(); duplicateSelected(); }
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); const amount = (event.shiftKey ? snap * 3 : snap) * (event.key === 'ArrowLeft' ? -1 : 1); updateEvents(events.map((item) => item.id === selected.id ? { ...item, offsetMinutes: Math.max(0, Math.min(durationMinutes, item.offsetMinutes + amount)), updatedAt: nowIso() } : item)); }
    };
    window.addEventListener('keydown', keyboard); return () => window.removeEventListener('keydown', keyboard);
  });

  const dragEvent = (event: ReactPointerEvent, item: TimelineEvent, resize = false) => {
    event.preventDefault(); event.stopPropagation(); const track = tracks.find((value) => value.id === item.trackId); if (track?.locked) return;
    setSelectedId(item.id); const startX = event.clientX; const initial = resize ? (item.durationMinutes || snap) : item.offsetMinutes;
    const move = (pointer: PointerEvent) => { const delta = (pointer.clientX - startX) / pixelsPerMinute; const value = snapValue(initial + delta, snap); updateEvents(patchEventList(item.id, resize ? { durationMinutes: Math.max(snap, Math.min(durationMinutes - item.offsetMinutes, value)) } : { offsetMinutes: Math.min(durationMinutes - (item.durationMinutes || 0), value) })); };
    const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); };
    window.addEventListener('pointermove', move); window.addEventListener('pointerup', up);
  };
  const patchEventList = (id: string, updates: Partial<TimelineEvent>) => events.map((value) => value.id === id ? { ...value, ...updates, updatedAt: nowIso() } : value);
  const tickStep = safeDuration <= 60 ? 5 : 15;
  const ticks = Array.from({ length: Math.floor(safeDuration / tickStep) + 1 }, (_, index) => index * tickStep);

  return <section className="rounded-xl border border-border bg-black/15">
    <header className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-3 py-2">
      <div className="flex items-center gap-2"><Layers3 className="h-4 w-4 text-primary" /><strong className="text-sm">Event Timeline</strong><span className="rounded bg-surface-hover px-2 py-0.5 text-[10px] text-text-secondary">{events.length} events</span></div>
      <div className="flex items-center gap-2 text-xs"><label>Snap <select value={snap} onChange={(event) => setSnap(Number(event.target.value))} className="ml-1 rounded border border-border bg-surface px-2 py-1"><option value={1}>1m</option><option value={5}>5m</option><option value={15}>15m</option></select></label><button type="button" className="rounded border border-border px-2 py-1" onClick={() => setZoom(Math.max(.6, zoom - .2))}>−</button><span>{Math.round(zoom * 100)}%</span><button type="button" className="rounded border border-border px-2 py-1" onClick={() => setZoom(Math.min(2, zoom + .2))}>+</button><Button type="button" size="sm" variant="secondary" onClick={addTrack}><Plus className="h-3.5 w-3.5" /> Track</Button><Button type="button" size="sm" onClick={() => newEvent()} disabled={!tracks.length}><Plus className="h-3.5 w-3.5" /> Event</Button></div>
    </header>
    {!tracks.length ? <button type="button" onClick={addTrack} className="flex h-40 w-full flex-col items-center justify-center text-sm text-text-secondary"><Layers3 className="mb-2 h-6 w-6" />Add the first timeline track</button> : <div ref={timelineViewportRef} className="max-h-[480px] min-h-40 overflow-auto">
      <div style={{ width: canvasWidth + 176 }}>
        <div className="sticky top-0 z-20 grid h-9 grid-cols-[176px_auto] border-b border-border bg-surface/95"><div className="sticky left-0 z-30 flex items-center border-r border-border bg-surface px-3 text-[10px] font-bold uppercase text-text-secondary">Timeline tracks</div><div className="relative" style={{ width: canvasWidth }}>{ticks.map((tick) => <div key={tick} className="absolute inset-y-0 border-l border-border/50 pl-1 text-[10px] text-text-secondary" style={{ left: tick * pixelsPerMinute }}>{clockAt(startTime, tick)}<span className="ml-1 opacity-60">{tick}m</span></div>)}</div></div>
        {orderedTracks.map((track) => <div key={track.id} className="grid min-h-[76px] grid-cols-[176px_auto] border-b border-border/60">
          <div className="sticky left-0 z-10 flex items-center gap-1 border-r border-border bg-surface px-2"><span className="flex flex-col"><button type="button" onClick={() => moveTrack(track.id, -1)}><ChevronUp className="h-3 w-3" /></button><button type="button" onClick={() => moveTrack(track.id, 1)}><ChevronDown className="h-3 w-3" /></button></span><input value={track.name} onChange={(event) => patchTrack(track.id, { name: event.target.value })} className="min-w-0 flex-1 bg-transparent text-xs font-bold outline-none" /><button type="button" onClick={() => patchTrack(track.id, { visible: !track.visible })}>{track.visible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}</button><button type="button" onClick={() => patchTrack(track.id, { locked: !track.locked })}>{track.locked ? <Lock className="h-3.5 w-3.5" /> : <LockOpen className="h-3.5 w-3.5" />}</button><button type="button" onClick={() => patchTrack(track.id, { muted: !track.muted })}>{track.muted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}</button><button type="button" onClick={() => removeTrack(track.id)}><Trash2 className="h-3.5 w-3.5 text-red-400" /></button></div>
          <div className="relative bg-[linear-gradient(to_right,var(--color-border)_1px,transparent_1px)]" style={{ width: canvasWidth, backgroundSize: `${snap * pixelsPerMinute}px 100%` }} onDoubleClick={(event) => newEvent(track.id, event.nativeEvent.offsetX / pixelsPerMinute)}>{track.visible && events.filter((item) => item.trackId === track.id).map((item) => <button type="button" key={item.id} onPointerDown={(event) => dragEvent(event, item)} onDoubleClick={() => setEditing(item)} className={`absolute top-3 h-12 overflow-hidden rounded-md border px-2 text-left text-[11px] shadow ${colors[item.type]} ${selectedId === item.id ? 'ring-2 ring-white/70' : ''}`} style={{ left: item.offsetMinutes * pixelsPerMinute, width: Math.max(32, (item.durationMinutes || 2) * pixelsPerMinute) }} title={`${item.title} · ${item.offsetMinutes}m`}><span className="block truncate font-bold">{item.title}</span><span className="block truncate opacity-70">{item.type.replace('_', ' ')}</span>{item.durationMinutes && <span onPointerDown={(event) => dragEvent(event, item, true)} className="absolute inset-y-0 right-0 w-2 cursor-ew-resize bg-white/20" />}</button>)}</div>
        </div>)}
      </div>
    </div>}
    {selected && <footer className="flex items-center justify-between gap-3 border-t border-border px-3 py-2 text-xs"><span className="truncate"><strong>{selected.title}</strong> · {clockAt(startTime, selected.offsetMinutes)} · {selected.durationMinutes || 0}m</span><div className="flex gap-1"><Button type="button" size="sm" variant="secondary" onClick={() => setEditing(selected)}>Edit</Button><Button type="button" size="icon" variant="secondary" onClick={duplicateSelected}><Copy className="h-3.5 w-3.5" /></Button><Button type="button" size="icon" variant="danger" onClick={deleteSelected}><Trash2 className="h-3.5 w-3.5" /></Button></div></footer>}
    {editing && <EventEditor event={editing} tracks={orderedTracks} actions={actions} onClose={() => setEditing(null)} onSave={saveEvent} />}
  </section>;
}

function EventEditor({ event: initial, tracks, actions, onClose, onSave }: { event: TimelineEvent; tracks: TimelineTrack[]; actions: ReturnType<typeof useDeveloperActionStore.getState>['actions']; onClose: () => void; onSave: (event: TimelineEvent) => void }) {
  const [event, setEvent] = useState(() => initial.type === 'action' ? { ...initial, triggerBehavior: { ...initial.triggerBehavior, launchActionsOnStart: true } } : initial); const patch = (updates: Partial<TimelineEvent>) => setEvent((value) => ({ ...value, ...updates }));
  const behavior = (updates: Partial<TimelineEvent['triggerBehavior']>) => patch({ triggerBehavior: { ...event.triggerBehavior, ...updates } });
  return <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" onMouseDown={onClose}><div className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl" onMouseDown={(e) => e.stopPropagation()}>
    <header className="flex shrink-0 items-center justify-between border-b border-border px-6 py-5"><div><p className="text-[10px] font-black uppercase tracking-[.18em] text-primary">Timeline event</p><h3 className="mt-1 text-xl font-black">{initial.title || 'New event'}</h3></div><button type="button" onClick={onClose} className="rounded-lg p-2 text-text-secondary transition hover:bg-surface-hover hover:text-text"><X className="h-5 w-5" /></button></header>
    <div className="grid min-h-0 flex-1 gap-5 overflow-y-auto p-6 lg:grid-cols-2">
      <label className="sm:col-span-2"><span className="text-xs font-black uppercase tracking-wider text-text-secondary">Event details</span><input autoFocus value={event.title} onChange={(e) => patch({ title: e.target.value })} className="mt-2 w-full rounded-lg border border-border p-3 text-base font-bold" placeholder="What should happen?" /></label>
      <label><span className="text-xs font-bold">Type</span><select value={event.type} onChange={(e) => { const type = e.target.value as TimelineEventType; patch({ type, triggerBehavior: { ...event.triggerBehavior, launchActionsOnStart: type === 'action' ? true : event.triggerBehavior.launchActionsOnStart } }); }} className="mt-1 w-full rounded-lg border border-border p-2.5">{eventTypes.map((type) => <option key={type} value={type}>{type.replace('_', ' ')}</option>)}</select></label>
      <label><span className="text-xs font-bold">Track</span><select value={event.trackId} onChange={(e) => patch({ trackId: e.target.value })} className="mt-1 w-full rounded-lg border border-border p-2.5">{tracks.map((track) => <option key={track.id} value={track.id}>{track.name}</option>)}</select></label>
      <label><span className="text-xs font-bold">Offset (minutes)</span><input type="number" min={0} value={event.offsetMinutes} onChange={(e) => patch({ offsetMinutes: Number(e.target.value) })} className="mt-1 w-full rounded-lg border border-border p-2.5" /></label>
      <label><span className="text-xs font-bold">Duration</span><input type="number" min={0} value={event.durationMinutes || 0} onChange={(e) => patch({ durationMinutes: Number(e.target.value) || undefined })} className="mt-1 w-full rounded-lg border border-border p-2.5" /></label>
      <label className="sm:col-span-2"><span className="text-xs font-bold">Description</span><textarea value={event.description || ''} onChange={(e) => patch({ description: e.target.value })} className="mt-1 min-h-28 w-full resize-y rounded-lg border border-border p-3" placeholder="Optional context shown when this event starts" /></label>
      {event.type === 'action' && <div className="sm:col-span-2"><span className="text-xs font-bold">Registered actions</span><div className="mt-2 grid gap-2 sm:grid-cols-2">{actions.filter((action) => action.enabled).map((action) => <label key={action.id} className="flex gap-2 rounded border border-border p-2 text-xs"><input type="checkbox" checked={event.actions?.includes(action.id)} onChange={() => patch({ actions: event.actions?.includes(action.id) ? event.actions.filter((id) => id !== action.id) : [...(event.actions || []), action.id] })} /><span><strong className="block">{action.label}</strong><span className="text-text-secondary">{action.type} · {action.type === 'url' ? 'external/unmanaged' : 'confirmation required'}</span></span></label>)}</div></div>}
      {event.type === 'checklist' && <label className="sm:col-span-2 rounded-xl border border-border bg-black/10 p-4"><span className="text-xs font-black uppercase tracking-wider text-text-secondary">Checklist</span><span className="mt-1 block text-xs text-text-secondary">Enter one item per line.</span><textarea value={event.checklist?.map((item) => item.text).join('\n') || ''} onChange={(e) => patch({ checklist: e.target.value.split('\n').filter(Boolean).map((text, index) => ({ id: event.checklist?.[index]?.id || crypto.randomUUID(), text, done: false })) })} className="mt-3 min-h-40 w-full resize-y rounded-lg border border-border p-3" /></label>}
      {event.type === 'note' && <label className="sm:col-span-2 rounded-xl border border-border bg-black/10 p-4"><span className="text-xs font-black uppercase tracking-wider text-text-secondary">Note template</span><span className="mt-1 block text-xs text-text-secondary">Shown as a writing prompt when the event starts.</span><textarea value={event.noteTemplate || ''} onChange={(e) => patch({ noteTemplate: e.target.value })} className="mt-3 min-h-40 w-full resize-y rounded-lg border border-border p-3" /></label>}
      <div className="sm:col-span-2 grid gap-3 rounded-xl border border-border bg-black/10 p-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="mb-1 sm:col-span-2 lg:col-span-3"><span className="text-xs font-black uppercase tracking-wider text-text-secondary">Event behavior</span></div>
        <ToggleSwitch checked={event.triggerBehavior.showPopup} onCheckedChange={(showPopup) => behavior({ showPopup })} label={<span className="flex items-center gap-2"><Bell className="h-4 w-4 text-primary" />Show popup</span>} className="min-h-12 rounded-lg border border-border bg-surface-hover/20 px-3" />
        <ToggleSwitch checked={!!event.triggerBehavior.playSound} onCheckedChange={(playSound) => behavior({ playSound })} label={<span className="flex items-center gap-2"><Volume2 className="h-4 w-4 text-primary" />Play sound</span>} className="min-h-12 rounded-lg border border-border bg-surface-hover/20 px-3" />
        <ToggleSwitch checked={!!event.triggerBehavior.autoDismiss} onCheckedChange={(autoDismiss) => behavior({ autoDismiss })} label={<span className="flex items-center gap-2"><X className="h-4 w-4 text-primary" />Auto dismiss</span>} className="min-h-12 rounded-lg border border-border bg-surface-hover/20 px-3" />
        <ToggleSwitch checked={!!event.triggerBehavior.requireUserAction} onCheckedChange={(requireUserAction) => behavior({ requireUserAction })} label={<span className="flex items-center gap-2"><CheckSquare className="h-4 w-4 text-primary" />Require response</span>} className="min-h-12 rounded-lg border border-border bg-surface-hover/20 px-3" />
        {event.type === 'action' && <ToggleSwitch checked={!!event.triggerBehavior.closeManagedActionsOnEnd} onCheckedChange={(closeManagedActionsOnEnd) => behavior({ closeManagedActionsOnEnd })} label={<span className="flex items-center gap-2"><X className="h-4 w-4 text-primary" />Close managed at end</span>} className="min-h-12 rounded-lg border border-border bg-surface-hover/20 px-3" />}
      </div>
    </div>
    <footer className="flex shrink-0 items-center justify-between gap-3 border-t border-border bg-surface px-6 py-4"><span className="hidden text-xs text-text-secondary sm:block">Changes apply after saving the schedule block.</span><div className="ml-auto flex gap-2"><Button type="button" variant="secondary" onClick={onClose}>Cancel</Button><Button type="button" onClick={() => onSave(event)}>Save event</Button></div></footer>
  </div></div>;
}
