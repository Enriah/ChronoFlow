import React from 'react';
import { Plus, Trash2, Globe, Laptop, FolderOpen, ToggleLeft, ToggleRight } from 'lucide-react';
import type { LinkedAction, LinkedActionType } from '../../models/LinkedAction';

interface LinkedActionEditorProps {
  actions: LinkedAction[];
  onChange: (actions: LinkedAction[]) => void;
}

export const LinkedActionEditor: React.FC<LinkedActionEditorProps> = ({ actions, onChange }) => {
  const addAction = (type: LinkedActionType) => {
    const newAction: LinkedAction = {
      id: crypto.randomUUID(),
      type,
      label: `New ${type}`,
      value: '',
      enabled: true
    };
    onChange([...actions, newAction]);
  };

  const updateAction = (id: string, updates: Partial<LinkedAction>) => {
    onChange(actions.map(a => a.id === id ? { ...a, ...updates } : a));
  };

  const removeAction = (id: string) => {
    onChange(actions.filter(a => a.id !== id));
  };

  const getIcon = (type: LinkedActionType) => {
    switch (type) {
      case 'url': return <Globe className="w-4 h-4" />;
      case 'application': return <Laptop className="w-4 h-4" />;
      case 'folder': return <FolderOpen className="w-4 h-4" />;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <label className="text-xs font-black uppercase tracking-widest text-text-secondary">Linked Actions</label>
        <div className="flex gap-2">
          <button 
            type="button"
            onClick={() => addAction('url')}
            className="p-1.5 hover:bg-surface-hover rounded-lg text-primary transition-colors flex items-center gap-1 text-[10px] font-bold"
          >
            <Plus className="w-3 h-3" /> URL
          </button>
          <button 
            type="button"
            onClick={() => addAction('application')}
            className="p-1.5 hover:bg-surface-hover rounded-lg text-primary transition-colors flex items-center gap-1 text-[10px] font-bold"
          >
            <Plus className="w-3 h-3" /> APP
          </button>
          <button 
            type="button"
            onClick={() => addAction('folder')}
            className="p-1.5 hover:bg-surface-hover rounded-lg text-primary transition-colors flex items-center gap-1 text-[10px] font-bold"
          >
            <Plus className="w-3 h-3" /> FOLDER
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {actions.length === 0 ? (
          <p className="text-[10px] text-text-secondary italic opacity-50">No actions linked to this task.</p>
        ) : (
          actions.map(action => (
            <div key={action.id} className="bg-surface-hover/30 rounded-xl p-3 border border-border/50 group">
              <div className="flex items-center gap-3 mb-2">
                <div className="text-primary opacity-70">{getIcon(action.type)}</div>
                <input 
                  type="text"
                  value={action.label}
                  onChange={(e) => updateAction(action.id, { label: e.target.value })}
                  placeholder="Label (e.g. My Playlist)"
                  className="bg-transparent border-none text-xs font-bold text-text focus:outline-none flex-grow"
                />
                <button 
                  type="button"
                  onClick={() => updateAction(action.id, { enabled: !action.enabled })}
                  className="text-text-secondary hover:text-primary transition-colors"
                >
                  {action.enabled ? <ToggleRight className="w-5 h-5 text-primary" /> : <ToggleLeft className="w-5 h-5 opacity-50" />}
                </button>
                <button 
                  type="button"
                  onClick={() => removeAction(action.id)}
                  className="text-text-secondary hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <input 
                type="text"
                value={action.value}
                onChange={(e) => updateAction(action.id, { value: e.target.value })}
                placeholder={action.type === 'url' ? "https://..." : "Path to file/folder..."}
                className="w-full bg-surface-hover/50 border border-border/30 rounded-lg px-3 py-1.5 text-[10px] text-text-secondary focus:outline-none focus:ring-1 focus:ring-primary/30"
              />
            </div>
          ))
        )}
      </div>
    </div>
  );
};
