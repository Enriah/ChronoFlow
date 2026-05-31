import type { ThemeEffects } from '../../../themes/theme.types';
import type { EffectModule } from '../../core/VisualEngine';

class Snowflake {
  x: number = 0;
  y: number = 0;
  size: number = 0;
  speedX: number = 0;
  speedY: number = 0;
  opacity: number = 0;

  constructor(width: number, height: number) {
    this.reset(width, height, true);
  }

  reset(width: number, height: number, initial: boolean = false) {
    this.x = Math.random() * width;
    this.y = initial ? Math.random() * height : -10;
    this.size = 1 + Math.random() * 3;
    this.speedX = -0.5 + Math.random() * 1;
    this.speedY = 1 + Math.random() * 2;
    this.opacity = 0.4 + Math.random() * 0.4;
  }

  update(width: number, height: number, speedMultiplier: number) {
    this.x += this.speedX * speedMultiplier;
    this.y += this.speedY * speedMultiplier;

    if (this.y > height || this.x < -10 || this.x > width + 10) {
      this.reset(width, height);
    }
  }

  render(ctx: CanvasRenderingContext2D, color: string) {
    ctx.fillStyle = color;
    ctx.globalAlpha = this.opacity;
    ctx.fillRect(this.x - this.size/2, this.y - this.size/2, this.size, this.size);
  }
}

export class SnowEffect implements EffectModule {
  id = 'snow';
  private flakes: Snowflake[] = [];
  private width: number = 0;
  private height: number = 0;
  private maxFlakes: number = 200; // Reduced from 300
  private intensity: number = 0.5;

  initialize(ctx: CanvasRenderingContext2D): void {
    this.width = ctx.canvas.width;
    this.height = ctx.canvas.height;
    this.flakes = Array.from({ length: this.maxFlakes }, () => new Snowflake(this.width, this.height));
  }

  update(_deltaTime: number, intensity: number, speed: number): void {
    this.intensity = intensity;
    const activeCount = Math.floor(this.maxFlakes * intensity);
    for (let i = 0; i < activeCount; i++) {
      if (!this.flakes[i]) {
        this.flakes[i] = new Snowflake(this.width, this.height);
      }
      this.flakes[i].update(this.width, this.height, speed);
    }
  }

  render(ctx: CanvasRenderingContext2D, theme: ThemeEffects): void {
    const activeCount = Math.floor(this.maxFlakes * this.intensity);
    for (let i = 0; i < activeCount; i++) {
      this.flakes[i]?.render(ctx, theme.snowColor);
    }
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
  }

  destroy(): void {
    this.flakes = [];
  }
}
