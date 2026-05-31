import { useEffect, useRef } from 'react';
import { useAppStore } from '../store/useAppStore';
import { useAnalyticsStore } from '../store/useAnalyticsStore';
import type { TaskSession } from '../models/TaskSession';

export function useSessionTracker() {
  const currentTask = useAppStore(state => state.currentTask);
  const isRunning = useAppStore(state => state.isRunning);
  const addSession = useAnalyticsStore(state => state.addSession);
  
  const lastTaskRef = useRef(currentTask);
  const startTimeRef = useRef(Date.now());

  useEffect(() => {
    const now = Date.now();
    
    // If task changed or timer stopped/started
    if (lastTaskRef.current?.id !== currentTask?.id || !isRunning) {
      // Record session for previous task if it existed
      if (lastTaskRef.current) {
        const endTime = now;
        const duration = endTime - startTimeRef.current;
        
        // Only record if duration is significant (e.g., > 1 second)
        if (duration > 1000) {
          const session: TaskSession = {
            id: crypto.randomUUID(),
            taskId: lastTaskRef.current.id,
            taskName: lastTaskRef.current.title,
            startTime: startTimeRef.current,
            endTime,
            duration,
          };
          addSession(session);
        }
      }
      
      // Update refs for new task
      lastTaskRef.current = currentTask;
      startTimeRef.current = now;
    }
  }, [currentTask, isRunning, addSession]);
}
