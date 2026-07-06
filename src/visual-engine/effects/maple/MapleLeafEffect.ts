import type { ThemeEffects, VisualEffectConfig } from '../../../themes/theme.types';
import { countFor, ParticleEffect } from '../shared/ParticleEffect';

export class MapleLeafEffect extends ParticleEffect {
  readonly id = 'maple_leaf';
  protected readonly maximum = 72;
  private sprite: HTMLCanvasElement | null = null;
  private spriteColor = '';

  update(delta: number, config: VisualEffectConfig, reduced: boolean) {
    const count = countFor(this.maximum, config.intensity, reduced);
    const speed = 35 + config.speed * 90;
    for (let i = 0; i < count; i++) {
      const leaf = this.particles[i];
      leaf.phase += delta * (1 + config.speed * 2.2);
      leaf.x += (Math.cos(leaf.phase) * 24 + leaf.vx * 7) * delta;
      leaf.y += speed * delta;
      leaf.rotation += leaf.spin * delta * 1.8;
      if (leaf.y > this.height + 30) this.resetTop(leaf);
    }
  }

  render(ctx: CanvasRenderingContext2D, theme: ThemeEffects, config: VisualEffectConfig, reduced: boolean) {
    const count = countFor(this.maximum, config.intensity, reduced);
    const sprite = this.getSprite(config.color || theme.mapleColor || theme.sakuraColor);
    for (let i = 0; i < count; i++) {
      const leaf = this.particles[i];
      const size = leaf.size * 1.25;
      ctx.save();
      ctx.globalAlpha *= leaf.alpha;
      ctx.translate(leaf.x, leaf.y);
      ctx.rotate(leaf.rotation);
      ctx.drawImage(sprite, -size * 1.25, -size * 1.5, size * 2.5, size * 2.9);
      ctx.restore();
    }
  }

  private getSprite(color: string) {
    if (this.sprite && this.spriteColor === color) return this.sprite;
    const sprite = document.createElement('canvas');
    sprite.width = 40; sprite.height = 46;
    const context = sprite.getContext('2d')!;
    context.fillStyle = color; context.translate(20, 22);
    const size = 14;
    context.beginPath(); context.moveTo(0, -size * 1.45); context.lineTo(size * .3, -size * .45); context.lineTo(size, -size * .75); context.lineTo(size * .62, 0); context.lineTo(size * 1.2, size * .35); context.lineTo(size * .35, size * .42); context.lineTo(0, size * 1.35); context.lineTo(-size * .35, size * .42); context.lineTo(-size * 1.2, size * .35); context.lineTo(-size * .62, 0); context.lineTo(-size, -size * .75); context.lineTo(-size * .3, -size * .45); context.closePath(); context.fill();
    this.sprite = sprite; this.spriteColor = color;
    return sprite;
  }
}

