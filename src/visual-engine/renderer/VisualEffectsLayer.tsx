import { useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useThemeStore } from '../../store/useThemeStore';
import { VisualEngine } from '../core/VisualEngine';
import { createCanvasEffects } from '../effects';
import { adaptCustomEffectColors, createAdaptiveEffectPalette, isLightThemeBackground } from '../core/effectPalette';
import { isEffectAllowedForTheme } from '../../themes/special/registry';

export function VisualEffectsLayer() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<VisualEngine | null>(null);
  const isEditing = useThemeStore((state) => state.isEditing);
  const activeEnvironment = useThemeStore((state) => state.activeEnvironment);
  const draftEnvironment = useThemeStore((state) => state.draftEnvironment);
  const performanceMode = useThemeStore((state) => state.performanceMode);
  const theme = useThemeStore((state) => state.getTheme());
  const environment = isEditing ? draftEnvironment : activeEnvironment;
  const visibleEffects = useMemo(
    () => environment.effects.map((effect) => !isEffectAllowedForTheme(environment.themeId, effect.id)
      ? { ...effect, enabled: false }
      : effect),
    [environment.effects, environment.themeId],
  );
  const enabledCount = visibleEffects.filter((effect) => effect.enabled).length;
  const colorMode = isLightThemeBackground(theme.colors.background) ? 'light' : 'dark';
  const adaptivePalette = useMemo(() => createAdaptiveEffectPalette(theme.effects, theme.colors.background), [theme]);
  const adaptiveConfigs = useMemo(() => adaptCustomEffectColors(visibleEffects, theme.colors.background), [visibleEffects, theme.colors.background]);

  useEffect(() => {
    if (!canvasRef.current) return;
    const engine = new VisualEngine();
    engine.setCanvas(canvasRef.current);
    createCanvasEffects().forEach((effect) => engine.register(effect));
    engine.start();
    engineRef.current = engine;
    return () => {
      engine.destroy();
      engineRef.current = null;
    };
  }, []);

  useEffect(() => {
    engineRef.current?.setPerformanceMode(performanceMode);
    engineRef.current?.configure(adaptiveConfigs, adaptivePalette);
  }, [adaptiveConfigs, adaptivePalette, performanceMode]);

  return createPortal(
    <canvas
      ref={canvasRef}
      data-visual-engine="canvas"
      data-active-effects={enabledCount}
      data-effect-color-mode={colorMode}
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 19,
        width: '100vw',
        height: '100vh',
        pointerEvents: 'none',
      }}
    />,
    document.body,
  );
}
