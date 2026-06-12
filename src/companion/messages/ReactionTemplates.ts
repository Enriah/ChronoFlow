import type { CompanionPersonality } from '../personality/Personalities';

export type CompanionEventType =
  | 'app_opened'
  | 'task_started'
  | 'task_completed'
  | 'focus_session_completed'
  | 'schedule_finished'
  | 'late_night_usage'
  | 'streak_milestone'
  | 'relationship';

export type TemplatePayload = {
  taskName?: string;
  streak?: number;
  milestone?: number;
  relationshipMessage?: string;
};

type TemplateGroup = Record<CompanionEventType, string[]>;

export const REACTION_TEMPLATES: Record<CompanionPersonality, TemplateGroup> = {
  calm: {
    app_opened: ['Welcome back. One step at a time.', 'A fresh session begins.', 'Settle in. We can start gently.'],
    task_started: ['Now focusing on {taskName}.', 'Begin with a steady pace.', 'One clear task: {taskName}.'],
    task_completed: ['Steady progress.', 'Done. Let that count.', 'A clean step forward.'],
    focus_session_completed: ['Session complete. Take a breath.', 'Good focus. Pause for a moment.', 'That block is finished.'],
    schedule_finished: ['Your schedule is complete.', 'Everything planned is done for today.', 'Today\'s list is clear.'],
    late_night_usage: ['It is late. Keep rest in view.', 'Still here? Consider winding down soon.', 'A gentle reminder to rest soon.'],
    streak_milestone: ['A steady {milestone}-day streak.', '{milestone} days of consistency.', 'Your rhythm is holding: {milestone} days.'],
    relationship: ['{relationshipMessage}', 'A quiet milestone: {relationshipMessage}', 'Worth remembering: {relationshipMessage}'],
  },
  friendly: {
    app_opened: ['Hey, welcome back!', 'Good to see you again.', 'Ready when you are.'],
    task_started: ['Nice, starting {taskName}.', 'You\'ve got {taskName} now.', 'Let\'s get into {taskName}.'],
    task_completed: ['Nice, another task done!', 'That one is checked off.', 'Good work finishing that.'],
    focus_session_completed: ['Focus session wrapped.', 'Nice session. You stayed with it.', 'That was a solid focus block.'],
    schedule_finished: ['All done for today!', 'Your schedule is cleared.', 'That is the full day handled.'],
    late_night_usage: ['Still awake? Don\'t forget to rest soon.', 'Late session tonight. Be kind to yourself.', 'One more thing, then rest?'],
    streak_milestone: ['You hit a {milestone}-day streak!', '{milestone} days in a row. Nice.', 'That streak is growing: {milestone} days.'],
    relationship: ['{relationshipMessage}', 'We just added this to our history: {relationshipMessage}', 'A little shared-history moment: {relationshipMessage}'],
  },
  caring: {
    app_opened: ['I\'m here with you.', 'Welcome back. How are you feeling?', 'Let\'s keep today manageable.'],
    task_started: ['Starting {taskName}. I\'ll stay nearby.', 'Take it gently with {taskName}.', 'One task now: {taskName}.'],
    task_completed: ['You did it. Take a small breath.', 'That is done. Be proud of the effort.', 'Finished. Let yourself reset.'],
    focus_session_completed: ['Focus finished. Please stretch a little.', 'Good effort. Rest your eyes for a moment.', 'Session done. Your energy matters too.'],
    schedule_finished: ['You completed today\'s plan.', 'That is enough for today\'s schedule.', 'Your planned work is done. Rest can count too.'],
    late_night_usage: ['Still awake? Don\'t forget to rest soon.', 'It is late. Your body needs care too.', 'Maybe save the next push for tomorrow.'],
    streak_milestone: ['A {milestone}-day streak. You have been showing up.', '{milestone} steady days. That matters.', 'You reached {milestone} days. Please celebrate gently.'],
    relationship: ['{relationshipMessage}', 'I want to remember this with you: {relationshipMessage}', 'This feels worth keeping: {relationshipMessage}'],
  },
  professional: {
    app_opened: ['ChronoFlow is ready.', 'Session active.', 'Schedule loaded.'],
    task_started: ['Task started: {taskName}.', 'Focus block active.', 'Current task: {taskName}.'],
    task_completed: ['Task completed.', 'Progress recorded.', 'Item closed.'],
    focus_session_completed: ['Focus session completed.', 'Session finished successfully.', 'Focus block closed.'],
    schedule_finished: ['Daily schedule completed.', 'All scheduled items are done.', 'No remaining scheduled tasks today.'],
    late_night_usage: ['Late-night usage detected. Consider rest.', 'It is late. Recovery may improve output.', 'Current time suggests winding down.'],
    streak_milestone: ['Streak milestone reached: {milestone} days.', '{milestone}-day focus streak recorded.', 'Consistency marker: {milestone} days.'],
    relationship: ['{relationshipMessage}', 'Milestone recorded: {relationshipMessage}', 'Shared history updated: {relationshipMessage}'],
  },
  energetic: {
    app_opened: ['You\'re back. Let\'s move!', 'Ready to build momentum!', 'New session, fresh energy!'],
    task_started: ['Go time for {taskName}!', '{taskName} is live. Let\'s go!', 'Lock in. {taskName} starts now!'],
    task_completed: ['Done! Keep the momentum!', 'That is a win!', 'Great finish. Next level!'],
    focus_session_completed: ['Focus block crushed!', 'Strong session. Keep rolling!', 'That was a solid push!'],
    schedule_finished: ['Full schedule cleared!', 'Everything planned is done!', 'You ran the table today!'],
    late_night_usage: ['Late night power mode. Remember recovery!', 'Still going! Rest soon to recharge.', 'Big energy, but sleep matters too!'],
    streak_milestone: ['Huge! {milestone} days in a row!', '{milestone}-day streak unlocked!', 'Momentum milestone: {milestone} days!'],
    relationship: ['{relationshipMessage}', 'New shared milestone! {relationshipMessage}', 'That belongs on the timeline: {relationshipMessage}'],
  },
  custom: {
    app_opened: ['Welcome back.', 'I\'m here.', 'Ready when you are.'],
    task_started: ['Starting {taskName}.', 'Now focusing on {taskName}.', '{taskName} begins now.'],
    task_completed: ['Task complete.', 'Done.', 'Progress made.'],
    focus_session_completed: ['Focus session complete.', 'Session done.', 'That focus block is finished.'],
    schedule_finished: ['Schedule complete.', 'Today\'s plan is done.', 'All scheduled items are finished.'],
    late_night_usage: ['It is late. Remember to rest.', 'Consider winding down soon.', 'Rest matters too.'],
    streak_milestone: ['{milestone}-day streak reached.', 'Milestone reached: {milestone} days.', 'Consistency: {milestone} days.'],
    relationship: ['{relationshipMessage}', 'Milestone saved: {relationshipMessage}', 'Remembering this: {relationshipMessage}'],
  },
};

export function chooseReactionTemplate(
  personality: CompanionPersonality,
  eventType: CompanionEventType,
  payload: TemplatePayload = {},
): string {
  const templates = REACTION_TEMPLATES[personality]?.[eventType] || REACTION_TEMPLATES.friendly[eventType];
  const selected = templates[Math.floor(Math.random() * templates.length)] || '';

  return selected
    .replaceAll('{taskName}', payload.taskName || 'this task')
    .replaceAll('{streak}', String(payload.streak || payload.milestone || 0))
    .replaceAll('{milestone}', String(payload.milestone || payload.streak || 0))
    .replaceAll('{relationshipMessage}', payload.relationshipMessage || 'We reached a new shared milestone.');
}
