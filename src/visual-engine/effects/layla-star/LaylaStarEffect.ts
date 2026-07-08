import type { ThemeEffects, VisualEffectConfig } from '../../../themes/theme.types';
import { countFor, ParticleEffect } from '../shared/ParticleEffect';

export class LaylaStarEffect extends ParticleEffect {
  readonly id = 'layla_star';
  protected readonly maximum = 88;

  private sprite: HTMLCanvasElement | null = null;
  private spriteKey = '';

  update(delta: number, config: VisualEffectConfig, reduced: boolean) {
    const count = countFor(this.maximum, config.intensity, reduced);
    const fallSpeed = 22 + config.speed * 58;
    const drift = 12 + config.speed * 18;

    for (let i = 0; i < count; i++) {
      const star = this.particles[i];
      star.phase += delta * (0.8 + config.speed * 2.2);
      star.x += (Math.sin(star.phase * 0.85) * drift + star.vx * 7) * delta;
      star.y += (fallSpeed + Math.cos(star.phase) * 5) * delta;
      star.rotation += star.spin * delta * (0.55 + config.speed * 0.7);

      if (star.y > this.height + 34 || star.x < -40 || star.x > this.width + 40) {
        this.resetDropdown(star);
      }
    }
  }

  render(ctx: CanvasRenderingContext2D, theme: ThemeEffects, config: VisualEffectConfig, reduced: boolean) {
    const count = countFor(this.maximum, config.intensity, reduced);
    const sprite = this.getSprite(config.color || theme.laylaStarColor || theme.starsColor, theme.snowColor);

    for (let i = 0; i < count; i++) {
      const star = this.particles[i];
      const pulse = 0.74 + Math.sin(star.phase) * 0.16;
      const size = star.size * (reduced ? 0.98 : 1.12);

      ctx.save();
      ctx.globalAlpha *= star.alpha * pulse;
      ctx.translate(star.x, star.y);
      ctx.rotate(star.rotation);
      ctx.drawImage(sprite, -size * 1.85, -size * 1.85, size * 3.7, size * 3.7);
      ctx.restore();
    }
  }

  private resetDropdown(particle: { x: number; y: number; vx: number; vy: number; size: number; alpha: number; rotation: number; spin: number; phase: number }) {
    particle.x = Math.random() * this.width;
    particle.y = -36 - Math.random() * this.height * 0.28;
    particle.vx = Math.random() * 2 - 1;
    particle.vy = 1 + Math.random() * 2;
    particle.size = 3.4 + Math.random() * 5.8;
    particle.alpha = 0.38 + Math.random() * 0.42;
    particle.rotation = Math.random() * Math.PI * 2;
    particle.spin = (Math.random() - 0.5) * 0.9;
    particle.phase = Math.random() * Math.PI * 2;
  }

  private getSprite(color: string, coreColor: string) {
    const key = `${color}|${coreColor}`;
    if (this.sprite && this.spriteKey === key) return this.sprite;

    const sprite = document.createElement('canvas');
    sprite.width = 56;
    sprite.height = 56;
    const context = sprite.getContext('2d')!;
    context.translate(28, 28);

    const glow = context.createRadialGradient(0, 0, 3, 0, 0, 27);
    glow.addColorStop(0, this.rgba('#dbeafe', 0.5));
    glow.addColorStop(0.42, this.rgba('#60a5fa', 0.26));
    glow.addColorStop(1, this.rgba('#2563eb', 0));
    context.fillStyle = glow;
    context.beginPath();
    context.arc(0, 0, 27, 0, Math.PI * 2);
    context.fill();

    context.shadowColor = '#93c5fd';
    context.shadowBlur = 8;
    const gradient = context.createRadialGradient(0, 0, 0, 0, 0, 22);
    gradient.addColorStop(0, this.rgba('#dbeafe', 0.58));
    gradient.addColorStop(0.34, this.rgba('#3566b8', 0.9));
    gradient.addColorStop(0.72, this.rgba('#183a86', 0.9));
    gradient.addColorStop(1, this.rgba('#0b1e52', 0.72));
    context.fillStyle = gradient;
    context.strokeStyle = this.rgba('#f8fbff', 0.92);
    context.lineWidth = 2.4;
    context.beginPath();
    context.moveTo(0, -22);
    context.bezierCurveTo(2.4, -21.2, 3.6, -18.2, 4.8, -14.2);
    context.bezierCurveTo(6.4, -8.8, 10.1, -5.1, 15.8, -3.4);
    context.bezierCurveTo(20.2, -2.1, 22, -1.1, 22, 0);
    context.bezierCurveTo(22, 1.1, 20.2, 2.1, 15.8, 3.4);
    context.bezierCurveTo(10.1, 5.1, 6.4, 8.8, 4.8, 14.2);
    context.bezierCurveTo(3.6, 18.2, 2.4, 21.2, 0, 22);
    context.bezierCurveTo(-2.4, 21.2, -3.6, 18.2, -4.8, 14.2);
    context.bezierCurveTo(-6.4, 8.8, -10.1, 5.1, -15.8, 3.4);
    context.bezierCurveTo(-20.2, 2.1, -22, 1.1, -22, 0);
    context.bezierCurveTo(-22, -1.1, -20.2, -2.1, -15.8, -3.4);
    context.bezierCurveTo(-10.1, -5.1, -6.4, -8.8, -4.8, -14.2);
    context.bezierCurveTo(-3.6, -18.2, -2.4, -21.2, 0, -22);
    context.closePath();
    context.fill();
    context.stroke();

    context.shadowBlur = 0;
    context.strokeStyle = this.rgba('#bfdbfe', 0.44);
    context.lineWidth = 0.9;
    context.beginPath();
    context.moveTo(0, -14);
    context.lineTo(0, 14);
    context.moveTo(-14, 0);
    context.lineTo(14, 0);
    context.stroke();

    const specks = [
      [-5.8, -6.2, 0.9],
      [4.4, -7.6, 0.7],
      [6.8, 3.8, 0.8],
      [-7.2, 5.2, 0.65],
      [0.8, 8.2, 0.55],
    ] as const;
    context.fillStyle = this.rgba('#ffffff', 0.82);
    specks.forEach(([x, y, radius]) => {
      context.beginPath();
      context.arc(x, y, radius, 0, Math.PI * 2);
      context.fill();
    });

    context.fillStyle = this.rgba('#f8fbff', 0.92);
    context.beginPath();
    context.arc(0, 0, 2.2, 0, Math.PI * 2);
    context.fill();

    this.sprite = sprite;
    this.spriteKey = key;
    return sprite;
  }

  private rgba(color: string, alpha: number) {
    const a = Math.max(0, Math.min(1, alpha));
    if (color.startsWith('rgba')) return color.replace(/rgba\(([^)]+),\s*[\d.]+\)/, `rgba($1, ${a})`);
    if (color.startsWith('rgb')) return color.replace('rgb(', 'rgba(').replace(')', `, ${a})`);

    const hex = color.replace('#', '');
    const normalized = hex.length === 3 ? hex.split('').map((part) => part + part).join('') : hex.slice(0, 6);
    const r = Number.parseInt(normalized.slice(0, 2), 16);
    const g = Number.parseInt(normalized.slice(2, 4), 16);
    const b = Number.parseInt(normalized.slice(4, 6), 16);
    if (![r, g, b].every(Number.isFinite)) return `rgba(183, 216, 255, ${a})`;
    return `rgba(${r}, ${g}, ${b}, ${a})`;
  }
}
