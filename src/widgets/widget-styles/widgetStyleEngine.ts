import type { CSSProperties } from 'react';
import type { WidgetStyle } from '../../themes/theme.types';
import { PersistentAssetService } from '../../services/PersistentAssetService';

interface WidgetChromeOptions {
  opacityMultiplier?: number;
  blurOffset?: number;
  performanceMode?: boolean;
  animatedBackdrop?: boolean;
}

export const DEFAULT_WIDGET_STYLE: WidgetStyle = {
  backgroundType: 'solid',
  opacity: 1,
  blur: 0,
  borderRadius: 24,
  borderWidth: 1,
  borderOpacity: 0.5,
  glowIntensity: 0.5,
  borderStyle: 'minimal',
  borderEffect: 'none',
  shadowIntensity: 0.2,
  surfaceEffect: 'none',
};

export function normalizeWidgetStyle(style?: Partial<WidgetStyle>): WidgetStyle {
  return {
    ...DEFAULT_WIDGET_STYLE,
    ...(style || {}),
  };
}

export function getWidgetChromeClassName(style: WidgetStyle): string {
  return [
    'widget-chrome',
    `widget-border-${style.borderStyle}`,
    `widget-border-effect-${style.borderEffect}`,
    `widget-surface-${style.surfaceEffect}`,
  ].join(' ');
}

export function getWidgetChromeStyle(
  widgetStyle?: Partial<WidgetStyle>,
  options: WidgetChromeOptions = {},
): CSSProperties {
  const style = normalizeWidgetStyle(widgetStyle);
  const opacity = style.opacity * (options.opacityMultiplier ?? 1);
  const effectiveBlur = options.performanceMode ? 0 : Math.min(style.blur + (options.blurOffset ?? 0), 32);
  const accent = style.accentColor || 'var(--primary)';
  const borderOpacity = Math.max(0, Math.min(style.borderOpacity, 1));
  const borderWidth = Math.max(0, style.borderWidth);
  const borderRadius = style.borderStyle === 'terminal' ? 0 : style.borderRadius;

  const chromeStyle: CSSProperties = {
    '--widget-radius': `${borderRadius}px`,
    '--widget-border-width': `${borderWidth}px`,
    '--widget-border-opacity': borderOpacity,
    '--widget-accent': accent,
    '--widget-base-border-color': `color-mix(in srgb, var(--border) ${Math.round(borderOpacity * 100)}%, var(--surface))`,
    '--widget-border-color': `color-mix(in srgb, ${accent} ${Math.round(borderOpacity * 100)}%, var(--surface))`,
    '--widget-border-muted-color': `color-mix(in srgb, ${accent} ${Math.round(borderOpacity * 42)}%, var(--surface))`,
    '--widget-border-soft-color': `color-mix(in srgb, ${accent} ${Math.round(borderOpacity * 28)}%, var(--surface))`,
    '--widget-glow': style.glowIntensity,
    '--widget-shadow': getShadow(style),
  } as CSSProperties;

  return {
    ...chromeStyle,
    ...getBackgroundStyle(style, opacity, effectiveBlur, options.animatedBackdrop === true),
  };
}

function getBackgroundStyle(style: WidgetStyle, opacity: number, blur: number, animatedBackdrop: boolean): CSSProperties {
  switch (style.backgroundType) {
    case 'solid':
      return {
        backgroundColor: `color-mix(in srgb, var(--surface) ${Math.round(opacity * 100)}%, var(--bg))`,
      };
    case 'gradient':
      return {
        background: `linear-gradient(135deg, rgba(var(--primary-rgb), ${opacity * 0.55}), rgba(var(--accent-rgb), ${opacity * 0.45}))`,
      };
    case 'image': {
      const resolvedUrl = PersistentAssetService.getAssetUrl(style.backgroundImage || '');
      return {
        backgroundImage: resolvedUrl ? `url("${resolvedUrl}")` : 'none',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundColor: `rgba(0, 0, 0, ${Math.max(0, 1 - opacity)})`,
      };
    }
    case 'glass':
    default:
      // Live backdrop blur forces WebView2 to recompute every widget whenever the
      // effect canvas changes. A slightly denser glass surface keeps the same
      // visual hierarchy without the full-screen GPU recomposition cost.
      const glassOpacity = animatedBackdrop ? Math.min(1, opacity + .08) : opacity;
      return {
        backgroundColor: `rgba(var(--surface-rgb, 255, 255, 255), ${glassOpacity})`,
        backdropFilter: !animatedBackdrop && blur > 0 ? `blur(${blur}px)` : 'none',
        WebkitBackdropFilter: !animatedBackdrop && blur > 0 ? `blur(${blur}px)` : 'none',
      };
  }
}

function getShadow(style: WidgetStyle): string {
  const baseShadow = style.shadowIntensity > 0
    ? `0 ${style.shadowIntensity * 14}px ${style.shadowIntensity * 36}px rgba(0, 0, 0, ${style.shadowIntensity * 0.34})`
    : 'none';

  if (style.glowIntensity <= 0 || style.borderEffect === 'none') {
    return baseShadow;
  }

  const glow = `0 0 ${style.glowIntensity * 28}px color-mix(in srgb, var(--widget-accent) ${style.glowIntensity * 45}%, transparent)`;
  return baseShadow === 'none' ? glow : `${baseShadow}, ${glow}`;
}
