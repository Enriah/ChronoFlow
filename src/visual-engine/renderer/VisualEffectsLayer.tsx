import React, { useEffect, useRef } from 'react';
import { visualEngine } from '../core/VisualEngine';
import { RainEffect } from '../effects/rain/RainEffect';
import { SakuraEffect } from '../effects/sakura/SakuraEffect';
import { MatrixEffect } from '../effects/matrix/MatrixEffect';
import { StarsEffect } from '../effects/stars/StarsEffect';
import { SnowEffect } from '../effects/snow/SnowEffect';
import { ElectricityEffect } from '../effects/electricity/ElectricityEffect';
import { FogEffect } from '../effects/fog/FogEffect';
import { useThemeStore } from '../../store/useThemeStore';

export const VisualEffectsLayer: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isEditing = useThemeStore(state => state.isEditing);
  const activeEnv = useThemeStore(state => state.activeEnvironment);
  const draftEnv = useThemeStore(state => state.draftEnvironment);
  
  const env = isEditing ? draftEnv : activeEnv;
  const theme = useThemeStore(state => state.getTheme());
  const performanceMode = useThemeStore(state => state.performanceMode);

  useEffect(() => {
    // Apply performance settings
    visualEngine.setPerformanceMode(performanceMode);
    if (performanceMode) {
      visualEngine.setRenderScale(0.4); // Down from 0.5
      visualEngine.setTargetFPS(15);    // Down from 20
    } else {
      visualEngine.setRenderScale(0.7); // Down from 0.75
      visualEngine.setTargetFPS(30);
    }
  }, [performanceMode]);

  useEffect(() => {
    if (canvasRef.current) {
      visualEngine.setCanvas(canvasRef.current);
      
      // Register all effects
      visualEngine.registerEffect(new RainEffect());
      visualEngine.registerEffect(new SakuraEffect());
      visualEngine.registerEffect(new MatrixEffect());
      visualEngine.registerEffect(new StarsEffect());
      visualEngine.registerEffect(new SnowEffect());
      visualEngine.registerEffect(new ElectricityEffect());
      visualEngine.registerEffect(new FogEffect());

      const effectConfigs = env.effects.reduce((acc, effect) => {
        acc[effect.id] = {
          intensity: effect.intensity,
          speed: effect.speed,
          enabled: effect.enabled
        };
        return acc;
      }, {} as Record<string, { intensity: number, speed: number, enabled: boolean }>);

      visualEngine.start(effectConfigs, theme.effects);
    }

    return () => {
      visualEngine.destroy();
    };
  }, []);

  useEffect(() => {
    // Sync effect changes
    const configs = env.effects.reduce((acc, effect) => {
      acc[effect.id] = {
        intensity: effect.intensity,
        speed: effect.speed,
        enabled: effect.enabled
      };
      return acc;
    }, {} as Record<string, { intensity: number, speed: number, enabled: boolean }>);

    visualEngine.updateConfigs(configs, theme.effects);
  }, [env.effects, theme.effects]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-[1]"
      style={{ mixBlendMode: theme.type === 'minimal' || theme.type === 'soft' ? 'multiply' : 'screen' }}
    />
  );
};
