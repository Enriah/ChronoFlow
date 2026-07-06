import type { ThemeEffects, VisualEffectConfig } from '../../../themes/theme.types';
import { countFor, ParticleEffect } from '../shared/ParticleEffect';

export class SnowEffect extends ParticleEffect {
  readonly id = 'snow';
  protected readonly maximum = 180;

  update(delta: number, config: VisualEffectConfig, reduced: boolean) {
    const count = countFor(this.maximum, config.intensity, reduced);
    const speed = 18 + config.speed * 70;
    for (let i = 0; i < count; i++) {
      const flake = this.particles[i];
      flake.phase += delta;
      flake.x += (Math.sin(flake.phase) * 8 + flake.vx * 4) * delta;
      flake.y += speed * delta * (.7 + flake.size / 8);
      if (flake.y > this.height + 10) this.resetTop(flake);
    }
  }

  render(ctx: CanvasRenderingContext2D, theme: ThemeEffects, config: VisualEffectConfig, reduced: boolean) {
    const count = countFor(this.maximum, config.intensity, reduced);
    ctx.fillStyle = config.color || theme.snowColor;
    const baseAlpha = ctx.globalAlpha;
    for (let i = 0; i < count; i++) {
      const flake = this.particles[i];
      ctx.globalAlpha = baseAlpha * flake.alpha;
      const size = Math.max(1, flake.size * .7);
      ctx.fillRect(flake.x - size * .5, flake.y - size * .5, size, size);
    }
  }
}

