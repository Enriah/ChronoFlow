import type { ThemeEffects, VisualEffectConfig } from '../../../themes/theme.types';
import type { EffectModule } from '../../core/VisualEngine';
import { clamp01 } from '../shared/ParticleEffect';

type Point = { x: number; y: number };

export class WaterSurfaceEffect implements EffectModule {
  readonly id = 'water_surface';

  private width = 1;
  private height = 1;
  private phase = 0;

  initialize(ctx: CanvasRenderingContext2D) {
    this.resize(ctx.canvas.width, ctx.canvas.height);
  }

  resize(width: number, height: number) {
    this.width = Math.max(1, width);
    this.height = Math.max(1, height);
  }

  update(deltaSeconds: number, config: VisualEffectConfig, performanceMode: boolean) {
    const speed = config.speed ?? 0.5;
    const motion = performanceMode ? 0.45 : 1;
    this.phase += deltaSeconds * motion * (0.22 + speed * 0.62);
  }

  render(ctx: CanvasRenderingContext2D, theme: ThemeEffects, config: VisualEffectConfig, performanceMode: boolean) {
    const intensity = clamp01(config.intensity ?? 0.55);
    const opacity = clamp01(config.opacity ?? 0.62);
    const water = config.color || theme.waterColor || theme.rainColor || '#38d5ff';
    const deep = theme.fogColor || '#082033';
    const accent = theme.electricityColor || theme.auroraColor || water;
    const width = this.width;
    const height = this.height;
    const horizon = height * (0.44 + intensity * 0.08) + Math.sin(this.phase * 0.7) * height * 0.012;
    const amplitude = height * (0.018 + intensity * 0.026);
    const step = performanceMode ? 52 : 30;
    const surface = this.buildSurfacePoints(width, horizon, amplitude, step);

    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    this.drawWaterBody(ctx, surface, water, deep, opacity);
    this.drawSurfaceLine(ctx, surface, water, accent, opacity, performanceMode);
    this.drawDepthBands(ctx, surface, water, accent, opacity, performanceMode);
    if (!performanceMode) this.drawSoftGlow(ctx, surface, water, opacity);
    ctx.restore();
  }

  destroy() {
    this.width = 1;
    this.height = 1;
  }

  private buildSurfacePoints(width: number, horizon: number, amplitude: number, step: number): Point[] {
    const points: Point[] = [];
    for (let x = -step * 2; x <= width + step * 2; x += step) {
      const y =
        horizon +
        Math.sin(x * 0.007 + this.phase * 1.55) * amplitude +
        Math.sin(x * 0.017 - this.phase * 0.92) * amplitude * 0.44 +
        Math.sin(x * 0.003 + this.phase * 0.38) * amplitude * 0.72;
      points.push({ x, y });
    }
    return points;
  }

  private drawWaterBody(ctx: CanvasRenderingContext2D, surface: Point[], water: string, deep: string, opacity: number) {
    const gradient = ctx.createLinearGradient(0, surface[0]?.y || this.height * 0.5, 0, this.height);
    gradient.addColorStop(0, this.rgba(water, opacity * 0.18));
    gradient.addColorStop(0.28, this.rgba(water, opacity * 0.08));
    gradient.addColorStop(1, this.rgba(deep, opacity * 0.04));

    ctx.fillStyle = gradient;
    ctx.beginPath();
    surface.forEach((point, index) => {
      if (index === 0) ctx.moveTo(point.x, point.y);
      else ctx.lineTo(point.x, point.y);
    });
    ctx.lineTo(this.width + 80, this.height + 80);
    ctx.lineTo(-80, this.height + 80);
    ctx.closePath();
    ctx.fill();
  }

