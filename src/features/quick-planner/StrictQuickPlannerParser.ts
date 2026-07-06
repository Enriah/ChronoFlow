import type { LinkedAction } from '../../models/LinkedAction';

export type StrictTimelineEventType = 'action' | 'reminder' | 'checklist' | 'note' | 'alert';

export type ParsedStrictTimelineEvent = {
  id: string;
  rawText: string;
  title: string;
  type: StrictTimelineEventType;
  startTime: string;
  endTime: string;
  offsetMinutes: number;
  durationMinutes: number;
  actionLabel?: string;
  matchedActionId?: string;
  unresolvedActionLabel?: string;
  checklist?: { id: string; text: string; done: boolean }[];
  triggerBehavior: {
    showPopup: boolean;
    playSound: boolean;
    autoDismiss: boolean;
    autoDismissAfterSeconds?: number;
    launchActionsOnStart: boolean;
    closeManagedActionsOnEnd: boolean;
  };
};

export type StrictQuickPlanWarning = {
  id: string;
  type: 'event_outside_schedule' | 'unknown_action' | 'event_overlap' | 'auto_close_enabled' | 'missing_optional_field';
  message: string;
  relatedEventId?: string;
};

export type StrictQuickPlanError = {
  id: string;
  type: 'missing_day' | 'invalid_date' | 'missing_schedule_time' | 'invalid_schedule_time' | 'missing_schedule_name' | 'invalid_event_syntax' | 'invalid_event_time' | 'missing_event_name' | 'unknown_event_type';
  message: string;
  rawText?: string;
};

export type StrictQuickPlanParseResult = {
  ok: boolean;
  originalText: string;
  date?: string;
  startTime?: string;
  endTime?: string;
  title?: string;
  plannedDurationMinutes?: number;
  events: ParsedStrictTimelineEvent[];
  warnings: StrictQuickPlanWarning[];
  errors: StrictQuickPlanError[];
  confidence: 'high' | 'medium' | 'low';
};

const id = () => typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : Math.random().toString(36).slice(2);
export const strictTimeToMinutes = (value: string) => Number(value.slice(0, 2)) * 60 + Number(value.slice(3));

