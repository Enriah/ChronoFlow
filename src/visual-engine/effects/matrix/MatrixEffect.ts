import type { ThemeEffects, VisualEffectConfig } from '../../../themes/theme.types';
import type { EffectModule } from '../../core/VisualEngine';

export class MatrixEffect implements EffectModule {
  readonly id = 'matrix';
  private height = 1;
  private readonly fontSize = 19;
  private columns: number[] = [];

  initialize(ctx: CanvasRenderingContext2D) { this.resize(ctx.canvas.width, ctx.canvas.height); }
  resize(width: number, height: number) {
    this.height = height;
    this.columns = Array.from({ length: Math.ceil(width / this.fontSize) }, () => Math.random() * -height / this.fontSize);
  }
  update(delta: number, config: VisualEffectConfig, reduced: boolean) {
    const step = reduced ? 2 : 1;
    for (let i = 0; i < this.columns.length; i += step) {
      this.columns[i] += delta * (8 + config.speed * 28);
      if (this.columns[i] * this.fontSize > this.height && Math.random() < .08) this.columns[i] = -Math.random() * 20;
    }
  }
  render(ctx: CanvasRenderingContext2D, theme: ThemeEffects, config: VisualEffectConfig, reduced: boolean) {
    const characters = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const step = reduced ? 2 : 1;
    ctx.fillStyle = config.color || theme.matrixColor;
    ctx.font = `${this.fontSize}px monospace`;
    for (let i = 0; i < this.columns.length; i += step) {
      if (Math.random() < config.intensity) ctx.fillText(characters[Math.floor(Math.random() * characters.length)], i * this.fontSize, this.columns[i] * this.fontSize);
    }
  }
  destroy() { this.columns = []; }
}

