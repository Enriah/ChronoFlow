import type { ThemeConfig } from './theme.types';

export const minimalTheme: ThemeConfig = {
  id: 'minimal',
  name: 'Minimal Dark',
  type: 'minimal',
  colors: {
    background: '#0b0f14',
    surface: '#121821',
    surfaceHover: '#1a2330',
    surfaceElevated: '#18212d',
    surfaceMuted: '#0f151d',
    primary: '#60a5fa',
    primaryForeground: '#ffffff',
    text: '#f8fafc',
    textSecondary: '#94a3b8',
    border: '#263244',
    accent: '#3b82f6',
  },
  typography: {
    fontFamily: 'ui-sans-serif, system-ui, sans-serif',
    titleFont: 'ui-sans-serif, system-ui, sans-serif',
  },
  ui: {
    radius: '12px',
    borderWeight: '1px',
    shadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
  },
  effects: {
    glow: false,
    scanlines: false,
    animations: true,
    rainColor: 'rgba(15, 23, 42, 0.2)',
    snowColor: 'rgba(15, 23, 42, 0.1)',
    sakuraColor: 'rgba(255, 183, 197, 0.4)',
    starsColor: 'rgba(15, 23, 42, 0.3)',
    matrixColor: 'rgba(34, 197, 94, 0.5)',
    electricityColor: 'rgba(59, 130, 246, 0.5)',
    fogColor: 'rgba(15, 23, 42, 0.05)',
  },
};

export const neonTheme: ThemeConfig = {
  id: 'neon',
  name: 'Cyber Dev',
  type: 'neon',
  colors: {
    background: '#050505',
    surface: '#121212',
    surfaceHover: '#1a1a1a',
    surfaceElevated: '#191919',
    surfaceMuted: '#0d0d0d',
    primary: '#00f2ff',
    primaryForeground: '#000000',
    text: '#ffffff',
    textSecondary: '#a0a0a0',
    border: '#333333',
    accent: '#ff00ff',
    glow: 'rgba(0, 242, 255, 0.5)',
  },
  typography: {
    fontFamily: 'system-ui, sans-serif',
    titleFont: 'system-ui, sans-serif',
  },
  ui: {
    radius: '4px',
    borderWeight: '2px',
    shadow: '0 0 15px rgba(0, 242, 255, 0.3)',
  },
  effects: {
    glow: true,
    scanlines: false,
    animations: true,
    rainColor: 'rgba(0, 242, 255, 0.4)',
    snowColor: 'rgba(255, 255, 255, 0.6)',
    sakuraColor: 'rgba(255, 0, 255, 0.4)',
    starsColor: 'rgba(255, 255, 255, 0.8)',
    matrixColor: 'rgba(0, 255, 65, 0.8)',
    electricityColor: 'rgba(0, 242, 255, 0.8)',
    fogColor: 'rgba(0, 242, 255, 0.1)',
  },
};

export const terminalTheme: ThemeConfig = {
  id: 'terminal',
  name: 'Terminal',
  type: 'terminal',
  colors: {
    background: '#000000',
    surface: '#0a0a0a',
    surfaceHover: '#141414',
    surfaceElevated: '#101510',
    surfaceMuted: '#050805',
    primary: '#00ff41',
    primaryForeground: '#000000',
    text: '#00ff41',
    textSecondary: '#008f11',
    border: '#003b00',
    accent: '#ffffff',
  },
  typography: {
    fontFamily: '"Fira Code", monospace',
    titleFont: '"Fira Code", monospace',
  },
  ui: {
    radius: '0px',
    borderWeight: '1px',
    shadow: 'none',
  },
  effects: {
    glow: false,
    scanlines: true,
    animations: false,
    rainColor: 'rgba(0, 255, 65, 0.3)',
    snowColor: 'rgba(0, 255, 65, 0.2)',
    sakuraColor: 'rgba(0, 255, 65, 0.2)',
    starsColor: 'rgba(0, 255, 65, 0.4)',
    matrixColor: 'rgba(0, 255, 65, 0.8)',
    electricityColor: 'rgba(0, 255, 65, 0.8)',
    fogColor: 'rgba(0, 255, 65, 0.1)',
  },
};

