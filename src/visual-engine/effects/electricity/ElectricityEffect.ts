import type { ThemeEffects, VisualEffectConfig } from '../../../themes/theme.types';
import type { EffectModule } from '../../core/VisualEngine';

type Bolt = { points: { x: number; y: number }[]; age: number; life: number };

export class ElectricityEffect implements EffectModule {
  readonly id = 'electricity';
  private width = 1;
  private height = 1;
  private timer = 0;
  private bolts: Bolt[] = [];

  initialize(ctx: CanvasRenderingContext2D) { this.resize(ctx.canvas.width, ctx.canvas.height); }
  resize(width: number, height: number) { this.width = width; this.height = height; }
  update(delta: number, config: VisualEffectConfig, reduced: boolean) {
    this.timer += delta * (.7 + config.speed * 4);
    if (this.timer > 1.2 / (.2 + config.intensity) && this.bolts.length < (reduced ? 1 : 3)) {
      this.bolts.push(this.createBolt()); this.timer = 0;
    }
    this.bolts.forEach((bolt) => bolt.age += delta);
    this.bolts = this.bolts.filter((bolt) => bolt.age < bolt.life);
  }
  render(ctx: CanvasRenderingContext2D, theme: ThemeEffects, config: VisualEffectConfig, reduced: boolean) {
    ctx.strokeStyle = config.color || theme.electricityColor;
    ctx.lineWidth = reduced ? 1.2 : 2;
    const baseAlpha = ctx.globalAlpha;
    for (const bolt of this.bolts) {
      ctx.globalAlpha = baseAlpha * (1 - bolt.age / bolt.life);
      ctx.beginPath(); ctx.moveTo(bolt.points[0].x, bolt.points[0].y);
      bolt.points.slice(1).forEach((point) => ctx.lineTo(point.x, point.y));
      ctx.stroke();
    }
  }
  destroy() { this.bolts = []; }

  private createBolt(): Bolt {
    const start = Math.random() * this.width;
    const points = Array.from({ length: 13 }, (_, index) => ({
      x: start + (Math.random() - .5) * this.width * .22,
      y: index / 12 * this.height,
    }));
    return { points, age: 0, life: .15 + Math.random() * .2 };
  }
}

