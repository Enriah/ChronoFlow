import type { ThemeEffects, VisualEffectConfig } from '../../../themes/theme.types';
import type { EffectModule } from '../../core/VisualEngine';

export class FogEffect implements EffectModule {
  readonly id = 'fog';
  private width = 1;
  private height = 1;
  private offset = 0;
  private texture: HTMLCanvasElement | null = null;
  private textureColor = '';

  initialize(ctx: CanvasRenderingContext2D) { this.resize(ctx.canvas.width, ctx.canvas.height); }
  resize(width: number, height: number) { this.width = width; this.height = height; }
  update(delta: number, config: VisualEffectConfig) {
    this.offset = (this.offset + delta * (8 + config.speed * 34)) % this.width;
  }
  render(ctx: CanvasRenderingContext2D, theme: ThemeEffects, config: VisualEffectConfig, reduced: boolean) {
    const color = config.color || theme.fogColor;
    const layers = reduced ? 2 : 4;
    const texture = this.getTexture(color);
    const baseAlpha = ctx.globalAlpha;
    const blobWidth = this.width * .82;
    const blobHeight = this.height * .72;
    for (let i = 0; i < layers; i++) {
      const travel = this.width + blobWidth;
      const x = ((this.offset * (1 + i * .16) + i * this.width / layers) % travel) - blobWidth;
      const y = this.height * (.1 + i * .1);
      ctx.globalAlpha = baseAlpha * config.intensity * .32;
      ctx.drawImage(texture, x, y, blobWidth, blobHeight);
      if (x + blobWidth < this.width * .12) ctx.drawImage(texture, x + travel, y, blobWidth, blobHeight);
    }
  }
  destroy() { this.texture = null; }

  private getTexture(color: string) {
    if (this.texture && this.textureColor === color) return this.texture;
    const texture = document.createElement('canvas');
    texture.width = 480; texture.height = 260;
    const context = texture.getContext('2d')!;
    const gradient = context.createRadialGradient(240, 130, 0, 240, 130, 235);
    gradient.addColorStop(0, color); gradient.addColorStop(.55, color); gradient.addColorStop(1, 'transparent');
    context.fillStyle = gradient; context.fillRect(0, 0, texture.width, texture.height);
    this.texture = texture; this.textureColor = color;
    return texture;
  }
}

