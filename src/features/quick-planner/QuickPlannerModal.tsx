import { useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, CheckCircle2, FileText, Layers3, Sparkles, Trash2, X } from 'lucide-react';
import { format } from 'date-fns';
import type { PlannedTask } from '../../models/PlannedTask';
import { usePlannerStore } from '../../store/usePlannerStore';
import { useWorkSessionStore } from '../../core/sessions/useWorkSessionStore';
import { useDeveloperActionStore } from '../developer-actions/useDeveloperActionStore';
import { useAgentStore } from '../agents/useAgentStore';
import { Button } from '../../components/ui/Button';
import { ToggleSwitch } from '../../components/ui/ToggleSwitch';
import { createStrictQuickPlanTask } from './StrictQuickPlannerPlan';
import { parseStrictQuickPlan, strictTimeToMinutes, type ParsedStrictTimelineEvent, type StrictQuickPlanParseResult, type StrictTimelineEventType } from './StrictQuickPlannerParser';
import { looksLikeBlockQuickPlan, parseBlockQuickPlan, type BlockQuickPlanResult } from './BlockQuickPlannerParser';

const eventTypes: StrictTimelineEventType[] = ['action', 'reminder', 'checklist', 'note', 'alert'];
type MiniLanguageSuggestion = { label: string; detail: string; insertText: string; kind: 'snippet' | 'field' | 'type' | 'action' | 'agent' | 'behavior' };

const currentCompletionToken = (value: string, cursor: number) => {
  const before = value.slice(0, cursor);
  const lineStart = before.lastIndexOf('\n') + 1;
  const line = before.slice(lineStart);
  const match = line.match(/[a-zA-Z][\w.:-]*$|$/);
  const token = match?.[0] || '';
  return { token, replaceStart: cursor - token.length, line };
};

const indentFor = (line: string) => line.match(/^\s*/)?.[0] || '';

