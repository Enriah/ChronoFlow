import { useMemo, useState } from 'react';
import { Edit3, Plus, Save, Trash2, X } from 'lucide-react';
import { clsx } from 'clsx';
import { useCompanionStore } from '../../store/useCompanionStore';
import type { CompanionMemory, CompanionMemoryCategory } from '../../models/companion/types';

const MEMORY_CATEGORIES: CompanionMemoryCategory[] = [
  'goal',
  'project',
  'habit',
  'interest',
  'preference',
  'milestone',
  'personal_note',
];

const EMPTY_DRAFT = {
  category: 'personal_note' as CompanionMemoryCategory,
  content: '',
  importance: 0.5,
};

type Draft = typeof EMPTY_DRAFT;

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unknown';
  return date.toLocaleDateString();
}

export function CompanionMemoryViewer({ onClose }: { onClose: () => void }) {
  const { memories, addMemory, updateMemory, removeMemory } = useCompanionStore();
  const [filter, setFilter] = useState<CompanionMemoryCategory | 'all'>('all');
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingDraft, setEditingDraft] = useState<Draft>(EMPTY_DRAFT);

  const filteredMemories = useMemo(() => {
    const list = filter === 'all' ? memories : memories.filter(memory => memory.category === filter);
    return [...list].sort((a, b) => b.importance - a.importance);
  }, [filter, memories]);

  const handleCreate = async () => {
    if (!draft.content.trim()) return;
    await addMemory(draft);
    setDraft(EMPTY_DRAFT);
  };

  const startEditing = (memory: CompanionMemory) => {
    setEditingId(memory.id);
    setEditingDraft({
      category: memory.category,
      content: memory.content,
      importance: memory.importance,
    });
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editingDraft.content.trim()) return;
    await updateMemory(editingId, editingDraft);
    setEditingId(null);
  };

  return (
    <div className="fixed inset-0 z-[120] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-4xl max-h-[86vh] overflow-hidden rounded-[2rem] border border-border bg-surface shadow-2xl flex flex-col">
        <div className="p-6 border-b border-border flex items-center justify-between gap-4">
          <div>
            <h3 className="text-xl font-black text-text">Companion Memory</h3>
            <p className="text-xs text-text-secondary opacity-70">{memories.length} saved memories</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/10 transition-colors" title="Close memory viewer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 border-b border-border space-y-4">
          <div className="flex flex-wrap gap-2">
            {(['all', ...MEMORY_CATEGORIES] as const).map(category => (
              <button
                key={category}
                onClick={() => setFilter(category)}
                className={clsx(
                  "px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border transition-all",
                  filter === category ? "bg-primary text-white border-primary" : "bg-white/5 text-text-secondary border-white/10 hover:bg-white/10"
                )}
              >
                {category.replace('_', ' ')}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-[160px_1fr_160px_auto] gap-3">
            <select
              value={draft.category}
              onChange={(event) => setDraft({ ...draft, category: event.target.value as CompanionMemoryCategory })}
              className="bg-bg-secondary border border-white/10 rounded-lg p-2 text-sm focus:outline-none focus:border-primary/50"
            >
              {MEMORY_CATEGORIES.map(category => (
                <option key={category} value={category}>{category.replace('_', ' ')}</option>
              ))}
            </select>
            <input
              value={draft.content}
              onChange={(event) => setDraft({ ...draft, content: event.target.value })}
              placeholder="Add an important fact, goal, project, or preference..."
              className="bg-bg-secondary border border-white/10 rounded-lg p-2 text-sm focus:outline-none focus:border-primary/50"
            />
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={draft.importance}
              onChange={(event) => setDraft({ ...draft, importance: Number(event.target.value) })}
              className="accent-primary"
              title={`Importance ${Math.round(draft.importance * 100)}%`}
            />
            <button
              onClick={handleCreate}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-primary text-white text-xs font-bold hover:opacity-90 transition-opacity"
            >
              <Plus className="w-4 h-4" />
              Add
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          {filteredMemories.length === 0 ? (
            <p className="text-sm text-text-secondary opacity-60 italic text-center py-16">No memories in this view.</p>
          ) : (
            <div className="space-y-3">
              {filteredMemories.map(memory => (
                <div key={memory.id} className="p-4 rounded-xl bg-white/5 border border-white/10">
                  {editingId === memory.id ? (
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-[160px_1fr_160px] gap-3">
                        <select
                          value={editingDraft.category}
                          onChange={(event) => setEditingDraft({ ...editingDraft, category: event.target.value as CompanionMemoryCategory })}
                          className="bg-bg-secondary border border-white/10 rounded-lg p-2 text-sm focus:outline-none focus:border-primary/50"
                        >
                          {MEMORY_CATEGORIES.map(category => (
                            <option key={category} value={category}>{category.replace('_', ' ')}</option>
                          ))}
                        </select>
                        <input
                          value={editingDraft.content}
                          onChange={(event) => setEditingDraft({ ...editingDraft, content: event.target.value })}
                          className="bg-bg-secondary border border-white/10 rounded-lg p-2 text-sm focus:outline-none focus:border-primary/50"
                        />
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.05"
                          value={editingDraft.importance}
                          onChange={(event) => setEditingDraft({ ...editingDraft, importance: Number(event.target.value) })}
                          className="accent-primary"
                        />
                      </div>
                      <div className="flex justify-end gap-2">
                        <button onClick={() => setEditingId(null)} className="px-3 py-2 rounded-lg bg-white/5 text-text-secondary text-xs font-bold hover:bg-white/10">
                          Cancel
                        </button>
                        <button onClick={handleSaveEdit} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-primary text-white text-xs font-bold hover:opacity-90">
                          <Save className="w-4 h-4" />
                          Save
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[10px] uppercase tracking-wider font-bold text-primary">{memory.category.replace('_', ' ')}</span>
                          <span className="text-[10px] text-text-secondary opacity-60">Importance {Math.round(memory.importance * 100)}%</span>
                          <span className="text-[10px] text-text-secondary opacity-60">Referenced {memory.timesReferenced}x</span>
                        </div>
                        <p className="text-sm text-text leading-relaxed">{memory.content}</p>
                        <p className="text-[10px] text-text-secondary opacity-50">Created {formatDate(memory.createdAt)} · Last accessed {formatDate(memory.lastAccessed)}</p>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <button onClick={() => startEditing(memory)} className="p-2 rounded-lg hover:bg-white/10 text-text-secondary hover:text-text" title="Edit memory">
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button onClick={() => removeMemory(memory.id)} className="p-2 rounded-lg hover:bg-red-500/10 text-red-300" title="Delete memory">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
