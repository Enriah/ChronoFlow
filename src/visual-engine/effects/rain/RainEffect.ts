import type { ThemeEffects } from '../../../themes/theme.types';
import type { EffectModule } from '../../core/VisualEngine';

class Drop {
  x: number = 0;
  y: number = 0;
  speed: number = 0;
  length: number = 0;
  opacity: number = 0;

  constructor(width: number, height: number) {
    this.reset(width, height, true);
  }

  reset(width: number, height: number, initial: boolean = false) {
    this.x = Math.random() * width;
    this.y = initial ? Math.random() * height : -20;
    this.speed = 15 + Math.random() * 25;
    this.length = 15 + Math.random() * 25;
    this.opacity = 0.1 + Math.random() * 0.3;
  }

  update(width: number, height: number, speedMultiplier: number) {
    this.y += this.speed * speedMultiplier;
    if (this.y > height) {
      this.reset(width, height);
    }
  }

  render(ctx: CanvasRenderingContext2D, color: string) {
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(this.x, this.y);
    ctx.lineTo(this.x, this.y + this.length);
    ctx.stroke();
  }
}

export class RainEffect implements EffectModule {
  id = 'rain';
  private drops: Drop[] = [];
  private width: number = 0;
  private height: number = 0;
  private maxDrops: number = 200; // Reduced further for GPU safety
  private intensity: number = 0.5;

  initialize(ctx: CanvasRenderingContext2D): void {
    this.width = ctx.canvas.width;
    this.height = ctx.canvas.height;
    this.drops = Array.from({ length: this.maxDrops }, () => new Drop(this.width, this.height));
  }

  update(_deltaTime: number, intensity: number, speed: number, performanceMode: boolean): void {
    this.intensity = intensity;
    // Reduce active drops in performance mode
    const limitMultiplier = performanceMode ? 0.5 : 1;
    const activeCount = Math.floor(this.maxDrops * intensity * limitMultiplier);
    
    for (let i = 0; i < activeCount; i++) {
      this.drops[i].update(this.width, this.height, speed * 1.5);
    }
  }

  render(ctx: CanvasRenderingContext2D, theme: ThemeEffects, performanceMode: boolean): void {
    const limitMultiplier = performanceMode ? 0.5 : 1;
    const activeCount = Math.floor(this.maxDrops * this.intensity * limitMultiplier);
    
    ctx.beginPath(); // Batch drawing for minor boost
    for (let i = 0; i < activeCount; i++) {
      this.drops[i]?.render(ctx, theme.rainColor);
    }
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
  }

  destroy(): void {
    this.drops = [];
  }
}