const buildSuggestions = (date: Date, actions: ReturnType<typeof useDeveloperActionStore.getState>['actions'], agents: ReturnType<typeof useAgentStore.getState>['profiles']): MiniLanguageSuggestion[] => [
  {
    kind: 'snippet',
    label: 'task block',
    detail: 'Create a Planner task with one timeline track.',
    insertText: [
      `use planner create task(New Task){`,
      `  date = ${format(date, 'd_M_yyyy')};`,
      '  time.begin = 09_00;',
      '  duration = 60;',
      '  project.path = "C:/project";',
      '  tags = "focus|coding";',
      '  use task create track(Main){',
      '    create event(Reminder){',
      '      time.begin = 09_10;',
      '      type.reminder;',
      '      duration = 5;',
      '      behavior.showpopup = true;',
      '    }',
      '  }',
      '}',
    ].join('\n'),
  },
  {
    kind: 'snippet',
    label: 'session block',
    detail: 'Create a standalone Session draft.',
    insertText: [
      'use session create session(New Session){',
      `  date = ${format(date, 'd_M_yyyy')};`,
      '  time.begin = 09_00;',
      '  duration = 60;',
      '  description = "";',
      '  note = "";',
      '}',
    ].join('\n'),
  },
  {
    kind: 'snippet',
    label: 'agent event',
    detail: 'Trigger an AI agent from the timeline.',
    insertText: [
      'create event(Agent Task){',
      '  layer = 1;',
      '  time.begin = 09_15;',
      '  type.agent;',
      `  agent = "${agents.find((agent) => agent.enabled)?.name || 'Codex CLI'}";`,
      '  duration = 10;',
      '  description = "Describe what the agent should do."; ',
      '  behavior.showpopup = true;',
      '}',
    ].join('\n'),
  },
  {
    kind: 'snippet',
    label: 'action event',
    detail: 'Trigger a registered action from the timeline.',
    insertText: [
      'create event(Open Tool){',
      '  layer = 1;',
      '  time.begin = 09_05;',
      '  type.action;',
      `  action = "${actions.find((action) => action.enabled)?.label || 'Chrome'}";`,
      '  duration = 5;',
      '  behavior.showpopup = true;',
      '}',
    ].join('\n'),
  },
  { kind: 'field', label: 'date', detail: 'Date in day_month_year format.', insertText: `date = ${format(date, 'd_M_yyyy')};` },
  { kind: 'field', label: 'time.begin', detail: 'Start time in hour_minute format.', insertText: 'time.begin = 09_00;' },
  { kind: 'field', label: 'duration', detail: 'Duration in minutes.', insertText: 'duration = 60;' },
  { kind: 'field', label: 'project.path', detail: 'Project path or project name.', insertText: 'project.path = "C:/project";' },
  { kind: 'field', label: 'tags', detail: 'Pipe-separated tags.', insertText: 'tags = "coding|focus";' },
  { kind: 'field', label: 'priority', detail: 'Task priority.', insertText: 'priority = "medium";' },
  { kind: 'field', label: 'description', detail: 'Context or prompt text.', insertText: 'description = "";' },
  { kind: 'field', label: 'note', detail: 'Session note.', insertText: 'note = "";' },
  { kind: 'field', label: 'layer', detail: 'Timeline layer number.', insertText: 'layer = 1;' },
  { kind: 'type', label: 'type.agent', detail: 'Run an AI agent profile.', insertText: 'type.agent;' },
  { kind: 'type', label: 'type.action', detail: 'Run registered actions.', insertText: 'type.action;' },
  { kind: 'type', label: 'type.reminder', detail: 'Show a reminder event.', insertText: 'type.reminder;' },
  { kind: 'type', label: 'type.checklist', detail: 'Checklist event.', insertText: 'type.checklist;' },
  { kind: 'type', label: 'type.note', detail: 'Note prompt event.', insertText: 'type.note;' },
  { kind: 'type', label: 'type.alert', detail: 'Alert event.', insertText: 'type.alert;' },
  { kind: 'behavior', label: 'behavior.showpopup', detail: 'Show popup when event starts.', insertText: 'behavior.showpopup = true;' },
  { kind: 'behavior', label: 'behavior.sound', detail: 'Play event sound.', insertText: 'behavior.sound = true;' },
  { kind: 'behavior', label: 'behavior.autodismiss', detail: 'Auto-dismiss popup.', insertText: 'behavior.autodismiss = true;' },
  ...actions.filter((action) => action.enabled).map((action): MiniLanguageSuggestion => ({ kind: 'action', label: `action: ${action.label}`, detail: `${action.type} action`, insertText: `action = "${action.label}";` })),
  ...agents.filter((agent) => agent.enabled).map((agent): MiniLanguageSuggestion => ({ kind: 'agent', label: `agent: ${agent.name}`, detail: `${agent.mode || 'cli'} profile`, insertText: `agent = "${agent.name}";` })),
];