  private drawSurfaceLine(
    ctx: CanvasRenderingContext2D,
    surface: Point[],
    water: string,
    accent: string,
    opacity: number,
    performanceMode: boolean,
  ) {
    const gradient = ctx.createLinearGradient(0, 0, this.width, 0);
    gradient.addColorStop(0, this.rgba(water, opacity * 0.12));
    gradient.addColorStop(0.35, this.rgba(accent, opacity * 0.72));
    gradient.addColorStop(0.62, this.rgba(water, opacity * 0.42));
    gradient.addColorStop(1, this.rgba(accent, opacity * 0.16));

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = gradient;
    ctx.lineWidth = Math.max(1.4, this.height * (performanceMode ? 0.0028 : 0.0042));
    ctx.shadowColor = this.rgba(water, opacity * 0.45);
    ctx.shadowBlur = performanceMode ? 2 : 8;
    ctx.beginPath();
    surface.forEach((point, index) => {
      if (index === 0) ctx.moveTo(point.x, point.y);
      else ctx.lineTo(point.x, point.y);
    });
    ctx.stroke();
    ctx.restore();
  }

  private drawDepthBands(
    ctx: CanvasRenderingContext2D,
    surface: Point[],
    water: string,
    accent: string,
    opacity: number,
    performanceMode: boolean,
  ) {
    const bandCount = performanceMode ? 3 : 6;
    const xStep = performanceMode ? 58 : 34;

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (let band = 1; band <= bandCount; band++) {
      const depth = band * this.height * 0.054;
      const alpha = opacity * (0.13 / band);
      const stroke = ctx.createLinearGradient(0, 0, this.width, 0);
      stroke.addColorStop(0, this.rgba(water, alpha * 0.45));
      stroke.addColorStop(0.48, this.rgba(accent, alpha));
      stroke.addColorStop(1, this.rgba(water, alpha * 0.32));

      ctx.strokeStyle = stroke;
      ctx.lineWidth = Math.max(1, this.height * 0.0014);
      ctx.beginPath();
      for (let x = -xStep * 2; x <= this.width + xStep * 2; x += xStep) {
        const surfaceY = this.sampleSurface(surface, x);
        const y =
          surfaceY +
          depth +
          Math.sin(x * (0.009 + band * 0.001) + this.phase * (1.2 - band * 0.08)) * this.height * 0.008 +
          Math.sin(x * 0.025 - this.phase * 0.6 - band) * this.height * 0.003;
        if (x <= -xStep * 2) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    ctx.restore();
  }

  private drawSoftGlow(ctx: CanvasRenderingContext2D, surface: Point[], water: string, opacity: number) {
    ctx.save();
    ctx.filter = 'blur(14px)';
    ctx.strokeStyle = this.rgba(water, opacity * 0.12);
    ctx.lineWidth = Math.max(8, this.height * 0.018);
    ctx.beginPath();
    surface.forEach((point, index) => {
      const y = point.y + this.height * 0.012;
      if (index === 0) ctx.moveTo(point.x, y);
      else ctx.lineTo(point.x, y);
    });
    ctx.stroke();
    ctx.restore();
  }

  private sampleSurface(surface: Point[], x: number) {
    if (!surface.length) return this.height * 0.5;
    for (let i = 1; i < surface.length; i++) {
      const prev = surface[i - 1];
      const next = surface[i];
      if (x <= next.x) {
        const amount = (x - prev.x) / Math.max(1, next.x - prev.x);
        return prev.y + (next.y - prev.y) * amount;
      }
    }
    return surface[surface.length - 1].y;
  }

  private rgba(color: string, alpha: number) {
    const a = clamp01(alpha);
    if (color.startsWith('rgba')) return color.replace(/rgba\(([^)]+),\s*[\d.]+\)/, `rgba($1, ${a})`);
    if (color.startsWith('rgb')) return color.replace('rgb(', 'rgba(').replace(')', `, ${a})`);

    const hex = color.replace('#', '');
    const normalized = hex.length === 3 ? hex.split('').map((part) => part + part).join('') : hex.slice(0, 6);
    const r = Number.parseInt(normalized.slice(0, 2), 16);
    const g = Number.parseInt(normalized.slice(2, 4), 16);
    const b = Number.parseInt(normalized.slice(4, 6), 16);
    if (![r, g, b].every(Number.isFinite)) return `rgba(56, 213, 255, ${a})`;
    return `rgba(${r}, ${g}, ${b}, ${a})`;
  }
}
