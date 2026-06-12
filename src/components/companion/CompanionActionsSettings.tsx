import { useEffect, useMemo, useState } from 'react';
import { ExternalLink, FolderOpen, Plus, Play, Save, Trash2 } from 'lucide-react';
import { clsx } from 'clsx';
import { SectionHeader } from '../ui/SectionHeader';
import { ToggleSwitch } from '../ui/ToggleSwitch';
import { CompanionActionService } from '../../companion/actions/CompanionActionService';
import type { CompanionAction, CompanionActionType } from '../../models/companion/types';

type DraftAction = {
  id?: string;
  type: CompanionActionType;
  label: string;
  path: string;
  url: string;
  internalAction?: CompanionAction['internalAction'];
  aliasesText: string;
  enabled: boolean;
  requiresConfirmation: boolean;
};

const emptyDraft: DraftAction = {
  type: 'app',
  label: '',
  path: '',
  url: '',
  aliasesText: '',
  enabled: true,
  requiresConfirmation: true,
};

function toDraft(action: CompanionAction): DraftAction {
  return {
    id: action.id,
    type: action.type,
    label: action.label,
    path: action.path || '',
    url: action.url || '',
    internalAction: action.internalAction,
    aliasesText: action.aliases.join(', '),
    enabled: action.enabled !== false,
    requiresConfirmation: action.requiresConfirmation !== false,
  };
}

function aliasesFromText(value: string) {
  return value
    .split(',')
    .map((alias) => alias.trim())
    .filter(Boolean);
}

