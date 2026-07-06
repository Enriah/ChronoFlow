import React from 'react';
import { clsx } from 'clsx';
import type { WidgetStyle } from '../../themes/theme.types';
import { useThemeStore } from '../../store/useThemeStore';
import { getWidgetChromeClassName, getWidgetChromeStyle, normalizeWidgetStyle } from './widgetStyleEngine';

interface WidgetContainerProps {
  style: WidgetStyle;
  children: React.ReactNode;
  className?: string;
  noPadding?: boolean;
}

export const WidgetContainer: React.FC<WidgetContainerProps> = ({ 
  style, 
  children, 
  className,
  noPadding = false
}) => {
  const performanceMode = useThemeStore(state => state.performanceMode);
  const animatedBackdrop = useThemeStore((state) => {
    const environment = state.isEditing ? state.draftEnvironment : state.activeEnvironment;
    return environment.effects.some((effect) => effect.enabled && effect.opacity > 0);
  });
  const normalizedStyle = normalizeWidgetStyle(style);

  if (!style) {
    return (
      <div className={clsx("bg-surface/50 rounded-3xl p-6 md:p-8", className)}>
        {children}
      </div>
    );
  }

  return (
    <div 
      className={clsx(
        "relative overflow-hidden transition-all duration-500",
        getWidgetChromeClassName(normalizedStyle),
        className
      )}
      style={getWidgetChromeStyle(normalizedStyle, { performanceMode, animatedBackdrop })}
    >
      {/* Interior Glow Effect */}
      {normalizedStyle.glowIntensity > 0 && (
        <div 
          className="absolute inset-0 pointer-events-none opacity-20"
          style={{
            boxShadow: `inset 0 0 ${normalizedStyle.glowIntensity * 40}px var(--widget-accent)`,
          }}
        />
      )}
      
      <div className={clsx(
        "relative z-10 h-full w-full flex flex-col",
        !noPadding && "p-6 md:p-8"
      )}>
        {children}
      </div>
    </div>
  );
};
