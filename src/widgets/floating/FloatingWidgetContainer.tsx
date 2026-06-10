import React from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { clsx } from 'clsx';
import { useWidgetStore } from '../../store/useWidgetStore';
import { useThemeStore } from '../../store/useThemeStore';
import { X, GripVertical } from 'lucide-react';
import { SyncManager } from '../../services/widgets/SyncManager';
import { PersistentAssetService } from '../../services/PersistentAssetService';
import type { WidgetType } from '../../store/useWidgetStore';

interface FloatingWidgetContainerProps {
  children: React.ReactNode;
  type: WidgetType;
  className?: string;
  title?: string;
}

export function FloatingWidgetContainer({ children, type, className, title }: FloatingWidgetContainerProps) {
  const settings = useWidgetStore(state => state.settings);
  const { activeEnvironment, getTheme } = useThemeStore();
  const theme = getTheme();
  
  // Map widget type to theme style
  const getWidgetStyle = () => {
    switch (type) {
      case 'countdown': return activeEnvironment.countdownStyle;
      case 'timeline': return activeEnvironment.timelineStyle;
      case 'weekly-focus': return activeEnvironment.statsStyle;
      default: return activeEnvironment.countdownStyle;
    }
  };

  const style = getWidgetStyle();
  
  const handleMouseDown = async () => {
    const win = getCurrentWindow();
    await win.startDragging();
  };

  const handleClose = async () => {
    SyncManager.dispatchAction('closeWidget', type);
  };

  // Calculate combined opacity and blur
  const finalOpacity = settings.opacity * style.opacity;
  const finalBlur = settings.blurAmount + style.blur;

  const getBorderStyle = () => {
    switch (style.borderStyle) {
      case 'neon':
        return {
          border: `2px solid var(--primary)`,
          boxShadow: `0 0 ${15 * style.glowIntensity}px var(--primary), inset 0 0 ${5 * style.glowIntensity}px var(--primary)`,
        };
      case 'terminal':
        return {
          border: `1px solid var(--primary)`,
          borderRadius: '0px',
        };
      case 'soft':
        return {
          border: `2px solid rgba(var(--primary-rgb), 0.2)`,
          borderRadius: `${style.borderRadius}px`,
        };
      default:
        return {
          border: `1px solid var(--border)`,
          borderRadius: `${style.borderRadius}px`,
        };
    }
  };

  const borderStyles = getBorderStyle();

  const getBackgroundStyle = () => {
    switch (style.backgroundType) {
      case 'glass':
        return {
          backgroundColor: `rgba(var(--surface-rgb), ${finalOpacity})`,
          backdropFilter: `blur(${finalBlur}px)`,
          WebkitBackdropFilter: `blur(${finalBlur}px)`,
        };
      case 'solid':
        return {
          backgroundColor: `rgba(var(--surface-rgb), ${finalOpacity})`,
        };
      case 'gradient':
        return {
          background: `linear-gradient(135deg, rgba(var(--surface-rgb), ${finalOpacity}), rgba(var(--bg-rgb), ${finalOpacity}))`,
        };
      case 'image':
        const resolvedUrl = PersistentAssetService.getAssetUrl(style.backgroundImage || '');
        return {
          backgroundImage: resolvedUrl ? `url("${resolvedUrl}")` : 'none',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundColor: `rgba(0, 0, 0, ${1 - finalOpacity})`,
        };
      default:
        return {
          backgroundColor: `rgba(var(--surface-rgb), ${finalOpacity})`,
          backdropFilter: `blur(${finalBlur}px)`,
        };
    }
  };

  const backgroundStyles = getBackgroundStyle();

  return (
    <div 
      className={clsx(
        "relative w-screen h-screen overflow-hidden flex flex-col group transition-all duration-300",
        className
      )}
      style={{
        ...backgroundStyles,
        ...borderStyles,
        boxShadow: style.shadowIntensity > 0 ? theme.ui.shadow : borderStyles.boxShadow,
      }}
    >
      {/* Title Bar / Drag Area */}
      <div 
        onMouseDown={handleMouseDown}
        className={clsx(
          "flex items-center justify-between px-4 py-2 cursor-move opacity-0 group-hover:opacity-100 transition-opacity bg-white/5 border-b",
          style.borderStyle === 'terminal' ? "border-primary/30" : "border-white/5"
        )}
      >
        <div className="flex items-center gap-2">
          <GripVertical className={clsx("w-3 h-3", style.borderStyle === 'terminal' ? "text-primary/50" : "text-white/30")} />
          <span className={clsx(
            "text-[10px] font-black uppercase tracking-widest",
            style.borderStyle === 'terminal' ? "text-primary/70" : "text-white/50"
          )}>
            {title || type}
          </span>
        </div>
        <button 
          onClick={handleClose}
          className={clsx(
            "p-1 rounded-lg transition-all",
            style.borderStyle === 'terminal' 
              ? "hover:bg-primary/20 text-primary/50 hover:text-primary" 
              : "hover:bg-rose-500/20 text-white/30 hover:text-rose-500"
          )}
        >
          <X className="w-3 h-3" />
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden relative">
        {children}
      </div>
    </div>
  );
}
