import type { ThemeEffects, VisualEffectConfig } from '../../../themes/theme.types';
import { countFor, ParticleEffect } from '../shared/ParticleEffect';

export class RainEffect extends ParticleEffect {
  readonly id = 'rain';
  protected readonly maximum = 180;

  update(delta: number, config: VisualEffectConfig, reduced: boolean) {
    const count = countFor(this.maximum, config.intensity, reduced);
    const velocity = 360 + config.speed * 700;
    for (let i = 0; i < count; i++) {
      const drop = this.particles[i];
      drop.y += velocity * delta;
      drop.x -= velocity * delta * .08;
      if (drop.y > this.height || drop.x < -30) this.resetTop(drop);
    }
  }

  render(ctx: CanvasRenderingContext2D, theme: ThemeEffects, config: VisualEffectConfig, reduced: boolean) {
    const count = countFor(this.maximum, config.intensity, reduced);
    ctx.strokeStyle = config.color || theme.rainColor;
    ctx.lineWidth = Math.max(1, this.width / 1400);
    ctx.beginPath();
    for (let i = 0; i < count; i++) {
      const drop = this.particles[i];
      ctx.moveTo(drop.x, drop.y);
      ctx.lineTo(drop.x - 5, drop.y + 20 + drop.size * 2);
    }
    ctx.stroke();
  }
}

