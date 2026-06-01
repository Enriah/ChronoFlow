import { useEffect, useState } from 'react';
import { Dashboard } from './components/Dashboard';
import { useAppStore } from './store/useAppStore';
import { usePlannerStore } from './store/usePlannerStore';
import { useAnalyticsStore } from './store/useAnalyticsStore';
import { useSessionTracker } from './hooks/useSessionTracker';
import { SyncManager } from './services/widgets/SyncManager';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { CountdownFloating } from './widgets/floating/CountdownFloating';
import { TimelineFloating } from './widgets/floating/TimelineFloating';
import { WeeklyFocusFloating } from './widgets/floating/WeeklyFocusFloating';

function App() {
  const hydrateApp = useAppStore(state => state.hydrate);
  const hydratePlanner = usePlannerStore(state => state.hydrate);
  const hydrateAnalytics = useAnalyticsStore(state => state.hydrate);
  
  const tick = useAppStore(state => state.tick);

  const [widgetType, setWidgetType] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      const win = getCurrentWindow();
      const params = new URLSearchParams(window.location.search);
      const type = params.get('widget');
      
      if (win.label.startsWith('widget-') || type) {
        setWidgetType(type || win.label.replace('widget-', ''));
      }
      
      await SyncManager.init();
    };
    
    init();
  }, []);

  useSessionTracker();

  useEffect(() => {
    hydrateApp();
    hydratePlanner();
    hydrateAnalytics();
  }, [hydrateApp, hydratePlanner, hydrateAnalytics]);

  useEffect(() => {
    // ALWAYS run the tick interval for rollover detection
    if (widgetType) return;

    const interval = setInterval(() => {
      tick();
    }, 1000); // 1s is enough for rollover and less battery intensive than 100ms when idle

    return () => clearInterval(interval);
  }, [tick, widgetType]);

  // Render Widget UI if we are in a widget window
  if (widgetType === 'countdown') return <CountdownFloating />;
  if (widgetType === 'timeline') return <TimelineFloating />;
  if (widgetType === 'weekly-focus') return <WeeklyFocusFloating />;

  return (
    <Dashboard />
  );
}

export default App;
