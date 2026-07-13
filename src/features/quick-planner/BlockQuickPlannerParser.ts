import type { FlowStep } from '../../models/FlowStep';
import type { TimelineEvent, TimelineEventType, TimelineTrack } from '../../models/EventTimeline';
import type { LinkedAction } from '../../models/LinkedAction';
import type { PlannedTask } from '../../models/PlannedTask';
import type { AgentProfile } from '../../models/Agent';

type IssueLevel = 'error' | 'warning';

export type BlockQuickPlanIssue = {
  id: string;
  level: IssueLevel;
  message: string;
  rawText?: string;
};

export type BlockSessionDraft = {
  title: string;
  date?: string;
  startTime?: string;
  plannedDurationMinutes: number;
  description?: string;
  project?: string;
  tags: string[];
  notes?: string;
  flowSteps: FlowStep[];
  actions: string[];
};

export type BlockQuickPlanResult = {
  ok: boolean;
  originalText: string;
  tasks: PlannedTask[];
  sessions: BlockSessionDraft[];
  issues: BlockQuickPlanIssue[];
  confidence: 'high' | 'medium' | 'low';
};

type Block = { raw: string; inner: string; name: string; start: number; end: number };

const timelineTypes: TimelineEventType[] = ['action', 'agent', 'reminder', 'checklist', 'note', 'alert', 'flow_step'];
const id = () => crypto.randomUUID();

