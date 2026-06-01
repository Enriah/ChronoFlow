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
  private maxStars: number = 150; // Reduced for performance
  private intensity: number = 0.5;
  private cachedColor: { r: string, g: string, b: string } | null = null;
  private lastColor: string = '';

  initialize(ctx: CanvasRenderingContext2D): void {
    this.width = ctx.canvas.width;
    this.height = ctx.canvas.height;
    this.stars = Array.from({ length: this.maxStars }, () => new Star(this.width, this.height));
  }

  private updateColorCache(color: string) {
    if (this.lastColor === color && this.cachedColor) return;
    this.lastColor = color;
    const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (match) {
      this.cachedColor = { r: match[1], g: match[2], b: match[3] };
    }
  }

  update(deltaTime: number, intensity: number, speed: number, performanceMode: boolean): void {
    this.intensity = intensity;
    const limitMultiplier = performanceMode ? 0.4 : 1;
    const activeCount = Math.floor(this.maxStars * intensity * limitMultiplier);
    
    for (let i = 0; i < activeCount; i++) {
      this.stars[i].update(deltaTime, speed);
    }
  }

  render(ctx: CanvasRenderingContext2D, theme: ThemeEffects, performanceMode: boolean): void {
    this.updateColorCache(theme.starsColor);
    const limitMultiplier = performanceMode ? 0.4 : 1;
    const activeCount = Math.floor(this.maxStars * this.intensity * limitMultiplier);

    for (let i = 0; i < activeCount; i++) {
      const star = this.stars[i];
      let currentOpacity = star.opacity * (0.5 + Math.sin(star.twinklePhase) * 0.5);
      
      if (this.cachedColor) {
        ctx.fillStyle = `rgba(${this.cachedColor.r}, ${this.cachedColor.g}, ${this.cachedColor.b}, ${currentOpacity})`;
      } else {
        ctx.fillStyle = theme.starsColor;
      }
      ctx.fillRect(star.x - star.size/2, star.y - star.size/2, star.size, star.size);
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
