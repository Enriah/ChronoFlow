import React from 'react';
import { clsx } from 'clsx';
import type { WidgetStyle } from '../../themes/theme.types';
import { useThemeStore } from '../../store/useThemeStore';
import { PersistentAssetService } from '../../services/PersistentAssetService';

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

  if (!style) {
    return (
      <div className={clsx("bg-surface/50 rounded-3xl p-6 md:p-8", className)}>
        {children}
      </div>
    );
  }

  const getBackgroundStyle = (): React.CSSProperties => {
    const { 
      backgroundType = 'glass', 
      backgroundImage = '', 
      opacity = 0.15, 
      blur = 20 
    } = style || {};
    
    const baseStyle: React.CSSProperties = {
      opacity: 1, // We control opacity via background color
    };

    switch (backgroundType) {
      case 'solid':
        return { ...baseStyle, backgroundColor: `rgba(var(--surface-rgb, 255, 255, 255), ${opacity})` };
      case 'gradient':
        return { 
          ...baseStyle, 
          background: `linear-gradient(135deg, rgba(var(--primary-rgb), ${opacity * 0.5}), rgba(var(--accent-rgb), ${opacity * 0.5}))` 
        };
      case 'glass':
        // Optimize: Limit blur in performance mode
        const effectiveBlur = performanceMode ? Math.min(blur, 4) : blur;
        return { 
          ...baseStyle, 
          backgroundColor: `rgba(var(--surface-rgb, 255, 255, 255), ${opacity})`,
          backdropFilter: effectiveBlur > 0 ? `blur(${effectiveBlur}px)` : 'none',
          WebkitBackdropFilter: effectiveBlur > 0 ? `blur(${effectiveBlur}px)` : 'none',
        };
      case 'image':
        const resolvedUrl = PersistentAssetService.getAssetUrl(backgroundImage);
        return { 
          ...baseStyle, 
          backgroundImage: resolvedUrl ? `url("${resolvedUrl}")` : 'none',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundColor: `rgba(0, 0, 0, ${1 - opacity})`, // Darken if opacity is low
        };
      default:
        return baseStyle;
    }
  };

  const getBorderStyle = (): string => {
    switch (style.borderStyle) {
      case 'neon':
        return 'border-2 border-primary shadow-[0_0_15px_rgba(var(--primary-rgb),0.5)]';
      case 'terminal':
        return 'border border-primary rounded-none';
      case 'soft':
        return 'border-0 shadow-xl';
      case 'minimal':
      default:
        return 'border border-border/50';
    }
  };

  const shadowStyle: React.CSSProperties = {
    boxShadow: style.shadowIntensity > 0 
      ? `0 ${style.shadowIntensity * 10}px ${style.shadowIntensity * 30}px rgba(0,0,0,${style.shadowIntensity * 0.3})`
      : 'none',
  };

  return (
    <div 
      className={clsx(
        "relative overflow-hidden transition-all duration-500",
        getBorderStyle(),
        className
      )}
      style={{
        borderRadius: `${style.borderRadius}px`,
        ...getBackgroundStyle(),
        ...shadowStyle,
      }}
    >
      {/* Interior Glow Effect */}
      {style.glowIntensity > 0 && (
        <div 
          className="absolute inset-0 pointer-events-none opacity-20"
          style={{
            boxShadow: `inset 0 0 ${style.glowIntensity * 40}px var(--primary)`,
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
