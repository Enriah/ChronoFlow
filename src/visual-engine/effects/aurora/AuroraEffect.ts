import type { ThemeEffects, VisualEffectConfig } from '../../../themes/theme.types';
import type { EffectModule } from '../../core/VisualEngine';
import { clamp01 } from '../shared/ParticleEffect';

export class AuroraEffect implements EffectModule {
  readonly id = 'aurora';

  private width = 1;
  private height = 1;
  private phase = 0;
  private buffer: HTMLCanvasElement | null = null;
  private bufferContext: CanvasRenderingContext2D | null = null;
  private bufferedPhase = Number.NEGATIVE_INFINITY;
  private bufferKey = '';

  initialize(ctx: CanvasRenderingContext2D) {
    this.resize(ctx.canvas.width, ctx.canvas.height);
  }

  resize(width: number, height: number) {
    this.width = Math.max(1, width);
    this.height = Math.max(1, height);
    this.buffer = null;
    this.bufferContext = null;
    this.bufferedPhase = Number.NEGATIVE_INFINITY;
  }

  update(delta: number, config: VisualEffectConfig) {
    const speed = config.speed ?? 0.5;
    this.phase += delta * (0.08 + speed * 0.35);
  }

  render(
    ctx: CanvasRenderingContext2D,
    theme: ThemeEffects,
    config: VisualEffectConfig,
    reduced: boolean
  ) {
    const w = this.width;
    const h = this.height;
    const intensity = clamp01(config.intensity ?? 0.78);
    const opacity = clamp01(config.opacity ?? 0.68);
    const speed = config.speed ?? 0.5;
    const colors = [
      config.color || theme.auroraColor || '#68ffb8',
      theme.electricityColor || '#7ef9ff',
      '#ff6adf',
      theme.starsColor || '#9d7bff',
    ];
    const layerCount = 1;
    const scale = reduced ? .38 : .52;
    const buffer = this.getBuffer(scale);
    const bufferContext = this.bufferContext!;
    const key = `${colors.join('|')}|${intensity.toFixed(2)}|${opacity.toFixed(2)}|${reduced}`;
    const refreshDistance = reduced ? .045 : .028;

    if (key !== this.bufferKey || this.phase - this.bufferedPhase >= refreshDistance) {
      bufferContext.setTransform(1, 0, 0, 1, 0, 0);
      bufferContext.clearRect(0, 0, buffer.width, buffer.height);
      bufferContext.setTransform(scale, 0, 0, scale, 0, 0);
      bufferContext.save();
      bufferContext.globalCompositeOperation = 'screen';
      this.drawHaze(bufferContext, w, h, colors, opacity * .35);
      for (let i = 0; i < layerCount; i++) {
        this.drawRibbon(bufferContext, w, h, i, layerCount, colors, { intensity, opacity, speed, reduced });
      }
      if (!reduced) for (let i = 0; i < 2; i++) this.drawHighlight(bufferContext, w, h, i, colors, opacity);
      bufferContext.restore();
      this.bufferKey = key;
      this.bufferedPhase = this.phase;
    }

    ctx.drawImage(buffer, 0, 0, w, h);
  }

