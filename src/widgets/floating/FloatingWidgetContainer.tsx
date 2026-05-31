import React from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { clsx } from 'clsx';
import { useWidgetStore } from '../../store/useWidgetStore';
import { X, GripVertical } from 'lucide-react';
import { WidgetManager } from '../../services/widgets/WidgetManager';
import type { WidgetType } from '../../store/useWidgetStore';

interface FloatingWidgetContainerProps {
  children: React.ReactNode;
  type: WidgetType;
  className?: string;
  title?: string;
}

export function FloatingWidgetContainer({ children, type, className, title }: FloatingWidgetContainerProps) {
  const settings = useWidgetStore(state => state.settings);
  
  const handleMouseDown = async () => {
    const win = getCurrentWindow();
    await win.startDragging();
  };

  const handleClose = async () => {
    await WidgetManager.closeWidget(type);
  };

  return (
    <div 
      className={clsx(
        "relative w-screen h-screen overflow-hidden flex flex-col group transition-all duration-300",
        className
      )}
      style={{
        backgroundColor: `rgba(0, 0, 0, ${settings.opacity})`,
        backdropFilter: `blur(${settings.blurAmount}px)`,
        borderRadius: '1.5rem',
        border: `1px solid rgba(255, 255, 255, 0.1)`,
      }}
    >
      {/* Title Bar / Drag Area */}
      <div 
        onMouseDown={handleMouseDown}
        className="flex items-center justify-between px-4 py-2 cursor-move opacity-0 group-hover:opacity-100 transition-opacity bg-white/5 border-b border-white/5"
      >
        <div className="flex items-center gap-2">
          <GripVertical className="w-3 h-3 text-white/30" />
          <span className="text-[10px] font-black uppercase tracking-widest text-white/50">{title || type}</span>
        </div>
        <button 
          onClick={handleClose}
          className="p-1 hover:bg-rose-500/20 text-white/30 hover:text-rose-500 rounded-lg transition-all"
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