export function normalizeStrictTime(value: string): string | null {
  const normalized = value.trim().replace(/^['"]|['"]$/g, '').toLowerCase().replace(/\s+/g, '');
  const match = normalized.match(/^(\d{1,2})(?:(?:h|:)(\d{0,2}))?$/);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = match[2] ? Number(match[2]) : 0;
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

function normalizeDate(value: string): string | null {
  const match = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) return null;
  const day = Number(match[1]); const month = Number(match[2]); const year = Number(match[3]);
  const date = new Date(year, month - 1, day);
  if (year < 1900 || date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

const normalizeMatchText = (value: string) => value
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().replace(/\s+/g, ' ');

function matchAction(label: string, actions: LinkedAction[]) {
  const needle = normalizeMatchText(label);
  const enabled = actions.filter((action) => action.enabled);
  const aliases = (action: LinkedAction) => (action.aliases || []).map(normalizeMatchText);
  return enabled.find((action) => aliases(action).includes(needle))
    || enabled.find((action) => normalizeMatchText(action.label) === needle)
    || enabled.find((action) => {
      const candidate = normalizeMatchText(action.label);
      return candidate.includes(needle) || needle.includes(candidate) || aliases(action).some((alias) => alias.includes(needle) || needle.includes(alias));
    });
}

type EventChunk = { raw: string; inner?: string; valid: boolean };
function extractEvents(input: string): { main: string; chunks: EventChunk[] } {
  const matcher = /\bevent\d*\s*\(/giu;
  const matches = [...input.matchAll(matcher)];
  if (!matches.length) return { main: input, chunks: [] };
  const chunks: EventChunk[] = [];
  for (const match of matches) {
    const start = match.index!;
    let depth = 0; let quote = false; let end = -1;
    for (let index = start; index < input.length; index++) {
      const character = input[index];
      if (character === '"' && input[index - 1] !== '\\') quote = !quote;
      if (quote) continue;
      if (character === '(') depth += 1;
      if (character === ')') {
        depth -= 1;
        if (depth === 0) { end = index; break; }
      }
    }
    const raw = end >= 0 ? input.slice(start, end + 1) : input.slice(start).trim();
    chunks.push({ raw, inner: end >= 0 ? raw.slice(raw.indexOf('(') + 1, -1) : undefined, valid: end >= 0 });
  }
  return { main: input.slice(0, matches[0].index).replace(/[\s,]+$/g, ''), chunks };
}

const valueAfter = (text: string, key: string) => {
  const match = text.match(new RegExp(`\\b${key}\\s+(?:"([^"]+)"|'([^']+)'|([^,]+))`, 'iu'));
  return (match?.[1] || match?.[2] || match?.[3] || '').trim();
};
const booleanAfter = (text: string, key: string, fallback = false) => {
  const match = text.match(new RegExp(`\\b${key}\\s+(true|false)\\b`, 'iu'));
  return match ? match[1].toLowerCase() === 'true' : fallback;
};

export function parseStrictQuickPlan(input: string, actions: LinkedAction[]): StrictQuickPlanParseResult {
  const errors: StrictQuickPlanError[] = [];
  const warnings: StrictQuickPlanWarning[] = [];
  const events: ParsedStrictTimelineEvent[] = [];
  const { main, chunks } = extractEvents(input.trim());

  const dayMatch = main.match(/\b(?:day|ngày|ngay)\s+(\d{1,2}\/\d{1,2}\/\d{4})\b/iu);
  const date = dayMatch ? normalizeDate(dayMatch[1]) : undefined;
  if (!dayMatch) errors.push({ id: id(), type: 'missing_day', message: 'Expected “Day DD/MM/YYYY”.' });
  else if (!date) errors.push({ id: id(), type: 'invalid_date', message: `“${dayMatch[1]}” is not a valid DD/MM/YYYY calendar date.` });

  const scheduleTimeMatch = main.match(/\bfrom\s+("?'?\d{1,2}(?:(?:h|:)\d{0,2})?"?'?)\s+to\s+("?'?\d{1,2}(?:(?:h|:)\d{0,2})?"?'?)/iu);
  const startTime = scheduleTimeMatch ? normalizeStrictTime(scheduleTimeMatch[1]) : undefined;
  const endTime = scheduleTimeMatch ? normalizeStrictTime(scheduleTimeMatch[2]) : undefined;
  if (!scheduleTimeMatch) errors.push({ id: id(), type: 'missing_schedule_time', message: 'Expected schedule time: from “HH:mm” to “HH:mm”.' });
  else if (!startTime || !endTime || strictTimeToMinutes(startTime) >= strictTimeToMinutes(endTime)) errors.push({ id: id(), type: 'invalid_schedule_time', message: 'Schedule start and end must be valid, with start before end.' });

  let title = '';
  if (scheduleTimeMatch) {
    const remainder = main.slice((scheduleTimeMatch.index || 0) + scheduleTimeMatch[0].length).replace(/^\s*,\s*/, '').trim();
    title = (remainder.match(/^"([^"]+)"/)?.[1] || remainder.match(/^'([^']+)'/)?.[1] || remainder.replace(/,$/, '').trim());
  }
  if (!title) errors.push({ id: id(), type: 'missing_schedule_name', message: 'Schedule name is required after the schedule time.' });

  const scheduleStart = startTime ? strictTimeToMinutes(startTime) : 0;
  const scheduleEnd = endTime ? strictTimeToMinutes(endTime) : 0;

  for (const chunk of chunks) {
    if (!chunk.valid || !chunk.inner) {
      errors.push({ id: id(), type: 'invalid_event_syntax', message: 'Event is missing a closing parenthesis.', rawText: chunk.raw });
      continue;
    }
    const eventTimeMatch = chunk.inner.match(/\bfrom\s+("?'?\d{1,2}(?:(?:h|:)\d{0,2})?"?'?)\s+to\s+("?'?\d{1,2}(?:(?:h|:)\d{0,2})?"?'?)/iu);
    const eventStart = eventTimeMatch ? normalizeStrictTime(eventTimeMatch[1]) : null;
    const eventEnd = eventTimeMatch ? normalizeStrictTime(eventTimeMatch[2]) : null;
    if (!eventStart || !eventEnd || strictTimeToMinutes(eventStart) >= strictTimeToMinutes(eventEnd)) {
      errors.push({ id: id(), type: 'invalid_event_time', message: 'Event requires valid from/to times with start before end.', rawText: chunk.raw });
      continue;
    }
    const eventTitle = valueAfter(chunk.inner, 'name');
    if (!eventTitle) {
      errors.push({ id: id(), type: 'missing_event_name', message: 'Event name is required.', rawText: chunk.raw });
      continue;
    }

    const actionLabel = valueAfter(chunk.inner, 'action');
    const checklistText = valueAfter(chunk.inner, 'checklist');
    const standaloneType = chunk.inner.match(/(?:^|,)\s*(reminder|note|alert)\s*(?=,|$)/iu)?.[1]?.toLowerCase() as StrictTimelineEventType | undefined;
    const type: StrictTimelineEventType | undefined = actionLabel ? 'action' : checklistText ? 'checklist' : standaloneType;
    if (!type) {
      errors.push({ id: id(), type: 'unknown_event_type', message: 'Use action, reminder, checklist, note, or alert.', rawText: chunk.raw });
      continue;
    }

    const eventId = id();
    const matchedAction = actionLabel ? matchAction(actionLabel, actions) : undefined;
    const autoDismiss = booleanAfter(chunk.inner, 'autoDismiss');
    const autoDismissSeconds = Number(chunk.inner.match(/\bautoDismissAfter\s+(\d+)\s*s\b/iu)?.[1] || 0) || undefined;
    const autoClose = booleanAfter(chunk.inner, 'autoClose');
    const startMinutes = strictTimeToMinutes(eventStart); const endMinutes = strictTimeToMinutes(eventEnd);
    const parsed: ParsedStrictTimelineEvent = {
      id: eventId, rawText: chunk.raw, title: eventTitle, type, startTime: eventStart, endTime: eventEnd,
      offsetMinutes: startMinutes - scheduleStart, durationMinutes: endMinutes - startMinutes,
      actionLabel: actionLabel || undefined, matchedActionId: matchedAction?.id,
      unresolvedActionLabel: actionLabel && !matchedAction ? actionLabel : undefined,
      checklist: type === 'checklist' ? checklistText.split('|').map((text) => text.trim()).filter(Boolean).map((text) => ({ id: id(), text, done: false })) : undefined,
      triggerBehavior: {
        showPopup: true,
        playSound: booleanAfter(chunk.inner, 'sound'),
        autoDismiss,
        autoDismissAfterSeconds: autoDismiss ? (autoDismissSeconds || 30) : undefined,
        launchActionsOnStart: type === 'action',
        closeManagedActionsOnEnd: autoClose,
      },
    };
    events.push(parsed);
    if (actionLabel && !matchedAction) warnings.push({ id: id(), type: 'unknown_action', message: `Action “${actionLabel}” was not found or is disabled.`, relatedEventId: eventId });
    if (autoClose) warnings.push({ id: id(), type: 'auto_close_enabled', message: `“${eventTitle}” will close only resources managed by this event.`, relatedEventId: eventId });
    if (startTime && endTime && (startMinutes < scheduleStart || endMinutes > scheduleEnd)) warnings.push({ id: id(), type: 'event_outside_schedule', message: `“${eventTitle}” is outside the schedule time block.`, relatedEventId: eventId });
  }

  for (let left = 0; left < events.length; left++) {
    for (let right = left + 1; right < events.length; right++) {
      const a = events[left]; const b = events[right];
      if (strictTimeToMinutes(a.startTime) < strictTimeToMinutes(b.endTime) && strictTimeToMinutes(b.startTime) < strictTimeToMinutes(a.endTime)) {
        warnings.push({ id: id(), type: 'event_overlap', message: `“${a.title}” overlaps “${b.title}”.`, relatedEventId: b.id });
      }
    }
  }

  const ok = errors.length === 0;
  return {
    ok, originalText: input, date: date || undefined, startTime: startTime || undefined, endTime: endTime || undefined, title: title || undefined,
    plannedDurationMinutes: startTime && endTime ? scheduleEnd - scheduleStart : undefined,
    events, warnings, errors,
    confidence: !ok ? 'low' : warnings.length ? 'medium' : 'high',
  };
}