  private getBuffer(scale: number) {
    const width = Math.max(1, Math.round(this.width * scale));
    const height = Math.max(1, Math.round(this.height * scale));
    if (this.buffer && this.buffer.width === width && this.buffer.height === height) return this.buffer;
    this.buffer = document.createElement('canvas');
    this.buffer.width = width; this.buffer.height = height;
    this.bufferContext = this.buffer.getContext('2d', { alpha: true });
    this.bufferKey = '';
    this.bufferedPhase = Number.NEGATIVE_INFINITY;
    return this.buffer;
  }
  private drawCurtainStrands(
  ctx: CanvasRenderingContext2D,
  centerY: number,
  thickness: number,
  phase: number,
  colorA: string,
  colorB: string,
  colorC: string,
  opacity: number,
  reduced: boolean
) {
  const w = this.width;

  const count = reduced ? 10 : 26;

  ctx.save();

  ctx.filter = `blur(${reduced ? 4 : 7}px)`;
  ctx.globalCompositeOperation = 'lighter';

  for (let i = 0; i < count; i++) {
    const t = i / Math.max(1, count - 1);

    const x =
      t * w +
      Math.sin(phase + i * 1.37) * 38 +
      Math.sin(phase * 0.5 + i * 2.1) * 16;

    const strandWidth = 7 + (Math.sin(i * 2.3 + phase) + 1) * 9;

    const top =
      centerY -
      thickness * (1.7 + Math.sin(i * 1.7 + phase) * 0.35);

    const bottom =
      centerY +
      thickness * (1.15 + Math.sin(i * 1.1 - phase) * 0.25);

    const strandColor =
      i % 3 === 0 ? colorA : i % 3 === 1 ? colorB : colorC;

    const g = ctx.createLinearGradient(x, top, x, bottom);

    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(0.18, this.rgba(strandColor, opacity * 0.10));
    g.addColorStop(0.42, this.rgba(strandColor, opacity * 0.42));
    g.addColorStop(0.58, this.rgba(strandColor, opacity * 0.58));
    g.addColorStop(0.78, this.rgba(strandColor, opacity * 0.20));
    g.addColorStop(1, 'rgba(0,0,0,0)');

    ctx.fillStyle = g;
    ctx.globalAlpha = 0.75 + Math.sin(i * 1.9 + phase) * 0.2;

    ctx.fillRect(
      x - strandWidth * 0.5,
      top,
      strandWidth,
      bottom - top
    );
  }

  ctx.restore();
  }
  private drawHaze(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  colors: string[],
  opacity: number
  ) {
  ctx.save();

  ctx.filter = 'blur(34px)';
  ctx.globalAlpha = 1;

  const leftGlow = ctx.createRadialGradient(
    w * 0.18,
    h * 0.22,
    0,
    w * 0.18,
    h * 0.22,
    Math.max(w, h) * 0.62
  );

  leftGlow.addColorStop(0, this.rgba(colors[2], opacity * 1.2));
  leftGlow.addColorStop(0.42, this.rgba(colors[3], opacity * 0.55));
  leftGlow.addColorStop(1, 'rgba(0,0,0,0)');

  ctx.fillStyle = leftGlow;
  ctx.fillRect(0, 0, w, h);

  const rightGlow = ctx.createRadialGradient(
    w * 0.72,
    h * 0.22,
    0,
    w * 0.72,
    h * 0.22,
    Math.max(w, h) * 0.58
  );

  rightGlow.addColorStop(0, this.rgba(colors[0], opacity * 1.35));
  rightGlow.addColorStop(0.4, this.rgba(colors[1], opacity * 0.65));
  rightGlow.addColorStop(1, 'rgba(0,0,0,0)');

  ctx.fillStyle = rightGlow;
  ctx.fillRect(0, 0, w, h);

  ctx.restore();
  }