export const softTheme: ThemeConfig = {
  id: 'soft',
  name: 'Sakura Day',
  type: 'soft',
  colors: {
    background: '#fff5f7',
    surface: '#ffffff',
    surfaceHover: '#fffafb',
    surfaceElevated: '#ffffff',
    surfaceMuted: '#fff0f4',
    primary: '#ff85a1',
    primaryForeground: '#ffffff',
    text: '#4a4a4a',
    textSecondary: '#a8a8a8',
    border: '#ffe3e8',
    accent: '#ffc2d1',
  },
  typography: {
    fontFamily: 'system-ui, sans-serif',
    titleFont: 'system-ui, sans-serif',
  },
  ui: {
    radius: '32px',
    borderWeight: '0px',
    shadow: '0 10px 30px rgba(255, 133, 161, 0.1)',
  },
  effects: {
    glow: false,
    scanlines: false,
    animations: true,
    rainColor: 'rgba(255, 133, 161, 0.3)',
    snowColor: 'rgba(255, 255, 255, 0.8)',
    sakuraColor: 'rgba(255, 183, 197, 0.6)',
    starsColor: 'rgba(255, 183, 197, 0.5)',
    matrixColor: 'rgba(255, 133, 161, 0.4)',
    electricityColor: 'rgba(255, 133, 161, 0.6)',
    fogColor: 'rgba(255, 183, 197, 0.2)',
  },
};
export const fantasyTheme: ThemeConfig = {
  id: 'fantasy',
  name: 'Enchanted Realm',
  type: 'fantasy',
  colors: {
    background: '#0b1020',
    surface: '#151b31',
    surfaceHover: '#202947',
    surfaceElevated: '#1c2440',
    surfaceMuted: '#10162a',
    primary: '#a78bfa',
    primaryForeground: '#110b22',
    text: '#f5f0ff',
    textSecondary: '#b8acd6',
    border: '#3a4268',
    accent: '#5eead4',
    glow: 'rgba(167, 139, 250, 0.45)',
  },
  typography: {
    fontFamily: 'system-ui, sans-serif',
    titleFont: 'system-ui, sans-serif',
  },
  ui: {
    radius: '18px',
    borderWeight: '1px',
    shadow: '0 18px 48px rgba(4, 7, 20, 0.45)',
  },
  effects: {
    glow: false,
    scanlines: false,
    animations: true,
    rainColor: '#8b9dc3', snowColor: '#f8fafc', sakuraColor: '#f0abfc',
    starsColor: '#e9d5ff', matrixColor: '#5eead4', electricityColor: '#a78bfa',
    fogColor: '#252c4e', auroraColor: '#6ee7b7', mapleColor: '#f59e0b',
  },
};

export const mapleTheme: ThemeConfig = {
  id: 'maple', name: 'Maple Forest', type: 'maple',
  colors: { background: '#11140f', surface: '#1b2118', surfaceHover: '#283125', surfaceElevated: '#232b20', surfaceMuted: '#151a13', primary: '#e8793e', primaryForeground: '#1b0b04', text: '#f7f1df', textSecondary: '#b9aa8a', border: '#46513a', accent: '#d6a84b', glow: 'rgba(232, 121, 62, 0.32)' },
  typography: { fontFamily: 'ui-sans-serif, system-ui, sans-serif', titleFont: 'Georgia, serif' },
  ui: { radius: '14px', borderWeight: '1px', shadow: '0 16px 42px rgba(5, 9, 4, 0.48)' },
  effects: { glow: false, scanlines: false, animations: true, rainColor: '#8ba49b', snowColor: '#f8fafc', sakuraColor: '#fda4af', starsColor: '#fef3c7', matrixColor: '#86a65c', electricityColor: '#f59e0b', fogColor: '#293326', auroraColor: '#84a96b', mapleColor: '#e8793e' },
};

export const sakuraTheme: ThemeConfig = {
  id: 'sakura', name: 'Sakura Evening', type: 'sakura',
  colors: { background: '#1a121a', surface: '#281c28', surfaceHover: '#3a2938', surfaceElevated: '#332332', surfaceMuted: '#211720', primary: '#f9a8d4', primaryForeground: '#2a1020', text: '#fff4fa', textSecondary: '#d8b7c9', border: '#5b3b52', accent: '#c4b5fd', glow: 'rgba(249, 168, 212, 0.36)' },
  typography: { fontFamily: 'ui-sans-serif, system-ui, sans-serif', titleFont: 'Georgia, serif' },
  ui: { radius: '20px', borderWeight: '1px', shadow: '0 16px 44px rgba(22, 8, 20, 0.48)' },
  effects: { glow: false, scanlines: false, animations: true, rainColor: '#b8a7bc', snowColor: '#fff7fb', sakuraColor: '#f9a8d4', starsColor: '#fce7f3', matrixColor: '#d8b4fe', electricityColor: '#c4b5fd', fogColor: '#3a2938', auroraColor: '#c4b5fd', mapleColor: '#fb7185' },
};

export const galaxyTheme: ThemeConfig = {
  id: 'galaxy', name: 'Deep Galaxy', type: 'galaxy',
  colors: { background: '#050816', surface: '#0d1328', surfaceHover: '#182041', surfaceElevated: '#131a35', surfaceMuted: '#080d1e', primary: '#67e8f9', primaryForeground: '#03151a', text: '#eef6ff', textSecondary: '#96a8cb', border: '#29365f', accent: '#c084fc', glow: 'rgba(103, 232, 249, 0.38)' },
  typography: { fontFamily: 'ui-sans-serif, system-ui, sans-serif', titleFont: 'ui-sans-serif, system-ui, sans-serif' },
  ui: { radius: '16px', borderWeight: '1px', shadow: '0 18px 52px rgba(0, 2, 12, 0.58)' },
  effects: { glow: true, scanlines: false, animations: true, rainColor: '#6b7fa8', snowColor: '#ffffff', sakuraColor: '#d8b4fe', starsColor: '#f8fafc', matrixColor: '#67e8f9', electricityColor: '#818cf8', fogColor: '#111936', auroraColor: '#22d3ee', mapleColor: '#c084fc' },
};

export const themes = [minimalTheme, neonTheme, terminalTheme, softTheme, fantasyTheme, mapleTheme, sakuraTheme, galaxyTheme];