const sampleFor = (date: Date) => [
  `use planner create task(Fix CI Pipeline){`,
  `  date = ${format(date, 'd_M_yyyy')};`,
  '  time.begin = 09_30;',
  '  duration = 60;',
  '  project.path = "ChronoFlow";',
  '  tags = "ci|deploy";',
  '  priority = "high";',
  '  use task create track(Main){',
  '    create event(Open Chrome){',
  '      layer = 1;',
  '      time.begin = 09_45;',
  '      type.action;',
  '      action = "Chrome";',
  '      duration = 5;',
  '      behavior.showpopup = true;',
  '    }',
  '    create event(Check logs){',
  '      time.begin = 10_00;',
  '      type.reminder;',
  '      duration = 5;',
  '    }',
  '  }',
  '}',
].join('\n');
const languagePresets = [
  {
    name: 'Bulk DSL',
    ghost: true,
    body: (date: Date) => sampleFor(date),
  },
  {
    name: 'CI/CD check',
    ghost: true,
    body: (date: Date) => [
      `Day ${format(date, 'dd/MM/yyyy')}, from "09:00" to "09:45", "CI/CD check",`,
      'project "ChronoFlow", tags "ci|deploy", priority "high", preset "CI/CD",',
      'event(from "09:05" to "09:10", name "Open CI dashboard", action "CI Dashboard"),',
      'event(from "09:15" to "09:25", name "Check failed jobs", checklist "pipeline status|failed step|logs|artifact"),',
      'event(from "09:35" to "09:40", name "Write deploy note", note)',
    ].join('\n'),
  },
  {
    name: 'Deploy verify',
    ghost: true,
    body: (date: Date) => [
      `Day ${format(date, 'dd/MM/yyyy')}, from "14:00" to "15:00", "Deploy verification",`,
      'project "Production", tags "deploy|smoke-test", priority "high", preset "Deploy",',
      'event(from "14:05" to "14:10", name "Open dashboard", action "Dashboard"),',
      'event(from "14:15" to "14:35", name "Smoke test", checklist "health endpoint|login flow|critical page|error logs"),',
      'event(from "14:45" to "14:50", name "Release note", note)',
    ].join('\n'),
  },
  {
    name: 'Deep work',
    ghost: true,
    body: (date: Date) => [
      `Day ${format(date, 'dd/MM/yyyy')}, from "10:00" to "11:30", "Deep work block",`,
      'project "ChronoFlow", tags "coding|focus", priority "medium", preset "Focus",',
      'event(from "10:00" to "10:05", name "Open workspace", action "VS Code"),',
      'event(from "11:15" to "11:25", name "Summary", checklist "commit notes|next step|blockers")',
    ].join('\n'),
  },
];

