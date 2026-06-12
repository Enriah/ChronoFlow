import type { CompanionAction } from '../../models/companion/types';

export type ActionIntentResult =
  | {
      kind: 'matched';
      action: CompanionAction;
      matchedAlias: string;
      requestedTarget: string;
    }
  | {
      kind: 'unknown';
      requestedTarget: string;
    }
  | {
      kind: 'none';
    };

const OPEN_VERBS = [
  'open',
  'launch',
  'start',
  'run',
  'skip',
  'next',
  'end',
  'finish',
  'stop',
  'mo',
  'bat',
  'chay',
  'bo qua',
  'ket thuc',
  'chuyen',
];

function stripVietnamese(input: string) {
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
}

export function normalizeActionText(input: string) {
  return stripVietnamese(input)
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function containsPhrase(text: string, phrase: string) {
  const normalizedPhrase = normalizeActionText(phrase);
  if (!normalizedPhrase) return false;
  return new RegExp(`(^|\\s)${normalizedPhrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(\\s|$)`, 'u').test(text);
}

function extractTarget(text: string) {
  for (const verb of OPEN_VERBS) {
    const normalizedVerb = normalizeActionText(verb);
    const match = text.match(new RegExp(`(^|\\s)${normalizedVerb}(\\s+)(.+)$`, 'u'));
    if (match?.[3]) return match[3].trim();
  }
  return '';
}

export class ActionIntentService {
  static detect(message: string, actions: CompanionAction[]): ActionIntentResult {
    const normalized = normalizeActionText(message);
    if (!normalized) return { kind: 'none' };

    const hasOpenVerb = OPEN_VERBS.some((verb) => containsPhrase(normalized, verb));
    if (!hasOpenVerb) return { kind: 'none' };

    const enabledActions = actions.filter((action) => action.enabled !== false);
    const candidates = enabledActions.flatMap((action) => {
      const aliases = Array.from(new Set([action.label, action.id, ...(action.aliases || [])]));
      return aliases.map((alias) => ({ action, alias, normalizedAlias: normalizeActionText(alias) }));
    }).filter((candidate) => candidate.normalizedAlias);

    const matched = candidates
      .filter((candidate) => containsPhrase(normalized, candidate.normalizedAlias))
      .sort((a, b) => b.normalizedAlias.length - a.normalizedAlias.length)[0];

    if (matched) {
      console.info('[CompanionActions] Local action intent matched', {
        requestedText: message,
        actionId: matched.action.id,
        matchedAlias: matched.alias,
      });
      return {
        kind: 'matched',
        action: matched.action,
        matchedAlias: matched.alias,
        requestedTarget: matched.alias,
      };
    }

    const requestedTarget = extractTarget(normalized);
    console.info('[CompanionActions] Open request did not match registry', {
      requestedText: message,
      requestedTarget,
    });
    return {
      kind: 'unknown',
      requestedTarget,
    };
  }
}
