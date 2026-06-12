import { useCompanionStore } from '../../store/useCompanionStore';
import { chooseReactionTemplate, type CompanionEventType, type TemplatePayload } from '../messages/ReactionTemplates';
import { PersonalityManager } from '../personality/PersonalityManager';

export type CompanionEventPayload = TemplatePayload & {
  taskId?: string;
};

const EVENT_COOLDOWNS: Partial<Record<CompanionEventType, number>> = {
  task_completed: 2 * 60 * 1000,
  focus_session_completed: 10 * 60 * 1000,
  relationship: 12 * 60 * 60 * 1000,
};

const GLOBAL_POPUP_COOLDOWN = 3 * 60 * 1000;

const sessionState = {
  appOpenedShown: false,
  lateNightShown: false,
  shownMilestones: new Set<number>(),
  lastEventTimes: {} as Partial<Record<CompanionEventType, number>>,
  lastPopupTime: 0,
};

function canEmit(eventType: CompanionEventType, payload: CompanionEventPayload, now: number) {
  if (eventType === 'app_opened' && sessionState.appOpenedShown) return false;
  if (eventType === 'late_night_usage' && sessionState.lateNightShown) return false;

  if (eventType === 'streak_milestone') {
    const milestone = payload.milestone || payload.streak;
    if (!milestone || sessionState.shownMilestones.has(milestone)) return false;
  }

  const cooldown = EVENT_COOLDOWNS[eventType] || 0;
  const lastEventTime = sessionState.lastEventTimes[eventType] || 0;
  if (cooldown > 0 && now - lastEventTime < cooldown) return false;

  if (now - sessionState.lastPopupTime < GLOBAL_POPUP_COOLDOWN) return false;

  return true;
}

function markEmitted(eventType: CompanionEventType, payload: CompanionEventPayload, now: number) {
  sessionState.lastEventTimes[eventType] = now;
  sessionState.lastPopupTime = now;

  if (eventType === 'app_opened') sessionState.appOpenedShown = true;
  if (eventType === 'late_night_usage') sessionState.lateNightShown = true;

  if (eventType === 'streak_milestone') {
    const milestone = payload.milestone || payload.streak;
    if (milestone) sessionState.shownMilestones.add(milestone);
  }
}

export function emitCompanionEvent(eventType: CompanionEventType, payload: CompanionEventPayload = {}) {
  try {
    const { config, profile } = useCompanionStore.getState();
    if (config.popupEnabled === false) return;

    const now = Date.now();
    if (!canEmit(eventType, payload, now)) return;

    const personality = PersonalityManager.normalize(profile.personality);
    const message = chooseReactionTemplate(personality, eventType, payload)
      ?.replace(/\{address\}/g, profile.userAddressStyle || 'you')
      ?.replace(/\{user\}/g, profile.userDisplayName || profile.userAddressStyle || 'you');
    if (!message) return;

    markEmitted(eventType, payload, now);

    window.dispatchEvent(new CustomEvent('companion-popup', {
      detail: {
        eventType,
        message,
      },
    }));
  } catch (error) {
    console.error('CompanionEventManager: failed to emit event', error);
  }
}
