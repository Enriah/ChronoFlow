export type ThemeType = 'minimal' | 'neon' | 'terminal' | 'soft'| 'fantasy' | 'custom';

export interface ThemeColors {
  background: string;
  surface: string;
  surfaceHover: string;
  primary: string;
  primaryForeground: string;
  text: string;
  textSecondary: string;
  border: string;
  accent: string;
  glow?: string;
}

export interface ThemeTypography {
  fontFamily: string;
  titleFont: string;
}

export interface ThemeUI {
  radius: string;
  borderWeight: string;
  shadow: string;
}

export interface ThemeEffects {
  glow: boolean;
  scanlines: boolean;
  animations: boolean;
  // Visual Effect Tokens
  rainColor: string;
  snowColor: string;
  sakuraColor: string;
  starsColor: string;
  matrixColor: string;
  electricityColor: string;
  fogColor: string;
}

export interface ThemeConfig {
  id: string;
  name: string;
  type: ThemeType;
  colors: ThemeColors;
  typography: ThemeTypography;
  ui: ThemeUI;
  effects: ThemeEffects;
}

export type VisualEffectType = 'rain' | 'sakura' | 'snow' | 'electricity' | 'stars' | 'matrix' | 'fog';

export interface VisualEffectConfig {
  id: VisualEffectType;
  enabled: boolean;
  intensity: number; // 0 to 1
  speed: number;     // 0 to 1
  color?: string;
  opacity: number;   // 0 to 1
}

export type OverlayType = 'scanlines' | 'blur' | 'vignette' | 'bloom' | 'crt' | 'none';

export interface OverlayConfig {
  type: OverlayType;
  enabled: boolean;
  intensity: number;
}

export type BackgroundType = 'image' | 'video' | 'gif' | 'gradient' | 'none';

export interface BackgroundConfig {
  type: BackgroundType;
  url?: string;
  opacity: number;
  blur: number;
  brightness: number;
}

export type WidgetBackgroundType = "solid" | "gradient" | "image" | "glass";
export type WidgetBorderStyle = "minimal" | "neon" | "terminal" | "soft";

export interface WidgetStyle {
  backgroundType: WidgetBackgroundType;
  backgroundImage?: string;
  opacity: number;
  blur: number;
  borderRadius: number;
  glowIntensity: number;
  borderStyle: WidgetBorderStyle;
  shadowIntensity: number;
}

export interface EnvironmentConfig {
  themeId: string;
  background: BackgroundConfig;
  effects: VisualEffectConfig[];
  overlays: OverlayConfig[];
  countdownStyle: WidgetStyle;
  timelineStyle: WidgetStyle;
  plannerStyle: WidgetStyle;
  statsStyle: WidgetStyle;
  rankingStyle: WidgetStyle;
}
