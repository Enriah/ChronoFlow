import React from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { clsx } from 'clsx';
import { useWidgetStore } from '../../store/useWidgetStore';
import { useThemeStore } from '../../store/useThemeStore';
import { X, GripVertical } from 'lucide-react';
import { SyncManager } from '../../services/widgets/SyncManager';
import type { WidgetType } from '../../store/useWidgetStore';
import { getWidgetChromeClassName, getWidgetChromeStyle, normalizeWidgetStyle } from '../widget-styles/widgetStyleEngine';

interface FloatingWidgetContainerProps {
  children: React.ReactNode;
  type: WidgetType;
  className?: string;
  title?: string;
}

export function FloatingWidgetContainer({ children, type, className, title }: FloatingWidgetContainerProps) {
  const settings = useWidgetStore(state => state.settings);
  const { activeEnvironment, performanceMode } = useThemeStore();
  
  const style = normalizeWidgetStyle(activeEnvironment.countdownStyle);
  
  const handleMouseDown = async () => {
    const win = getCurrentWindow();
    await win.startDragging();
  };

  const handleClose = async () => {
    SyncManager.dispatchAction('closeWidget', type);
  };

  return (
    <div 
      className={clsx(
        "relative w-screen h-screen overflow-hidden flex flex-col group transition-all duration-300",
        getWidgetChromeClassName(style),
        className
      )}
      style={getWidgetChromeStyle(style, {
        opacityMultiplier: settings.opacity,
        blurOffset: settings.blurAmount,
        performanceMode,
      })}
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
