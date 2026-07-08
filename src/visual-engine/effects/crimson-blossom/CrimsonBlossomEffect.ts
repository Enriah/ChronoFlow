import type { ThemeEffects, VisualEffectConfig } from '../../../themes/theme.types';
import { countFor, ParticleEffect } from '../shared/ParticleEffect';

export class CrimsonBlossomEffect extends ParticleEffect {
  readonly id = 'crimson_blossom';
  protected readonly maximum = 96;

  private sprite: HTMLCanvasElement | null = null;
  private spriteKey = '';

  update(delta: number, config: VisualEffectConfig, reduced: boolean) {
    const count = countFor(this.maximum, config.intensity, reduced);
    const fallSpeed = 36 + config.speed * 92;
    const drift = 22 + config.speed * 20;

    for (let i = 0; i < count; i++) {
      const blossom = this.particles[i];
      blossom.phase += delta * (1.1 + config.speed * 2.4);
      blossom.x += (Math.sin(blossom.phase * 0.92) * drift + blossom.vx * 10) * delta;
      blossom.y += (fallSpeed + Math.cos(blossom.phase) * 10) * delta;
      blossom.rotation += blossom.spin * delta * (1.4 + config.speed);

      if (blossom.y > this.height + 28 || blossom.x < -40 || blossom.x > this.width + 40) {
        this.resetDropdown(blossom);
      }
    }
  }

  render(ctx: CanvasRenderingContext2D, theme: ThemeEffects, config: VisualEffectConfig, reduced: boolean) {
    const count = countFor(this.maximum, config.intensity, reduced);
    const sprite = this.getSprite(config.color || theme.crimsonBlossomColor || theme.sakuraColor, theme.starsColor);

    for (let i = 0; i < count; i++) {
      const blossom = this.particles[i];
      const pulse = 0.78 + Math.sin(blossom.phase) * 0.12;
      const size = blossom.size * (reduced ? 0.95 : 1.16);

      ctx.save();
      ctx.globalAlpha *= blossom.alpha * pulse;
      ctx.translate(blossom.x, blossom.y);
      ctx.rotate(blossom.rotation);
      ctx.drawImage(sprite, -size * 1.65, -size * 1.65, size * 3.3, size * 3.3);
      ctx.restore();
    }
  }

  private resetDropdown(particle: { x: number; y: number; vx: number; vy: number; size: number; alpha: number; rotation: number; spin: number; phase: number }) {
    particle.x = Math.random() * this.width;
    particle.y = -30 - Math.random() * this.height * 0.32;
    particle.vx = Math.random() * 2 - 1;
    particle.vy = 1 + Math.random() * 2;
    particle.size = 3 + Math.random() * 7;
    particle.alpha = 0.42 + Math.random() * 0.46;
    particle.rotation = Math.random() * Math.PI * 2;
    particle.spin = (Math.random() - 0.5) * 2.2;
    particle.phase = Math.random() * Math.PI * 2;
  }

  private getSprite(color: string, coreColor: string) {
    const key = `${color}|${coreColor}`;
    if (this.sprite && this.spriteKey === key) return this.sprite;

    const sprite = document.createElement('canvas');
    sprite.width = 48;
    sprite.height = 48;
    const context = sprite.getContext('2d')!;
    context.translate(24, 24);

    context.shadowColor = color;
    context.shadowBlur = 5;
    for (let i = 0; i < 5; i++) {
      context.save();
      context.rotate((Math.PI * 2 * i) / 5);
      const gradient = context.createRadialGradient(0, -5, 1, 0, -10, 18);
      gradient.addColorStop(0, this.rgba(coreColor, 0.72));
      gradient.addColorStop(0.32, this.rgba(color, 0.9));
      gradient.addColorStop(1, this.rgba(color, 0.08));
      context.fillStyle = gradient;
      context.beginPath();
      context.moveTo(0, 0);
      context.bezierCurveTo(-8, -8, -7, -21, 0, -18);
      context.bezierCurveTo(8, -21, 8, -8, 0, 0);
      context.fill();
      context.restore();
    }

    context.shadowBlur = 0;
    context.fillStyle = this.rgba(coreColor, 0.92);
    context.beginPath();
    context.arc(0, 0, 2.4, 0, Math.PI * 2);
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
    if (![r, g, b].every(Number.isFinite)) return `rgba(255, 63, 85, ${a})`;
    return `rgba(${r}, ${g}, ${b}, ${a})`;
  }
}
