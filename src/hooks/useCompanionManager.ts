import { useEffect } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { emitCompanionEvent } from '../companion/events/CompanionEventManager';
import { JournalService } from '../companion/journal/JournalService';
import { RelationshipService } from '../companion/relationship/RelationshipService';
import { useCompanionGlobalPushToTalk } from './useCompanionGlobalPushToTalk';
import { useCompanionWakeWord } from './useCompanionWakeWord';

export function useCompanionManager() {
  useCompanionGlobalPushToTalk();
  useCompanionWakeWord();

  useEffect(() => {
    const initPresence = async () => {
      try {
        const win = getCurrentWindow();
        if (win.label !== 'main') return;

        setTimeout(() => emitCompanionEvent('app_opened'), 1200);

        const hour = new Date().getHours();
        if (hour >= 23 || hour < 5) {
          setTimeout(() => emitCompanionEvent('late_night_usage'), 5000);
        }

        setTimeout(() => {
          JournalService.ensureMissingReflections().catch((error) => {
            console.error('CompanionManager: failed to check journal reflections', error);
          });
          RelationshipService.refreshRelationship().catch((error) => {
            console.error('CompanionManager: failed to refresh relationship', error);
          });
        }, 2500);
      } catch (error) {
        console.error('CompanionManager: failed to initialize presence', error);
      }
    };

    initPresence();
  }, []);

  // Companion Journal
  useEffect(() => {
    const handleRollover = async (event: any) => {
      const win = getCurrentWindow();
      if (win.label !== 'main') return;

      const { previousDay } = event.detail;
      JournalService.ensureDailyReflection(previousDay).catch((error) => {
        console.error('CompanionManager: failed to create daily reflection', error);
      });
      JournalService.ensureCompletedPeriodSummaries(previousDay).catch((error) => {
        console.error('CompanionManager: failed to create period journal summary', error);
      });
    };

    const handleBeforeUnload = () => {
      JournalService.upsertDailyStats(JournalService.todayKey()).catch((error) => {
        console.error('CompanionManager: failed to save journal stats before unload', error);
      });
    };
    const handleRelationshipRefresh = () => {
      RelationshipService.refreshRelationship().catch((error) => {
        console.error('CompanionManager: failed to refresh relationship', error);
      });
    };

    window.addEventListener('day-rollover', handleRollover);
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('companion-relationship-refresh', handleRelationshipRefresh);
    return () => {
      window.removeEventListener('day-rollover', handleRollover);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('companion-relationship-refresh', handleRelationshipRefresh);
    };
  }, []);
}