export function QuickPlannerModal({ date, onClose, onCreated }: { date: Date; onClose: () => void; onCreated: (task: PlannedTask) => void }) {
  const actions = useDeveloperActionStore((state) => state.actions);
  const agentProfiles = useAgentStore((state) => state.profiles);
  const addTask = usePlannerStore((state) => state.addTask);
  const createSession = useWorkSessionStore((state) => state.create);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [text, setText] = useState(() => sampleFor(date));
  const [cursorIndex, setCursorIndex] = useState(0);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [selectedSuggestion, setSelectedSuggestion] = useState(0);
  const [plan, setPlan] = useState<StrictQuickPlanParseResult>();
  const [blockPlan, setBlockPlan] = useState<BlockQuickPlanResult>();
  const completionContext = useMemo(() => currentCompletionToken(text, cursorIndex), [cursorIndex, text]);
  const suggestions = useMemo(() => {
    const token = completionContext.token.toLowerCase();
    const all = buildSuggestions(date, actions, agentProfiles);
    const filtered = token
      ? all.filter((item) => `${item.label} ${item.detail}`.toLowerCase().includes(token)).slice(0, 10)
      : all.slice(0, 8);
    return filtered;
  }, [actions, agentProfiles, completionContext.token, date]);
  const updateCursor = () => setCursorIndex(textareaRef.current?.selectionStart || 0);
  const validationErrors = useMemo(() => {
    if (blockPlan) return blockPlan.issues.filter((issue) => issue.level === 'error').map((issue) => issue.message);
    if (!plan?.ok) return plan?.errors.map((error) => error.message) || [];
    const errors: string[] = [];
    if (!plan.date || !plan.title?.trim()) errors.push('Date and schedule name are required.');
    if (!plan.startTime || !plan.endTime || !/^\d{2}:\d{2}$/.test(plan.startTime) || !/^\d{2}:\d{2}$/.test(plan.endTime) || strictTimeToMinutes(plan.startTime) >= strictTimeToMinutes(plan.endTime)) errors.push('Schedule start must be before schedule end.');
    plan.events.forEach((event) => {
      if (!event.title.trim()) errors.push('Every event requires a name.');
      if (!/^\d{2}:\d{2}$/.test(event.startTime) || !/^\d{2}:\d{2}$/.test(event.endTime) || strictTimeToMinutes(event.startTime) >= strictTimeToMinutes(event.endTime)) errors.push(`${event.title || 'Event'} must end after it starts.`);
    });
    return errors;
  }, [blockPlan, plan]);

  const parse = () => {
    if (looksLikeBlockQuickPlan(text)) {
      setBlockPlan(parseBlockQuickPlan(text, actions, agentProfiles));
      setPlan(undefined);
      return;
    }
    setPlan(parseStrictQuickPlan(text, actions));
    setBlockPlan(undefined);
  };
  const insertSuggestion = (suggestion: MiniLanguageSuggestion) => {
    const { replaceStart, line } = completionContext;
    const cursor = textareaRef.current?.selectionStart ?? cursorIndex;
    const prefix = text.slice(0, replaceStart);
    const suffix = text.slice(cursor);
    const lineIsBlank = !line.trim();
    const needsNewlineBefore = prefix.length > 0 && !prefix.endsWith('\n') && !lineIsBlank && suggestion.kind === 'snippet';
    const insertion = `${needsNewlineBefore ? '\n' : ''}${lineIsBlank ? indentFor(line) : ''}${suggestion.insertText}`;
    const nextText = `${prefix}${insertion}${suffix}`;
    const nextCursor = prefix.length + insertion.length;
    setText(nextText);
    setPlan(undefined);
    setBlockPlan(undefined);
    setShowSuggestions(true);
    window.requestAnimationFrame(() => {
      textareaRef.current?.focus();
      textareaRef.current?.setSelectionRange(nextCursor, nextCursor);
      setCursorIndex(nextCursor);
    });
  };
  const patchPlan = (updates: Partial<StrictQuickPlanParseResult>) => setPlan((current) => {
    if (!current) return current;
    const next = { ...current, ...updates };
    if (next.startTime && next.endTime) {
      const start = strictTimeToMinutes(next.startTime); const end = strictTimeToMinutes(next.endTime);
      next.plannedDurationMinutes = Math.max(0, end - start);
      next.events = next.events.map((event) => ({ ...event, offsetMinutes: strictTimeToMinutes(event.startTime) - start }));
    }
    return next;
  });
  const patchEvent = (eventId: string, updates: Partial<ParsedStrictTimelineEvent>) => setPlan((current) => {
    if (!current) return current;
    const scheduleStart = current.startTime ? strictTimeToMinutes(current.startTime) : 0;
    const events = current.events.map((event) => {
      if (event.id !== eventId) return event;
      const next = { ...event, ...updates };
      const start = strictTimeToMinutes(next.startTime); const end = strictTimeToMinutes(next.endTime);
      return { ...next, offsetMinutes: start - scheduleStart, durationMinutes: Math.max(0, end - start) };
    });
    const actionResolvedOrRemoved = !!updates.matchedActionId || (updates.type !== undefined && updates.type !== 'action');
    const warnings = actionResolvedOrRemoved ? current.warnings.filter((warning) => !(warning.type === 'unknown_action' && warning.relatedEventId === eventId)) : current.warnings;
    return { ...current, events, warnings };
  });
  const removeEvent = (eventId: string) => setPlan((current) => current ? ({ ...current, events: current.events.filter((event) => event.id !== eventId), warnings: current.warnings.filter((warning) => warning.relatedEventId !== eventId) }) : current);
  const create = () => {
    if (blockPlan) {
      if (validationErrors.length) return;
      if (!window.confirm(`Create ${blockPlan.tasks.length} task(s) and ${blockPlan.sessions.length} session(s)?`)) return;
      blockPlan.tasks.forEach((task) => addTask(task));
      blockPlan.sessions.forEach((session) => createSession({
        title: session.title,
        description: session.description,
        project: session.project,
        tags: session.tags,
        plannedDurationMinutes: session.plannedDurationMinutes,
        actions: session.actions,
        flowSteps: session.flowSteps,
        notes: session.notes,
      }));
      if (blockPlan.tasks[0]) onCreated(blockPlan.tasks[0]);
      onClose();
      return;
    }
    if (!plan || validationErrors.length) return;
    if (!window.confirm(`Create “${plan.title}” with ${plan.events.length} timeline event(s)?`)) return;
    const task = createStrictQuickPlanTask({ ...plan, ok: true });
    addTask(task); onCreated(task); onClose();
  };

  return createPortal(<div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/70 p-4">
    <div className="flex max-h-[96vh] w-full max-w-7xl flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl">
      <header className="flex items-center justify-between border-b border-border px-6 py-5"><div><p className="text-[10px] font-black uppercase tracking-[.18em] text-primary">ChronoFlow mini-language</p><h2 className="mt-1 text-xl font-black">Create schedule from text</h2></div><button onClick={onClose} className="rounded-lg p-2 hover:bg-surface-hover"><X className="h-5 w-5" /></button></header>
      <div className="grid min-h-0 flex-1 overflow-y-auto lg:grid-cols-[.85fr_1.15fr]">
        <section className="border-b border-border p-5 lg:border-b-0 lg:border-r">
          <label className="text-xs font-bold">Strict command</label>
          <div className="mt-2 grid gap-2 sm:grid-cols-3">
            {languagePresets.map((preset) => <button key={preset.name} type="button" onClick={() => { setText(preset.body(date)); setPlan(undefined); }} className="rounded-xl border border-dashed border-primary/30 bg-primary/5 px-3 py-2 text-left text-xs text-text-secondary transition hover:border-primary hover:text-text">
              <span className="flex items-center gap-1 font-black text-primary"><Sparkles className="h-3.5 w-3.5" /> {preset.name}</span>
              <span className="mt-1 block opacity-60">ghost preset</span>
            </button>)}
          </div>
          <textarea ref={textareaRef} value={text} onSelect={updateCursor} onKeyUp={updateCursor} onClick={updateCursor} onFocus={() => setShowSuggestions(true)} onKeyDown={(event) => {
            if ((event.ctrlKey || event.metaKey) && event.code === 'Space') { event.preventDefault(); setShowSuggestions(true); return; }
            if (!showSuggestions || !suggestions.length) return;
            if (event.key === 'ArrowDown') { event.preventDefault(); setSelectedSuggestion((index) => Math.min(suggestions.length - 1, index + 1)); }
            if (event.key === 'ArrowUp') { event.preventDefault(); setSelectedSuggestion((index) => Math.max(0, index - 1)); }
            if (event.key === 'Tab') { event.preventDefault(); insertSuggestion(suggestions[selectedSuggestion] || suggestions[0]); }
            if (event.key === 'Escape') { event.preventDefault(); setShowSuggestions(false); }
          }} onChange={(event) => { setText(event.target.value); setCursorIndex(event.target.selectionStart); setSelectedSuggestion(0); setShowSuggestions(true); setPlan(undefined); setBlockPlan(undefined); }} className="mt-2 min-h-[360px] w-full resize-y rounded-xl border border-border p-4 font-mono text-sm leading-6" spellCheck={false} />
          {showSuggestions && <div className="mt-2 overflow-hidden rounded-xl border border-border bg-surface-muted">
            <div className="flex items-center justify-between border-b border-border/60 px-3 py-2 text-[10px] font-black uppercase tracking-wider text-text-secondary"><span>IntelliSense</span><span>Tab insert · Ctrl+Space show · Esc hide</span></div>
            <div className="max-h-56 overflow-y-auto p-2">
              {suggestions.map((suggestion, index) => <button key={`${suggestion.kind}-${suggestion.label}`} type="button" onMouseDown={(event) => { event.preventDefault(); insertSuggestion(suggestion); }} onMouseEnter={() => setSelectedSuggestion(index)} className={`grid w-full grid-cols-[88px_minmax(0,1fr)] gap-3 rounded-lg px-3 py-2 text-left text-xs transition ${index === selectedSuggestion ? 'bg-primary/15 text-text' : 'hover:bg-surface-hover/70'}`}>
                <span className="rounded bg-surface-hover px-2 py-1 text-center text-[9px] font-black uppercase text-primary">{suggestion.kind}</span>
                <span className="min-w-0"><strong className="block truncate">{suggestion.label}</strong><span className="block truncate text-text-secondary">{suggestion.detail}</span></span>
              </button>)}
              {!suggestions.length && <p className="px-3 py-4 text-center text-xs text-text-secondary">No suggestions for “{completionContext.token}”.</p>}
            </div>
          </div>}
          <details className="mt-4 rounded-xl border border-border bg-surface-muted p-4 text-xs" open><summary className="cursor-pointer font-bold">Syntax reminder</summary><pre className="mt-3 whitespace-pre-wrap text-text-secondary">{'Block DSL:\nuse planner create task(Task Name){\n  date = 7_7_2026;\n  time.begin = 20_30;\n  duration = 60;\n  project.path = "C:/repo";\n  use task create track(Main){\n    create event(Event Name){\n      layer = 1;\n      time.begin = 20_35;\n      type.agent; // action, agent, checklist, note, alert\n      agent = "Codex CLI";\n      description = "Check deploy logs and summarize blockers.";\n      duration = 20;\n      behavior.showpopup = true;\n    }\n  }\n}\n\nuse session create session(Session Name){\n  date = 7_7_2026;\n  time.begin = 20_30;\n  duration = 60;\n  description = "";\n  note = "";\n}\n\nClassic text syntax is still supported.'}</pre></details>
          <div className="mt-4 flex justify-end"><Button onClick={parse}><FileText className="h-4 w-4" /> Parse</Button></div>
        </section>
        <section className="min-h-[520px] p-5">
          {!plan && !blockPlan && <div className="flex h-full min-h-80 flex-col items-center justify-center text-center text-text-secondary"><FileText className="mb-3 h-8 w-8 opacity-40" /><p className="font-bold">Parse the command to review the plan.</p><p className="mt-1 text-sm">Nothing is created before confirmation.</p></div>}
          {blockPlan && <BlockPlanPreview plan={blockPlan} />}
          {plan && <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-black">Preview</h3><p className="text-xs text-text-secondary">Confidence: {plan.confidence}</p></div>{plan.ok && !validationErrors.length && <span className="flex items-center gap-1 text-xs font-bold text-emerald-500"><CheckCircle2 className="h-4 w-4" /> Ready to create</span>}</div>
            {!!plan.errors.length && <MessageList tone="error" messages={plan.errors.map((error) => error.message)} />}
            {!!plan.warnings.length && <MessageList tone="warning" messages={plan.warnings.map((warning) => warning.message)} />}
            {plan.ok && <>
              <div className="grid gap-3 rounded-xl border border-border bg-surface-muted p-4 sm:grid-cols-2">
                <label className="sm:col-span-2"><span className="text-xs font-bold">Schedule name</span><input value={plan.title || ''} onChange={(event) => patchPlan({ title: event.target.value })} className="mt-1 w-full rounded-lg border border-border p-2.5" /></label>
                <label><span className="text-xs font-bold">Date</span><input type="date" value={plan.date || ''} onChange={(event) => patchPlan({ date: event.target.value })} className="mt-1 w-full rounded-lg border border-border p-2.5" /></label>
                <div className="grid grid-cols-2 gap-2"><label><span className="text-xs font-bold">Start</span><input type="time" value={plan.startTime || ''} onChange={(event) => patchPlan({ startTime: event.target.value })} className="mt-1 w-full rounded-lg border border-border p-2.5" /></label><label><span className="text-xs font-bold">End</span><input type="time" value={plan.endTime || ''} onChange={(event) => patchPlan({ endTime: event.target.value })} className="mt-1 w-full rounded-lg border border-border p-2.5" /></label></div>
                <label><span className="text-xs font-bold">Project</span><input value={plan.project || ''} onChange={(event) => patchPlan({ project: event.target.value })} className="mt-1 w-full rounded-lg border border-border p-2.5" /></label>
                <label><span className="text-xs font-bold">Tags</span><input value={plan.tags?.join(', ') || ''} onChange={(event) => patchPlan({ tags: event.target.value.split(',').map((tag) => tag.trim()).filter(Boolean) })} className="mt-1 w-full rounded-lg border border-border p-2.5" /></label>
              </div>
              <div className="space-y-3">{plan.events.map((event, index) => <EventPreview key={event.id} event={event} index={index} actions={actions} onPatch={(updates) => patchEvent(event.id, updates)} onRemove={() => removeEvent(event.id)} />)}{!plan.events.length && <p className="rounded-xl border border-border p-4 text-sm text-text-secondary">This command creates a schedule block without timeline events.</p>}</div>
              {!!validationErrors.length && <MessageList tone="error" messages={validationErrors} />}
            </>}
          </div>}
        </section>
      </div>
      <footer className="flex items-center justify-end border-t border-border px-6 py-4"><div className="flex gap-2"><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={create} disabled={!(plan?.ok || blockPlan?.ok) || validationErrors.length > 0}>{blockPlan ? 'Create bulk plan' : 'Create plan'}</Button></div></footer>
    </div>
  </div>, document.body);
}

