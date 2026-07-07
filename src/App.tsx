import { useEffect, useState } from 'react';
import { Dashboard } from './components/Dashboard';
import { useAppStore } from './store/useAppStore';
import { usePlannerStore } from './store/usePlannerStore';
import { useWorkSessionStore } from './core/sessions/useWorkSessionStore';
import { useSessionTemplateStore } from './features/session-templates/useSessionTemplateStore';
import { useDeveloperActionStore } from './features/developer-actions/useDeveloperActionStore';
import { useAgentStore } from './features/agents/useAgentStore';
import { SyncManager } from './services/widgets/SyncManager';
import { Window, getCurrentWindow } from '@tauri-apps/api/window';
import { CountdownFloating } from './widgets/floating/CountdownFloating';
import { TimelineRuntimeController } from './features/event-timeline/TimelineRuntimeController';
import { ScheduleTimelineController } from './features/event-timeline/ScheduleTimelineController';

function App() {
  const hydrateApp = useAppStore(state => state.hydrate);
  const hydratePlanner = usePlannerStore(state => state.hydrate);
  const hydrateSessions = useWorkSessionStore(state => state.hydrate);
  const hydrateTemplates = useSessionTemplateStore(state => state.hydrate);
  const hydrateActions = useDeveloperActionStore(state => state.hydrate);
  const hydrateAgents = useAgentStore(state => state.hydrate);
  const tickSessions = useWorkSessionStore(state => state.tick);
  
  const tick = useAppStore(state => state.tick);
  const checkRollover = useAppStore(state => state.checkRollover);

  const [widgetType, setWidgetType] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const init = async () => {
      const win = getCurrentWindow();
      const params = new URLSearchParams(window.location.search);
      const type = params.get('widget');
      
      const isWidget = win.label.startsWith('widget-') || !!type;
      if (isWidget) {
        setWidgetType(type || win.label.replace('widget-', ''));
      }
      
      await SyncManager.init();

      // Hydrate all stores
      hydrateApp();
      hydratePlanner();
      hydrateSessions();
      hydrateTemplates();
      hydrateActions();
      hydrateAgents();

      setIsReady(true);

      // Transition from splashscreen to main window if this is the main window
      if (!isWidget && win.label === 'main') {
        // Small delay to ensure the dashboard has started rendering
        setTimeout(async () => {
          try {
            const splash = await Window.getByLabel('splashscreen');
            if (splash) {
              await win.show();
              await splash.close();
            }
          } catch (e) {
            console.error('Splashscreen transition failed:', e);
            await win.show(); // Fallback: just show the main window
          }
        }, 800);
      }
    };
    
    init();
  }, [hydrateApp, hydratePlanner, hydrateSessions, hydrateTemplates, hydrateActions, hydrateAgents]);

  useEffect(() => {
    // ALWAYS run the interval for rollover detection, even in widgets
    const interval = setInterval(() => {
      if (widgetType) {
        checkRollover();
      } else {
        tick();
      }
      tickSessions();
    }, 1000); 

    return () => clearInterval(interval);
  }, [tick, checkRollover, tickSessions, widgetType]);

  // Don't render until stores are hydrated to avoid layout shifts or missing data
  if (!isReady) return null;

  // Render Widget UI if we are in a widget window
  if (widgetType === 'countdown') return <CountdownFloating />;

  return <><TimelineRuntimeController /><ScheduleTimelineController /><Dashboard /></>;
}

export default App;
