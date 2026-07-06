import type { ThemeEffects, VisualEffectConfig } from '../../../themes/theme.types';
import { countFor, ParticleEffect } from '../shared/ParticleEffect';

export class SakuraEffect extends ParticleEffect {
  readonly id = 'sakura';
  protected readonly maximum = 90;
  private sprite: HTMLCanvasElement | null = null;
  private spriteColor = '';

  update(delta: number, config: VisualEffectConfig, reduced: boolean) {
    const count = countFor(this.maximum, config.intensity, reduced);
    const speed = 28 + config.speed * 75;
    for (let i = 0; i < count; i++) {
      const petal = this.particles[i];
      petal.phase += delta * (1.2 + config.speed * 2);
      petal.x += (Math.sin(petal.phase) * 18 + petal.vx * 8) * delta;
      petal.y += speed * delta;
      petal.rotation += petal.spin * delta;
      if (petal.y > this.height + 20) this.resetTop(petal);
    }
  }

  render(ctx: CanvasRenderingContext2D, theme: ThemeEffects, config: VisualEffectConfig, reduced: boolean) {
    const count = countFor(this.maximum, config.intensity, reduced);
    const sprite = this.getSprite(config.color || theme.sakuraColor);
    for (let i = 0; i < count; i++) {
      const petal = this.particles[i];
      ctx.save();
      ctx.globalAlpha *= petal.alpha;
      ctx.translate(petal.x, petal.y);
      ctx.rotate(petal.rotation);
      ctx.drawImage(sprite, -petal.size, -petal.size, petal.size * 2, petal.size * 2.25);
      ctx.restore();
    }
  }

  private getSprite(color: string) {
    if (this.sprite && this.spriteColor === color) return this.sprite;
    const sprite = document.createElement('canvas');
    sprite.width = 32; sprite.height = 36;
    const context = sprite.getContext('2d')!;
    context.fillStyle = color; context.translate(16, 15);
    context.beginPath(); context.moveTo(0, 0);
    context.bezierCurveTo(-14, -14, -14, 14, 0, 18);
    context.bezierCurveTo(14, 14, 14, -14, 0, 0); context.fill();
    this.sprite = sprite; this.spriteColor = color;
    return sprite;
  }
}

