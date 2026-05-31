import type { ThemeEffects } from '../../../themes/theme.types';
import type { EffectModule } from '../../core/VisualEngine';

class Bolt {
  segments: { x: number, y: number }[] = [];
  opacity: number = 0;
  life: number = 0;
  maxLife: number = 0;

  constructor(width: number, height: number) {
    this.reset(width, height);
  }

  reset(width: number, height: number) {
    const startX = Math.random() * width;
    const startY = 0;
    const endX = startX + (Math.random() - 0.5) * 200;
    const endY = height;

    this.segments = [{ x: startX, y: startY }];
    let currX = startX;
    let currY = startY;

    const segmentCount = 10;
    for (let i = 1; i <= segmentCount; i++) {
      currX += (endX - startX) / segmentCount + (Math.random() - 0.5) * 100;
      currY += (endY - startY) / segmentCount;
      this.segments.push({ x: currX, y: currY });
    }

    this.life = 0;
    this.maxLife = 0.1 + Math.random() * 0.2;
    this.opacity = 0.5 + Math.random() * 0.5;
  }

  update(deltaTime: number) {
    this.life += deltaTime;
  }

  isDead() {
    return this.life >= this.maxLife;
  }

  render(ctx: CanvasRenderingContext2D, color: string, performanceMode: boolean) {
    if (this.segments.length < 2) return;

    const baseColor = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
    const alpha = this.opacity * (1 - this.life / this.maxLife);
    
    if (baseColor) {
      const r = baseColor[1];
      const g = baseColor[2];
      const b = baseColor[3];
      ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
      ctx.shadowColor = `rgb(${r}, ${g}, ${b})`;
    } else {
      ctx.strokeStyle = color;
      ctx.shadowColor = color;
    }

    ctx.lineWidth = performanceMode ? 1 : 2;
    
    // Optimize: shadowBlur is very expensive, disable in performance mode
    if (!performanceMode) {
      ctx.shadowBlur = 10;
    }
    
    ctx.beginPath();
    ctx.moveTo(this.segments[0].x, this.segments[0].y);
    for (let i = 1; i < this.segments.length; i++) {
      ctx.lineTo(this.segments[i].x, this.segments[i].y);
    }
    ctx.stroke();
    
    ctx.shadowBlur = 0;
  }
}

export class ElectricityEffect implements EffectModule {
  id = 'electricity';
  private bolts: Bolt[] = [];
  private width: number = 0;
  private height: number = 0;
  private spawnTimer: number = 0;

  initialize(ctx: CanvasRenderingContext2D): void {
    this.width = ctx.canvas.width;
    this.height = ctx.canvas.height;
  }

  update(deltaTime: number, intensity: number, speed: number, _performanceMode: boolean): void {
    this.spawnTimer += deltaTime * speed * 5;

    if (this.spawnTimer > 1 / (intensity + 0.1)) {
      this.bolts.push(new Bolt(this.width, this.height));
      this.spawnTimer = 0;
    }

    this.bolts = this.bolts.filter(bolt => {
      bolt.update(deltaTime);
      return !bolt.isDead();
    });
  }

  render(ctx: CanvasRenderingContext2D, theme: ThemeEffects, performanceMode: boolean): void {
    this.bolts.forEach(bolt => bolt.render(ctx, theme.electricityColor, performanceMode));
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
  }

  destroy(): void {
    this.bolts = [];
  }
}
