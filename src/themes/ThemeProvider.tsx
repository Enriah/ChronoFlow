import { useEffect, type ReactNode } from 'react';
import { useThemeStore } from '../store/useThemeStore';

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const theme = useThemeStore((state) => state.getTheme());

  const hexToRgb = (hex: string): string => {
    hex = hex.replace('#', '');
    if (hex.length === 3) {
      hex = hex.split('').map(char => char + char).join('');
    }
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return `${r}, ${g}, ${b}`;
  };

  useEffect(() => {
    const root = document.documentElement;
    const { colors, typography, ui } = theme;

    // Inject colors
    root.style.setProperty('--bg', colors.background);
    root.style.setProperty('--surface', colors.surface);
    root.style.setProperty('--surface-hover', colors.surfaceHover);
    root.style.setProperty('--surface-elevated', colors.surfaceElevated);
    root.style.setProperty('--surface-muted', colors.surfaceMuted);
    root.style.setProperty('--primary', colors.primary);
    root.style.setProperty('--primary-fg', colors.primaryForeground);
    root.style.setProperty('--text', colors.text);
    root.style.setProperty('--text-secondary', colors.textSecondary);
    root.style.setProperty('--border', colors.border);
    root.style.setProperty('--accent', colors.accent);

    // Inject RGB variants for transparency
    root.style.setProperty('--primary-rgb', hexToRgb(colors.primary));
    root.style.setProperty('--accent-rgb', hexToRgb(colors.accent));
    root.style.setProperty('--surface-rgb', hexToRgb(colors.surface));
    root.style.setProperty('--surface-elevated-rgb', hexToRgb(colors.surfaceElevated));
    root.style.setProperty('--bg-rgb', hexToRgb(colors.background));

    // Inject typography
    root.style.setProperty('--font-main', typography.fontFamily);
    root.style.setProperty('--font-title', typography.titleFont);

    // Inject UI
    root.style.setProperty('--radius', ui.radius);
    root.style.setProperty('--border-weight', ui.borderWeight);
    root.style.setProperty('--shadow', ui.shadow);

    // Update global styles for background color and transitions
    root.style.backgroundColor = colors.background;
    root.style.color = colors.text;
    root.style.fontFamily = typography.fontFamily;

  }, [theme]);

  return (
    <div className={`theme-${theme.type} min-h-screen transition-colors duration-500`}>
      {/* Scanline effect for terminal theme */}
      {theme.effects.scanlines && (
        <div className="fixed inset-0 pointer-events-none z-[100] bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%] opacity-20" />
      )}
      {children}
    </div>
  );
}