export const looksLikeBlockQuickPlan = (input: string) => /\b(?:use\s+)?(?:planner|session)\s+create\s+(?:task|session)\s*\(/iu.test(input)
  || /\bcreate\s+(?:task|session)\s*\(/iu.test(input);

const stripLineComments = (input: string) => {
  let result = '';
  let quote: '"' | "'" | null = null;
  for (let index = 0; index < input.length; index++) {
    const current = input[index];
    const next = input[index + 1];
    if (!quote && current === '/' && next === '/') {
      while (index < input.length && input[index] !== '\n') index += 1;
      result += '\n';
      continue;
    }
    if ((current === '"' || current === "'") && input[index - 1] !== '\\') {
      quote = quote === current ? null : quote || current;
    }
    result += current;
  }
  return result;
};

const unquote = (value = '') => value.trim().replace(/^["']|["']$/g, '').replace(/\\"/g, '"').replace(/\\'/g, "'");

const normalizeDate = (value?: string): string | undefined => {
  if (!value) return undefined;
  const raw = unquote(value).replace(/\s+/g, '');
  const ymd = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  const dmy = raw.match(/^(\d{1,2})[_/](\d{1,2})[_/](\d{4})$/);
  const match = ymd ? [ymd[3], ymd[2], ymd[1]] : dmy ? [dmy[1], dmy[2], dmy[3]] : null;
  if (!match) return undefined;
  const day = Number(match[0]); const month = Number(match[1]); const year = Number(match[2]);
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return undefined;
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
};

const normalizeTime = (value?: string): string | undefined => {
  if (!value) return undefined;
  const raw = unquote(value).toLowerCase().replace(/\s+/g, '').replace('_', ':');
  const match = raw.match(/^(\d{1,2})(?:(?::|h)(\d{1,2}))?$/);
  if (!match) return undefined;
  const hour = Number(match[1]); const minute = match[2] ? Number(match[2]) : 0;
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return undefined;
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
};

const timeToMinutes = (value: string) => Number(value.slice(0, 2)) * 60 + Number(value.slice(3));
const minutesToTime = (minutes: number) => `${String(Math.floor(minutes / 60) % 24).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
const numberValue = (value?: string, fallback = 0) => {
  const parsed = Number(unquote(value).replace(/[^\d.-]/g, ''));
  return Number.isFinite(parsed) ? parsed : fallback;
};
const boolValue = (value?: string, fallback = false) => {
  const raw = unquote(value).toLowerCase();
  if (['true', 'yes', 'on', '1'].includes(raw)) return true;
  if (['false', 'no', 'off', '0'].includes(raw)) return false;
  return fallback;
};
const listValue = (value?: string) => unquote(value).split(/[|,]/).map((item) => item.trim()).filter(Boolean);

const parseAssignments = (body: string) => {
  const values = new Map<string, string>();
  const matcher = /([a-z][\w.]*)\s*=\s*("(?:\\"|[^"])*"|'(?:\\'|[^'])*'|[^;\n}]+)/giu;
  for (const match of body.matchAll(matcher)) values.set(match[1].toLowerCase(), match[2].trim());
  return values;
};

const parseFlags = (body: string, prefix: string) => [...body.matchAll(new RegExp(`\\b${prefix}\\.([a-z][\\w-]*)\\b`, 'giu'))].map((match) => match[1].toLowerCase());

const normalizeMatchText = (value: string) => value
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().replace(/\s+/g, ' ');

const matchAction = (label: string | undefined, actions: LinkedAction[]) => {
  if (!label) return undefined;
  const needle = normalizeMatchText(label);
  const enabled = actions.filter((action) => action.enabled);
  return enabled.find((action) => normalizeMatchText(action.label) === needle)
    || enabled.find((action) => normalizeMatchText(action.label).includes(needle) || needle.includes(normalizeMatchText(action.label)));
};

const matchAgent = (label: string | undefined, agents: AgentProfile[]) => {
  if (!label) return undefined;
  const needle = normalizeMatchText(label);
  const enabled = agents.filter((agent) => agent.enabled);
  return enabled.find((agent) => normalizeMatchText(agent.name) === needle)
    || enabled.find((agent) => normalizeMatchText(agent.name).includes(needle) || needle.includes(normalizeMatchText(agent.name)));
};

function extractBlocks(input: string, matcher: RegExp): Block[] {
  const blocks: Block[] = [];
  for (const match of input.matchAll(matcher)) {
    const open = input.indexOf('{', match.index! + match[0].length - 1);
    if (open < 0) continue;
    let quote: '"' | "'" | null = null;
    let depth = 0;
    let close = -1;
    for (let index = open; index < input.length; index++) {
      const current = input[index];
      if ((current === '"' || current === "'") && input[index - 1] !== '\\') quote = quote === current ? null : quote || current;
      if (quote) continue;
      if (current === '{') depth += 1;
      if (current === '}') {
        depth -= 1;
        if (depth === 0) { close = index; break; }
      }
    }
    if (close < 0) continue;
    blocks.push({ raw: input.slice(match.index, close + 1), inner: input.slice(open + 1, close), name: unquote(match[1] || ''), start: match.index!, end: close + 1 });
  }
  return blocks;
}

const removeBlocks = (input: string, blocks: Block[]) => {
  let output = input;
  [...blocks].sort((a, b) => b.start - a.start).forEach((block) => {
    output = `${output.slice(0, block.start)}\n${output.slice(block.end)}`;
  });
  return output;
};

const issue = (level: IssueLevel, message: string, rawText?: string): BlockQuickPlanIssue => ({ id: id(), level, message, rawText });

const makeTrack = (name: string, order: number, type: TimelineTrack['type'] = 'custom'): TimelineTrack => {
  const now = new Date().toISOString();
  return { id: id(), name, type, visible: true, locked: false, muted: false, order, createdAt: now, updatedAt: now };
};

function parseFlowSteps(body: string, actions: LinkedAction[]): FlowStep[] {
  const stepBlocks = extractBlocks(body, /\bcreate\s+(?:flow|step)\s*\(\s*([^)]+?)\s*\)\s*\{/giu);
  return stepBlocks.map((block) => {
    const values = parseAssignments(block.inner);
    const actionsValue = listValue(values.get('actions') || values.get('action')).map((label) => matchAction(label, actions)?.id).filter(Boolean) as string[];
    return {
      id: id(),
      title: block.name || unquote(values.get('title')) || 'Untitled step',
      description: unquote(values.get('description')),
      plannedDurationMinutes: numberValue(values.get('duration') || values.get('plannedDurationMinutes'), 0) || undefined,
      checklist: listValue(values.get('checklist')).map((text) => ({ id: id(), text, done: false })),
      actions: actionsValue,
      status: 'pending',
    };
  });
}

function parseSessions(input: string, actions: LinkedAction[], issues: BlockQuickPlanIssue[]): BlockSessionDraft[] {
  const sessions = extractBlocks(input, /\b(?:use\s+)?session\s+create\s+session\s*\(\s*([^)]+?)\s*\)\s*\{/giu);
  return sessions.map((block) => {
    const values = parseAssignments(block.inner);
    const date = normalizeDate(values.get('date'));
    const startTime = normalizeTime(values.get('time.begin') || values.get('begin') || values.get('time'));
    const duration = Math.max(1, numberValue(values.get('duration'), 60));
    if (values.has('date') && !date) issues.push(issue('error', `Session “${block.name}” has an invalid date. Use day_month_year, e.g. 7_7_2026.`, block.raw));
    if ((values.has('time.begin') || values.has('begin')) && !startTime) issues.push(issue('error', `Session “${block.name}” has an invalid start time. Use hour_minute, e.g. 20_30.`, block.raw));
    const notes = [unquote(values.get('note')), date || startTime ? `Scheduled by mini-language: ${date || 'no date'} ${startTime || 'no time'}` : ''].filter(Boolean).join('\n');
    return {
      title: block.name || unquote(values.get('name')) || 'Untitled session',
      date,
      startTime,
      plannedDurationMinutes: duration,
      description: unquote(values.get('description')),
      project: unquote(values.get('project') || values.get('project.path')),
      tags: listValue(values.get('tags')),
      notes,
      flowSteps: parseFlowSteps(block.inner, actions),
      actions: listValue(values.get('actions') || values.get('action')).map((label) => matchAction(label, actions)?.id).filter(Boolean) as string[],
    };
  });
}

function parseEvent(block: Block, taskDate: string, taskStart: string, taskDuration: number, defaultTrackId: string, actions: LinkedAction[], agents: AgentProfile[], issues: BlockQuickPlanIssue[]): TimelineEvent {
  const values = parseAssignments(block.inner);
  const typeFlag = parseFlags(block.inner, 'type')[0];
  const typeValue = unquote(values.get('type')).toLowerCase();
  const type = (timelineTypes.includes(typeFlag as TimelineEventType) ? typeFlag : timelineTypes.includes(typeValue as TimelineEventType) ? typeValue : 'reminder') as TimelineEventType;
  const eventStart = normalizeTime(values.get('time.begin') || values.get('begin') || values.get('time'));
  const hasDuration = values.has('duration');
  const duration = type === 'agent' && !hasDuration ? undefined : Math.max(1, numberValue(values.get('duration'), 5));
  const actionLabel = unquote(values.get('action'));
  const action = matchAction(actionLabel, actions);
  const agentLabel = unquote(values.get('agent') || values.get('ai') || values.get('agent.profile'));
  const agent = matchAgent(agentLabel, agents);
  const taskStartMinutes = timeToMinutes(taskStart);
  const eventStartMinutes = eventStart ? timeToMinutes(eventStart) : taskStartMinutes;
  const offset = eventStartMinutes - taskStartMinutes;
  const endsAt = offset + (duration || 0);
  if (!eventStart && type !== 'agent') issues.push(issue('error', `Event "${block.name}" needs time.begin, e.g. time.begin = 20_35;`, block.raw));
  if ((eventStart || type !== 'agent') && (offset < 0 || endsAt > taskDuration)) issues.push(issue('error', `Event "${block.name}" must stay inside the parent task duration.`, block.raw));
  if (type === 'action' && actionLabel && !action) issues.push(issue('warning', `Action "${actionLabel}" was not found or is disabled.`, block.raw));
  if (type === 'agent' && agentLabel && !agent) issues.push(issue('warning', `Agent "${agentLabel}" was not found or is disabled.`, block.raw));
  const descriptionSource = unquote(values.get('description.from') || values.get('prompt.from')).toLowerCase();
  const onFail = unquote(values.get('on.fail') || values.get('onfail')).toLowerCase();
  const now = new Date().toISOString();
  return {
    id: id(),
    trackId: defaultTrackId,
    title: block.name || unquote(values.get('name')) || 'Untitled event',
    description: unquote(values.get('description')),
    type,
    offsetMinutes: Math.max(0, offset),
    durationMinutes: duration,
    absoluteStartTime: eventStart ? `${taskDate}T${minutesToTime(eventStartMinutes)}:00` : undefined,
    absoluteEndTime: eventStart && duration ? `${taskDate}T${minutesToTime(eventStartMinutes + duration)}:00` : undefined,
    actions: type === 'action' && action ? [action.id] : [],
    agentProfileId: type === 'agent' ? agent?.id : undefined,
    agentRunIds: [],
    agent: type === 'agent' ? {
      nextEventName: unquote(values.get('next') || values.get('next.event') || values.get('agent.next')) || undefined,
      timeoutMinutes: numberValue(values.get('timeout') || values.get('agent.timeout'), 0) || undefined,
      descriptionSource: descriptionSource === 'previous.output' || descriptionSource === 'previous_output' ? 'previous_output' : 'self',
      descriptionAppend: unquote(values.get('description.append') || values.get('prompt.append')) || undefined,
      requireApprovalBeforeNext: boolValue(values.get('require.approval') || values.get('agent.requireapproval'), false),
      writeOutputPath: unquote(values.get('write.output') || values.get('output.path')) || undefined,
      onFail: ['retry', 'fallback', 'manual'].includes(onFail) ? onFail as 'retry' | 'fallback' | 'manual' : 'stop',
    } : undefined,
    checklist: type === 'checklist' ? listValue(values.get('checklist')).map((text) => ({ id: id(), text, done: false })) : undefined,
    noteTemplate: type === 'note' ? unquote(values.get('note')) || block.name : undefined,
    triggerBehavior: {
      showPopup: boolValue(values.get('behavior.showpopup'), true),
      playSound: boolValue(values.get('behavior.sound'), false),
      autoDismiss: boolValue(values.get('behavior.autodismiss'), false),
      autoDismissAfterSeconds: numberValue(values.get('behavior.autodismissafter'), 30),
      requireUserAction: type === 'checklist',
      launchActionsOnStart: type === 'action',
      closeManagedActionsOnEnd: boolValue(values.get('behavior.closemanagedactions'), false),
      closeMode: 'soft',
      markCompletedOnEnd: true,
    },
    lifecycle: {},
    status: 'pending',
    createdAt: now,
    updatedAt: now,
  };
}

function parseTasks(input: string, actions: LinkedAction[], agents: AgentProfile[], issues: BlockQuickPlanIssue[]): PlannedTask[] {
  const taskBlocks = extractBlocks(input, /\b(?:(?:use\s+)?planner\s+)?create\s+task\s*\(\s*([^)]+?)\s*\)\s*\{/giu);
  return taskBlocks.map((block) => {
    const trackBlocks = extractBlocks(block.inner, /\b(?:use\s+task\s+)?create\s+track\s*(?:\(\s*([^)]+?)\s*\))?\s*\{/giu);
    const taskBody = removeBlocks(block.inner, trackBlocks);
    const values = parseAssignments(taskBody);
    const date = normalizeDate(values.get('date'));
    const startTime = normalizeTime(values.get('time.begin') || values.get('begin') || values.get('time'));
    const duration = Math.max(1, numberValue(values.get('duration'), 60));
    if (!date) issues.push(issue('error', `Task “${block.name}” needs a valid date, e.g. date = 7_7_2026;`, block.raw));
    if (!startTime) issues.push(issue('error', `Task “${block.name}” needs a valid time.begin, e.g. time.begin = 20_30;`, block.raw));

    const tracks: TimelineTrack[] = [];
    const events: TimelineEvent[] = [];
    const ensureLayerTrack = (layer: number) => {
      const name = `Layer ${layer}`;
      let track = tracks.find((item) => item.name === name);
      if (!track) {
        track = makeTrack(name, tracks.length, 'custom');
        tracks.push(track);
      }
      return track;
    };

    trackBlocks.forEach((trackBlock, index) => {
      const track = makeTrack(trackBlock.name || `Track ${index + 1}`, tracks.length, 'custom');
      tracks.push(track);
      const eventBlocks = extractBlocks(trackBlock.inner, /\bcreate\s+event\s*\(\s*([^)]+?)\s*\)\s*\{/giu);
      eventBlocks.forEach((eventBlock) => {
        const values = parseAssignments(eventBlock.inner);
        const layer = numberValue(values.get('layer'), 0);
        const targetTrack = layer > 0 ? ensureLayerTrack(layer) : track;
        events.push(parseEvent(eventBlock, date || '1970-01-01', startTime || '00:00', duration, targetTrack.id, actions, agents, issues));
      });
    });

    if (!tracks.length) tracks.push(makeTrack('Layer 1', 0, 'custom'));
    const endTime = startTime ? minutesToTime(timeToMinutes(startTime) + duration) : undefined;
    return {
      id: id(),
      title: block.name || unquote(values.get('title')) || 'Untitled task',
      description: unquote(values.get('description')),
      date: date || '1970-01-01',
      startTime,
      endTime,
      project: unquote(values.get('project') || values.get('project.path')),
      tags: listValue(values.get('tags')),
      plannedDurationMinutes: duration,
      priority: ['low', 'medium', 'high'].includes(unquote(values.get('priority')).toLowerCase()) ? unquote(values.get('priority')).toLowerCase() as PlannedTask['priority'] : undefined,
      status: 'planned',
      completed: false,
      timelineTracks: tracks,
      timelineEvents: events,
    };
  });
}

export function parseBlockQuickPlan(input: string, actions: LinkedAction[], agents: AgentProfile[] = []): BlockQuickPlanResult {
  const originalText = input;
  const stripped = stripLineComments(input);
  const issues: BlockQuickPlanIssue[] = [];
  const sessions = parseSessions(stripped, actions, issues);
  const withoutSessions = removeBlocks(stripped, extractBlocks(stripped, /\b(?:use\s+)?session\s+create\s+session\s*\(\s*([^)]+?)\s*\)\s*\{/giu));
  const tasks = parseTasks(withoutSessions, actions, agents, issues);
  if (!tasks.length && !sessions.length) issues.push(issue('error', 'No task or session block was found. Use create task(name) { ... } or use session create session(name) { ... }.'));
  const errorCount = issues.filter((item) => item.level === 'error').length;
  return {
    ok: errorCount === 0,
    originalText,
    tasks,
    sessions,
    issues,
    confidence: errorCount ? 'low' : issues.length ? 'medium' : 'high',
  };
}
