import { useState } from 'react';
import { Bot, PlayCircle, Plus, Save, Trash2, X } from 'lucide-react';
import type { AgentProfile } from '../../models/Agent';
import { Button } from '../../components/ui/Button';
import { ToggleSwitch } from '../../components/ui/ToggleSwitch';
import { useAgentStore } from './useAgentStore';

const blankProfile = (): AgentProfile => {
  const stamp = new Date().toISOString();
  return { id: crypto.randomUUID(), name: '', mode: 'cli', command: '', args: [], enabled: true, timeoutSeconds: 900, createdAt: stamp, updatedAt: stamp };
};

export function AgentSettings() {
  const { profiles, runs, saveProfile, removeProfile, clearRuns } = useAgentStore();
  const [draft, setDraft] = useState<AgentProfile | null>(null);
  const save = () => {
    if (!draft?.name.trim() || !draft.command.trim()) return;
    saveProfile(draft);
    setDraft(null);
  };
  const draftMode = draft?.mode || 'cli';

  return <div className="space-y-5">
    <header className="flex flex-wrap items-start justify-between gap-3">
      <div><h3 className="font-black">AI Agents</h3><p className="mt-1 text-xs text-text-secondary">Timeline events can trigger a CLI agent with captured logs, or launch an Agent App when you prefer a GUI workflow.</p></div>
      <Button size="sm" variant="secondary" onClick={() => setDraft(blankProfile())}><Plus className="h-4 w-4" /> Add agent</Button>
    </header>

    {draft && <section className="overflow-hidden rounded-xl border border-primary/30 bg-primary/5">
      <div className="flex items-center justify-between border-b border-border/60 px-5 py-4"><div><p className="text-[10px] font-black uppercase tracking-wider text-primary">Agent profile</p><h4 className="mt-1 font-black">{draft.name || 'New agent'}</h4></div><button type="button" onClick={() => setDraft(null)} className="rounded-lg p-2 text-text-secondary hover:bg-surface-hover hover:text-text"><X className="h-4 w-4" /></button></div>
      <div className="grid gap-4 p-5 md:grid-cols-2">
        <label><span className="text-xs font-bold">Name</span><input autoFocus value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} className="mt-1.5 w-full rounded-lg border border-border p-3" placeholder="Codex CLI" /></label>
        <label><span className="text-xs font-bold">Mode</span><select value={draftMode} onChange={(event) => setDraft({ ...draft, mode: event.target.value as AgentProfile['mode'] })} className="mt-1.5 w-full rounded-lg border border-border p-3"><option value="cli">Agent CLI · capture output</option><option value="app">Agent App · launch GUI</option></select></label>
        <label><span className="text-xs font-bold">{draftMode === 'app' ? 'App command / path' : 'CLI command'}</span><input value={draft.command} onChange={(event) => setDraft({ ...draft, command: event.target.value })} className="mt-1.5 w-full rounded-lg border border-border p-3 font-mono text-sm" placeholder={draftMode === 'app' ? 'codex or C:/path/to/agent.exe' : 'codex'} /></label>
        <label className="md:col-span-2"><span className="text-xs font-bold">Arguments</span><input value={draft.args.join(' ')} onChange={(event) => setDraft({ ...draft, args: event.target.value.split(/\s+/).filter(Boolean) })} className="mt-1.5 w-full rounded-lg border border-border p-3 font-mono text-sm" placeholder={draftMode === 'app' ? '--prompt-file {promptFile}' : 'exec -'} /><span className="mt-1 block text-xs text-text-secondary">{draftMode === 'app' ? <>For app profiles, use <code>{'{prompt}'}</code> or <code>{'{promptFile}'}</code> in arguments if the app supports opening with a prompt. Without placeholders, ChronoFlow only launches the app and keeps the prompt in run logs.</> : <>Prompt is sent through stdin. Use args like <code>exec -</code> for tools that read stdin.</>}</span></label>
        <label><span className="text-xs font-bold">Working directory</span><input value={draft.workingDirectory || ''} onChange={(event) => setDraft({ ...draft, workingDirectory: event.target.value })} className="mt-1.5 w-full rounded-lg border border-border p-3 font-mono text-sm" placeholder={String.raw`C:\path\to\project`} /></label>
        <label><span className="text-xs font-bold">{draftMode === 'app' ? 'Launch timeout hint' : 'Timeout (seconds)'}</span><input type="number" min={30} value={draft.timeoutSeconds || 900} onChange={(event) => setDraft({ ...draft, timeoutSeconds: Math.max(30, Number(event.target.value) || 900) })} className="mt-1.5 w-full rounded-lg border border-border p-3" disabled={draftMode === 'app'} /></label>
        <ToggleSwitch checked={draft.enabled} onCheckedChange={(enabled) => setDraft({ ...draft, enabled })} label="Enabled" description="Can be selected by agent events." className="rounded-lg border border-border bg-surface-hover/20 p-3 md:col-span-2" />
      </div>
      <footer className="flex justify-end gap-2 border-t border-border/60 px-5 py-4"><Button size="sm" variant="secondary" onClick={() => setDraft(null)}>Cancel</Button><Button size="sm" onClick={save}><Save className="h-4 w-4" /> Save agent</Button></footer>
    </section>}

    <div className="space-y-2">{profiles.map((profile) => <div key={profile.id} className={`grid gap-3 rounded-xl border border-border p-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center ${profile.enabled ? 'bg-surface-hover/30' : 'opacity-55'}`}>
      <div className="min-w-0"><div className="flex items-center gap-2"><Bot className="h-4 w-4 text-primary" /><strong className="truncate">{profile.name}</strong><span className="rounded bg-surface-hover px-2 py-0.5 text-[10px] uppercase">{profile.mode || 'cli'}</span><span className="rounded bg-surface-hover px-2 py-0.5 text-[10px] uppercase">{profile.enabled ? 'enabled' : 'disabled'}</span></div><p className="mt-1 truncate font-mono text-xs text-text-secondary">{profile.command} {profile.args.join(' ')}</p></div>
      <div className="flex items-center gap-2"><Button size="sm" variant="secondary" onClick={() => setDraft(profile)}>Edit</Button><Button size="icon" variant="danger" title="Delete agent" onClick={() => removeProfile(profile.id)}><Trash2 className="h-4 w-4" /></Button></div>
    </div>)}{!profiles.length && <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-text-secondary">No AI agent profiles.</div>}</div>

    <section className="rounded-xl border border-border bg-surface-hover/20 p-4">
      <div className="flex items-center justify-between gap-3"><h4 className="flex items-center gap-2 font-black"><PlayCircle className="h-4 w-4 text-primary" /> Agent runs</h4><Button size="sm" variant="ghost" onClick={clearRuns}>Clear</Button></div>
      <div className="mt-3 max-h-64 space-y-2 overflow-y-auto">{runs.slice(0, 12).map((run) => <article key={run.id} className="rounded-lg border border-border bg-surface px-3 py-2 text-xs">
        <div className="flex justify-between gap-3"><strong className="truncate">{run.eventTitle}</strong><span className={run.status === 'failed' ? 'text-red-400' : 'text-emerald-500'}>{run.status}</span></div>
        <p className="mt-1 truncate text-text-secondary">{run.agentName} · {new Date(run.startedAt).toLocaleString()}</p>
        {(run.stdout || run.stderr) && <pre className="mt-2 max-h-24 overflow-auto whitespace-pre-wrap rounded bg-black/20 p-2">{run.stdout || run.stderr}</pre>}
      </article>)}{!runs.length && <p className="text-sm text-text-secondary">No agent runs yet.</p>}</div>
    </section>
  </div>;
}
