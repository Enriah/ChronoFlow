import { useAppStore } from '../../store/useAppStore';
import { useCompanionStore } from '../../store/useCompanionStore';
import { PersonalityManager } from '../../companion/personality/PersonalityManager';
import { MemoryService } from '../../companion/memory/MemoryService';
import { MemoryRecallService } from '../../companion/recall/MemoryRecallService';
import { format } from 'date-fns';

export class ContextBuilder {
  static buildContext(userMessage = '') {
    const appState = useAppStore.getState();
    // const plannerState = usePlannerStore.getState();
    // const analyticsState = useAnalyticsStore.getState(); // If needed
    const companionState = useCompanionStore.getState();

    const now = new Date();
    const todayStr = format(now, 'yyyy-MM-dd');
    const timeStr = format(now, 'HH:mm');

    // Current Activity
    const currentTask = appState.currentTask;
    const nextTask = appState.nextTask;

    // Today's Schedule (Limit to 10 items to save tokens)
    const todaySchedules = appState.schedules
      .slice(0, 10)
      .map(s => ({
        title: s.title,
        start: format(s.startTime, 'HH:mm'),
        end: format(s.endTime, 'HH:mm'),
        completed: s.completed
      }));

    const memoryQuery = [
      currentTask?.title,
      nextTask?.title,
      todaySchedules.map(s => s.title).join(' '),
    ].filter(Boolean).join(' ');

    const relevantMemories = MemoryService.getRelevantMemories(companionState.memories, {
      text: memoryQuery,
      limit: 8,
    }).map(m => `[${m.category}] ${m.content}`);

    // Context String
    const recallContext = userMessage && MemoryRecallService.isRecallQuestion(userMessage)
      ? `\n${MemoryRecallService.buildContext(userMessage, 5)}`
      : '';

    return `Time: ${timeStr} | Date: ${todayStr}
Task: ${currentTask?.title || 'None'} | Next: ${nextTask?.title || 'None'}
Schedule: ${todaySchedules.map(s => `${s.start}-${s.end}: ${s.title}${s.completed ? ' (Done)' : ''}`).join(', ')}
Relevant memory: ${relevantMemories.join('; ')}
User display name: ${companionState.profile.userDisplayName || 'Unknown'} | Address style: ${companionState.profile.userAddressStyle || 'user'}
Personality: ${companionState.profile.personality} | Style: ${companionState.profile.responseStyle}${recallContext}`;
  }

  static buildSystemPrompt() {
    const companionState = useCompanionStore.getState();
    const { name, personality, responseStyle } = companionState.profile;

    let basePrompt = `You are ${name}, a helpful AI companion living inside ChronoFlow, a productivity app. 
Your goal is to be a supportive partner, help the user stay focused, and provide casual, natural conversation.
Keep your responses ${responseStyle}. 
Personality: ${personality}.`;

    basePrompt += `\nTone instructions: ${PersonalityManager.getChatInstruction(companionState.profile)}`;
    basePrompt += `\nCall the user as "${companionState.profile.userAddressStyle || 'you'}" when it fits naturally. Their display name is "${companionState.profile.userDisplayName || 'the user'}". Do not hardcode pronouns.`;

    basePrompt += `\n\nAlways remember you are a character in their workspace, not a generic assistant. You have access to their schedule and tasks.`;

    return basePrompt;
  }
}
