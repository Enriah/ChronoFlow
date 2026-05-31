export type AudioEventType =
  | 'taskStarted'
  | 'taskEndingSoon'
  | 'taskCompleted'
  | 'nextTaskStarting'
  | 'plannerReminder'
  | 'warningNotification';

export interface NotificationSound {
  id: string;
  name: string;
  isDefault?: boolean;
  mimeType?: string;
  data?: ArrayBuffer; // Binary representation for IndexedDB
  url?: string;       // Blob Object URL generated at runtime
}

export interface AudioEventSetting {
  soundId: string;
  volume: number;     // 0.0 to 1.0
  enabled: boolean;
}