export function CompanionActionsSettings() {
  const [actions, setActions] = useState<CompanionAction[]>([]);
  const [draft, setDraft] = useState<DraftAction>(emptyDraft);
  const [status, setStatus] = useState('');

  const sortedActions = useMemo(
    () => [...actions].sort((a, b) => a.label.localeCompare(b.label)),
    [actions]
  );

  const setTransientStatus = (message: string) => {
    setStatus(message);
    window.setTimeout(() => setStatus(''), 3000);
  };

  const loadActions = async () => {
    const loaded = await CompanionActionService.loadActions();
    setActions(loaded);
  };

  useEffect(() => {
    void loadActions();
  }, []);

  const persist = async (nextActions: CompanionAction[], message: string) => {
    setActions(nextActions);
    await CompanionActionService.saveActions(nextActions);
    window.dispatchEvent(new CustomEvent('companion-actions-updated'));
    setTransientStatus(message);
  };

  const saveDraft = async () => {
    if (!draft.label.trim()) {
      setTransientStatus('Add a label first.');
      return;
    }
    if (draft.type === 'url' && !draft.url.trim()) {
      setTransientStatus('Add a URL first.');
      return;
    }
    if ((draft.type === 'app' || draft.type === 'folder') && !draft.path.trim()) {
      setTransientStatus('Add a path first.');
      return;
    }

    const now = new Date().toISOString();
    const existing = draft.id ? actions.find((action) => action.id === draft.id) : null;
    const nextAction = CompanionActionService.createAction({
      type: draft.type,
      label: draft.label,
      path: draft.type === 'app' || draft.type === 'folder' ? draft.path : '',
      url: draft.type === 'url' ? draft.url : '',
      internalAction: draft.type === 'internal' ? (draft.internalAction || 'skip_current_session') : undefined,
      aliases: aliasesFromText(draft.aliasesText),
      enabled: draft.enabled,
      requiresConfirmation: draft.requiresConfirmation,
    });

    const actionToSave: CompanionAction = existing
      ? { ...nextAction, id: existing.id, createdAt: existing.createdAt, updatedAt: now }
      : nextAction;
    const nextActions = existing
      ? actions.map((action) => (action.id === existing.id ? actionToSave : action))
      : [...actions, actionToSave];

    await persist(nextActions, existing ? 'Action updated.' : 'Action added.');
    setDraft(emptyDraft);
  };

  const deleteAction = async (actionId: string) => {
    await persist(actions.filter((action) => action.id !== actionId), 'Action deleted.');
    if (draft.id === actionId) setDraft(emptyDraft);
  };

  const toggleAction = async (action: CompanionAction, patch: Partial<CompanionAction>) => {
    await persist(
      actions.map((item) => item.id === action.id ? { ...item, ...patch, updatedAt: new Date().toISOString() } : item),
      'Action setting saved.'
    );
  };

  const testAction = async (action: CompanionAction) => {
    try {
      console.info('[CompanionActions] Test action requested', { id: action.id, type: action.type, label: action.label });
      await CompanionActionService.executeAction(action);
      setTransientStatus(`Opened ${action.label}.`);
    } catch (error: any) {
      console.error('[CompanionActions] Test action failed', error);
      setTransientStatus(error?.message || 'Action test failed.');
    }
  };

  return (
    <section className="space-y-4">
      <SectionHeader title="Actions" />
      <div className="rounded-xl border border-border bg-surface/60 p-4 space-y-4">
        <div>
          <p className="text-sm font-black text-text">Allowed Companion Actions</p>
          <p className="text-xs leading-relaxed text-text-secondary">
            Companion can only open apps, folders, or links listed here. It never runs arbitrary shell commands.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-2">
            <label className="text-sm font-medium text-text-secondary">Type</label>
            <select
              value={draft.type}
              onChange={(event) => setDraft({ ...draft, type: event.target.value as CompanionActionType })}
              className="w-full rounded-lg border border-border bg-bg-secondary p-2 text-sm text-text focus:outline-none focus:border-primary/50"
            >
              <option value="app">App (.exe/.lnk)</option>
              <option value="url">URL</option>
              <option value="folder">Folder</option>
              <option value="internal">Built-in Command</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-text-secondary">Label</label>
            <input
              value={draft.label}
              onChange={(event) => setDraft({ ...draft, label: event.target.value })}
              placeholder="VS Code"
              className="w-full rounded-lg border border-border bg-bg-secondary p-2 text-sm text-text focus:outline-none focus:border-primary/50"
            />
          </div>
          {draft.type === 'internal' ? (
            <div className="space-y-2 md:col-span-2 rounded-lg border border-primary/20 bg-primary/10 p-3">
              <p className="text-sm font-bold text-text">Built-in action: skip_current_session</p>
              <p className="text-xs leading-relaxed text-text-secondary">
                This calls the existing ChronoFlow skip session action. It does not run shell commands or open files.
              </p>
            </div>
          ) : (
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium text-text-secondary">
                {draft.type === 'url' ? 'URL' : draft.type === 'folder' ? 'Folder Path' : 'Executable Path'}
              </label>
              <input
                value={draft.type === 'url' ? draft.url : draft.path}
                onChange={(event) => setDraft(draft.type === 'url'
                  ? { ...draft, url: event.target.value }
                  : { ...draft, path: event.target.value })}
                placeholder={draft.type === 'url' ? 'https://example.com' : 'C:/Users/.../Code.exe or shortcut.lnk'}
                className="w-full rounded-lg border border-border bg-bg-secondary p-2 text-sm text-text focus:outline-none focus:border-primary/50"
              />
              <p className="text-[11px] text-text-secondary">
                Native file picker is not installed in this build, so paste the approved path here.
              </p>
            </div>
          )}
          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-medium text-text-secondary">Aliases</label>
            <input
              value={draft.aliasesText}
              onChange={(event) => setDraft({ ...draft, aliasesText: event.target.value })}
              placeholder="vscode, code, visual studio code"
              className="w-full rounded-lg border border-border bg-bg-secondary p-2 text-sm text-text focus:outline-none focus:border-primary/50"
            />
          </div>
          <ToggleSwitch
            checked={draft.enabled}
            onChange={() => setDraft({ ...draft, enabled: !draft.enabled })}
            label="Enabled"
          />
          <ToggleSwitch
            checked={draft.requiresConfirmation}
            onChange={() => setDraft({ ...draft, requiresConfirmation: !draft.requiresConfirmation })}
            label="Require confirmation"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={saveDraft}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-xs font-bold text-white hover:opacity-90"
          >
            {draft.id ? <Save className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {draft.id ? 'Save Action' : 'Add Action'}
          </button>
          {draft.id && (
            <button
              onClick={() => setDraft(emptyDraft)}
              className="rounded-lg border border-border bg-surface-hover/50 px-4 py-2 text-xs font-bold text-text hover:bg-surface-hover"
            >
              New Action
            </button>
          )}
        </div>
      </div>

      <div className="space-y-2">
        {sortedActions.length === 0 ? (
          <div className="rounded-xl border border-border bg-surface/45 p-4 text-sm text-text-secondary">
            No actions registered yet.
          </div>
        ) : sortedActions.map((action) => (
          <div key={action.id} className="rounded-xl border border-border bg-surface/50 p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-bold text-text">{action.label}</p>
                  <span className="rounded-full border border-border bg-bg-secondary px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-text-secondary">
                  {action.type === 'internal' ? 'built-in' : action.type}
                  </span>
                  <span className={clsx(
                    'rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wider',
                    action.enabled ? 'bg-emerald-500/10 text-emerald-300' : 'bg-white/5 text-text-secondary'
                  )}>
                    {action.enabled ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
                <p className="mt-1 break-all text-xs text-text-secondary">
                  {action.type === 'internal' ? action.internalAction : action.type === 'url' ? action.url : action.path}
                </p>
                <p className="mt-2 text-xs text-text-secondary">
                  Aliases: {action.aliases.join(', ') || 'None'}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setDraft(toDraft(action))}
                  className="rounded-lg border border-border bg-surface-hover/50 px-3 py-2 text-xs font-bold text-text hover:bg-surface-hover"
                >
                  Edit
                </button>
                <button
                  onClick={() => testAction(action)}
                  className="inline-flex items-center gap-2 rounded-lg border border-border bg-surface-hover/50 px-3 py-2 text-xs font-bold text-text hover:bg-surface-hover"
                >
                  {action.type === 'url' ? <ExternalLink className="h-4 w-4" /> : action.type === 'folder' ? <FolderOpen className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  Test
                </button>
                <button
                  onClick={() => deleteAction(action.id)}
                  className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs font-bold text-red-300 hover:bg-red-500/20"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
              <ToggleSwitch
                checked={action.enabled}
                onChange={() => toggleAction(action, { enabled: !action.enabled })}
                label="Enabled"
              />
              <ToggleSwitch
                checked={action.requiresConfirmation}
                onChange={() => toggleAction(action, { requiresConfirmation: !action.requiresConfirmation })}
                label="Require confirmation"
              />
            </div>
          </div>
        ))}
      </div>

      {status && <p className="text-xs text-text-secondary">{status}</p>}
    </section>
  );
}
