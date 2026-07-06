import type { ThemeEffects, VisualEffectConfig } from '../../../themes/theme.types';
import { countFor, ParticleEffect } from '../shared/ParticleEffect';

export class StarsEffect extends ParticleEffect {
  readonly id = 'stars';
  protected readonly maximum = 190;

  update(delta: number, config: VisualEffectConfig, reduced: boolean) {
    const count = countFor(this.maximum, config.intensity, reduced);
    for (let i = 0; i < count; i++) this.particles[i].phase += delta * (.7 + config.speed * 2.5);
  }

  render(ctx: CanvasRenderingContext2D, theme: ThemeEffects, config: VisualEffectConfig, reduced: boolean) {
    const count = countFor(this.maximum, config.intensity, reduced);
    ctx.fillStyle = config.color || theme.starsColor;
    const baseAlpha = ctx.globalAlpha;
    for (let i = 0; i < count; i++) {
      const star = this.particles[i];
      ctx.globalAlpha = baseAlpha * star.alpha * (.35 + (Math.sin(star.phase) + 1) * .325);
      const size = Math.max(.8, star.size * .44);
      ctx.fillRect(star.x - size * .5, star.y - size * .5, size, size);
    }
  }
}

