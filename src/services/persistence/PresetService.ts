import { useThemeStore } from '../../store/useThemeStore';
import { useAudioStore } from '../../store/useAudioStore';
import { usePlannerStore } from '../../store/usePlannerStore';
import { useAppStore } from '../../store/useAppStore';
import { useWorkSessionStore } from '../../core/sessions/useWorkSessionStore';
import { useDeveloperActionStore } from '../../features/developer-actions/useDeveloperActionStore';
import { LocalStorageService } from './storage';
import type { WorkSession } from '../../models/WorkSession';
import type { LinkedAction } from '../../models/LinkedAction';

interface SystemBackup {
  version: string; timestamp: string;
  theme: { activeEnvironment: any; savedPresets: any[] };
  audio: { assignments: any; globalVolume: number; eventSettings: any };
  planner: { tasks: any[] }; app: { schedules: any[] };
  sessions?: WorkSession[]; actions?: LinkedAction[];
}

export const PresetService = {
  exportPreset() {
    const theme = useThemeStore.getState(); const audio = useAudioStore.getState();
    const backup: SystemBackup = {
      version: '2.0.0', timestamp: new Date().toISOString(),
      theme: { activeEnvironment: theme.activeEnvironment, savedPresets: theme.savedPresets },
      audio: { assignments: audio.assignments, globalVolume: audio.globalVolume, eventSettings: audio.eventSettings },
      planner: { tasks: usePlannerStore.getState().tasks }, app: { schedules: useAppStore.getState().schedules },
      sessions: useWorkSessionStore.getState().sessions,
      actions: useDeveloperActionStore.getState().actions,
    };
    const url = URL.createObjectURL(new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' }));
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = `chronoflow_backup_${new Date().toISOString().split('T')[0]}.json`; document.body.appendChild(anchor); anchor.click();
    setTimeout(() => { anchor.remove(); URL.revokeObjectURL(url); }, 1000);
  },
  async importPreset(file: File): Promise<void> {
    const backup = JSON.parse(await file.text()) as SystemBackup;
    if (!backup.theme || !backup.audio || !backup.planner || !backup.app) throw new Error('Invalid ChronoFlow backup.');
    useThemeStore.setState({ activeEnvironment: backup.theme.activeEnvironment, savedPresets: backup.theme.savedPresets });
    useAudioStore.setState({ assignments: backup.audio.assignments, globalVolume: backup.audio.globalVolume, eventSettings: backup.audio.eventSettings });
    usePlannerStore.setState({ tasks: backup.planner.tasks }); LocalStorageService.savePlannedTasks(backup.planner.tasks);
    useAppStore.setState({ schedules: backup.app.schedules }); LocalStorageService.saveSchedules(backup.app.schedules);
    if (Array.isArray(backup.sessions)) { useWorkSessionStore.setState({ sessions: backup.sessions, activeSession: backup.sessions.find((session) => ['running', 'paused', 'overdue'].includes(session.status)) || null }); LocalStorageService.saveWorkSessions(backup.sessions); }
    if (Array.isArray(backup.actions)) { useDeveloperActionStore.setState({ actions: backup.actions }); localStorage.setItem('chronoflow_developer_actions_v2', JSON.stringify(backup.actions)); }
    useAppStore.getState().hydrate();
  },
};
