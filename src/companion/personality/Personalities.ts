export type CompanionPersonality = 'calm' | 'friendly' | 'caring' | 'professional' | 'energetic' | 'custom';

export interface PersonalityDefinition {
  id: CompanionPersonality;
  label: string;
  chatInstruction: string;
  popupStyle: string;
}

export const PERSONALITIES: Record<CompanionPersonality, PersonalityDefinition> = {
  calm: {
    id: 'calm',
    label: 'Calm',
    chatInstruction: 'Be soothing, patient, concise, and help the user reduce stress.',
    popupStyle: 'quiet and steady',
  },
  friendly: {
    id: 'friendly',
    label: 'Friendly',
    chatInstruction: 'Be warm, casual, encouraging, and naturally conversational.',
    popupStyle: 'warm and casual',
  },
  caring: {
    id: 'caring',
    label: 'Caring',
    chatInstruction: 'Be gentle, attentive, supportive, and mindful of rest and wellbeing.',
    popupStyle: 'gentle and attentive',
  },
  professional: {
    id: 'professional',
    label: 'Professional',
    chatInstruction: 'Be concise, practical, direct, and focused on productivity.',
    popupStyle: 'clear and efficient',
  },
  energetic: {
    id: 'energetic',
    label: 'Energetic',
    chatInstruction: 'Be upbeat, motivating, brief, and momentum-focused.',
    popupStyle: 'upbeat and motivating',
  },
  custom: {
    id: 'custom',
    label: 'Custom',
    chatInstruction: 'Follow the user-provided custom tone instruction while keeping responses useful.',
    popupStyle: 'custom',
  },
};

export const DEFAULT_PERSONALITY: CompanionPersonality = 'friendly';
