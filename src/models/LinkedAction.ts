export type LinkedActionType = 'app' | 'url' | 'folder' | 'file' | 'command';

export type LinkedAction = {
  id: string;
  type: LinkedActionType;
  label: string;
  aliases?: string[];
  value: string;
  workingDirectory?: string;
  enabled: boolean;
  requiresConfirmation: boolean;
  dangerLevel?: 'safe' | 'medium' | 'dangerous';
  createdAt: string;
  updatedAt: string;
};