function MessageList({ tone, messages }: { tone: 'error' | 'warning'; messages: string[] }) {
  const warning = tone === 'warning';
  return <div className={`rounded-xl border p-3 text-sm ${warning ? 'border-amber-500/30 bg-amber-500/10 text-amber-400' : 'border-red-500/30 bg-red-500/10 text-red-400'}`}>{messages.map((message, index) => <div key={`${message}-${index}`} className="flex gap-2"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /><span>{message}</span></div>)}</div>;
}

function BlockPlanPreview({ plan }: { plan: BlockQuickPlanResult }) {
  const errors = plan.issues.filter((issue) => issue.level === 'error').map((issue) => issue.message);
  const warnings = plan.issues.filter((issue) => issue.level === 'warning').map((issue) => issue.message);
  return <div className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h3 className="font-black">Bulk preview</h3><p className="text-xs text-text-secondary">Confidence: {plan.confidence} · {plan.tasks.length} task(s) · {plan.sessions.length} session(s)</p></div>
      {plan.ok && <span className="flex items-center gap-1 text-xs font-bold text-emerald-500"><CheckCircle2 className="h-4 w-4" /> Ready to create</span>}
    </div>
    {!!errors.length && <MessageList tone="error" messages={errors} />}
    {!!warnings.length && <MessageList tone="warning" messages={warnings} />}
    <div className="grid gap-3">
      {plan.tasks.map((task) => <article key={task.id} className="rounded-xl border border-border bg-surface-muted p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><p className="text-[10px] font-black uppercase tracking-wider text-primary">Planner task</p><h4 className="font-black">{task.title}</h4><p className="mt-1 text-xs text-text-secondary">{task.date} · {task.startTime} → {task.endTime} · {task.plannedDurationMinutes}m</p></div>
          <span className="inline-flex items-center gap-1 rounded-lg bg-surface-hover px-2 py-1 text-xs text-text-secondary"><Layers3 className="h-3.5 w-3.5" /> {task.timelineEvents?.length || 0} events</span>
        </div>
        {!!task.timelineEvents?.length && <div className="mt-3 grid gap-2 sm:grid-cols-2">{task.timelineEvents.map((event) => <div key={event.id} className="rounded-lg border border-border/60 bg-surface px-3 py-2 text-xs"><strong>{event.title}</strong><span className="ml-2 text-text-secondary">{event.type} · +{event.offsetMinutes}m · {event.durationMinutes || 0}m</span></div>)}</div>}
      </article>)}
      {plan.sessions.map((session, index) => <article key={`${session.title}-${index}`} className="rounded-xl border border-border bg-surface-muted p-4">
        <p className="text-[10px] font-black uppercase tracking-wider text-primary">Session</p>
        <h4 className="font-black">{session.title}</h4>
        <p className="mt-1 text-xs text-text-secondary">{session.date || 'No date'} · {session.startTime || 'No time'} · {session.plannedDurationMinutes}m · {session.flowSteps.length} flow step(s)</p>
        {session.description && <p className="mt-2 text-sm text-text-secondary">{session.description}</p>}
      </article>)}
    </div>
  </div>;
}

