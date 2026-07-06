import React from 'react';
import { clsx } from 'clsx';
import { useThemeStore } from '../../store/useThemeStore';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  className, 
  isLoading,
  ...props 
}) => {
  const theme = useThemeStore(state => state.getTheme());
  const isTerminal = theme.type === 'terminal';

  const variants = {
    primary: "bg-primary text-primary-fg shadow-lg shadow-primary/20 hover:opacity-90 active:scale-95",
    secondary: "bg-surface-elevated border border-border text-text hover:bg-surface-hover active:scale-95",
    ghost: "bg-transparent text-text-secondary hover:text-text hover:bg-surface-hover active:scale-95",
    danger: "bg-red-500/10 text-red-500 hover:bg-red-500/20 active:scale-95",
  };

  const sizes = {
    sm: "px-3 py-1.5 text-xs font-bold",
    md: "px-6 py-3 text-sm font-bold",
    lg: "px-8 py-4 text-base font-black uppercase tracking-widest",
    icon: "w-10 h-10 flex items-center justify-center p-0",
  };

  return (
    <button 
      className={clsx(
        "inline-flex items-center justify-center gap-2 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:pointer-events-none min-w-0",
        variants[variant],
        sizes[size],
        isTerminal && "font-mono rounded-none uppercase",
        className
      )}
      {...props}
    >
      {isLoading ? <span className="h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin" /> : children}
    </button>
  );
};
