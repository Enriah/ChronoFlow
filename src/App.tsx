import { useEffect, useState } from 'react';
import { Dashboard } from './components/Dashboard';
import { useAppStore } from './store/useAppStore';
import { usePlannerStore } from './store/usePlannerStore';
import { useAnalyticsStore } from './store/useAnalyticsStore';
import { useCompanionStore } from './store/useCompanionStore';
import { useSessionTracker } from './hooks/useSessionTracker';
import { useCompanionManager } from './hooks/useCompanionManager';
import { SyncManager } from './services/widgets/SyncManager';
import { Window, getCurrentWindow } from '@tauri-apps/api/window';
import { CountdownFloating } from './widgets/floating/CountdownFloating';
import { TimelineFloating } from './widgets/floating/TimelineFloating';
import { WeeklyFocusFloating } from './widgets/floating/WeeklyFocusFloating';

function App() {
  const hydrateApp = useAppStore(state => state.hydrate);
  const hydratePlanner = usePlannerStore(state => state.hydrate);
  const hydrateAnalytics = useAnalyticsStore(state => state.hydrate);
  const hydrateCompanion = useCompanionStore(state => state.hydrate);
  
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
      hydrateAnalytics();
      await hydrateCompanion();

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
  }, [hydrateApp, hydratePlanner, hydrateAnalytics, hydrateCompanion]);

  useSessionTracker();
  useCompanionManager();

  useEffect(() => {
    // ALWAYS run the interval for rollover detection, even in widgets
    const interval = setInterval(() => {
      if (widgetType) {
        checkRollover();
      } else {
        tick();
      }
    }, 1000); 

    return () => clearInterval(interval);
  }, [tick, checkRollover, widgetType]);

  // Don't render until stores are hydrated to avoid layout shifts or missing data
  if (!isReady) return null;

  // Render Widget UI if we are in a widget window
  if (widgetType === 'countdown') return <CountdownFloating />;
  if (widgetType === 'timeline') return <TimelineFloating />;
  if (widgetType === 'weekly-focus') return <WeeklyFocusFloating />;

  return (
    <Dashboard />
  );
}

export default App;