function EventPreview({ event, index, actions, onPatch, onRemove }: { event: ParsedStrictTimelineEvent; index: number; actions: ReturnType<typeof useDeveloperActionStore.getState>['actions']; onPatch: (updates: Partial<ParsedStrictTimelineEvent>) => void; onRemove: () => void }) {
  return <article className="rounded-xl border border-border p-4">
    <div className="mb-3 flex items-center justify-between"><strong className="text-sm">Event {index + 1}</strong><button onClick={onRemove} className="text-red-400"><Trash2 className="h-4 w-4" /></button></div>
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="sm:col-span-2"><span className="text-xs font-bold">Name</span><input value={event.title} onChange={(change) => onPatch({ title: change.target.value })} className="mt-1 w-full rounded-lg border border-border p-2" /></label>
      <label><span className="text-xs font-bold">Type</span><select value={event.type} onChange={(change) => { const type = change.target.value as StrictTimelineEventType; onPatch({ type, matchedActionId: type === 'action' ? event.matchedActionId : undefined, unresolvedActionLabel: type === 'action' ? event.unresolvedActionLabel : undefined, triggerBehavior: { ...event.triggerBehavior, launchActionsOnStart: type === 'action', closeManagedActionsOnEnd: type === 'action' && event.triggerBehavior.closeManagedActionsOnEnd } }); }} className="mt-1 w-full rounded-lg border border-border p-2">{eventTypes.map((type) => <option key={type}>{type}</option>)}</select></label>
      <div className="grid grid-cols-2 gap-2"><label><span className="text-xs font-bold">Start</span><input type="time" value={event.startTime} onChange={(change) => onPatch({ startTime: change.target.value })} className="mt-1 w-full rounded-lg border border-border p-2" /></label><label><span className="text-xs font-bold">End</span><input type="time" value={event.endTime} onChange={(change) => onPatch({ endTime: change.target.value })} className="mt-1 w-full rounded-lg border border-border p-2" /></label></div>
      {event.type === 'action' && <label className="sm:col-span-2"><span className="text-xs font-bold">Registered action</span><select value={event.matchedActionId || ''} onChange={(change) => { const action = actions.find((item) => item.id === change.target.value); onPatch({ matchedActionId: action?.id, actionLabel: action?.label || event.actionLabel, unresolvedActionLabel: action ? undefined : event.actionLabel }); }} className="mt-1 w-full rounded-lg border border-border p-2"><option value="">Unresolved — do not launch</option>{actions.filter((action) => action.enabled).map((action) => <option key={action.id} value={action.id}>{action.label} · {action.type}</option>)}</select></label>}
      {event.type === 'checklist' && <label className="sm:col-span-2"><span className="text-xs font-bold">Checklist · one item per line</span><textarea value={event.checklist?.map((item) => item.text).join('\n') || ''} onChange={(change) => onPatch({ checklist: change.target.value.split('\n').filter(Boolean).map((itemText, itemIndex) => ({ id: event.checklist?.[itemIndex]?.id || crypto.randomUUID(), text: itemText, done: false })) })} className="mt-1 min-h-24 w-full rounded-lg border border-border p-2" /></label>}
      <div className="sm:col-span-2 grid gap-2 sm:grid-cols-2"><ToggleSwitch checked={event.triggerBehavior.autoDismiss} onCheckedChange={(autoDismiss) => onPatch({ triggerBehavior: { ...event.triggerBehavior, autoDismiss, autoDismissAfterSeconds: autoDismiss ? (event.triggerBehavior.autoDismissAfterSeconds || 30) : undefined } })} label="Auto dismiss" />{event.type === 'action' && <ToggleSwitch checked={event.triggerBehavior.closeManagedActionsOnEnd} onCheckedChange={(closeManagedActionsOnEnd) => onPatch({ triggerBehavior: { ...event.triggerBehavior, closeManagedActionsOnEnd } })} label="Auto close managed actions" />}</div>
      {event.triggerBehavior.autoDismiss && <label><span className="text-xs font-bold">Dismiss after (seconds)</span><input type="number" min={1} value={event.triggerBehavior.autoDismissAfterSeconds || 30} onChange={(change) => onPatch({ triggerBehavior: { ...event.triggerBehavior, autoDismissAfterSeconds: Math.max(1, Number(change.target.value) || 30) } })} className="mt-1 w-full rounded-lg border border-border p-2" /></label>}
    </div>
  </article>;
}
