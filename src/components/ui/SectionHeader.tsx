import React from 'react';
import { useThemeStore } from '../../store/useThemeStore';
import { clsx } from 'clsx';

interface SectionHeaderProps {
  title: string;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({ 
  title, 
  icon, 
  actions,
  className 
}) => {
  const theme = useThemeStore(state => state.getTheme());
  const isTerminal = theme.type === 'terminal';

  return (
    <header className={clsx("flex justify-between items-center mb-8 relative z-10", className)}>
      <div className="flex items-center gap-3 min-w-0">
        {icon && <div className="text-primary shrink-0">{icon}</div>}
        <h2 className="text-xl font-black tracking-tight text-text truncate">
          {isTerminal ? `> ${title.toUpperCase().replace(/\s+/g, '_')}` : title}
        </h2>
      </div>
      {actions && (
        <div className="flex gap-2 shrink-0">
          {actions}
        </div>
      )}
    </header>
  );
};
