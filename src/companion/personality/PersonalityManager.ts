import type { CompanionProfile } from '../../models/companion/types';
import { DEFAULT_PERSONALITY, PERSONALITIES, type CompanionPersonality } from './Personalities';

export class PersonalityManager {
  static normalize(personality?: string): CompanionPersonality {
    if (personality && personality in PERSONALITIES) {
      return personality as CompanionPersonality;
    }

    return DEFAULT_PERSONALITY;
  }

  static getChatInstruction(profile: CompanionProfile): string {
    const personality = this.normalize(profile.personality);

    if (personality === 'custom' && profile.customPrompt?.trim()) {
      return profile.customPrompt.trim();
    }

    return PERSONALITIES[personality].chatInstruction;
  }

  static getPopupStyle(profile: CompanionProfile): string {
    const personality = this.normalize(profile.personality);

    if (personality === 'custom' && profile.customPrompt?.trim()) {
      return `custom: ${profile.customPrompt.trim()}`;
    }

    return PERSONALITIES[personality].popupStyle;
  }
}
