import type { ThemeEffects, VisualEffectConfig, VisualEffectType } from '../../themes/theme.types';

type Rgb = { r: number; g: number; b: number };

const EFFECT_CONTRAST: Record<VisualEffectType, number> = {
  aurora: 1.8,
  rain: 2.8,
  sakura: 2.7,
  maple_leaf: 2.7,
  snow: 2.8,
  electricity: 3.2,
  stars: 3.1,
  matrix: 3.2,
  fog: 1.35,
  water_surface: 2.25,
  crimson_blossom: 2.8,
  layla_star: 2.7,
};

const clampByte = (value: number) => Math.max(0, Math.min(255, Math.round(value)));

function parseColor(value: string): Rgb | null {
  const color = value.trim();
  if (color.startsWith('#')) {
    const hex = color.slice(1);
    const normalized = hex.length === 3 ? hex.split('').map((part) => part + part).join('') : hex.slice(0, 6);
    if (!/^[0-9a-f]{6}$/i.test(normalized)) return null;
    return { r: parseInt(normalized.slice(0, 2), 16), g: parseInt(normalized.slice(2, 4), 16), b: parseInt(normalized.slice(4, 6), 16) };
  }
  const match = color.match(/rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/i);
  if (!match) return null;
  return { r: clampByte(Number(match[1])), g: clampByte(Number(match[2])), b: clampByte(Number(match[3])) };
}

const channelLuminance = (value: number) => {
  const channel = value / 255;
  return channel <= .04045 ? channel / 12.92 : ((channel + .055) / 1.055) ** 2.4;
};

const luminance = (color: Rgb) => .2126 * channelLuminance(color.r) + .7152 * channelLuminance(color.g) + .0722 * channelLuminance(color.b);
const contrast = (a: Rgb, b: Rgb) => {
  const light = Math.max(luminance(a), luminance(b));
  const dark = Math.min(luminance(a), luminance(b));
  return (light + .05) / (dark + .05);
};
const mix = (source: Rgb, target: Rgb, amount: number): Rgb => ({
  r: source.r + (target.r - source.r) * amount,
  g: source.g + (target.g - source.g) * amount,
  b: source.b + (target.b - source.b) * amount,
});
const toCss = (color: Rgb) => `rgb(${clampByte(color.r)}, ${clampByte(color.g)}, ${clampByte(color.b)})`;

export function isLightThemeBackground(background: string) {
  const parsed = parseColor(background);
  return parsed ? luminance(parsed) > .42 : false;
}

export function adaptEffectColor(color: string, background: string, minimumContrast: number) {
  const foreground = parseColor(color);
  const backdrop = parseColor(background);
  if (!foreground || !backdrop) return color;
  if (contrast(foreground, backdrop) >= minimumContrast) return toCss(foreground);

  const target = isLightThemeBackground(background) ? { r: 12, g: 18, b: 28 } : { r: 248, g: 250, b: 252 };
  for (let amount = .08; amount <= 1; amount += .04) {
    const candidate = mix(foreground, target, amount);
    if (contrast(candidate, backdrop) >= minimumContrast) return toCss(candidate);
  }
  return toCss(target);
}

export function createAdaptiveEffectPalette(effects: ThemeEffects, background: string): ThemeEffects {
  return {
    ...effects,
    auroraColor: adaptEffectColor(effects.auroraColor || effects.electricityColor, background, EFFECT_CONTRAST.aurora),
    rainColor: adaptEffectColor(effects.rainColor, background, EFFECT_CONTRAST.rain),
    sakuraColor: adaptEffectColor(effects.sakuraColor, background, EFFECT_CONTRAST.sakura),
    mapleColor: adaptEffectColor(effects.mapleColor || effects.sakuraColor, background, EFFECT_CONTRAST.maple_leaf),
    snowColor: adaptEffectColor(effects.snowColor, background, EFFECT_CONTRAST.snow),
    electricityColor: adaptEffectColor(effects.electricityColor, background, EFFECT_CONTRAST.electricity),
    starsColor: adaptEffectColor(effects.starsColor, background, EFFECT_CONTRAST.stars),
    matrixColor: adaptEffectColor(effects.matrixColor, background, EFFECT_CONTRAST.matrix),
    fogColor: adaptEffectColor(effects.fogColor, background, EFFECT_CONTRAST.fog),
    waterColor: adaptEffectColor(effects.waterColor || effects.rainColor, background, EFFECT_CONTRAST.water_surface),
    crimsonBlossomColor: adaptEffectColor(effects.crimsonBlossomColor || effects.sakuraColor, background, EFFECT_CONTRAST.crimson_blossom),
    laylaStarColor: adaptEffectColor(effects.laylaStarColor || effects.starsColor, background, EFFECT_CONTRAST.layla_star),
  };
}

export function adaptCustomEffectColors(configs: VisualEffectConfig[], background: string) {
  return configs.map((config) => config.color
    ? { ...config, color: adaptEffectColor(config.color, background, EFFECT_CONTRAST[config.id]) }
    : config);
}
