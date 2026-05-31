import type { ThemeEffects } from '../../../themes/theme.types';
import type { EffectModule } from '../../core/VisualEngine';

class Star {
  x: number = 0;
  y: number = 0;
  size: number = 0;
  opacity: number = 0;
  twinkleSpeed: number = 0;
  twinklePhase: number = 0;

  constructor(width: number, height: number) {
    this.reset(width, height);
  }

  reset(width: number, height: number) {
    this.x = Math.random() * width;
    this.y = Math.random() * height;
    this.size = 0.5 + Math.random() * 1.5;
    this.opacity = 0.1 + Math.random() * 0.7;
    this.twinkleSpeed = 0.5 + Math.random() * 2;
    this.twinklePhase = Math.random() * Math.PI * 2;
  }

  update(deltaTime: number, speedMultiplier: number) {
    this.twinklePhase += this.twinkleSpeed * deltaTime * speedMultiplier;
  }

  render(ctx: CanvasRenderingContext2D, color: string) {
    const baseColor = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
    let currentOpacity = this.opacity * (0.5 + Math.sin(this.twinklePhase) * 0.5);
    
    if (baseColor) {
      const r = baseColor[1];
      const g = baseColor[2];
      const b = baseColor[3];
      ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${currentOpacity})`;
    } else {
      ctx.fillStyle = color;
    }

    ctx.fillRect(this.x - this.size/2, this.y - this.size/2, this.size, this.size);
  }
}

export class StarsEffect implements EffectModule {
  id = 'stars';
  private stars: Star[] = [];
  private width: number = 0;
  private height: number = 0;
  private maxStars: number = 200; // Reduced from 400
  private intensity: number = 0.5;

  initialize(ctx: CanvasRenderingContext2D): void {
    this.width = ctx.canvas.width;
    this.height = ctx.canvas.height;
    this.stars = Array.from({ length: this.maxStars }, () => new Star(this.width, this.height));
  }

  update(deltaTime: number, intensity: number, speed: number, _performanceMode: boolean): void {
    this.intensity = intensity;
    const activeCount = Math.floor(this.maxStars * intensity);
    for (let i = 0; i < activeCount; i++) {
      if (!this.stars[i]) {
        this.stars[i] = new Star(this.width, this.height);
      }
      this.stars[i].update(deltaTime, speed);
    }
  }

  render(ctx: CanvasRenderingContext2D, theme: ThemeEffects, _performanceMode: boolean): void {
    const activeCount = Math.floor(this.maxStars * this.intensity);
    for (let i = 0; i < activeCount; i++) {
      this.stars[i]?.render(ctx, theme.starsColor);
    }
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.stars.forEach(star => star.reset(width, height));
  }

  destroy(): void {
    this.stars = [];
  }
}
