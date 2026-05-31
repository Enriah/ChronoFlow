import type { ThemeEffects } from '../../../themes/theme.types';
import type { EffectModule } from '../../core/VisualEngine';

class Petal {
  x: number = 0;
  y: number = 0;
  size: number = 0;
  speedX: number = 0;
  speedY: number = 0;
  rotation: number = 0;
  rotationSpeed: number = 0;
  opacity: number = 0;

  constructor(width: number, height: number) {
    this.reset(width, height, true);
  }

  reset(width: number, height: number, initial: boolean = false) {
    this.x = Math.random() * width;
    this.y = initial ? Math.random() * height : -20;
    this.size = 5 + Math.random() * 10;
    this.speedX = -1 + Math.random() * 2;
    this.speedY = 1 + Math.random() * 2;
    this.rotation = Math.random() * Math.PI * 2;
    this.rotationSpeed = (Math.random() - 0.5) * 0.05;
    this.opacity = 0.4 + Math.random() * 0.4;
  }

  update(width: number, height: number, speedMultiplier: number) {
    this.x += this.speedX * speedMultiplier;
    this.y += this.speedY * speedMultiplier;
    this.rotation += this.rotationSpeed * speedMultiplier;

    if (this.y > height || this.x < -20 || this.x > width + 20) {
      this.reset(width, height);
    }
  }

  render(ctx: CanvasRenderingContext2D, cachedPetal: HTMLCanvasElement) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);
    ctx.globalAlpha = this.opacity;
    ctx.drawImage(cachedPetal, -this.size, -this.size, this.size * 2, this.size * 2);
    ctx.restore();
  }
}

export class SakuraEffect implements EffectModule {
  id = 'sakura';
  private petals: Petal[] = [];
  private width: number = 0;
  private height: number = 0;
  private maxPetals: number = 100; // Reduced from 150
  private intensity: number = 0.5;
  private petalCache: HTMLCanvasElement | null = null;
  private lastColor: string = '';

  initialize(ctx: CanvasRenderingContext2D): void {
    this.width = ctx.canvas.width;
    this.height = ctx.canvas.height;
    this.petals = Array.from({ length: this.maxPetals }, () => new Petal(this.width, this.height));
  }

  private updateCache(color: string) {
    if (this.lastColor === color && this.petalCache) return;
    
    this.lastColor = color;
    const size = 20;
    const canvas = document.createElement('canvas');
    canvas.width = size * 2;
    canvas.height = size * 2;
    const ctx = canvas.getContext('2d');
    
    if (ctx) {
      ctx.fillStyle = color;
      ctx.translate(size, size);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.bezierCurveTo(-size/2, -size/2, -size/2, size/2, 0, size/2);
      ctx.bezierCurveTo(size/2, size/2, size/2, -size/2, 0, 0);
      ctx.fill();
    }
    this.petalCache = canvas;
  }

  update(_deltaTime: number, intensity: number, speed: number): void {
    this.intensity = intensity;
    const activeCount = Math.floor(this.maxPetals * intensity);
    for (let i = 0; i < activeCount; i++) {
      if (!this.petals[i]) {
        this.petals[i] = new Petal(this.width, this.height);
      }
      this.petals[i].update(this.width, this.height, speed);
    }
  }

  render(ctx: CanvasRenderingContext2D, theme: ThemeEffects): void {
    this.updateCache(theme.sakuraColor);
    if (!this.petalCache) return;

    const activeCount = Math.floor(this.maxPetals * this.intensity);
    for (let i = 0; i < activeCount; i++) {
      this.petals[i]?.render(ctx, this.petalCache);
    }
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
  }

  destroy(): void {
    this.petals = [];
  }
}