  private drawRibbon(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    index: number,
    _total: number,
    colors: string[],
    options: {
      intensity: number;
      opacity: number;
      speed: number;
      reduced: boolean;
    }
  ) {
    const { intensity, opacity, speed, reduced } = options;

    const centerY = h * 0.28 + Math.sin(this.phase * 0.45) * h * 0.035;

    const amplitude = h * 0.11 * intensity;

    const thickness = h * 0.18;
    const phase = this.phase * (0.45 + speed * 0.25) + index * 1.8;

    const step = reduced ? 48 : 28;

    const topPoints: { x: number; y: number }[] = [];
    const bottomPoints: { x: number; y: number }[] = [];

    for (let x = -80; x <= w + 80; x += step) {
      const wave1 = Math.sin(x * 0.006 + phase) * amplitude;
      const wave2 = Math.sin(x * 0.014 + phase * 0.72) * amplitude * 0.42;
      const wave3 = Math.sin(x * 0.0025 - phase * 0.55) * amplitude * 0.6;

      const y = centerY + wave1 + wave2 + wave3;

      const localThickness =
        thickness *
        (0.75 +
          Math.sin(x * 0.008 + phase * 1.35) * 0.18 +
          Math.sin(x * 0.017 - phase) * 0.08);

      topPoints.push({
        x,
        y: y - localThickness,
      });

      bottomPoints.push({
        x,
        y: y + localThickness,
      });
    }

    const gradient = ctx.createLinearGradient(0,centerY - thickness * 1.8,0,centerY + thickness * 1.8
);

    const c1 = colors[index % colors.length];
    const c2 = colors[(index + 1) % colors.length];
    const c3 = colors[(index + 2) % colors.length];
    gradient.addColorStop(0, 'rgba(0,0,0,0)');
    gradient.addColorStop(0.10, this.rgba(c3, opacity * 0.10));
    gradient.addColorStop(0.24, this.rgba(c1, opacity * 0.32));
    gradient.addColorStop(0.42, this.rgba(c2, opacity * 0.72));
    gradient.addColorStop(0.52, this.rgba(c3, opacity * 0.58));
    gradient.addColorStop(0.64, this.rgba(c1, opacity * 0.45));
    gradient.addColorStop(0.80, this.rgba(c2, opacity * 0.18));
    gradient.addColorStop(1, 'rgba(0,0,0,0)');

    ctx.save();

    // Blur is what makes it stop looking like a hard rectangle.
    ctx.filter = `blur(${reduced ? 7 : 12}px)`;
    ctx.globalAlpha = 1;
    ctx.fillStyle = gradient;
    ctx.beginPath();

    topPoints.forEach((p, i) => {
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    });

    for (let i = bottomPoints.length - 1; i >= 0; i--) {
      const p = bottomPoints[i];
      ctx.lineTo(p.x, p.y);
    }

    ctx.closePath();

    ctx.fill();

// Váº½ cÃ¡c tia dá»c bÃªn trong ribbon Ä‘á»ƒ giá»‘ng cá»±c quang tháº­t hÆ¡n
    ctx.clip();

  this.drawCurtainStrands(
    ctx,
    centerY,
    thickness,
    phase,
    c1,
    c2,
    c3,
    opacity,
    reduced
  );

  ctx.restore();
  }

  private drawHighlight(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    index: number,
    colors: string[],
    opacity: number
  ) {
    const yBase =h * 0.30 +index * h * 0.045 + Math.sin(this.phase * 0.5 + index) * h * 0.025;
    const amplitude = h * 0.045;
    const phase = this.phase * 0.7 + index * 2.2;

    const gradient = ctx.createLinearGradient(0, 0, w, 0);
    gradient.addColorStop(0, 'rgba(0,0,0,0)');
    gradient.addColorStop(0.22, this.rgba(colors[index % colors.length], opacity * 0.16));
    gradient.addColorStop(0.45, this.rgba(colors[(index + 1) % colors.length], opacity * 0.55));
    gradient.addColorStop(0.62, this.rgba(colors[(index + 2) % colors.length], opacity * 0.42));
    gradient.addColorStop(0.82, this.rgba(colors[index % colors.length], opacity * 0.12));
    gradient.addColorStop(1, 'rgba(0,0,0,0)');

    ctx.save();
    ctx.filter = 'blur(6px)';
    ctx.globalAlpha = opacity * 1;
    ctx.strokeStyle = gradient;
    ctx.lineWidth = Math.max(3, h * 0.016);
    ctx.lineCap = 'round';

    ctx.beginPath();

    for (let x = -40; x <= w + 40; x += 24) {
      const y =
        yBase +
        Math.sin(x * 0.008 + phase) * amplitude +
        Math.sin(x * 0.021 - phase * 0.5) * amplitude * 0.35;

      if (x === -40) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }

    ctx.stroke();
    ctx.restore();
  }

  private rgba(color: string, alpha: number) {
    const a = clamp01(alpha);

    if (color.startsWith('rgba')) {
      return color.replace(/rgba\(([^)]+),\s*[\d.]+\)/, `rgba($1, ${a})`);
    }

    if (color.startsWith('rgb')) {
      return color.replace('rgb(', 'rgba(').replace(')', `, ${a})`);
    }

    const hex = color.replace('#', '');

    const normalized =
      hex.length === 3
        ? hex
            .split('')
            .map((c) => c + c)
            .join('')
        : hex;

    const r = parseInt(normalized.slice(0, 2), 16);
    const g = parseInt(normalized.slice(2, 4), 16);
    const b = parseInt(normalized.slice(4, 6), 16);

    return `rgba(${r}, ${g}, ${b}, ${a})`;
  }

  destroy() { this.buffer = null; this.bufferContext = null; }
}

