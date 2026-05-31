import type { ThemeEffects } from '../../../themes/theme.types';
import type { EffectModule } from '../../core/VisualEngine';

export class FogEffect implements EffectModule {
  id = 'fog';
  private width: number = 0;
  private height: number = 0;
  private offset: number = 0;
  private intensity: number = 0.5;

  initialize(ctx: CanvasRenderingContext2D): void {
    this.width = ctx.canvas.width;
    this.height = ctx.canvas.height;
  }

  update(deltaTime: number, intensity: number, speed: number, _performanceMode: boolean): void {
    this.intensity = intensity;
    this.offset += deltaTime * speed * 50;
  }

  render(ctx: CanvasRenderingContext2D, theme: ThemeEffects, performanceMode: boolean): void {
    const baseColor = theme.fogColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
    let colorPrefix = 'rgba(255, 255, 255, ';
    if (baseColor) {
      colorPrefix = `rgba(${baseColor[1]}, ${baseColor[2]}, ${baseColor[3]}, `;
    }

    const gradient = ctx.createLinearGradient(0, 0, this.width, 0);
    const alpha = this.intensity * 0.3;
    
    gradient.addColorStop(0, `${colorPrefix}0)`);
    gradient.addColorStop(0.5, `${colorPrefix}${alpha})`);
    gradient.addColorStop(1, `${colorPrefix}0)`);

    ctx.fillStyle = gradient;
    
    // Simulate moving fog with multiple layers - reduce in performance mode
    const layers = performanceMode ? 1 : 3;
    for (let i = 0; i < layers; i++) {
      const shift = (this.offset * (1 + i * 0.2)) % this.width;
      ctx.save();
      ctx.translate(shift - this.width, 0);
      ctx.fillRect(0, 0, this.width * 2, this.height);
      ctx.restore();
    }
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
  }

  destroy(): void {}
}
